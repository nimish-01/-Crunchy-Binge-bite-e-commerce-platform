import { PrismaClient } from "@prisma/client"

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
              // PrismaClientKnownRequestError uses `.code`; PrismaClientInitializationError uses `.errorCode`
              const e = err as { code?: string; errorCode?: string; message?: string }
              const code = e?.code ?? e?.errorCode
              const isTransient =
                code === "P1001" ||
                code === "P1002" ||
                (typeof e?.message === "string" &&
                  (e.message.includes("Can't reach database server") ||
                    e.message.includes("Connection refused") ||
                    e.message.includes("ETIMEDOUT") ||
                    e.message.includes("ECONNRESET")))
              if (isTransient && attempt < 3) {
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

type PrismaClientExtended = ReturnType<typeof buildPrisma>

const globalForPrisma = globalThis as unknown as { prisma: PrismaClientExtended }

export const prisma: PrismaClientExtended =
  globalForPrisma.prisma ?? buildPrisma()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
