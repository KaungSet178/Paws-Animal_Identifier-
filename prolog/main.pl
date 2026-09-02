:- initialization(main, main).

:- use_module(library(http/json)).
:- use_module(rules/json_api).

main(Argv) :-
    parse_observations(Argv, Observations),
    reason_json(Observations).

parse_observations([], []).
parse_observations([Json|_], Observations) :-
    open_string(Json, Stream),
    json_read_dict(Stream, Dict),
    close(Stream),
    dict_observations(Dict, Observations).

dict_observations(Dict, Observations) :-
    is_dict(Dict),
    get_dict(observations, Dict, Items),
    !,
    maplist(dict_observation, Items, Observations).
dict_observations(Items, Observations) :-
    is_list(Items),
    maplist(dict_observation, Items, Observations).

dict_observation(Dict, Trait-Value) :-
    atom_string(Trait, Dict.trait),
    atom_string(Value, Dict.value).
