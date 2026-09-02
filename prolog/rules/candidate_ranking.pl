:- module(candidate_ranking, [ranked_candidates/2, top_candidates/3]).

:- use_module(library(lists)).
:- use_module(candidate_scoring).
:- use_module('../generated/mammal_traits').

ranked_candidates(Observations, Ranked) :-
    findall(row(Animal, Score, Matches, Conflicts, Known, Label), (
        candidate_score(Animal, Observations, Score, Matches, Conflicts, Known, evidence_label(Label))
    ), Rows),
    predsort(compare_candidate, Rows, Ranked).

top_candidates(Observations, Limit, Top) :-
    ranked_candidates(Observations, Ranked),
    length(Top, Limit),
    append(Top, _, Ranked),
    !.
top_candidates(Observations, _Limit, Ranked) :-
    ranked_candidates(Observations, Ranked).

compare_candidate(Order, row(A, ScoreA, MatchesA, ConflictsA, KnownA, _), row(B, ScoreB, MatchesB, ConflictsB, KnownB, _)) :-
    compare(ScoreOrder, ScoreB, ScoreA),
    compare(MatchOrder, MatchesB, MatchesA),
    compare(ConflictOrder, ConflictsA, ConflictsB),
    compare(KnownOrder, KnownB, KnownA),
    compare(KeyOrder, A, B),
    first_non_equal([ScoreOrder, MatchOrder, ConflictOrder, KnownOrder, KeyOrder], Order).

first_non_equal([], =).
first_non_equal([=|Rest], Order) :- !, first_non_equal(Rest, Order).
first_non_equal([Order|_], Order).
