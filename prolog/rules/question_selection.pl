:- module(question_selection, [
    next_question/2,
    question_score/4,
    question_score_components/10,
    recovery_question/2,
    recovery_question_score/4,
    recovery_candidate_focus/2
]).

:- use_module(library(lists)).
:- use_module(evidence).
:- use_module(candidate_ranking).
:- use_module('../generated/mammal_traits').

focus_score_margin(4).
focus_min_candidates(5).
focus_max_candidates(12).
tie_break_score_margin(2).
recovery_min_observations(5).
recovery_score_margin(2).
recovery_override_margin(10).

next_question(Observations, QuestionId) :-
    preferred_recovery_question(Observations, QuestionId),
    !.
next_question(Observations, QuestionId) :-
    normal_next_question(Observations, QuestionId),
    !.
next_question(Observations, QuestionId) :-
    tie_break_question(Observations, QuestionId).

preferred_recovery_question(Observations, QuestionId) :-
    recovery_question_with_score(Observations, QuestionId, RecoveryScore),
    recovery_preferred_over_normal(Observations, RecoveryScore).

recovery_preferred_over_normal(Observations, _RecoveryScore) :-
    \+ normal_selected_score(Observations, _),
    !.
recovery_preferred_over_normal(Observations, RecoveryScore) :-
    length(Observations, Count),
    Count >= 7,
    normal_selected_score(Observations, NormalScore),
    RecoveryScore >= NormalScore,
    !.
recovery_preferred_over_normal(Observations, RecoveryScore) :-
    normal_selected_score(Observations, NormalScore),
    recovery_override_margin(Margin),
    RecoveryScore >= NormalScore + Margin.

normal_next_question(Observations, QuestionId) :-
    candidate_focus(Observations, Candidates),
    findall(score(Score, Known, Distinct, QuestionId0), (
        question_score(Observations, Candidates, QuestionId0, Score),
        known_count(Candidates, QuestionId0, Known),
        distinct_count(Candidates, QuestionId0, Distinct)
    ), Scores),
    Scores \= [],
    predsort(compare_question, Scores, [score(_, _, _, QuestionId)|_]).

tie_break_question(Observations, QuestionId) :-
    tie_break_focus(Observations, Candidates),
    findall(score(Score, Known, Distinct, QuestionId0), (
        tie_break_question_score(Observations, Candidates, QuestionId0, Score),
        known_count(Candidates, QuestionId0, Known),
        distinct_count(Candidates, QuestionId0, Distinct)
    ), Scores),
    Scores \= [],
    predsort(compare_question, Scores, [score(_, _, _, QuestionId)|_]).

normal_selected_score(Observations, Score) :-
    candidate_focus(Observations, Candidates),
    findall(score(Score0, Known, Distinct, QuestionId0), (
        question_score(Observations, Candidates, QuestionId0, Score0),
        known_count(Candidates, QuestionId0, Known),
        distinct_count(Candidates, QuestionId0, Distinct)
    ), Scores),
    Scores \= [],
    predsort(compare_question, Scores, [score(Score, _, _, _)|_]).

candidate_focus(Observations, Candidates) :-
    Observations \= [],
    ranked_candidates(Observations, Ranked),
    Ranked = [TopRow|_],
    TopRow = row(_, TopScore, _, _, _, _),
    focus_score_margin(Margin),
    MinimumScore is TopScore - Margin,
    findall(row(A, S, M, C, K, L), (
        member(row(A, S, M, C, K, L), Ranked),
        S >= MinimumScore
    ), WindowRows),
    focus_min_candidates(Min),
    ensure_minimum_focus(Ranked, WindowRows, Min, FocusRows0),
    focus_max_candidates(Max),
    take_rows(Max, FocusRows0, FocusRows),
    FocusRows \= [],
    !,
    findall(A, member(row(A, _, _, _, _, _), FocusRows), Candidates).
candidate_focus(Observations, Candidates) :-
    top_candidates(Observations, 25, Ranked),
    findall(A, member(row(A, _, _, _, _, _), Ranked), Candidates).

ensure_minimum_focus(_Ranked, WindowRows, Min, FocusRows) :-
    length(WindowRows, Count),
    Count >= Min,
    !,
    FocusRows = WindowRows.
ensure_minimum_focus(RankedRest, _WindowRows, Min, FocusRows) :-
    take_rows(Min, RankedRest, FocusRows),
    !.
ensure_minimum_focus(_, WindowRows, _, WindowRows).

take_rows(0, _, []) :- !.
take_rows(_, [], []) :- !.
take_rows(N, [H|T], [H|Rest]) :-
    N > 0,
    N1 is N - 1,
    take_rows(N1, T, Rest).

tie_break_focus(Observations, Candidates) :-
    ranked_candidates(Observations, Ranked),
    Ranked = [TopRow|_],
    TopRow = row(_, TopScore, _, _, _, _),
    findall(row(A, S, M, C, K, L), (
        member(row(A, S, M, C, K, L), Ranked),
        S =:= TopScore
    ), ExactRows),
    tie_break_rows(TopScore, Ranked, ExactRows, FocusRows),
    length(FocusRows, Count),
    Count >= 2,
    !,
    findall(A, member(row(A, _, _, _, _, _), FocusRows), Candidates).

tie_break_rows(_TopScore, _Ranked, ExactRows, ExactRows) :-
    length(ExactRows, Count),
    Count >= 2,
    !.
tie_break_rows(TopScore, Ranked, _ExactRows, NearRows) :-
    tie_break_score_margin(Margin),
    MinimumScore is TopScore - Margin,
    findall(row(A, S, M, C, K, L), (
        member(row(A, S, M, C, K, L), Ranked),
        S >= MinimumScore
    ), NearRows).

question_score(Observations, Candidates, Trait, Score) :-
    question_score_components(Observations, Candidates, Trait, Score, _Base, _Known, _Distinct, _Penalty, _Bonus, _Relevance).

question_score_components(Observations, Candidates, Trait, Score, Base, Known, Distinct, Penalty, Bonus, Relevance) :-
    trait_weight(Trait, Weight),
    \+ answered_trait(Observations, Trait),
    question_semantically_allowed(Observations, Candidates, Trait),
    value_counts(Candidates, Trait, Counts),
    Counts = [_-_|_],
    length(Counts, Distinct),
    Distinct >= 2,
    total_count(Counts, Known),
    Known >= 2,
    entropy(Counts, Entropy),
    pool_bonus(Observations, Trait, Bonus),
    semantic_bonus(Observations, Trait, SemanticBonus),
    semantic_penalty(Observations, Trait, Penalty),
    semantic_relevance(Observations, Candidates, Trait, Relevance),
    Base is (Entropy * Known * Weight) + Bonus,
    Score is Base + SemanticBonus + Relevance - Penalty,
    Score > 0.

tie_break_question_score(Observations, Candidates, Trait, Score) :-
    trait_weight(Trait, Weight),
    \+ answered_trait(Observations, Trait),
    question_semantically_allowed(Observations, Candidates, Trait),
    value_counts(Candidates, Trait, Counts),
    Counts = [_-_|_],
    length(Counts, Distinct),
    Distinct >= 2,
    total_count(Counts, Known),
    Known >= 2,
    entropy(Counts, Entropy),
    semantic_relevance(Observations, Candidates, Trait, Relevance),
    Score is (Entropy * Known * Weight) + Relevance + Distinct,
    Score > 0.

recovery_question(Observations, QuestionId) :-
    recovery_question_with_score(Observations, QuestionId, _Score).

recovery_question_with_score(Observations, QuestionId, Score) :-
    recovery_candidate_focus(Observations, Candidates),
    findall(score(Score0, Known, Distinct, QuestionId0), (
        recovery_question_score(Observations, Candidates, QuestionId0, Score0),
        recovery_known_count(Candidates, QuestionId0, Known),
        recovery_distinct_count(Candidates, QuestionId0, Distinct)
    ), Scores),
    Scores \= [],
    predsort(compare_question, Scores, [score(Score, _, _, QuestionId)|_]).

recovery_candidate_focus(Observations, Candidates) :-
    recovery_context_rows(Observations, FocusRows),
    findall(A, member(row(A, _, _, _, _, _), FocusRows), Candidates).

recovery_context_rows(Observations, FocusRows) :-
    length(Observations, Count),
    recovery_min_observations(Min),
    Count >= Min,
    Count < 8,
    ranked_candidates(Observations, Ranked),
    Ranked = [TopRow|_],
    TopRow = row(_, TopScore, _, _, _, _),
    findall(row(A, S, M, C, K, L), (
        member(row(A, S, M, C, K, L), Ranked),
        S =:= TopScore
    ), ExactRows),
    recovery_rows(TopScore, Ranked, ExactRows, FocusRows0),
    take_rows(12, FocusRows0, FocusRows),
    length(FocusRows, FocusCount),
    FocusCount >= 2,
    recovery_noisy_rows(TopRow, ExactRows).

recovery_noisy_rows(row(_, _, _, Conflicts, _, _), _ExactRows) :-
    Conflicts > 0,
    !.
recovery_noisy_rows(_TopRow, ExactRows) :-
    length(ExactRows, Count),
    Count >= 2,
    member(row(_, _, _, Conflicts, _, _), ExactRows),
    Conflicts > 0.

recovery_rows(_TopScore, _Ranked, ExactRows, ExactRows) :-
    length(ExactRows, Count),
    Count >= 2,
    !.
recovery_rows(TopScore, Ranked, _ExactRows, NearRows) :-
    recovery_score_margin(Margin),
    MinimumScore is TopScore - Margin,
    findall(row(A, S, M, C, K, L), (
        member(row(A, S, M, C, K, L), Ranked),
        S >= MinimumScore
    ), NearRows).

recovery_question_score(Observations, Candidates, Trait, Score) :-
    trait_weight(Trait, Weight),
    \+ answered_trait(Observations, Trait),
    question_semantically_allowed(Observations, Candidates, Trait),
    recovery_value_summary(Candidates, Trait, Known, Missing, Distinct),
    Known >= 1,
    recovery_trait_separates(Known, Missing, Distinct),
    recovery_leader_split(Candidates, Trait, LeaderSplit),
    semantic_relevance(Observations, Candidates, Trait, Relevance),
    Score is (Weight * 10) + (Known * 4) + (Distinct * 6) + (Missing * 3) + LeaderSplit + Relevance,
    Score > 0.

recovery_trait_separates(_Known, _Missing, Distinct) :-
    Distinct >= 2,
    !.
recovery_trait_separates(_Known, Missing, _Distinct) :-
    Missing > 0.

recovery_value_summary(Candidates, Trait, Known, Missing, Distinct) :-
    findall(Value, (member(A, Candidates), trait(A, Trait, Value)), Values),
    length(Values, Known),
    length(Candidates, Total),
    Missing is Total - Known,
    sort(Values, Unique),
    length(Unique, Distinct).

recovery_known_count(Candidates, Trait, Known) :-
    recovery_value_summary(Candidates, Trait, Known, _Missing, _Distinct).

recovery_distinct_count(Candidates, Trait, Distinct) :-
    recovery_value_summary(Candidates, Trait, _Known, _Missing, Distinct).

recovery_leader_split([Leader|Rest], Trait, 10) :-
    recovery_value_state(Leader, Trait, LeaderState),
    member(Other, Rest),
    recovery_value_state(Other, Trait, OtherState),
    LeaderState \= OtherState,
    !.
recovery_leader_split(_, _, 0).

recovery_value_state(Animal, Trait, known(Value)) :-
    trait(Animal, Trait, Value),
    !.
recovery_value_state(_, _, missing).

value_counts(Candidates, Trait, Counts) :-
    findall(Value, (member(A, Candidates), trait(A, Trait, Value)), Values),
    sort(Values, Unique),
    findall(Value-Count, (
        member(Value, Unique),
        include(=(Value), Values, Matching),
        length(Matching, Count)
    ), Counts).

known_count(Candidates, Trait, Known) :-
    findall(A, (member(A, Candidates), trait(A, Trait, _)), KnownAnimals),
    length(KnownAnimals, Known).

distinct_count(Candidates, Trait, Distinct) :-
    value_counts(Candidates, Trait, Counts),
    length(Counts, Distinct).

total_count([], 0).
total_count([_-N|Rest], Total) :- total_count(Rest, Tail), Total is N + Tail.

entropy(Counts, Entropy) :-
    total_count(Counts, Total),
    entropy_(Counts, Total, Entropy).

entropy_([], _Total, 0).
entropy_([_-N|Rest], Total, Entropy) :-
    P is N / Total,
    entropy_(Rest, Total, Tail),
    Entropy is Tail - (P * log(P) / log(2)).

pool_bonus([], Trait, 100) :- question_pool(opening, Trait), !.
pool_bonus(_, Trait, 15) :- question_pool(general_followup, Trait), !.
pool_bonus(_, Trait, 8) :- question_pool(opening, Trait), !.
pool_bonus(_, _Trait, 0).

question_semantically_allowed(Observations, _Candidates, Trait) :-
    member(Answered-Value, Observations),
    \+ uncertainty_answer(Value),
    question_block_if(Trait, Answered, Value, _Reason),
    !,
    fail.
question_semantically_allowed(Observations, Candidates, body_size_impression) :-
    cetacean_context(Observations, Candidates),
    useful_cetacean_specific_discriminator(Observations, Candidates),
    !,
    fail.
question_semantically_allowed(Observations, _Candidates, Trait) :-
    member(Answered-Value, Observations),
    uncertainty_answer(Value),
    semantic_observation_group(Group, Trait),
    semantic_observation_group(Group, Answered),
    Trait \= Answered,
    !,
    fail.
question_semantically_allowed(Observations, Candidates, Trait) :-
    question_domain_gate(Trait, Gate),
    !,
    domain_gate_allowed(Observations, Candidates, Gate).
question_semantically_allowed(_, _, _).

cetacean_context(Observations, Candidates) :-
    domain_gate_allowed(Observations, Candidates, cetacean).

useful_cetacean_specific_discriminator(Observations, Candidates) :-
    question_domain_gate(Trait, cetacean),
    \+ answered_trait(Observations, Trait),
    recovery_value_summary(Candidates, Trait, Known, Missing, Distinct),
    useful_discriminator_shape(Known, Missing, Distinct),
    !.

useful_discriminator_shape(Known, _Missing, Distinct) :-
    Known >= 2,
    Distinct >= 2,
    !.
useful_discriminator_shape(Known, Missing, _Distinct) :-
    Known >= 1,
    Missing > 0.

domain_gate_allowed(Observations, _Candidates, Gate) :-
    observation_value(Observations, body_form, Value),
    \+ uncertainty_answer(Value),
    !,
    domain_gate_body_form(Gate, Value).
domain_gate_allowed(_Observations, Candidates, Gate) :-
    domain_candidate_count(Candidates, Gate, DomainCount),
    length(Candidates, Total),
    DomainCount >= 2,
    DomainCount * 2 >= Total.

domain_candidate_count(Candidates, Gate, Count) :-
    findall(A, (
        member(A, Candidates),
        domain_candidate(Gate, A)
    ), DomainCandidates),
    length(DomainCandidates, Count).

domain_candidate(Gate, Animal) :-
    animal_order(Animal, Order),
    domain_gate_order(Gate, Order),
    !.
domain_candidate(Gate, Animal) :-
    trait(Animal, body_form, BodyForm),
    domain_gate_body_form(Gate, BodyForm).

semantic_bonus(Observations, Trait, Bonus) :-
    findall(Value, (
        member(Answered-Observed, Observations),
        \+ uncertainty_answer(Observed),
        question_bonus(Trait, Answered, Observed, Value, _Reason)
    ), Values),
    sum_list(Values, Bonus).

semantic_penalty(Observations, Trait, Penalty) :-
    findall(Value, (
        member(Answered-Observed, Observations),
        \+ uncertainty_answer(Observed),
        question_penalty(Trait, Answered, Observed, Value, _Reason)
    ), Values),
    sum_list(Values, Penalty).

semantic_relevance(Observations, _Candidates, Trait, 40) :-
    question_domain_gate(Trait, Gate),
    observation_value(Observations, body_form, Value),
    \+ uncertainty_answer(Value),
    domain_gate_body_form(Gate, Value),
    !.
semantic_relevance(_Observations, Candidates, Trait, 15) :-
    question_domain_gate(Trait, Gate),
    domain_candidate_count(Candidates, Gate, DomainCount),
    length(Candidates, Total),
    DomainCount >= 2,
    DomainCount * 2 >= Total,
    !.
semantic_relevance(_, _, _, 0).

compare_question(Order, score(ScoreA, KnownA, DistinctA, TraitA), score(ScoreB, KnownB, DistinctB, TraitB)) :-
    compare(ScoreOrder, ScoreB, ScoreA),
    compare(KnownOrder, KnownB, KnownA),
    compare(DistinctOrder, DistinctB, DistinctA),
    compare(KeyOrder, TraitA, TraitB),
    first_non_equal([ScoreOrder, KnownOrder, DistinctOrder, KeyOrder], Order).

first_non_equal([], =).
first_non_equal([=|Rest], Order) :- !, first_non_equal(Rest, Order).
first_non_equal([Order|_], Order).
