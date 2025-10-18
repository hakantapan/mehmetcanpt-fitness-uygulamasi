import ResponsiveLayout from "@/components/responsive-layout"
import Image from "next/image"

export default function DanisanDashboard() {
  return (
    <ResponsiveLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="flex items-center gap-4 mb-8">
          <div className="relative">
            <Image
              src="/fitness-user-avatar.png"
              alt="Profil"
              width={60}
              height={60}
              className="rounded-full border-2 border-primary"
            />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-background flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Hoş geldin, Ahmet!</h1>
            <p className="text-muted-foreground">Bugün harika bir antrenman günü 💪</p>
          </div>
        </div>
      </div>
    </ResponsiveLayout>
  )
}
