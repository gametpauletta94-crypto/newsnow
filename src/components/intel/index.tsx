import { loadConfig } from "~/data"
import { DailySummaryCard } from "./daily-summary-card"
import { GithubTrendCard } from "./github-trend-card"
import { HotTrendCard } from "./hot-trend-card"

export function IntelSection() {
  // 默认全部显示；配置加载失败/缺失时保持原默认行为（dataModules 默认开启）
  const [show, setShow] = useState({ daily: true, github: true, trend: true })

  useEffect(() => {
    let alive = true
    loadConfig()
      .then(c => {
        if (!alive) return
        const m = c.dataModules ?? {}
        setShow({
          daily: m.dailySummary !== false,
          github: m.githubTrend !== false,
          trend: m.hotTrend !== false,
        })
      })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  const { daily, github, trend } = show
  if (!daily && !github && !trend) return null
  return (
    <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
      {daily && <DailySummaryCard />}
      {github && <GithubTrendCard />}
      {trend && <HotTrendCard />}
    </section>
  )
}
