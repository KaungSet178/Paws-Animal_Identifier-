:- module(evidence, [
    observation_trait/2,
    observation_value/3,
    answered_trait/2,
    uncertainty_answer/1,
    evidence_for/7,
    candidate_totals/6,
    compatible_candidate/2
]).

:- use_module('../generated/mammal_traits').

observation_trait(Trait-_, Trait).
observation_value(Observations, Trait, Value) :- member(Trait-Value, Observations).
answered_trait(Observations, Trait) :- observation_value(Observations, Trait, _).

uncertainty_answer(unknown).
uncertainty_answer(not_clear).
uncertainty_answer(not_sure).
uncertainty_answer(tail_not_clear).

evidence_for(_Animal, _Trait-Answer, 0, 0, 0, 0, unknown) :-
    uncertainty_answer(Answer),
    !.
evidence_for(Animal, Trait-Answer, Weight, 1, 0, 1, match) :-
    trait_weight(Trait, Weight),
    trait(Animal, Trait, Answer),
    !.
evidence_for(Animal, Trait-Answer, NegWeight, 0, 1, 1, conflict) :-
    trait_weight(Trait, Weight),
    trait(Animal, Trait, Known),
    Known \= Answer,
    !,
    Penalty is (Weight + 1) // 2,
    NegWeight is -Penalty.
evidence_for(_Animal, Trait-_, 0, 0, 0, 0, missing) :-
    trait_weight(Trait, _),
    !.

candidate_totals(Animal, Observations, Score, Matches, Conflicts, KnownEvidenceCount) :-
    findall(S-M-C-K, (
        member(Obs, Observations),
        evidence_for(Animal, Obs, S, M, C, K, _)
    ), Evidence),
    sum_score(Evidence, Score),
    sum_matches(Evidence, Matches),
    sum_conflicts(Evidence, Conflicts),
    sum_known(Evidence, KnownEvidenceCount).

sum_score([], 0).
sum_score([S-_-_-_|Rest], Total) :- sum_score(Rest, Tail), Total is S + Tail.

sum_matches([], 0).
sum_matches([_-M-_-_|Rest], Total) :- sum_matches(Rest, Tail), Total is M + Tail.

sum_conflicts([], 0).
sum_conflicts([_-_-C-_|Rest], Total) :- sum_conflicts(Rest, Tail), Total is C + Tail.

sum_known([], 0).
sum_known([_-_-_-K|Rest], Total) :- sum_known(Rest, Tail), Total is K + Tail.

compatible_candidate(Animal, Observations) :-
    animal(Animal),
    candidate_totals(Animal, Observations, _Score, _Matches, 0, _Known).
