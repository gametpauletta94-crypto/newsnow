import { loadDaily, type DailyData, type TopEvent } from "~/data"

function EventRow({ e }: { e: TopEvent }) {
  const hasMeta = (e.impact ?? 0) > 0 || (e.personal_score ?? 0) > 0 || e.category
  return (
    <li className="rounded-xl p-3 bg-white/60 dark:bg-white/5 border border-primary/10 flex flex-col gap-1.5">
      <div className="flex items-start gap-2">
        {e.url
          ? (
            <a href={e.url} target="_blank" rel="noreferrer" className="text-sm font-medium op-90 hover:underline flex-1">
              {e.title}
            </a>
            )
          : <span className="text-sm font-medium op-90 flex-1">{e.title}</span>}
        {e.source && <span className="text-xs op-50 shrink-0 whitespace-nowrap">{e.source}</span>}
      </div>
      {hasMeta && (
        <div className="flex flex-wrap items-center gap-1.5">
          {e.category && (
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
              {e.category}
            </span>
          )}
          {(e.impact ?? 0) > 0 && (
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-500 font-medium">
              影响 {e.impact}
            </span>
          )}
          {(e.personal_score ?? 0) > 0 && (
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 font-medium">
              评分 {e.personal_score}
            </span>
          )}
        </div>
      )}
      {e.why_watch && <p className="text-xs op-60 leading-relaxed">{e.why_watch}</p>}
    </li>
  )
}

export function DailySummaryCard() {
  const [data, setData] = useState<DailyData | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    loadDaily()
      .then(d => { if (alive) { setData(d); setLoaded(true) } })
      .catch(() => { if (alive) setLoaded(true) })
    return () => { alive = false }
  }, [])

  const events = data?.topEvents ?? []
  return (
    <section className="rounded-2xl p-4 bg-primary/5 border border-primary/10 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-bold">今日 AI 摘要</h2>
        {data?.date && <span className="text-xs op-60">{data.date}</span>}
      </div>
      {!loaded
        ? <p className="text-xs op-50">加载中…</p>
        : data?.summary
          ? <p className="text-sm op-80 mb-3 leading-relaxed">{data.summary}</p>
          : null}
      {!loaded
        ? null
        : events.length > 0
          ? (
            <ul className="flex flex-col gap-2">
              {events.slice(0, 6).map((e, i) => <EventRow key={i} e={e} />)}
            </ul>
            )
          : <p className="text-xs op-50">暂无摘要数据</p>}
    </section>
  )
}
