/**
 * V0.4.2 — AI 新闻智能情报采集器
 *
 * 独立脚本（不进入前端 bundle）。通过 `pnpm run collect:news` 运行，
 * 读取多个 AI 资讯 RSS 源，筛选 AI 相关内容，分类评分后生成
 * public/data/daily.json，供首页「今日 AI 摘要」模块运行时读取。
 *
 * 设计原则：
 * - 每个来源独立 fetch + 解析，单源失败仅跳过，绝不阻塞其他来源。
 * - 仅用项目既有依赖（fast-xml-parser 解析 XML），不引入新依赖。
 * - 生成的 daily.json 保持与现有 loadDaily() 兼容：保留 date/title/summary/
 *   topEvents[].title|source|url，并新增 published/category/impact/
 *   personal_score/why_watch 可选字段。
 */

import { writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { XMLParser } from "fast-xml-parser"

const OUT = resolve(process.cwd(), "public/data/daily.json")
const MAX_PER_SOURCE = 8
const MAX_RAW_PER_SOURCE = 60

interface RawItem {
  title: string
  description: string
  url: string
  published: string
}

interface Source {
  id: string
  name: string
  url: string
  fallback?: string
}

// 第一批来源：官方博客优先，缺失官方 RSS 的用 Google News RSS 兜底。
const SOURCES: Source[] = [
  {
    id: "openai",
    name: "OpenAI Blog",
    url: "https://openai.com/blog/rss.xml",
    fallback: "https://news.google.com/rss/search?q=OpenAI+site:openai.com&hl=en-US&gl=US&ceid=US:en",
  },
  {
    id: "anthropic",
    name: "Anthropic News",
    url: "https://www.anthropic.com/news/rss.xml",
    fallback: "https://news.google.com/rss/search?q=Anthropic+site:anthropic.com&hl=en-US&gl=US&ceid=US:en",
  },
  {
    id: "deepmind",
    name: "Google DeepMind Blog",
    url: "https://deepmind.google/blog/rss.xml",
    fallback: "https://news.google.com/rss/search?q=DeepMind+site:deepmind.google&hl=en-US&gl=US&ceid=US:en",
  },
  {
    id: "huggingface",
    name: "Hugging Face Blog",
    url: "https://huggingface.co/blog/feed.xml",
  },
  {
    id: "hackernews",
    name: "Hacker News",
    url: "https://hnrss.org/frontpage",
  },
]

// 阶段4：AI 相关关键词（短缩写用单词边界避免误匹配 "available/main" 等）
const KEYWORDS = [
  "GPT", "LLM", "MCP", "RAG", "Claude", "Gemini", "OpenAI",
  "Anthropic", "HuggingFace", "Hugging Face", "AI", "Agent",
  "大模型", "智能体", "推理模型",
]

const SHORT = new Set(["ai", "gpt", "llm", "mcp", "rag"])

function isAiRelated(text: string): boolean {
  const t = text.toLowerCase()
  return KEYWORDS.some((k) => {
    const kk = k.toLowerCase()
    if (SHORT.has(kk)) return new RegExp(`\\b${kk}\\b`, "i").test(t)
    return t.includes(kk)
  })
}

// 阶段5：分类
function classify(text: string): string {
  const t = text.toLowerCase()
  if (/(agent|mcp|rag|智能体|自动化|automation|workflow)/.test(t)) return "AI Agent"
  if (/(教育|education|学习|teacher|tutor|辅导|教学)/.test(t)) return "教育AI"
  if (/(创业|startup|funding|融资|ipo|公司|product)/.test(t)) return "AI创业"
  if (/(脑机|量子|机器人|具身|neuralink|太空|robot|space)/.test(t)) return "未来科技"
  if (/(gpt|llm|gemini|claude|model|大模型|推理模型|openai|anthropic|多模态|multimodal)/.test(t)) return "AI模型"
  return "AI模型"
}

// 阶段5：评分（1-5）
function scoreImpact(text: string): number {
  const hits = (text.match(/(gpt|llm|agent|mcp|rag|claude|gemini|openai|anthropic|hugging\s?face|大模型|智能体|推理模型|多模态)/gi) || []).length
  return Math.max(1, Math.min(5, 3 + Math.min(2, hits)))
}

function scorePersonal(text: string, category: string): number {
  const focus = new Set(["AI模型", "AI Agent", "AI创业", "教育AI", "未来科技"])
  let s = focus.has(category) ? 4 : 3
  const hits = (text.match(/(gpt|llm|agent|mcp|rag|claude|gemini|openai|anthropic|hugging\s?face|大模型|智能体)/gi) || []).length
  if (hits > 0) s += 1
  return Math.max(1, Math.min(5, s))
}

function whyWatch(category: string, text: string): string {
  const matched = KEYWORDS.filter((k) => {
    const kk = k.toLowerCase()
    if (SHORT.has(kk)) return new RegExp(`\\b${kk}\\b`, "i").test(text.toLowerCase())
    return text.toLowerCase().includes(kk)
  })
  const kw = matched.slice(0, 3).join("、")
  return `关注「${category}」方向：${kw || "AI"} 相关动态，建议跟进其技术演进与落地信号。`
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" })

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function asText(v: unknown): string {
  if (v == null) return ""
  if (typeof v === "string") return v
  if (typeof v === "object" && "#text" in (v as any)) return String((v as any)["#text"] ?? "")
  return String(v)
}

function extractLink(link: any): string {
  if (!link) return ""
  if (typeof link === "string") return link
  if (Array.isArray(link)) {
    const self = link.find((l: any) => l && (l["@_rel"] === "alternate" || !l["@_rel"]))
    const any = link[0]
    return (self ?? any)?.["@_href"] ?? ""
  }
  if (typeof link === "object") return link["@_href"] ?? asText(link)
  return ""
}

async function fetchFeed(src: Source): Promise<RawItem[]> {
  const urls = [src.url, src.fallback].filter(Boolean) as string[]
  for (const url of urls) {
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 12000)
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { "User-Agent": "Mozilla/5.0 PAIC-news-collector" },
      })
      clearTimeout(t)
      if (!res.ok) continue
      const xml = await res.text()
      const obj = parser.parse(xml)
      const items: any[] = []
      if (obj?.rss?.channel?.item) {
        const it = obj.rss.channel.item
        Array.isArray(it) ? items.push(...it) : items.push(it)
      }
      else if (obj?.feed?.entry) {
        const en = obj.feed.entry
        Array.isArray(en) ? items.push(...en) : items.push(en)
      }
      const out: RawItem[] = items.slice(0, MAX_RAW_PER_SOURCE).map((it) => ({
        title: decode(asText(it.title)),
        description: decode(asText(it.description ?? it.summary ?? it.content)),
        url: extractLink(it.link),
        published: asText(it.pubDate ?? it.published ?? it.updated),
      })).filter((i) => i.title && i.url)
      if (out.length) return out
    }
    catch {
      // 单源失败：尝试下一个候选 URL，均失败则跳过（不阻塞其他来源）
    }
  }
  return []
}

async function main() {
  console.log("[news-collector] 开始采集 AI 新闻情报…")
  const all: Array<RawItem & { source: string; category: string; impact: number; personal_score: number; why_watch: string }> = []

  for (const src of SOURCES) {
    const items = await fetchFeed(src)
    const kept = items
      .filter((i) => isAiRelated(`${i.title} ${i.description}`))
      .slice(0, MAX_PER_SOURCE)
    for (const i of kept) {
      const text = `${i.title} ${i.description}`
      const category = classify(text)
      all.push({
        ...i,
        source: src.name,
        category,
        impact: scoreImpact(text),
        personal_score: scorePersonal(text, category),
        why_watch: whyWatch(category, text),
      })
    }
    console.log(`  - ${src.name}: 解析 ${items.length} 条，命中 AI ${kept.length} 条`)
  }

  all.sort((a, b) => {
    const ta = Date.parse(a.published) || 0
    const tb = Date.parse(b.published) || 0
    if (tb !== ta) return tb - ta
    return b.personal_score - a.personal_score
  })

  const top = all.slice(0, 12)
  const cats = [...new Set(top.map((t) => t.category))]
  const date = new Date().toISOString().slice(0, 10)
  const summary =
    top.length > 0
      ? `今日共收录 ${top.length} 条 AI 相关资讯，覆盖 ${cats.join("、")} 等方向。重点包括：${top
        .slice(0, 4)
        .map((t, i) => `${i + 1}) ${t.title}`)
        .join("；")}。`
      : "今日暂无足够 AI 相关资讯，请稍后刷新或检查数据源连接。"

  const daily = {
    date,
    title: "今日 AI 摘要",
    summary,
    topEvents: top.map((t) => ({
      title: t.title,
      source: t.source,
      url: t.url,
      published: t.published || "",
      category: t.category,
      impact: t.impact,
      personal_score: t.personal_score,
      why_watch: t.why_watch,
    })),
  }

  writeFileSync(OUT, `${JSON.stringify(daily, null, 2)}\n`, "utf-8")
  console.log(`[news-collector] 已生成 ${OUT}（${top.length} 条）`)
}

main().catch((e) => {
  console.error("[news-collector] 失败：", e)
  process.exit(1)
})
