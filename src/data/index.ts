import dailyJson from "../../data/daily.json"
import githubJson from "../../data/github.json"
import trendJson from "../../data/trend.json"
import tagsJson from "../../data/tags.json"
import sourcesJson from "../../data/sources.json"
import configJson from "../../data/config.json"
import type { ActiveCategory } from "~/atoms"

export interface TopEvent {
  title: string
  source?: string
  url?: string
}

export interface DailyData {
  date?: string
  title?: string
  summary?: string
  topEvents?: TopEvent[]
}

export interface GithubRepo {
  name: string
  description?: string
  stars?: number
  starsToday?: number
  language?: string
  url?: string
}

export interface GithubData {
  updatedAt?: string
  repos?: GithubRepo[]
}

export interface TrendItem {
  topic: string
  heat?: number
  source?: string
  url?: string
}

export interface TrendData {
  updatedAt?: string
  trends?: TrendItem[]
}

export interface TagCategory {
  id: string
  name: string
  keywords: string[]
}

export interface TagsData {
  categories?: TagCategory[]
}

export interface SourceMeta {
  id: string
  name: string
  enabled?: boolean
  group?: string
}

export interface SourcesData {
  version?: string
  note?: string
  sources?: SourceMeta[]
}

export interface DataModules {
  dailySummary?: boolean
  githubTrend?: boolean
  hotTrend?: boolean
}

export interface AppConfig {
  version?: string
  dataModules?: DataModules
  refreshIntervalMinutes?: number
}

/**
 * V0.3 数据读取层。
 * 当前从本地 /data/*.json 静态导入（构建时打包进 bundle），暂不连接外部 API。
 * 每个 loader 都对缺失/异常做兜底，失败时返回空数据，绝不影响原新闻功能。
 * 后续如需接入 API，只需把静态导入换成 fetch("/data/xxx.json") 即可。
 */

export function loadDaily(): DailyData {
  try {
    const d = dailyJson as DailyData
    return {
      date: d.date ?? "",
      title: d.title ?? "今日 AI 摘要",
      summary: d.summary ?? "",
      topEvents: Array.isArray(d.topEvents)
        ? d.topEvents.filter(e => e && e.title)
        : [],
    }
  }
  catch {
    return { title: "今日 AI 摘要", summary: "", topEvents: [] }
  }
}

export function loadGithub(): GithubData {
  try {
    const d = githubJson as GithubData
    return {
      updatedAt: d.updatedAt ?? "",
      repos: Array.isArray(d.repos)
        ? d.repos.filter(r => r && r.name)
        : [],
    }
  }
  catch {
    return { repos: [] }
  }
}

export function loadTrend(): TrendData {
  try {
    const d = trendJson as TrendData
    return {
      updatedAt: d.updatedAt ?? "",
      trends: Array.isArray(d.trends)
        ? d.trends.filter(t => t && t.topic)
        : [],
    }
  }
  catch {
    return { trends: [] }
  }
}

export function loadTags(): ActiveCategory[] {
  try {
    const d = tagsJson as TagsData
    const cats = Array.isArray(d.categories) ? d.categories : []
    return cats
      .filter(c => c && c.id && c.name)
      .map(c => ({
        id: String(c.id),
        name: String(c.name),
        keywords: Array.isArray(c.keywords) ? c.keywords.map(k => String(k)) : [],
      }))
  }
  catch {
    return []
  }
}

export function loadSources(): SourcesData {
  try {
    return sourcesJson as SourcesData
  }
  catch {
    return {}
  }
}

export function loadConfig(): AppConfig {
  try {
    return configJson as AppConfig
  }
  catch {
    return {}
  }
}
