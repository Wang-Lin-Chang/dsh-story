// dsh-story/src/core/template.mjs —— 世界模板引擎：模板 JSON 编译成审计配置 + 校验声明
// 模板即状态机：换一个 JSON = 换一个世界的物理法则（境界链/货币/地图/unique 物品/节奏红线）
export const XIANXIA_TEMPLATE = {
  id: 'xianxia-v1',
  name: '仙侠·境界流',
  attributes: {
    realm: { type: 'ladder', levels: ['练气', '筑基', '金丹', '元婴', '化神', '渡劫', '大乘'], monotonic: true },
    wallet: { type: 'currency', unit: '灵石', min: 0 },
  },
  locations: ['壁垒', '青云宗', '枯林山', '灵界北域', '归墟海', '天象台', '旧都'],
  uniqueItems: ['壁垒钥匙', '天象仪', '飞升令'],
  relations: { types: ['师徒', '道侣', '仇敌', '同门'], range: [-100, 100] },
  emotions: { types: ['爱', '恨', '惧', '愧'], range: [-100, 100] },
  rhythm: { questMaxRun: 5, fireMaxGap: 10, constellationMaxGap: 15, volumeSize: 30 },
  foreshadow: { maxGap: 40 },
  invariants: [
    'ASSET_NON_NEGATIVE', 'REALM_MONOTONIC', 'DEAD_NO_EVENT', 'RANGE_CHECK',
    'FORESHADOW_OVERDUE', 'FORESHADOW_DUE', 'GHOST_PAYOFF', 'TIME_MONOTONIC',
    'AGE_FLOW', 'ITEM_UNIQUE', 'DEBT_BALANCE', 'NAME_UNIQUE', 'SECT_LOYALTY', 'PLACE_GHOST',
  ],
  seedPrompts: {
    opening: '开书三问：主角缺什么（匮乏）？世界欠他什么（仇/债）？第一场冲突在几章内爆发？',
    chapterHook: '每章末留钩：一个未答的问题 / 一个未到的危机 / 一个未亮的伏笔。',
  },
}

/** 编译模板 → 审计配置（规则引擎消费的纯参数） */
export function compileTemplate(tpl) {
  return {
    levels: tpl.attributes?.realm?.levels ?? [],
    locations: tpl.locations ?? [],
    uniqueItems: tpl.uniqueItems ?? [],
    volumeSize: tpl.rhythm?.volumeSize ?? 30,
    maxGap: tpl.foreshadow?.maxGap ?? 40,
    invariants: tpl.invariants ?? [],
    currency: tpl.attributes?.wallet?.unit ?? '两',
    realmMonotonic: tpl.attributes?.realm?.monotonic ?? true,
    rhythm: tpl.rhythm ?? {},
  }
}

/** 模板自检：结构完整性（缺失字段返回问题清单——模板作者的第一道校验） */
export function validateTemplate(tpl) {
  const problems = []
  if (typeof tpl.id !== 'string' || tpl.id.length === 0) problems.push('缺 id')
  if (typeof tpl.name !== 'string') problems.push('缺 name')
  if (tpl.attributes?.realm !== undefined && !Array.isArray(tpl.attributes.realm.levels)) problems.push('realm.levels 必须是数组')
  if (tpl.attributes?.wallet?.min !== undefined && typeof tpl.attributes.wallet.min !== 'number') problems.push('wallet.min 必须是数字')
  if (!Array.isArray(tpl.locations)) problems.push('locations 必须是数组')
  return problems
}
