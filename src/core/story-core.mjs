// dsh-story/src/core/story-core.mjs —— 统一故事核心：书生命周期（init/character/chapter/draft/settle/audit/statecard）
// 整合：四本账 + 章节锚点 + 字数窗 + 伏笔 + 14 类叙事不变量（规则引擎见 invariant.mjs）
// 真理模型（story-spec 草案第 1 节）：一切皆事件流——初始快照事件化（chapter=0 种子事件），表为投影
import { DatabaseSync } from 'node:sqlite'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { compileTemplate, validateTemplate } from './template.mjs'
import { audit } from './invariant.mjs'

export function countWords(text) {
  const cjk = (text.match(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/g) ?? []).length
  const latin = (text.replace(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/g, ' ').match(/[A-Za-z0-9]+/g) ?? []).length
  return cjk + latin
}

export class StoryBook {
  constructor(root, template) {
    this.root = root
    const tp = validateTemplate(template)
    if (tp.length > 0) throw new Error(`template invalid: ${tp.join('; ')}`)
    this.template = template
    this.cfg = compileTemplate(template)
    fs.mkdirSync(path.join(root, 'chapters'), { recursive: true })
    fs.writeFileSync(path.join(root, 'template.json'), JSON.stringify(template, null, 2))
    this.db = new DatabaseSync(path.join(root, 'ledger.db'))
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;')
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS characters(id TEXT PRIMARY KEY, name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'alive', realm TEXT, wallet REAL NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS events(seq INTEGER PRIMARY KEY AUTOINCREMENT, chapter INTEGER NOT NULL, field TEXT NOT NULL, target TEXT NOT NULL, delta REAL, note TEXT, ghost INTEGER DEFAULT 0, at INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS idx_events_field ON events(field);
      CREATE INDEX IF NOT EXISTS idx_events_chapter ON events(chapter);
      CREATE TABLE IF NOT EXISTS foreshadows(id TEXT PRIMARY KEY, type TEXT, planted_at INTEGER, last_touched_at INTEGER, paid_off_at INTEGER, note TEXT);
    `)
    this.ins = this.db.prepare('INSERT INTO events(chapter, field, target, delta, note, ghost, at) VALUES (?,?,?,?,?,?,?)')
  }

  // ---------- 人物 ----------
  character(id, name, { realm, wallet = 0 } = {}) {
    this.db.prepare('INSERT OR REPLACE INTO characters(id, name, realm, wallet) VALUES (?,?,?,?)').run(id, name, realm ?? null, wallet)
    if (wallet) this.ins.run(0, 'wallet', id, wallet, '建档', 0, Date.now())
    if (realm) this.ins.run(0, 'realm', id, null, realm, 0, Date.now())
    return this
  }
  event(chapter, field, target, delta, note, ghost = 0) {
    this.ins.run(chapter, field, target, delta, note, ghost, Date.now())
    return this
  }

  // ---------- 伏笔 ----------
  foreshadow(id, type, chapter, note) {
    this.db.prepare('INSERT OR REPLACE INTO foreshadows(id, type, planted_at, last_touched_at, note) VALUES (?,?,?,?,?)').run(id, type, chapter, chapter, note)
    return this
  }
  touchForeshadow(id, chapter) { this.db.prepare('UPDATE foreshadows SET last_touched_at=? WHERE id=?').run(chapter, id); return this }
  payoffForeshadow(id, chapter, note = '') {
    const f = this.db.prepare('SELECT * FROM foreshadows WHERE id=?').get(id)
    if (f === undefined) { this.ins.run(chapter, 'payoff', id, null, note, 1, Date.now()); return this }
    this.db.prepare('UPDATE foreshadows SET paid_off_at=? WHERE id=?').run(chapter, id)
    return this
  }

  // ---------- 章节 ----------
  chapter(slug, title, intentMoves = []) {
    const dir = path.join(this.root, 'chapters', slug)
    fs.mkdirSync(path.join(dir, 'events'), { recursive: true })
    fs.writeFileSync(path.join(dir, 'draft.md'), '')
    fs.writeFileSync(path.join(dir, 'intent.json'), JSON.stringify({ slug, title, at: Date.now(), moves: intentMoves }, null, 2))
    return dir
  }
  writeDraft(slug, text) {
    fs.writeFileSync(path.join(this.root, 'chapters', slug, 'draft.md'), text)
    return this
  }
  reAnchor(slug, title, intentMoves) {
    const dir = path.join(this.root, 'chapters', slug)
    fs.writeFileSync(path.join(dir, 'intent.json'), JSON.stringify({ slug, title, at: Date.now(), reanchored: true, moves: intentMoves }, null, 2))
    return this
  }

  // ---------- 结算（锚点对账 + 字数窗 + 入账） ----------
  settle(slug, actualMoves, { minWords = 2000, maxWords = 3000 } = {}) {
    const dir = path.join(this.root, 'chapters', slug)
    const problems = []
    const warnings = []
    const draft = fs.readFileSync(path.join(dir, 'draft.md'), 'utf-8')
    const words = countWords(draft)
    if (words < minWords) warnings.push({ code: 'WORD_SHORT', detail: `字数 ${words} < 下限 ${minWords}（差 ${minWords - words}）` })
    if (words > maxWords) warnings.push({ code: 'WORD_OVER', detail: `字数 ${words} > 上限 ${maxWords}（超 ${words - maxWords}）` })
    const intent = JSON.parse(fs.readFileSync(path.join(dir, 'intent.json'), 'utf-8'))
    const exp = new Map((intent.moves ?? []).map(m => [`${m.field}:${m.target}`, m]))
    for (const m of actualMoves) {
      const e = exp.get(`${m.field}:${m.target}`)
      if (e === undefined) problems.push({ code: 'UNANNOUNCED_MOVE', detail: `结算出现未预告变动 ${m.field}:${m.target} ${m.delta >= 0 ? '+' : ''}${m.delta}` })
      else if (e.delta !== m.delta) problems.push({ code: 'MOVE_MISMATCH', detail: `${m.field}:${m.target} 预期 ${e.delta >= 0 ? '+' : ''}${e.delta} 实结 ${m.delta >= 0 ? '+' : ''}${m.delta}` })
    }
    for (const [k, e] of exp) if (!actualMoves.some(m => `${m.field}:${m.target}` === k)) problems.push({ code: 'MISSING_MOVE', detail: `预告了 ${k}（${e.delta >= 0 ? '+' : ''}${e.delta}）但未结算` })
    // ---- 即时守恒硬校验（settle 当场拒入账——原型卖点，打磨不可退化）----
    for (const m of actualMoves) {
      if (m.field === 'wallet') {
        const bal = new Map()
        for (const ev of this.db.prepare("SELECT target, delta FROM events WHERE field='wallet'").all()) bal.set(ev.target, (bal.get(ev.target) ?? 0) + (ev.delta ?? 0))
        const cur = bal.get(m.target) ?? 0
        if (cur + (m.delta ?? 0) < 0) problems.push({ code: 'NEGATIVE_ASSET', detail: `${m.target} 资产 ${cur} + ${m.delta} < 0 —— 口袋没这么多钱` })
        const ch = this.db.prepare('SELECT status FROM characters WHERE id=?').get(m.target)
        if (ch !== undefined && ch.status !== 'alive') problems.push({ code: 'DEAD_CHAR_ACTIVE', detail: `已故角色 ${m.target} 在本章有资产变动` })
      }
      if (m.field === 'emotion' || m.field === 'relation') {
        if (Math.abs(Number(m.delta ?? 0)) > 100) problems.push({ code: 'RANGE_CHECK', detail: `${m.field} 变动 ${m.delta} 超出 [-100,100]` })
      }
    }
    const verdict = problems.length === 0 ? 'OK' : 'DIVERGED'
    fs.writeFileSync(path.join(dir, 'post.json'), JSON.stringify({ at: Date.now(), moves: actualMoves, verdict, problems, warnings }, null, 2))
    fs.writeFileSync(path.join(dir, 'verdict'), verdict)
    if (verdict === 'OK') {
      for (const m of actualMoves) {
        this.ins.run(Number(slug.match(/\d+/)?.[0] ?? 0), m.field, m.target, m.delta, m.note, 0, Date.now())
        if (m.field === 'wallet') this.db.prepare('UPDATE characters SET wallet = wallet + ? WHERE id=?').run(m.delta, m.target)
      }
    }
    return { verdict, words, problems, warnings }
  }

  // ---------- 写前状态卡（草稿前喂给作者/AI 的"此刻世界快照"） ----------
  stateCard(slug = null, focusIds = null) {
    const chs = this.db.prepare('SELECT * FROM characters').all()
    const card = { chapter: slug, characters: [], openForeshadows: [], debts: [] }
    const bal = new Map()
    for (const e of this.db.prepare("SELECT target, delta FROM events WHERE field='wallet'").all()) bal.set(e.target, (bal.get(e.target) ?? 0) + (e.delta ?? 0))
    for (const ch of chs) {
      const wallet = bal.get(ch.id) ?? 0
      if (focusIds !== null && !focusIds.includes(ch.id) && wallet <= 0 && ch.status === 'alive') continue   // 只列焦点角色或"有资产/状态"的角色
      if (focusIds !== null && !focusIds.includes(ch.id)) continue
      card.characters.push({ id: ch.id, name: ch.name, status: ch.status, realm: ch.realm, wallet })
    }
    const nowCh = slug !== null ? Number(slug.match(/\d+/)?.[0] ?? 0) : 999999
    for (const f of this.db.prepare('SELECT * FROM foreshadows WHERE paid_off_at IS NULL').all()) {
      if (nowCh - f.last_touched_at > this.cfg.maxGap) card.openForeshadows.push({ id: f.id, note: f.note, gap: nowCh - f.last_touched_at, danger: true })
      else card.openForeshadows.push({ id: f.id, note: f.note, gap: nowCh - f.last_touched_at, danger: false })
    }
    return card
  }

  // ---------- 全量审计 ----------
  audit() {
    return audit(this.db, { ...this.cfg, nowChapter: Number(String(this.db.prepare('SELECT MAX(chapter) m FROM events').get().m ?? 0)) })
  }
}
