import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// ─── SQLite Concurrent Access Mutex ─────────────────────────────────
// SQLite (via better-sqlite3) can segfault under concurrent queries in
// the Next.js standalone server. This simple mutex serializes all DB
// access to prevent crashes.

let mutexPromise: Promise<void> = Promise.resolve()

/**
 * Wrap a database operation with mutex protection.
 * Usage: `await withDb(() => db.mediaAsset.findMany(...))`
 */
export async function withDb<T>(fn: () => Promise<T>): Promise<T> {
  // Wait for any in-flight operation to complete
  let resolve: () => void
  const prevPromise = mutexPromise
  mutexPromise = new Promise<void>((r) => { resolve = r })

  await prevPromise
  try {
    return await fn()
  } finally {
    resolve!()
  }
}

// Enable WAL mode for better concurrent read performance (best-effort)
db.$executeRawUnsafe(`PRAGMA journal_mode=WAL`).catch(() => {})
