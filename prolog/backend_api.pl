:- initialization(main, main).

:- use_module(library(http/json)).
:- use_module(rules/json_api).

main(_) :-
    read_string(user_input, _, Input),
    open_string(Input, Stream),
    json_read_dict(Stream, Dict),
    close(Stream),
    dict_observations(Dict, Observations),
    reason_json(Observations).

dict_observations(Dict, Observations) :-
    is_dict(Dict),
    get_dict(observations, Dict, Items),
    !,
    maplist(dict_observation, Items, Observations).
dict_observations(_Dict, []).

dict_observation(Dict, Trait-Value) :-
    atom_string(Trait, Dict.attribute),
    atom_string(Value, Dict.value).
