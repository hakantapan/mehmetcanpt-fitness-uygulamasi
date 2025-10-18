import type { PackageStatus, FitnessPackage } from "@prisma/client"
import { prisma } from "@/lib/prisma"

const PACKAGE_STATUS: Record<
  "ACTIVE" | "PENDING" | "EXPIRED" | "CANCELLED",
  PackageStatus
> = {
  ACTIVE: "ACTIVE" as PackageStatus,
  PENDING: "PENDING" as PackageStatus,
  EXPIRED: "EXPIRED" as PackageStatus,
  CANCELLED: "CANCELLED" as PackageStatus,
}

const ACTIVE_STATUSES: PackageStatus[] = [PACKAGE_STATUS.ACTIVE, PACKAGE_STATUS.PENDING]

export async function getActivePackagePurchase(userId: string) {
  if (!userId) return null

  const now = new Date()
  return prisma.packagePurchase.findFirst({
    where: {
      userId,
      status: { in: ACTIVE_STATUSES },
      startsAt: { lte: now },
      expiresAt: { gt: now },
    },
    include: {
      package: true,
    },
    orderBy: {
      expiresAt: "desc",
    },
  })
}

export function calculateExpiry(durationInDays: number, from: Date = new Date()) {
  const expiresAt = new Date(from)
  expiresAt.setDate(expiresAt.getDate() + Math.max(durationInDays, 0))
  return expiresAt
}

export function getRemainingDays(expiresAt: Date) {
  const diffMs = expiresAt.getTime() - Date.now()
  return diffMs <= 0 ? 0 : Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

export async function createPackagePurchase(userId: string, fitnessPackage: FitnessPackage, paymentReference?: string) {
  const now = new Date()
  const expiresAt = calculateExpiry(fitnessPackage.durationInDays, now)

  return prisma.$transaction(async (tx) => {
    await tx.packagePurchase.updateMany({
      where: {
        userId,
        status: { in: ACTIVE_STATUSES },
        expiresAt: { gt: now },
      },
      data: {
        status: PACKAGE_STATUS.EXPIRED,
        cancelledAt: now,
      },
    })

    return tx.packagePurchase.create({
      data: {
        userId,
        packageId: fitnessPackage.id,
        status: PACKAGE_STATUS.ACTIVE,
        purchasedAt: now,
        startsAt: now,
        expiresAt,
        paymentReference,
      },
      include: {
        package: true,
      },
    })
  })
}
