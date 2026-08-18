import { createFileRoute } from "@tanstack/react-router"
import { focusSourcesAtom } from "~/atoms"
import { Column } from "~/components/column"
import { WelcomeHeader } from "~/components/welcome-header"
import { CategoryBar } from "~/components/category-bar"
import { IntelSection } from "~/components/intel"

export const Route = createFileRoute("/")({
  component: IndexComponent,
})

function IndexComponent() {
  const focusSources = useAtomValue(focusSourcesAtom)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const id = useMemo(() => focusSources.length ? "focus" : "hottest", [])
  return (
    <>
      <WelcomeHeader />
      <IntelSection />
      <CategoryBar />
      <Column id={id} />
    </>
  )
}
