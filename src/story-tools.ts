// dsh-story/src/story-tools.ts —— 写作五工具（作者视角：开书/状态卡/结算/审计/查世界）
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { Context } from '@deepseek-ai/cordis'
import type { StoryManager } from './plugin.ts'
import type { StoryBook } from './core/story-core.mjs'

export const name = 'dsh-story-tools'
export const inject = ['tools', 'story'] as const

export function apply(ctx: Context) {
  const mgr = ctx.get('story') as unknown as StoryManager
  const tools = ctx.get('tools') as unknown as { register: (tool: unknown) => void }
  const book = (name: string): StoryBook => {
    const b = mgr.get(name) ?? mgr.open(name)
    return b
  }

  tools.register(defineTool({
    name: 'story_new',
    description: '开一本新书：世界模板（默认仙侠·境界流）+ 人物建档。世界状态存账本，跨会话跨重启有效。',
    parameters: {
      name: { type: 'string', required: true, description: '书名（目录名，如 feisheng）' },
      characters: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { id: { type: 'string' }, name: { type: 'string' }, realm: { type: 'string' }, wallet: { type: 'number' } } }, description: '初始人物（含境界/初始资产）' },
    },
    output: { schema: { type: 'object', additionalProperties: false, properties: { name: { type: 'string' }, template: { type: 'string' }, characters: { type: 'number' } } }, render: (_a: unknown, v: any) => [{ type: 'text', text: `开书成功：${v.name}（模板 ${v.template}）· ${v.characters} 人建档` }] },
    async execute(args) {
      const a = args as any
      const b = book(String(a.name))
      let n = 0
      for (const ch of (a.characters ?? []) as any[]) {
        b.character(String(ch.id), String(ch.name), { realm: ch.realm, wallet: Number(ch.wallet ?? 0) })
        n++
      }
      return { name: a.name, template: b.template.name, characters: n }
    },
  }))

  tools.register(defineTool({
    name: 'story_draft',
    description: '写前状态卡：从账本生成"此刻世界"快照（人物状态/资产/未收伏笔），动笔前喂给作者或 AI。',
    parameters: {
      name: { type: 'string', required: true, description: '书名' },
      chapter: { type: 'string', required: true, description: '章节 slug（如 0003-归墟海）' },
      focus: { type: 'array', items: { type: 'string' }, description: '焦点人物 id（可选，默认全部）' },
    },
    output: { schema: { type: 'object', additionalProperties: false, properties: { card: { type: 'string' } } }, render: (_a: unknown, v: any) => [{ type: 'text', text: v.card }] },
    async execute(args) {
      const a = args as any
      const b = book(String(a.name))
      const card = b.stateCard(String(a.chapter), a.focus ?? null)
      const lines: string[] = [`【写前状态卡】第 ${a.chapter} 章`]
      for (const ch of card.characters) lines.push(`  ${ch.name}（${ch.realm ?? '未知境界'}）· ${ch.wallet} ${b.cfg.currency} · ${ch.status}`)
      if (card.openForeshadows.length > 0) {
        lines.push('  未收伏笔：')
        for (const f of card.openForeshadows) lines.push(`    「${f.note}」距今 ${f.gap} 章${f.danger ? '（超期警告！该收了）' : ''}`)
      } else lines.push('  未收伏笔：无')
      return { card: lines.join('\n') }
    },
  }))

  tools.register(defineTool({
    name: 'story_settle',
    description: '章节结算：字数窗校验 + 锚点对账（预期变动 vs 实际结算）→ OK 入账 / DIVERGED 拒入账并给问题清单。',
    parameters: {
      name: { type: 'string', required: true, description: '书名' },
      chapter: { type: 'string', required: true, description: '章节 slug' },
      moves: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { field: { type: 'string' }, target: { type: 'string' }, delta: { type: 'number' }, note: { type: 'string' } } }, description: '实际结算变动（资产/情绪/关系等）' },
      min_words: { type: 'number', description: '字数下限（默认 2000）' },
      max_words: { type: 'number', description: '字数上限（默认 3000）' },
    },
    output: { schema: { type: 'object', additionalProperties: false, properties: { verdict: { type: 'string' }, words: { type: 'number' }, problems: { type: 'array' }, warnings: { type: 'array' } } }, render: (_a: unknown, v: any) => [{ type: 'text', text: `VERDICT: ${v.verdict} · 字数 ${v.words}${(v.problems ?? []).length > 0 ? '\n问题: ' + v.problems.map((p: any) => p.detail).join('; ') : ''}${(v.warnings ?? []).length > 0 ? '\n提示: ' + v.warnings.map((w: any) => w.detail).join('; ') : ''}` }] },
    async execute(args) {
      const a = args as any
      const b = book(String(a.name))
      const r = b.settle(String(a.chapter), (a.moves ?? []).map((m: any) => ({ field: String(m.field), target: String(m.target), delta: Number(m.delta), note: m.note ?? '' })), { minWords: Number(a.min_words ?? 2000), maxWords: Number(a.max_words ?? 3000) })
      return r
    },
  }))

  tools.register(defineTool({
    name: 'story_audit',
    description: '全书叙事不变量审计：14 类硬规则（资产非负/境界单调/死者无新事/时间单调/伏笔债务等）全事件流回放，零误杀。',
    parameters: { name: { type: 'string', required: true, description: '书名' } },
    output: { schema: { type: 'object', additionalProperties: false, properties: { violations: { type: 'number' }, issues: { type: 'array' }, engine_ms: { type: 'number' } } }, render: (_a: unknown, v: any) => [{ type: 'text', text: v.violations === 0 ? `审计通过：${v.engine_ms}ms，14 类规则零违规` : `审计发现 ${v.violations} 项违规（${v.engine_ms}ms）：\n` + (v.issues ?? []).map((i: any) => `  ✗ ${i.code}: ${i.detail}`).join('\n') }] },
    async execute(args) {
      const a = args as any
      const b = book(String(a.name))
      const rep = b.audit()
      const issues = rep.issues.filter((i: any) => i.code !== 'DEBT_OPEN')
      return { violations: issues.length, issues, engine_ms: Number(rep.engineMs.toFixed(2)) }
    },
  }))

  tools.register(defineTool({
    name: 'story_world',
    description: '查世界：人物/伏笔/事件溯源查询（谁活着/欠谁多少/哪章发生了什么）。',
    parameters: {
      name: { type: 'string', required: true, description: '书名' },
      query: { type: 'string', description: '查询：characters（人物账）/ foreshadows（伏笔账）/ events:<target>（某角色事件溯源）' },
    },
    output: { schema: { type: 'object', additionalProperties: false, properties: { text: { type: 'string' } } }, render: (_a: unknown, v: any) => [{ type: 'text', text: v.text }] },
    async execute(args) {
      const a = args as any
      const b = book(String(a.name))
      const q = String(a.query ?? 'characters')
      let text = ''
      if (q === 'characters') {
        const chs = b.db.prepare('SELECT * FROM characters').all()
        text = chs.map((c: any) => `${c.name}（${c.id}）· ${c.realm ?? '未知境界'} · ${c.wallet} ${b.cfg.currency} · ${c.status}`).join('\n')
      } else if (q === 'foreshadows') {
        const fs = b.db.prepare('SELECT * FROM foreshadows ORDER BY planted_at').all()
        text = fs.length === 0 ? '无伏笔' : fs.map((f: any) => `「${f.note}」埋于第 ${f.planted_at} 章 ${f.paid_off_at !== null ? `· 已收于第 ${f.paid_off_at} 章` : '· 未收'}`).join('\n')
      } else if (q.startsWith('events:')) {
        const t = q.slice(7)
        const evs = b.db.prepare('SELECT * FROM events WHERE target=? ORDER BY seq').all(t)
        text = evs.map((e: any) => `[${e.chapter}] ${e.field} ${e.delta ?? ''} —— ${e.note}`).join('\n')
      } else text = '未知查询：characters / foreshadows / events:<角色id>'
      return { text }
    },
  }))
}
