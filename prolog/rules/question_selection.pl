:- module(question_selection, [next_question/2, question_score/4, question_score_components/10]).

:- use_module(library(lists)).
:- use_module(evidence).
:- use_module(candidate_ranking).
:- use_module('../generated/mammal_traits').

next_question(Observations, QuestionId) :-
    candidate_focus(Observations, Candidates),
    findall(score(Score, Known, Distinct, QuestionId0), (
        question_score(Observations, Candidates, QuestionId0, Score),
        known_count(Candidates, QuestionId0, Known),
        distinct_count(Candidates, QuestionId0, Distinct)
    ), Scores),
    Scores \= [],
    predsort(compare_question, Scores, [score(_, _, _, QuestionId)|_]).

candidate_focus(Observations, Candidates) :-
    Observations \= [],
    findall(A, compatible_candidate(A, Observations), Compatible),
    length(Compatible, Count),
    Count >= 2,
    !,
    Candidates = Compatible.
candidate_focus(Observations, Candidates) :-
    top_candidates(Observations, 25, Ranked),
    findall(A, member(row(A, _, _, _, _, _), Ranked), Candidates).

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
    Value \= unknown,
    question_block_if(Trait, Answered, Value, _Reason),
    !,
    fail.
question_semantically_allowed(Observations, Candidates, Trait) :-
    question_domain_gate(Trait, Gate),
    !,
    domain_gate_allowed(Observations, Candidates, Gate).
question_semantically_allowed(_, _, _).

domain_gate_allowed(Observations, _Candidates, Gate) :-
    observation_value(Observations, body_form, Value),
    Value \= unknown,
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
        Observed \= unknown,
        question_bonus(Trait, Answered, Observed, Value, _Reason)
    ), Values),
    sum_list(Values, Bonus).

semantic_penalty(Observations, Trait, Penalty) :-
    findall(Value, (
        member(Answered-Observed, Observations),
        Observed \= unknown,
        question_penalty(Trait, Answered, Observed, Value, _Reason)
    ), Values),
    sum_list(Values, Penalty).

semantic_relevance(Observations, _Candidates, Trait, 40) :-
    question_domain_gate(Trait, Gate),
    observation_value(Observations, body_form, Value),
    Value \= unknown,
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
