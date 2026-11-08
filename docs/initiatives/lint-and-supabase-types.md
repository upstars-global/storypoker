# Lint strictness and Supabase types

1. Status: Planned
2. Priority: P2
3. Initiated: 2026-06-24 (audit)
4. Last reviewed: 2026-07-17

## Why

Lint passes with ~461 warnings, so new warnings get lost in the noise. Supabase
queries are typed as `any` instead of using generated types.

## Expected outcome

Lint works as a gate, and table types come from the database schema.

## Scope

1. Introduce `--max-warnings 0` gradually, by rule category.
2. Connect generated Supabase types in place of `any`.

## Completion criteria

1. `npm run lint` fails on new warnings.
2. Store methods use types generated from the schema.

## Next step

Count warnings by rule and resolve the most common one.
