import type { ActiveCategory } from "~/atoms"

export interface TopEvent {
  title: string
  source?: string
  url?: string
  published?: string
  category?: string
  impact?: number
  personal_score?: number
  why_watch?: string
}

export interface DailyData {
  date?: string
  title?: string
  summary?: string
  topEvents?: TopEvent[]
}

export interface GithubRepo {
  name: string
  repo?: string
  url?: string
  stars?: number
  stars_today?: number
  language?: string
  category?: string
  description?: string
  personal_score?: number
  why_watch?: string
  recommended_action?: string
}

export interface GithubData {
  date?: string
  source?: string
  projects?: GithubRepo[]
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
 * V0.3.1 数据读取层（运行时加载）。
 * 由 V0.3 的静态 import 改为运行时 fetch('/data/*.json')，
 * 修改 JSON 无需重新构建即可生效。
 *
 * 设计原则：
 * - 所有 loader 均为异步，失败时返回 null 或空结构，绝不影响原新闻功能。
 * - fetch 使用 cache:'no-cache'，保证每次打开页面拿到最新 JSON。
 * - 服务端渲染（SSR）不执行 useEffect，因此 fetch 仅在浏览器侧发生，无 SSR 取数问题。
 */

const BASE = "/data"

async function fetchJson<T>(file: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}/${file}`, { cache: "no-cache" })
    if (!res.ok) return null
    return (await res.json()) as T
  }
  catch {
    return null
  }
}

export async function loadDaily(): Promise<DailyData> {
  const d = await fetchJson<DailyData>("daily.json")
  if (!d) return { title: "今日 AI 摘要", summary: "", topEvents: [] }
  return {
    date: d.date ?? "",
    title: d.title ?? "今日 AI 摘要",
    summary: d.summary ?? "",
    topEvents: Array.isArray(d.topEvents)
      ? d.topEvents
        .filter(e => e && e.title)
        .map((e) => ({
          title: e.title,
          source: e.source ?? "",
          url: e.url ?? "",
          published: e.published ?? "",
          category: e.category ?? "",
          impact: e.impact ?? 0,
          personal_score: e.personal_score ?? 0,
          why_watch: e.why_watch ?? "",
        }))
      : [],
  }
}

export async function loadGithub(): Promise<GithubData> {
  const d = await fetchJson<GithubData>("github.json")
  if (!d) return { projects: [] }
  // 新 schema: projects[]；兼容旧 schema: repos[]/starsToday
  let projects: GithubRepo[] = []
  if (Array.isArray(d.projects)) {
    projects = d.projects
      .filter(p => p && p.name)
      .map((p) => ({
        name: p.name,
        repo: p.repo ?? p.name,
        url: p.url ?? (p.repo ? `https://github.com/${p.repo}` : "#"),
        stars: p.stars ?? 0,
        stars_today: p.stars_today ?? 0,
        language: p.language ?? "",
        category: p.category ?? "",
        description: p.description ?? "",
        personal_score: p.personal_score ?? 0,
        why_watch: p.why_watch ?? "",
        recommended_action: p.recommended_action ?? "",
      }))
  }
  else if (Array.isArray((d as any).repos)) {
    projects = (d as any).repos
      .filter((r: any) => r && r.name)
      .map((r: any) => ({
        name: r.name,
        repo: r.name,
        url: r.url ?? "#",
        stars: r.stars ?? 0,
        stars_today: r.starsToday ?? 0,
        language: r.language ?? "",
        category: "",
        description: r.description ?? "",
        personal_score: 0,
        why_watch: "",
        recommended_action: "",
      }))
  }
  return { date: d.date ?? "", source: d.source ?? "", projects }
}

export async function loadTrend(): Promise<TrendData> {
  const d = await fetchJson<TrendData>("trend.json")
  if (!d) return { trends: [] }
  return {
    updatedAt: d.updatedAt ?? "",
    trends: Array.isArray(d.trends)
      ? d.trends.filter(t => t && t.topic)
      : [],
  }
}

export async function loadTags(): Promise<ActiveCategory[]> {
  const d = await fetchJson<TagsData>("tags.json")
  if (!d || !Array.isArray(d.categories)) return []
  return d.categories
    .filter(c => c && c.id && c.name)
    .map(c => ({
      id: String(c.id),
      name: String(c.name),
      keywords: Array.isArray(c.keywords) ? c.keywords.map(k => String(k)) : [],
    }))
}

export async function loadSources(): Promise<SourcesData> {
  const d = await fetchJson<SourcesData>("sources.json")
  return d ?? {}
}

export async function loadConfig(): Promise<AppConfig> {
  const d = await fetchJson<AppConfig>("config.json")
  return d ?? {}
}
