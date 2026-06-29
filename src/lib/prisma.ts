import { PrismaClient } from "@prisma/client"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalForPrisma = globalThis as unknown as { prisma: any }

function buildPrisma() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })

  // Transparent retry for Neon cold-start (P1001 = can't reach DB, P1002 = timeout)
  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }: { args: unknown; query: (a: unknown) => Promise<unknown> }) {
          let lastErr: unknown
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              return await query(args)
            } catch (err: unknown) {
              lastErr = err
              const code = (err as { code?: string })?.code
              if ((code === "P1001" || code === "P1002") && attempt < 3) {
                await new Promise((r) => setTimeout(r, attempt * 1500))
                continue
              }
              break
            }
          }
          throw lastErr
        },
      },
    },
  })
}

export const prisma = globalForPrisma.prisma ?? buildPrisma()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
