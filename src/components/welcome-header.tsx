function useClock(intervalMs = 30000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}

export function WelcomeHeader() {
  const now = useClock()
  const time = now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
  return (
    <section className="mb-6 flex flex-col gap-1.5">
      <h1 className="text-2xl font-bold md:text-3xl">我的 AI 情报中心</h1>
      <p className="text-sm op-70 font-mono">Personal AI Intelligence Center</p>
      <p className="text-sm op-80">每天获取：AI · 科技 · 商业 · 开源 · 投资趋势</p>
      <p className="text-xs op-60">最后更新时间：{time}</p>
    </section>
  )
}
