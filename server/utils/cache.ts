interface CacheEntry<T> {
  expiresAt: number
  value: T
}

interface CacheStorage {
  getItem<T>(key: string): Promise<T | null>
  setItem<T>(key: string, value: T): Promise<void>
}

export async function cachedFetch<T>(
  key: string,
  producer: () => Promise<T>,
  ttlSeconds: number,
  storageFactory: () => CacheStorage = () => useStorage('cache:api') as CacheStorage
): Promise<T> {
  const storage = storageFactory()
  const cached = await getCachedValue(storage, key)

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }

  const value = await producer()
  await setCachedValue(storage, key, value, ttlSeconds)

  return value
}

async function getCachedValue<T>(storage: CacheStorage, key: string): Promise<CacheEntry<T> | null> {
  try {
    return await storage.getItem<CacheEntry<T>>(key)
  } catch {
    return null
  }
}

async function setCachedValue<T>(storage: CacheStorage, key: string, value: T, ttlSeconds: number): Promise<void> {
  try {
    await storage.setItem(key, {
      expiresAt: Date.now() + ttlSeconds * 1000,
      value
    })
  } catch {
    // Cache persistence must not make successful upstream enrichment unavailable.
  }
}
