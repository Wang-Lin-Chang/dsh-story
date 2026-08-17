# dsh-story

> Long-form novel assistant for DeepSeek Harness: a **story ledger** (characters/assets/relations/emotions) with append-only event sourcing, chapter anchors with pre-commit/reconciliation, foreshadow debt audit, and **14 narrative invariants checked by hard rules — zero mis-kills**. AI reviews can miss; the ledger can't.
>
> 给 DeepSeek Harness 的长篇网文助手：**故事账本**（人物/资产/关系/情绪）+ append-only 事件溯源 + 章节锚点（预承诺/对账）+ 伏笔债务审计 + **14 类叙事不变量硬规则校验——零误杀**。AI 审查会漏，账本不会。

[![license](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)
[![ci](https://github.com/Wang-Lin-Chang/dsh-story/actions/workflows/ci.yml/badge.svg)](https://github.com/Wang-Lin-Chang/dsh-story/actions/workflows/ci.yml)

## 为什么存在 / Why this exists

1000 章 × 100 人物 × 10 属性 = 100 万状态项——人脑记不住，所以主角"前文有钱后文穷"、伏笔埋了忘收、死人复活。主流方案（LLM 审查）耗 token 且会漏。本插件把一致性下沉为**机器可校验的硬账**：

- 每一笔钱/情绪/关系/境界变动 = 一条 append-only 事件（章号+来源可溯源）
- 写前状态卡：动笔前自动拿到"此刻世界"（主角多少钱、什么境界、几个仇人、哪些伏笔该收了）
- 章节锚点：写前预承诺 → 写后结算 → OK 入账 / DIVERGED 当场拒入账
- 14 类叙事不变量审计：资产非负/境界单调/死者无新事/时间单调/幽灵地点/伏笔债务/神器唯一/债务余额/同名冲突/门派忠诚……**注入实验 100% 召回 + 零误杀**

## 实测数据 / Measured

| 实验 | 判决 |
|---|---|
| 伏笔债务审计（120 章 × 12 伏笔 × 债务注入）| 100% 召回零误报 · 0.10ms vs 人工通读 10 小时 |
| 8 类不变量（300 章 × 15 人物 × 注入）| 8/8 召回 · 零误杀 |
| 新 6 类规则（含合法叛门对照组）| 6/6 召回 · 零误杀 |
| 大规模性能（1000 章 × 100 人物 × 20 万事件）| 全库审计 p50 83.7ms · 3/3 召回 |
| 《飞升之后》真实文本（ch001/ch002 实战）| 全流程通 · 漂移注入当场枪毙 |

全部实验装置的判决记录在 `EXPERIMENTS.md`（数据可复核）。

## 工具 / Tools

| 工具 | 语义 |
|---|---|
| `story_new` | 开新书（世界模板：境界链/货币/地图/unique 物品/节奏红线）|
| `story_draft` | 写前状态卡（账本 → "此刻世界"快照 + 未收伏笔预警）|
| `story_settle` | 章节结算：字数窗（默认 2000-3000 可配）+ 锚点对账 + 即时守恒（口袋没这么多钱当场拒入账）|
| `story_audit` | 全书 14 类叙事不变量审计（全事件流回放，毫秒级）|
| `story_world` | 查世界：人物账 / 伏笔账 / 事件溯源 |

## 诚实边界 / Honest boundaries

- 硬规则只报**确定违反**（零误杀原则）；性格漂移/文风突变属软审层（LLM 判词留档），不在硬规则范围。
- 修正稿必须**重新锚定**（改主意 = 重新承诺）。
- 字数窗是规范提示不是枪毙（字数可补，账错了就是错了）。
- 本插件管"不崩"；"好看"（爽点/追读力）是模板节奏参数 + 软审层的活。

## 开发 / Development

```sh
npm test   # 插件集成验收（node --experimental-strip-types）
node real-book.mjs   # 真实文章实战（需《飞升之后》文本）
```

## License

Apache-2.0


