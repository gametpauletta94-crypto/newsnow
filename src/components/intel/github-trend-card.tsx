import { loadGithub, type GithubData } from "~/data"

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

  const repos = data?.repos ?? []
  return (
    <section className="rounded-2xl p-4 bg-primary/5 border border-primary/10 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-bold">GitHub 趋势</h2>
        {data?.updatedAt && <span className="text-xs op-60">已更新</span>}
      </div>
      {!loaded
        ? <p className="text-xs op-50">加载中…</p>
        : repos.length > 0
          ? (
            <ul className="flex flex-col gap-2">
              {repos.slice(0, 5).map(r => (
                <li key={r.name} className="text-sm">
                  <div className="flex items-center gap-2">
                    <a
                      href={r.url || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium op-90 hover:underline truncate"
                    >
                      {r.name}
                    </a>
                    {r.language && <span className="text-xs op-50 shrink-0">{r.language}</span>}
                  </div>
                  {r.description && <div className="text-xs op-70 truncate">{r.description}</div>}
                  <div className="text-xs op-60">★ {r.stars ?? 0} · 今日 +{r.starsToday ?? 0}</div>
                </li>
              ))}
            </ul>
            )
          : <p className="text-xs op-50">暂无趋势数据</p>}
    </section>
  )
}
