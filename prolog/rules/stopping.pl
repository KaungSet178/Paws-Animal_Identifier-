:- module(stopping, [identification_status/3]).

:- use_module(question_selection).

identification_status([], _Ranked, continue) :- !.
identification_status(_Observations, Ranked, complete) :-
    nonconflicting_rows(Ranked, [row(_, TopScore, TopMatches, 0, TopKnown, _)]),
    TopMatches >= 2,
    TopKnown >= 2,
    TopScore >= 6,
    !.
identification_status(Observations, Ranked, complete) :-
    Ranked = [row(_, TopScore, TopMatches, 0, TopKnown, _), row(_, SecondScore, _, _, _, _)|_],
    TopMatches >= 2,
    TopKnown >= 2,
    TopScore >= 6,
    Gap is TopScore - SecondScore,
    Gap >= 4,
    \+ next_question(Observations, _),
    !.
identification_status(_Observations, Ranked, complete) :-
    Ranked = [row(_, TopScore, TopMatches, 0, TopKnown, _), row(_, SecondScore, _, _, _, _)|_],
    TopMatches >= 3,
    TopKnown >= 3,
    TopScore >= 8,
    Gap is TopScore - SecondScore,
    Gap >= 6,
    !.
identification_status(Observations, Ranked, ambiguous) :-
    nonconflicting_rows(Ranked, [row(_, TopScore, TopMatches, 0, TopKnown, _), row(_, SecondScore, _, 0, _, _)|_]),
    TopMatches >= 2,
    TopKnown >= 2,
    Gap is TopScore - SecondScore,
    Gap =< 3,
    \+ next_question(Observations, _),
    !.
identification_status(Observations, _Ranked, insufficient_evidence) :-
    \+ next_question(Observations, _),
    !.
identification_status(_, _, continue).

nonconflicting_rows(Ranked, Filtered) :-
    findall(row(A, S, M, 0, K, L), member(row(A, S, M, 0, K, L), Ranked), Filtered).
