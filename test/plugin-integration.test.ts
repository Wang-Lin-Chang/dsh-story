// dsh-story/test/plugin-integration.test.ts —— 插件集成验收：五工具全链路（开书→状态卡→结算→审计→查世界）
import { Context } from '@deepseek-ai/cordis'
import { apply } from '../src/plugin.ts'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'

let passed = 0, failed = 0
const check = (name: string, cond: boolean, detail = '') => {
  if (cond) passed++
  else { failed++; console.log(`  ❌ ${name} ${detail}`) }
}
const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'story-plugin-'))

{
  const ctx = new Context()
  const registered: string[] = []
  ctx.provide('tools', { register: (t: any) => { registered.push(t.name) } })
  await ctx.plugin(apply as never, { booksRoot: path.join(ROOT, 'books') })
  const { apply: toolsApply } = await import('../src/story-tools.ts')
  await ctx.plugin(toolsApply as never)
  check('五工具注册', ['story_new', 'story_draft', 'story_settle', 'story_audit', 'story_world'].every(n => registered.includes(n)), registered.join(','))

  const mgr = ctx.story as any
  // story_new
  const b = mgr.open('feisheng')
  b.character('chu-yuan', '楚渊', { realm: '大乘', wallet: 120000 })
  b.character('su-yunqi', '苏云栖', { realm: '练气', wallet: 50 })
  check('开书建档', mgr.get('feisheng') !== undefined)

  // story_draft：状态卡
  const card = b.stateCard('0003', null)
  check('状态卡含人物', card.characters.some((c: any) => c.name === '楚渊') && card.characters.some((c: any) => c.name === '苏云栖'), card.characters.map((c: any) => c.name).join(','))
  b.foreshadow('star', 'main', 1, '星的颜色')
  const card2 = b.stateCard('0045', null)
  check('状态卡含超期伏笔', card2.openForeshadows.some((f: any) => f.danger === true), JSON.stringify(card2.openForeshadows))

  // story_settle：对账 + 字数窗
  b.chapter('0001-外面', '外面', [{ field: 'emotion', target: 'su-yunqi', delta: 10, kind: 'fear', note: '真相震撼' }])
  b.writeDraft('0001-外面', '壁垒前，楚渊说出了真相。'.repeat(100))   // ~1300 字
  const r = b.settle('0001-外面', [{ field: 'emotion', target: 'su-yunqi', delta: 10, kind: 'fear', note: '真相震撼' }], { minWords: 2000, maxWords: 3000 })
  check('结算 OK + 字数提示', r.verdict === 'OK' && r.warnings.some((w: any) => w.code === 'WORD_SHORT'), JSON.stringify({ v: r.verdict, w: r.warnings.map((w: any) => w.code) }))

  // 漂移：DIVERGED 拒入账
  b.chapter('0002-漂移', '漂移', [{ field: 'wallet', target: 'chu-yuan', delta: -500000, note: '重启阵法' }])
  b.writeDraft('0002-漂移', '楚渊掏出五十万灵石。'.repeat(200))
  const r2 = b.settle('0002-漂移', [{ field: 'wallet', target: 'chu-yuan', delta: -500000, note: '重启阵法' }], { minWords: 2000, maxWords: 3000 })
  const rep = b.audit()
  check('漂移拒入账（DIVERGED 前资产非负仍成立）', rep.issues.filter((i: any) => i.code === 'ASSET_NON_NEGATIVE').length === 0, JSON.stringify(rep.issues.map((i: any) => i.code)))
  check('漂移章 verdict DIVERGED 无问题（未入账）', r2.verdict === 'OK' ? false : true, String(r2.verdict))

  // story_audit + story_world
  const rep2 = b.audit()
  check('审计引擎跑通', typeof rep2.engineMs === 'number' && rep2.engineMs > 0)
  const chs = b.db.prepare('SELECT * FROM characters').all()
  check('世界查询：人物账', chs.length >= 2)
  b.db.close()
}

console.log('='.repeat(66))
console.log(`  dsh-story 插件集成验收: ${passed} 通过 / ${failed} 失败`)
console.log('='.repeat(66))
process.exit(failed > 0 ? 1 : 0)
