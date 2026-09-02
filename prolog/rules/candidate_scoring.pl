:- module(candidate_scoring, [candidate_score/7]).

:- use_module(evidence).
:- use_module('../generated/mammal_traits').

candidate_score(Animal, Observations, Score, Matches, Conflicts, KnownEvidenceCount, evidence_label(Label)) :-
    animal(Animal),
    candidate_totals(Animal, Observations, Score, Matches, Conflicts, KnownEvidenceCount),
    evidence_strength(Score, Matches, Conflicts, KnownEvidenceCount, Label).

evidence_strength(_Score, _Matches, Conflicts, _Known, conflicting) :- Conflicts > 0, !.
evidence_strength(Score, Matches, 0, Known, strong) :- Matches >= 3, Known >= 3, Score >= 8, !.
evidence_strength(_Score, Matches, 0, Known, moderate) :- Matches >= 2, Known >= 2, !.
evidence_strength(_Score, Matches, 0, _Known, weak) :- Matches >= 1, !.
evidence_strength(_, _, _, _, none).
