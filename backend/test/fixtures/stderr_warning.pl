:- initialization(main, main).

main(_) :-
    format(user_error, 'warning: fixture stderr~n', []),
    write('{"status":"continue","candidates":[],"nextQuestion":null}'),
    nl.
