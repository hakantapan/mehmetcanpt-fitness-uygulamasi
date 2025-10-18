import { PrismaClient as GeneratedPrismaClient } from '@prisma/client'

function resolvePrismaClient() {
  try {
    const testClient = new GeneratedPrismaClient({ log: [] })
    const hasNewModels = typeof (testClient as unknown as Record<string, unknown>).workoutTemplate !== 'undefined'
    testClient.$disconnect().catch(() => null)
    if (hasNewModels) {
      return GeneratedPrismaClient
    }
  } catch (_error) {
    // fall back to direct client below
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const directClient = require('../node_modules/.prisma/client/index.js').PrismaClient as typeof GeneratedPrismaClient
  return directClient
}

const PrismaClientConstructor = resolvePrismaClient()

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = global as unknown as { prisma: InstanceType<typeof PrismaClientConstructor> }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClientConstructor({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
