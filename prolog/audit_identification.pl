:- initialization(main, main).

:- use_module(library(http/json)).
:- use_module(rules/json_api).
:- use_module(rules/candidate_ranking).
:- use_module(generated/mammal_traits).

safety_limit(25).

main(_) :-
    read_string(user_input, _, Input),
    open_string(Input, Stream),
    json_read_dict(Stream, Dict),
    close(Stream),
    get_dict(keys, Dict, KeyTexts),
    maplist(atom_string, Keys, KeyTexts),
    maplist(audit_species, Keys, Results),
    json_write_dict(current_output, _{results: Results}, [null('null')]),
    nl.

audit_species(Key, Dict) :-
    simulate_species(Key, [], [], Status, FinalObservations, Trace),
    ranked_candidates(FinalObservations, Ranked),
    target_details(Key, Ranked, Rank, Score, Matches, Conflicts),
    trace_counts(Trace, KnownAnswers, UnknownAnswers),
    length(Trace, QuestionsAsked),
    trace_path(Trace, QuestionPath),
    atom_string(Key, KeyText),
    scientific_name(Key, ScientificName),
    Dict = _{
        species_key: KeyText,
        scientific_name: ScientificName,
        final_status: Status,
        questions_asked: QuestionsAsked,
        target_rank: Rank,
        target_score: Score,
        matches: Matches,
        conflicts: Conflicts,
        known_answers: KnownAnswers,
        unknown_answers: UnknownAnswers,
        question_path: QuestionPath
    }.

simulate_species(Key, Observations, Trace, Status, FinalObservations, FinalTrace) :-
    reason_dict(Observations, Response),
    get_dict(status, Response, CurrentStatus),
    (
        CurrentStatus == continue
    ->
        length(Trace, Count),
        (
            safety_limit(Limit),
            Count >= Limit
        ->
            Status = max_question_limit,
            FinalObservations = Observations,
            FinalTrace = Trace
        ;
            get_dict(nextQuestion, Response, Question),
            get_dict(id, Question, QuestionText),
            atom_string(QuestionId, QuestionText),
            answer_for_species(Key, QuestionId, Value, Source),
            append(Observations, [QuestionId-Value], NextObservations),
            append(Trace, [step(QuestionId, Value, Source)], NextTrace),
            simulate_species(Key, NextObservations, NextTrace, Status, FinalObservations, FinalTrace)
        )
    ;
        Status = CurrentStatus,
        FinalObservations = Observations,
        FinalTrace = Trace
    ).

answer_for_species(Key, QuestionId, Value, known_trait) :-
    trait(Key, QuestionId, Value),
    !.
answer_for_species(_Key, _QuestionId, unknown, unknown).

target_details(Key, Ranked, Rank, Score, Matches, Conflicts) :-
    nth1(Rank, Ranked, row(Key, Score, Matches, Conflicts, _, _)),
    !.
target_details(_Key, _Ranked, '', '', '', '').

trace_counts(Trace, KnownAnswers, UnknownAnswers) :-
    findall(Source, member(step(_, _, Source), Trace), Sources),
    include(=(known_trait), Sources, Known),
    include(=(unknown), Sources, Unknown),
    length(Known, KnownAnswers),
    length(Unknown, UnknownAnswers).

trace_path([], '').
trace_path(Trace, Path) :-
    findall(Part, (
        member(step(QuestionId, Value, Source), Trace),
        format(string(Part), '~w=~w(~w)', [QuestionId, Value, Source])
    ), Parts),
    atomic_list_concat(Parts, '|', AtomPath),
    atom_string(AtomPath, Path).
