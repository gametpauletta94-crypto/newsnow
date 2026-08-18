import { loadConfig } from "~/data"
import { DailySummaryCard } from "./daily-summary-card"
import { GithubTrendCard } from "./github-trend-card"
import { HotTrendCard } from "./hot-trend-card"

export function IntelSection() {
  const config = loadConfig()
  const m = config.dataModules ?? {}
  const showDaily = m.dailySummary !== false
  const showGithub = m.githubTrend !== false
  const showTrend = m.hotTrend !== false
  if (!showDaily && !showGithub && !showTrend) return null
  return (
    <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
      {showDaily && <DailySummaryCard />}
      {showGithub && <GithubTrendCard />}
      {showTrend && <HotTrendCard />}
    </section>
  )
}
