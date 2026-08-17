// dsh-story/src/plugin.ts —— dsh-story 插件壳：cordis 桥 + 多书管理器
import type { Context } from '@deepseek-ai/cordis'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { StoryBook } from './core/story-core.mjs'
import { XIANXIA_TEMPLATE } from './core/template.mjs'

export interface StoryPluginConfig {
  booksRoot?: string
}

export class StoryManager {
  booksRoot: string
  books = new Map<string, StoryBook>()
  constructor(booksRoot: string) {
    this.booksRoot = booksRoot
    fs.mkdirSync(booksRoot, { recursive: true })
  }
  open(name: string, template = XIANXIA_TEMPLATE): StoryBook {
    if (this.books.has(name)) return this.books.get(name)!
    const root = path.join(this.booksRoot, name)
    const book = new StoryBook(root, template)
    this.books.set(name, book)
    return book
  }
  get(name: string): StoryBook | undefined { return this.books.get(name) }
}

export function apply(ctx: Context, config: StoryPluginConfig = {}) {
  const mgr = new StoryManager(config.booksRoot ?? './data/story-books')
  ctx.provide('story', mgr)
  ctx.effect(() => () => { for (const b of mgr.books.values()) { try { b.db.close() } catch {} } }, 'dsh-story')
  return mgr
}
