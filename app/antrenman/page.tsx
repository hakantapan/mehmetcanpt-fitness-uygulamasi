import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { getActivePackagePurchase } from "@/lib/subscription"
import ClientWorkoutProgramPage from "../danisan/antrenman/page"

export default async function AntrenmanPage() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  if (!userId) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/antrenman")}`)
  }

  const activePackage = await getActivePackagePurchase(userId)

  if (!activePackage) {
    redirect("/paket-satin-al?source=antrenman")
  }

  return <ClientWorkoutProgramPage />
}
