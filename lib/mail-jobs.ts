import { prisma } from "@/lib/prisma"
import { sendWeeklyCheckinEmail } from "@/lib/mail"

export async function sendWeeklyCheckinReminderEmails() {
  const activeStatuses = ["ACTIVE", "PENDING"] as const

  const purchases = await prisma.packagePurchase.findMany({
    where: {
      status: { in: activeStatuses },
      expiresAt: { gt: new Date() },
    },
    select: {
      userId: true,
      package: {
        select: {
          name: true,
        },
      },
      user: {
        select: {
          email: true,
          profile: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  })

  const sentUsers = new Set<string>()

  for (const purchase of purchases) {
    if (!purchase.user?.email || sentUsers.has(purchase.userId)) continue

    const name = purchase.user.profile
      ? `${purchase.user.profile.firstName ?? ""} ${purchase.user.profile.lastName ?? ""}`.trim()
      : null

    await sendWeeklyCheckinEmail(
      purchase.user.email,
      { name },
      {
        context: {
          userId: purchase.userId,
          packageName: purchase.package?.name ?? null,
        },
      },
    )
    sentUsers.add(purchase.userId)
  }
}
