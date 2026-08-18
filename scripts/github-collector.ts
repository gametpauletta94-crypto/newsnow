/**
 * GitHub 智能情报采集器（PAIC V0.4.1）
 *
 * 职责：
 *  - 调用 GitHub Search API 检索 AI 方向热门仓库；
 *  - 按个人关注方向（AI Agent / AI模型 / AI工具 / AI创业 / 教育AI / 开源基础设施）筛选项目；
 *  - 计算 personal_score（高度相关5 / 趋势4 / 一般3 / 其他1-2）并生成 why_watch / recommended_action；
 *  - 通过基线文件计算 stars_today（真实日增），首次运行无基线时使用启发式估算；
 *  - 生成 public/data/github.json（新 schema）。
 *
 * 设计原则：
 *  - 代码完全独立，不 import 任何前端模块，不会被打包进前端 bundle；
 *  - 不写入任何私密 token；仅在使用环境变量 GITHUB_TOKEN（如 Actions 内置 token）时附带；
 *  - 网络/限流失败时不崩溃：返回已采集结果，若完全无数据则写入离线种子，保证前端始终有可用数据。
 *
 * 运行：
 *  - 本地：  pnpm run collect:github
 *  - CI：    GitHub Actions 每天 06:00 触发（见 .github/workflows/github-intelligence.yml）
 */

import { writeFileSync, readFileSync, existsSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, "..")
const GITHUB_JSON = join(projectRoot, "public", "data", "github.json")
const BASELINE_JSON = join(projectRoot, "scripts", "github-baseline.json")

const API = "https://api.github.com/search/repositories"
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || ""
const DELAY_MS = 900 // 礼貌节流，避免触发限流

// ---- 关注方向与检索关键词（阶段4） ----
interface FocusArea {
  category: string
  query: string
  keywords: string[]
}

const FOCUS_AREAS: FocusArea[] = [
  { category: "AI Agent", query: "AI agent framework stars:>2000 pushed:>2025-01-01", keywords: ["agent", "mcp", "automation", "ai agent", "tool"] },
  { category: "AI模型", query: "LLM model inference stars:>8000 pushed:>2025-01-01", keywords: ["llm", "model", "inference", "transformer", "gpt"] },
  { category: "AI工具", query: "AI tool productivity stars:>2000 pushed:>2025-01-01", keywords: ["tool", "ai tool", "copilot", "assistant", "productivity"] },
  { category: "AI创业", query: "AI startup platform stars:>2000 pushed:>2025-01-01", keywords: ["startup", "platform", "saas", "api", "ai"] },
  { category: "教育AI", query: "education AI learning stars:>500 pushed:>2025-01-01", keywords: ["education", "learning", "tutor", "course", "ai"] },
  { category: "开源基础设施", query: "vector database LLM infrastructure stars:>5000 pushed:>2025-01-01", keywords: ["infrastructure", "vector", "database", "rag", "embedding"] },
]

// ---- 输出数据结构（阶段3） ----
interface GithubProject {
  name: string
  repo: string
  url: string
  stars: number
  stars_today: number
  language: string
  category: string
  description: string
  personal_score: number
  why_watch: string
  recommended_action: string
}

interface GithubOutput {
  date: string
  source: string
  projects: GithubProject[]
}

// ---- GitHub Search API 原始响应（节选） ----
interface GhRepo {
  full_name: string
  html_url: string
  description: string | null
  stargazers_count: number
  language: string | null
  pushed_at: string
  topics?: string[]
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function searchRepos(area: FocusArea): Promise<GithubProject[]> {
  const url = `${API}?q=${encodeURIComponent(area.query)}&sort=stars&order=desc&per_page=8`
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "paic-github-collector",
    "X-GitHub-Api-Version": "2022-11-28",
  }
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`

  try {
    const res = await fetch(url, { headers })
    if (res.status === 403 || res.status === 429) {
      console.warn(`[collector] ${area.category}: rate limited (${res.status}), skip`)
      return []
    }
    if (!res.ok) {
      console.warn(`[collector] ${area.category}: HTTP ${res.status}, skip`)
      return []
    }
    const json = await res.json() as { items?: GhRepo[] }
    const items = json.items ?? []
    return items.map(it => buildProject(it, area))
  }
  catch (e) {
    console.warn(`[collector] ${area.category}: fetch failed ->`, (e as Error).message)
    return []
  }
}

function daysSince(iso: string): number {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return 999
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000))
}

function formatStars(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

// ---- 个人评分（阶段5） ----
function scoreRepo(text: string, category: string, stars: number, starsToday: number, daysSincePush: number): number {
  const t = text.toLowerCase()
  const core = ["agent", "mcp", "llm", "rag", "langchain", "automation", "ai agent"]
  const coreHits = core.filter(k => t.includes(k)).length
  if (coreHits >= 2 || ((category === "AI Agent" || category === "AI模型") && stars > 10000)) return 5 // 高度相关
  if (starsToday >= 30 || daysSincePush <= 3) return 4 // 趋势
  if (stars > 1000) return 3 // 一般
  return stars > 200 ? 2 : 1 // 其他
}

function whyWatch(category: string, language: string, stars: number, score: number): string {
  const lang = language ? `${language} · ` : ""
  const rel = score >= 5 ? "高度相关，建议纳入技术雷达"
    : score === 4 ? "呈上升趋势，建议加入观察列表"
      : score === 3 ? "值得关注，可评估是否契合工作流"
        : "相关性一般，可暂列低优先"
  return `${category} 方向｜${lang}⭐ ${formatStars(stars)} stars：${rel}`
}

function recommendedAction(score: number): string {
  switch (score) {
    case 5: return "立即 Star 并加入技术雷达，优先评估落地场景"
    case 4: return "加入观察列表，关注本周增长与社区动态"
    case 3: return "按需试用，验证是否契合现有工作流"
    default: return "暂列低优先，定期回看"
  }
}

function buildProject(it: GhRepo, area: FocusArea): GithubProject {
  const stars = it.stargazers_count ?? 0
  const text = `${it.full_name} ${it.description ?? ""} ${(it.topics ?? []).join(" ")}`
  // stars_today 在 assemble 阶段结合基线计算，这里先用 0 占位
  const score = scoreRepo(text, area.category, stars, 0, daysSince(it.pushed_at))
  return {
    name: it.full_name,
    repo: it.full_name,
    url: it.html_url,
    stars,
    stars_today: 0,
    language: it.language ?? "",
    category: area.category,
    description: (it.description ?? "").slice(0, 160),
    personal_score: score,
    why_watch: whyWatch(area.category, it.language ?? "", stars, score),
    recommended_action: recommendedAction(score),
  }
}

// ---- 基线（用于真实 stars_today 差值） ----
type Baseline = Record<string, number>

function loadBaseline(): Baseline {
  try {
    if (existsSync(BASELINE_JSON)) {
      return JSON.parse(readFileSync(BASELINE_JSON, "utf8")) as Baseline
    }
  }
  catch { /* ignore */ }
  return {}
}

function saveBaseline(b: Baseline) {
  writeFileSync(BASELINE_JSON, JSON.stringify(b, null, 2), "utf8")
}

// 首次运行无基线时的启发式估算（仅用于让卡片有合理非零值）
function estimateToday(stars: number, daysSincePush: number): number {
  if (daysSincePush <= 7) return Math.round(stars * 0.0015)
  if (daysSincePush <= 30) return Math.round(stars * 0.0005)
  return 0
}

// ---- 离线种子（仅在完全无法访问 API 时使用，保证前端有数据） ----
function seedProjects(): GithubProject[] {
  const seeds: Array<[string, string, number, string, string]> = [
    ["ourongxing/newsnow", "Elegant reading of real-time news", 12000, "TypeScript", "开源基础设施"],
    ["vllm-project/vllm", "High-throughput and memory-efficient LLM inference engine", 35000, "Python", "AI模型"],
    ["langchain-ai/langchain", "Build context-aware reasoning applications", 98000, "Python", "AI Agent"],
    ["huggingface/transformers", "State-of-the-art ML models with a unified API", 140000, "Python", "AI模型"],
    ["microlinkhq/browserless", "Headless browser automation for scraping and AI agents", 8000, "JavaScript", "AI工具"],
    ["openai/openai-cookbook", "Examples and guides for using the OpenAI API", 62000, "Jupyter Notebook", "AI工具"],
  ]
  return seeds.map(([name, desc, stars, lang, cat]) => {
    const score = scoreRepo(`${name} ${desc}`, cat, stars, 0, 1)
    return {
      name, repo: name, url: `https://github.com/${name}`, stars,
      stars_today: estimateToday(stars, 1), language: lang, category: cat,
      description: desc, personal_score: score,
      why_watch: whyWatch(cat, lang, stars, score),
      recommended_action: recommendedAction(score),
    }
  })
}

// ---- 主流程 ----
async function main() {
  console.log("[collector] start")
  const baseline = loadBaseline()
  const collected = new Map<string, GithubProject>()

  for (const area of FOCUS_AREAS) {
    const projects = await searchRepos(area)
    for (const p of projects) {
      if (!collected.has(p.name)) collected.set(p.name, p)
    }
    await sleep(DELAY_MS)
  }

  let projects = Array.from(collected.values())

  if (projects.length === 0) {
    console.warn("[collector] no live data, use offline seed")
    projects = seedProjects()
  }

  // 计算 stars_today：有基线用真实差值，否则启发式估算
  const newBaseline: Baseline = {}
  for (const p of projects) {
    const prev = baseline[p.name]
    if (typeof prev === "number") {
      p.stars_today = Math.max(0, p.stars - prev)
    }
    else {
      p.stars_today = estimateToday(p.stars, 1)
    }
    newBaseline[p.name] = p.stars
  }
  saveBaseline(newBaseline)

  // 排序：评分高优先，其次 stars 高
  projects.sort((a, b) => b.personal_score - a.personal_score || b.stars - a.stars)
  projects = projects.slice(0, 18)

  const output: GithubOutput = {
    date: new Date().toISOString().slice(0, 10),
    source: projects.length && collected.size ? "GitHub Search API" : "seed (offline fallback)",
    projects,
  }

  writeFileSync(GITHUB_JSON, JSON.stringify(output, null, 2), "utf8")
  console.log(`[collector] wrote ${projects.length} projects -> ${GITHUB_JSON} (source=${output.source})`)
}

main().catch(err => {
  console.error("[collector] fatal:", err)
  process.exit(1)
})
