import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { getActivePackagePurchase } from "@/lib/subscription"
import ClientGelisimPage from "./client-page"

export default async function GelisimPage() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  if (!userId) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/gelisim")}`)
  }

  const activePackage = await getActivePackagePurchase(userId)

  if (!activePackage) {
    redirect("/paket-satin-al?source=gelisim")
  }

  return <ClientGelisimPage />
}
