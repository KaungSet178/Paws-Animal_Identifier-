:- module(json_api, [reason_json/1, reason_dict/2]).

:- use_module(library(http/json)).
:- use_module(candidate_ranking).
:- use_module(question_selection).
:- use_module(stopping).
:- use_module('../generated/mammal_traits').

reason_json(Observations) :-
    reason_dict(Observations, Dict),
    json_write_dict(current_output, Dict, [null('null')]),
    nl.

reason_dict(Observations, _{
    status: Status,
    candidates: CandidateDicts,
    nextQuestion: NextQuestion
}) :-
    ranked_candidates(Observations, Ranked),
    identification_status(Observations, Ranked, Status),
    response_candidates(Status, Ranked, CandidateRows),
    maplist(candidate_dict, CandidateRows, CandidateDicts),
    response_question(Status, Observations, NextQuestion).

response_candidates(continue, Ranked, CandidateRows) :- take(10, Ranked, CandidateRows), !.
response_candidates(complete, Ranked, CandidateRows) :-
    result_candidate_limit(Ranked, Limit),
    take(Limit, Ranked, CandidateRows),
    !.
response_candidates(ambiguous, Ranked, CandidateRows) :- take(3, Ranked, CandidateRows), !.
response_candidates(_, Ranked, CandidateRows) :- take(10, Ranked, CandidateRows).

result_candidate_limit(Ranked, 1) :-
    high_confidence_result(Ranked),
    !.
result_candidate_limit(_, 3).

high_confidence_result([row(_, TopScore, TopMatches, 0, TopKnown, _)|Rest]) :-
    TopMatches >= 3,
    TopKnown >= 3,
    TopScore >= 10,
    Rest = [row(_, SecondScore, _, _, _, _)|_],
    Gap is TopScore - SecondScore,
    Gap >= 4,
    \+ plausible_contradicted_alternative(TopScore, Rest).

plausible_contradicted_alternative(TopScore, Rows) :-
    take(2, Rows, Alternatives),
    member(row(_, Score, Matches, Conflicts, _, _), Alternatives),
    Matches >= 3,
    Conflicts > 0,
    Gap is TopScore - Score,
    Gap =< 6.

candidate_dict(row(Key, Score, Matches, Conflicts, Known, Label), _{
    key: KeyText,
    commonName: CommonName,
    scientificName: ScientificName,
    score: Score,
    matches: Matches,
    conflicts: Conflicts,
    knownEvidenceCount: Known,
    evidence: LabelText
}) :-
    atom_string(Key, KeyText),
    atom_string(Label, LabelText),
    common_name(Key, CommonName),
    scientific_name(Key, ScientificName).

response_question(continue, Observations, Dict) :-
    next_question(Observations, QuestionId),
    question(QuestionId, Text, Options),
    atom_string(QuestionId, IdText),
    maplist(option_dict, Options, OptionDicts),
    Dict = _{id: IdText, text: Text, options: OptionDicts},
    !.
response_question(_, _, null).

option_dict(option(Value, Label), _{value: ValueText, label: Label}) :-
    atom_string(Value, ValueText).

take(0, _, []) :- !.
take(_, [], []) :- !.
take(N, [H|T], [H|Rest]) :-
    N > 0,
    N1 is N - 1,
    take(N1, T, Rest).
