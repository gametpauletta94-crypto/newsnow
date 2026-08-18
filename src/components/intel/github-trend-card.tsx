import { loadGithub, type GithubData } from "~/data"

function scoreClass(score: number): string {
  if (score >= 5) return "bg-rose-500/15 text-rose-500"
  if (score === 4) return "bg-amber-500/15 text-amber-500"
  if (score === 3) return "bg-sky-500/15 text-sky-500"
  return "bg-gray-500/15 text-gray-500"
}

export function GithubTrendCard() {
  const [data, setData] = useState<GithubData | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    loadGithub()
      .then(d => { if (alive) { setData(d); setLoaded(true) } })
      .catch(() => { if (alive) setLoaded(true) })
    return () => { alive = false }
  }, [])

  const projects = data?.projects ?? []
  return (
    <section className="rounded-2xl p-4 bg-primary/5 border border-primary/10 flex flex-col">
      <div className="flex items-center justify-between mb-2 gap-2">
        <h2 className="text-base font-bold shrink-0">GitHub 趋势</h2>
        <span className="text-xs op-60 truncate">{data?.source || "GitHub"}</span>
      </div>
      {!loaded
        ? <p className="text-xs op-50">加载中…</p>
        : projects.length > 0
          ? (
            <ul className="flex flex-col gap-3">
              {projects.slice(0, 6).map(p => (
                <li key={p.name} className="text-sm border-b border-primary/5 pb-2 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <a
                      href={p.url || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium op-90 hover:underline truncate"
                    >
                      {p.name}
                    </a>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 font-semibold ${scoreClass(p.personal_score ?? 0)}`}>
                      评分 {p.personal_score ?? 0}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs op-60 mt-0.5">
                    {p.category && <span className="px-1 py-0.5 rounded bg-primary/10">{p.category}</span>}
                    {p.language && <span>{p.language}</span>}
                    <span>★ {p.stars ?? 0}</span>
                    <span className="text-emerald-500">今日 +{p.stars_today ?? 0}</span>
                  </div>
                  {p.why_watch && <div className="text-xs op-70 mt-1 leading-snug">{p.why_watch}</div>}
                  {p.recommended_action && <div className="text-xs op-50 mt-0.5 leading-snug">→ {p.recommended_action}</div>}
                </li>
              ))}
            </ul>
            )
          : <p className="text-xs op-50">暂无趋势数据</p>}
    </section>
  )
}
