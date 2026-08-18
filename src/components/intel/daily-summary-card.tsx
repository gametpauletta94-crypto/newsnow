import { loadDaily, type DailyData } from "~/data"

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
            <ol className="flex flex-col gap-1.5">
              {events.slice(0, 5).map((e, i) => (
                <li key={i} className="text-sm flex gap-2 items-start">
                  <span className="text-primary font-bold shrink-0">{i + 1}</span>
                  {e.url
                    ? (
                      <a href={e.url} target="_blank" rel="noreferrer" className="op-90 hover:underline">
                        {e.title}
                      </a>
                      )
                    : <span className="op-90">{e.title}</span>}
                  {e.source && <span className="text-xs op-50 ml-auto shrink-0 whitespace-nowrap">{e.source}</span>}
                </li>
              ))}
            </ol>
            )
          : <p className="text-xs op-50">暂无摘要数据</p>}
    </section>
  )
}
