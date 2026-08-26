# Changelog

## [0.1.2] - 2026-08-26

### Changed

- 语言合规清扫：工具描述、状态卡提示语与判词措辞；README 双语分文件（README.md 英文 + README.zh-CN.md 中文）。工具名与账本语义不变。

## [0.1.0] - 2026-08-17

### Added

- Story ledger: characters/assets/relations/emotions with append-only event sourcing (seed-event truth model).
- Chapter anchors: pre-commit intent → post settlement → OK/DIVERGED with in-settle conservation checks.
- Word-count window (default 2000-3000, configurable).
- Foreshadow ledger + debt audit (overdue / due / ghost payoff).
- 14 narrative invariants as declarative hard rules (injection-tested: 100% recall, zero mis-kills).
- World template engine (realm ladder / currency / map / unique items / rhythm).
- State card generation (pre-draft world snapshot).
- Five tools: story_new / story_draft / story_settle / story_audit / story_world.
- Real-text run: 飞升之后 ch001/ch002 full workflow.

### Fixed

- Settle conservation checks restored after module merge (in-settle NEGATIVE_ASSET regression caught by integration test).
