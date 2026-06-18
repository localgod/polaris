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
  const cached = await storage.getItem<CacheEntry<T>>(key)

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }

  const value = await producer()
  await storage.setItem(key, {
    expiresAt: Date.now() + ttlSeconds * 1000,
    value
  })

  return value
}
