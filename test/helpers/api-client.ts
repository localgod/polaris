/**
 * API Test Client
 * 
 * Provides a simple fetch wrapper for testing API endpoints.
 * Can work with either:
 * 1. A running dev server (npm run dev)
 * 2. A test server started by the test suite
 * 
 * Set NUXT_TEST_BASE_URL environment variable to override the default.
 */

const DEFAULT_BASE_URL = 'http://localhost:3000'

export function getBaseURL(): string {
  return process.env.NUXT_TEST_BASE_URL || DEFAULT_BASE_URL
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
  const baseURL = getBaseURL()
  const url = `${baseURL}${path}`
  
  const response = await fetch(url)
  
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    const message = errorBody.message || response.statusText
    throw new Error(message)
  }
  
  return response.json()
}

export async function apiPost<T = unknown>(path: string, body: unknown): Promise<T> {
  const baseURL = getBaseURL()
  const url = `${baseURL}${path}`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    const message = errorBody.message || response.statusText
    throw new Error(message)
  }
  
  return response.json()
}

export async function checkServerHealth(): Promise<boolean> {
  try {
    const baseURL = getBaseURL()
    const response = await fetch(baseURL, { method: 'HEAD' })
    return response.ok
  } catch {
    return false
  }
}
