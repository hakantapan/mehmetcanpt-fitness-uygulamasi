import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { getActivePackagePurchase } from "@/lib/subscription"
import ClientSupplementPage from "./client-page"

export default async function SupplementPage() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  if (!userId) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/supplement")}`)
  }

  const activePackage = await getActivePackagePurchase(userId)

  if (!activePackage) {
    redirect("/paket-satin-al?source=supplement")
  }

  return <ClientSupplementPage />
}
