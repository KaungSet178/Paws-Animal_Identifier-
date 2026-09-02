:- initialization(main, main).

main(_) :-
    sleep(5),
    write('{"status":"continue","candidates":[],"nextQuestion":null}'),
    nl.
