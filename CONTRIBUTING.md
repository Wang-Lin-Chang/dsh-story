# Contributing

Every capability claim carries an experiment number (see `EXPERIMENTS.md`). Contributions must follow the same rule.

## Rules

- **No claims without an experiment.** New invariant rules need an injection experiment (100% recall + zero mis-kills) before entering `src/core/invariant.mjs`.
- Rules are declarative data, not ad-hoc code.
- Tests must pass: `npm test`.

## Development

```sh
npm test                    # plugin integration test
node story-invariant-perf.mjs   # large-scale performance experiment
node real-book.mjs          # real-text workflow
```
