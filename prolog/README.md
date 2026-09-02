# Phase 4 Prolog Reasoning Engine

This directory contains the Prolog-only adaptive reasoning layer for the verified Myanmar mammal trait subset.

Generate knowledge facts:

```sh
npm run generate:prolog
```

Run the JSON API from the command line:

```sh
swipl -q -s prolog/main.pl -- "{\"observations\":[{\"trait\":\"body_form\",\"value\":\"elephant_like\"}]}"
```

Unknown answers use `unknown` and are neutral evidence. Missing dataset traits are also neutral: they do not add score and do not create conflicts.
