import { loadTrend } from "~/data"

export function HotTrendCard() {
  const data = loadTrend()
  const trends = data.trends ?? []
  return (
    <section className="rounded-2xl p-4 bg-primary/5 border border-primary/10 flex flex-col">
      <h2 className="text-base font-bold mb-2">热点趋势</h2>
      {trends.length > 0
        ? (
          <ul className="flex flex-col gap-1.5">
            {trends.slice(0, 6).map((t, i) => (
              <li key={i} className="text-sm flex items-center gap-2">
                <span className="text-primary font-bold w-5 shrink-0">{i + 1}</span>
                {t.url
                  ? (
                    <a href={t.url} target="_blank" rel="noreferrer" className="op-90 hover:underline truncate">
                      {t.topic}
                    </a>
                    )
                  : <span className="op-90 truncate">{t.topic}</span>}
                {typeof t.heat === "number" && (
                  <span className="text-xs op-50 ml-auto shrink-0 whitespace-nowrap">热度 {t.heat}</span>
                )}
              </li>
            ))}
          </ul>
          )
        : <p className="text-xs op-50">暂无趋势数据</p>}
    </section>
  )
}
