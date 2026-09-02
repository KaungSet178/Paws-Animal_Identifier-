:- module(question_selection, [next_question/2, question_score/4]).

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
    trait_weight(Trait, Weight),
    \+ answered_trait(Observations, Trait),
    value_counts(Candidates, Trait, Counts),
    Counts = [_-_|_],
    length(Counts, Distinct),
    Distinct >= 2,
    total_count(Counts, Known),
    Known >= 2,
    entropy(Counts, Entropy),
    pool_bonus(Observations, Trait, Bonus),
    Score is (Entropy * Known * Weight) + Bonus.

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

compare_question(Order, score(ScoreA, KnownA, DistinctA, TraitA), score(ScoreB, KnownB, DistinctB, TraitB)) :-
    compare(ScoreOrder, ScoreB, ScoreA),
    compare(KnownOrder, KnownB, KnownA),
    compare(DistinctOrder, DistinctB, DistinctA),
    compare(KeyOrder, TraitA, TraitB),
    first_non_equal([ScoreOrder, KnownOrder, DistinctOrder, KeyOrder], Order).

first_non_equal([], =).
first_non_equal([=|Rest], Order) :- !, first_non_equal(Rest, Order).
first_non_equal([Order|_], Order).
