:- module(candidate_scoring, [candidate_score/7]).

:- use_module(evidence).
:- use_module('../generated/mammal_traits').

candidate_score(Animal, Observations, Score, Matches, Conflicts, KnownEvidenceCount, evidence_label(Label)) :-
    animal(Animal),
    candidate_totals(Animal, Observations, Score, Matches, Conflicts, KnownEvidenceCount),
    evidence_strength(Score, Matches, Conflicts, KnownEvidenceCount, Label).

evidence_strength(_Score, _Matches, _Conflicts, 0, none) :- !.
evidence_strength(Score, Matches, Conflicts, Known, strong) :-
    Matches >= 3,
    Known >= 3,
    Score >= 8,
    Conflicts =< 1,
    !.
evidence_strength(Score, Matches, Conflicts, Known, moderate) :-
    Matches >= 2,
    Known >= 2,
    Score >= 5,
    Conflicts =< 1,
    !.
evidence_strength(Score, Matches, Conflicts, _Known, mixed) :-
    Matches > 0,
    Conflicts > 0,
    Score > 0,
    !.
evidence_strength(Score, _Matches, Conflicts, _Known, conflicting) :-
    Conflicts > 0,
    Score =< 0,
    !.
evidence_strength(Score, Matches, _Conflicts, _Known, weak) :-
    Matches >= 1,
    Score > 0,
    !.
evidence_strength(_, _, _, _, none).
