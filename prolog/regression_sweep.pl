:- initialization(main, main).

:- use_module(library(http/json)).
:- use_module(rules/json_api).
:- use_module(rules/evidence).
:- use_module(generated/mammal_traits).

safety_limit(12).

main(_) :-
    read_string(user_input, _, Input),
    open_string(Input, Stream),
    json_read_dict(Stream, Dict),
    close(Stream),
    requested_keys(Dict, Keys),
    requested_scenarios(Dict, Scenarios),
    findall(Result, (
        member(Scenario, Scenarios),
        member(Key, Keys),
        simulate_species(Key, Scenario, Result)
    ), Results),
    json_write_dict(current_output, _{results: Results}, [null('null')]),
    nl.

requested_keys(Dict, Keys) :-
    get_dict(keys, Dict, KeyTexts),
    KeyTexts \= [],
    !,
    maplist(atom_string, Keys, KeyTexts).
requested_keys(_Dict, Keys) :-
    findall(Key, identification_active(Key, true), Keys).

requested_scenarios(Dict, Scenarios) :-
    get_dict(scenarios, Dict, ScenarioTexts),
    ScenarioTexts \= [],
    !,
    maplist(atom_string, Scenarios, ScenarioTexts).
requested_scenarios(_Dict, [clean, one_wrong_after_three, one_uncertain, partial_three_answers]).

simulate_species(Key, Scenario, Dict) :-
    simulate_loop(Key, Scenario, [], [], FinalStatus, _FinalObservations, Trace, Response),
    get_dict(candidates, Response, Candidates),
    target_details(Key, Candidates, TargetReturnedRank, TargetScore, TargetMatches, TargetConflicts, TargetEvidence),
    top3(Candidates, Top3),
    length(Trace, QuestionsAsked),
    trace_path(Trace, Path),
    response_next_question(Response, NextQuestion),
    atom_string(Key, KeyText),
    atom_string(Scenario, ScenarioText),
    scientific_name(Key, ScientificName),
    Dict = _{
        speciesKey: KeyText,
        scientificName: ScientificName,
        scenario: ScenarioText,
        finalStatus: FinalStatus,
        questionsAsked: QuestionsAsked,
        nextQuestion: NextQuestion,
        targetReturnedRank: TargetReturnedRank,
        targetScore: TargetScore,
        targetMatches: TargetMatches,
        targetConflicts: TargetConflicts,
        targetEvidence: TargetEvidence,
        top3: Top3,
        path: Path
    }.

simulate_loop(_Key, partial_three_answers, Observations, Trace, continue, Observations, Trace, Response) :-
    length(Trace, Count),
    Count >= 3,
    !,
    reason_dict(Observations, Response).
simulate_loop(Key, Scenario, Observations, Trace, Status, FinalObservations, FinalTrace, Response) :-
    reason_dict(Observations, CurrentResponse),
    get_dict(status, CurrentResponse, CurrentStatus),
    (
        CurrentStatus == continue
    ->
        length(Trace, Count),
        (
            safety_limit(Limit),
            Count >= Limit
        ->
            Status = safety_limit,
            FinalObservations = Observations,
            FinalTrace = Trace,
            Response = CurrentResponse
        ;
            get_dict(nextQuestion, CurrentResponse, Question),
            get_dict(id, Question, QuestionText),
            atom_string(QuestionId, QuestionText),
            answer_for_scenario(Key, QuestionId, Trace, Scenario, Value, Source),
            append(Observations, [QuestionId-Value], NextObservations),
            append(Trace, [step(QuestionId, Value, Source)], NextTrace),
            simulate_loop(Key, Scenario, NextObservations, NextTrace, Status, FinalObservations, FinalTrace, Response)
        )
    ;
        Status = CurrentStatus,
        FinalObservations = Observations,
        FinalTrace = Trace,
        Response = CurrentResponse
    ).

answer_for_scenario(_Key, QuestionId, Trace, one_uncertain, Value, uncertainty) :-
    \+ member(step(_, _, uncertainty), Trace),
    !,
    uncertainty_for_question(QuestionId, Value).
answer_for_scenario(Key, QuestionId, Trace, one_wrong_after_three, Value, wrong_trait) :-
    known_count(Trace, KnownCount),
    KnownCount >= 3,
    \+ member(step(_, _, wrong_trait), Trace),
    trait(Key, QuestionId, Correct),
    \+ uncertainty_answer(Correct),
    wrong_option(QuestionId, Correct, Value),
    !.
answer_for_scenario(Key, QuestionId, _Trace, _Scenario, Value, known_trait) :-
    trait(Key, QuestionId, Value),
    !.
answer_for_scenario(_Key, _QuestionId, _Trace, _Scenario, unknown, unknown).

known_count(Trace, Count) :-
    include(known_step, Trace, Known),
    length(Known, Count).

known_step(step(_, _, known_trait)).

uncertainty_for_question(QuestionId, Value) :-
    member(Value, [not_clear, not_sure, tail_not_clear, unknown]),
    uncertainty_answer(Value),
    question_has_option(QuestionId, Value),
    !.
uncertainty_for_question(_QuestionId, unknown).

question_has_option(QuestionId, Value) :-
    question(QuestionId, _Text, Options),
    member(option(Value, _), Options).

wrong_option(QuestionId, Correct, Value) :-
    question(QuestionId, _Text, Options),
    member(option(Value, _), Options),
    Value \= Correct,
    \+ uncertainty_answer(Value).

target_details(Key, Candidates, Rank, Score, Matches, Conflicts, Evidence) :-
    atom_string(Key, KeyText),
    nth1(Rank, Candidates, Candidate),
    get_dict(key, Candidate, KeyText),
    !,
    get_dict(score, Candidate, Score),
    get_dict(matches, Candidate, Matches),
    get_dict(conflicts, Candidate, Conflicts),
    get_dict(evidence, Candidate, Evidence).
target_details(_Key, _Candidates, null, null, null, null, null).

top3(Candidates, Top3) :-
    take(3, Candidates, Top3).

response_next_question(Response, NextQuestion) :-
    get_dict(nextQuestion, Response, Question),
    Question \= null,
    !,
    get_dict(id, Question, NextQuestion).
response_next_question(_Response, null).

trace_path([], '').
trace_path(Trace, Path) :-
    findall(Part, (
        member(step(QuestionId, Value, Source), Trace),
        format(string(Part), '~w=~w(~w)', [QuestionId, Value, Source])
    ), Parts),
    atomic_list_concat(Parts, '|', AtomPath),
    atom_string(AtomPath, Path).

take(0, _, []) :- !.
take(_, [], []) :- !.
take(N, [H|T], [H|Rest]) :-
    N > 0,
    N1 is N - 1,
    take(N1, T, Rest).
