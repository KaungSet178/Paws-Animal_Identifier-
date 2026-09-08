:- module(stopping, [identification_status/3]).

:- use_module(question_selection).

max_identification_questions(8).

identification_status([], _Ranked, continue) :- !.
identification_status(Observations, _Ranked, continue) :-
    recovery_question(Observations, _),
    !.
identification_status(_Observations, Ranked, complete) :-
    Ranked = [row(_, TopScore, TopMatches, TopConflicts, TopKnown, _)],
    acceptable_complete_candidate(TopScore, TopMatches, TopConflicts, TopKnown),
    !.
identification_status(Observations, Ranked, complete) :-
    Ranked = [row(_, TopScore, TopMatches, TopConflicts, TopKnown, _), row(_, SecondScore, _, _, _, _)|_],
    acceptable_complete_candidate(TopScore, TopMatches, TopConflicts, TopKnown),
    Gap is TopScore - SecondScore,
    Gap >= 4,
    \+ next_question(Observations, _),
    !.
identification_status(Observations, Ranked, complete) :-
    Ranked = [row(_, TopScore, TopMatches, 0, TopKnown, _), row(_, SecondScore, _, SecondConflicts, _, _)|_],
    strong_complete_candidate(TopScore, TopMatches, 0, TopKnown),
    SecondConflicts > 0,
    Gap is TopScore - SecondScore,
    Gap >= 3,
    \+ next_question(Observations, _),
    !.
identification_status(_Observations, Ranked, complete) :-
    Ranked = [row(_, TopScore, TopMatches, 0, TopKnown, _), row(_, SecondScore, _, SecondConflicts, _, _)|_],
    strong_complete_candidate(TopScore, TopMatches, 0, TopKnown),
    SecondConflicts > 0,
    Gap is TopScore - SecondScore,
    Gap >= 4,
    !.
identification_status(Observations, Ranked, complete) :-
    length(Observations, Count),
    Count >= 6,
    Ranked = [row(_, TopScore, TopMatches, TopConflicts, TopKnown, _), row(_, SecondScore, _, _, _, _)|_],
    decisive_followup_candidate(TopScore, TopMatches, TopConflicts, TopKnown),
    Gap is TopScore - SecondScore,
    Gap >= 2,
    !.
identification_status(Observations, Ranked, complete) :-
    length(Observations, Count),
    Count >= 8,
    Ranked = [row(_, TopScore, TopMatches, 0, TopKnown, _), row(_, SecondScore, _, SecondConflicts, _, _)|_],
    late_clean_leader(TopScore, TopMatches, TopKnown),
    SecondConflicts > 0,
    Gap is TopScore - SecondScore,
    Gap >= 2,
    !.
identification_status(_Observations, Ranked, complete) :-
    Ranked = [row(_, TopScore, TopMatches, TopConflicts, TopKnown, _), row(_, SecondScore, _, _, _, _)|_],
    strong_complete_candidate(TopScore, TopMatches, TopConflicts, TopKnown),
    Gap is TopScore - SecondScore,
    Gap >= 6,
    !.
identification_status(Observations, Ranked, ambiguous) :-
    length(Observations, Count),
    Count >= 6,
    Ranked = [
        row(_, TopScore, TopMatches, TopConflicts, TopKnown, _),
        row(_, SecondScore, SecondMatches, SecondConflicts, SecondKnown, _)
        |_
    ],
    strong_complete_candidate(TopScore, TopMatches, TopConflicts, TopKnown),
    strong_complete_candidate(SecondScore, SecondMatches, SecondConflicts, SecondKnown),
    Gap is TopScore - SecondScore,
    Gap =< 1,
    !.
identification_status(Observations, Ranked, ambiguous) :-
    Ranked = [_|_],
    max_identification_questions(Max),
    length(Observations, Count),
    Count >= Max,
    !.
identification_status(Observations, Ranked, ambiguous) :-
    Ranked = [_|_],
    \+ next_question(Observations, _),
    !.
identification_status(Observations, _Ranked, insufficient_evidence) :-
    \+ next_question(Observations, _),
    !.
identification_status(_, _, continue).

acceptable_complete_candidate(Score, Matches, Conflicts, Known) :-
    Matches >= 2,
    Known >= 2,
    Score >= 6,
    Conflicts =< 1.

strong_complete_candidate(Score, Matches, Conflicts, Known) :-
    Matches >= 3,
    Known >= 3,
    Score >= 8,
    Conflicts =< 1.

decisive_followup_candidate(Score, Matches, Conflicts, Known) :-
    Matches >= 5,
    Known >= 5,
    Score >= 12,
    Conflicts =< 1.

late_clean_leader(Score, Matches, Known) :-
    Matches >= 4,
    Known >= 4,
    Score >= 9.
