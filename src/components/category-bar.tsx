import { activeCategoryAtom, type ActiveCategory } from "~/atoms"
import { loadTags } from "~/data"

// 兜底分类：当 tags.json 缺失/为空/加载失败时，仍保证 6 个分类可用
const FALLBACK_CATEGORIES: ActiveCategory[] = [
  { id: "ai-model", name: "AI模型", keywords: ["OpenAI", "ChatGPT", "Claude", "Gemini", "DeepSeek", "Qwen", "大模型", "GPT", "LLM", "Llama"] },
  { id: "ai-agent", name: "AI Agent", keywords: ["Agent", "智能体", "MCP", "Codex", "Claude Code", "Manus"] },
  { id: "ai-startup", name: "AI创业", keywords: ["AI创业", "AI SaaS", "一人公司", "AI应用", "AI startup"] },
  { id: "edu-ai", name: "教育AI", keywords: ["AI教育", "智慧教育", "AI教师", "教育智能体", "AI 教育"] },
  { id: "future-tech", name: "未来科技", keywords: ["脑机接口", "Neuralink", "机器人", "具身智能", "意识上传", "量子"] },
  { id: "github-oss", name: "GitHub开源", keywords: ["GitHub", "Open Source", "AI开源", "开源"] },
]

export function CategoryBar() {
  const [active, setActive] = useAtom(activeCategoryAtom)
  // 初始展示兜底分类，tags.json 加载成功后替换；加载失败则保持兜底
  const [categories, setCategories] = useState<ActiveCategory[]>(FALLBACK_CATEGORIES)

  useEffect(() => {
    let alive = true
    loadTags()
      .then(c => { if (alive && c.length) setCategories(c) })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  return (
    <div className="mb-5 flex flex-wrap gap-2">
      <Chip label="全部" active={active === null} onClick={() => setActive(null)} />
      {categories.map(c => (
        <Chip
          key={c.id}
          label={c.name}
          active={active?.id === c.id}
          onClick={() => setActive(active?.id === c.id ? null : c)}
        />
      ))}
    </div>
  )
}

function Chip({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={$(
        "px-3 py-1.5 rounded-full text-sm cursor-pointer transition-all select-none",
        active
          ? "bg-primary text-white font-bold shadow shadow-primary/30"
          : "bg-primary/10 op-80 hover:bg-primary/20",
      )}
    >
      {label}
    </button>
  )
}
