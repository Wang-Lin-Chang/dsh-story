# dsh-story

> Long-form novel assistant for DeepSeek Harness: a **story ledger** (characters/assets/relations/emotions) with append-only event sourcing, chapter anchors with pre-commit/reconciliation, foreshadow debt audit, and **14 narrative invariants checked by hard rules — zero mis-kills**. AI reviews can miss; the ledger can't.

中文版见 [README.zh-CN.md](./README.zh-CN.md)。

[![license](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)
[![ci](https://github.com/Wang-Lin-Chang/dsh-story/actions/workflows/ci.yml/badge.svg)](https://github.com/Wang-Lin-Chang/dsh-story/actions/workflows/ci.yml)

## Why this exists

1000 chapters × 100 characters × 10 attributes = 1 million state items — beyond human memory, so protagonists "had money earlier, broke later", foreshadowing gets planted and never paid off, dead characters come back to life. The mainstream answer (LLM review) costs tokens and still misses. This plugin pushes consistency down into a **machine-checkable hard ledger**:

- Every change of money/emotion/relation/realm = one append-only event (chapter number + traceable source)
- Pre-writing state card: before drafting you automatically get the "current setting" (how much money the protagonist has, what realm, which enemies, which foreshadowing is due)
- Chapter anchors: pre-commit before writing → settle after writing → OK is recorded / DIVERGED is rejected on the spot
- 14 narrative invariants audit: asset non-negative / realm monotonic / dead characters get no new events / time monotonic / ghost locations / foreshadow debt / unique items / debt balance / name collisions / sect loyalty… **injection experiments 100% recall + zero mis-kills**

## Measured

| Experiment | Verdict |
|---|---|
| Foreshadow debt audit (120 chapters × 12 foreshadows × debt injection) | 100% recall, zero false reports · 0.10ms vs 10 hours of human reading |
| 8 invariant classes (300 chapters × 15 characters × injection) | 8/8 recall · zero mis-kills |
| New 6 rule classes (including legal defection control group) | 6/6 recall · zero mis-kills |
| Large-scale performance (1000 chapters × 100 characters × 200k events) | Full-ledger audit p50 83.7ms · 3/3 recall |
| Real text of 《飞升之后》 (ch001/ch002 live run) | Full pipeline passes · drift injection rejected on the spot |

All experiment verdicts are recorded in `EXPERIMENTS.md` (numbers reproducible).

## Tools

| Tool | Semantics |
|---|---|
| `story_new` | Start a book (setting template: realm ladder/currency/map/unique items/rhythm red lines) |
| `story_draft` | Pre-writing state card (ledger → "current setting" snapshot + due-foreshadow warnings) |
| `story_settle` | Chapter settlement: word-count window (default 2000-3000, configurable) + anchor reconciliation + immediate conservation (no money, no entry) |
| `story_audit` | Full-book 14-class narrative invariant audit (full event-stream replay, millisecond level) |
| `story_world` | Query the setting: character ledger / foreshadow ledger / event provenance |

## Honest boundaries

- Hard rules only report **certain violations** (zero-mis-kill principle); personality drift/style shifts belong to the soft review layer (LLM verdicts archived), outside the hard-rule scope.
- Revised drafts must be **re-anchored** (changing your mind = re-committing).
- The word-count window is a specification hint, not a kill: word counts can be fixed later; a wrong ledger entry is just wrong.
- This plugin keeps the story "from breaking"; whether it "reads well" (pacing, payoff) is the template's rhythm parameters plus the soft review layer.

## Development

```sh
npm test   # plugin integration acceptance (node --experimental-strip-types)
node real-book.mjs   # real-book live run (needs the 《飞升之后》 text)
```

## License

Apache-2.0
