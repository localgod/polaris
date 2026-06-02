import type { Component } from '~~/types/api'

export interface ComponentIdentity {
  purl?: string
  packageManager?: string | null
  group?: string | null
  name?: string
  version?: string
}

export function encodeComponentKey(component: Pick<Component, 'purl' | 'packageManager' | 'group' | 'name' | 'version'>): string {
  const identity: ComponentIdentity = component.purl
    ? { purl: component.purl }
    : {
        packageManager: component.packageManager,
        group: component.group,
        name: component.name,
        version: component.version
      }

  return encodeBase64Url(JSON.stringify(identity))
}

export function decodeComponentKey(key: string): ComponentIdentity | null {
  try {
    const identity = JSON.parse(decodeBase64Url(key)) as ComponentIdentity
    if (identity.purl) return { purl: identity.purl }
    if (!identity.name || !identity.version) return null
    return {
      packageManager: identity.packageManager ?? null,
      group: identity.group ?? null,
      name: identity.name,
      version: identity.version
    }
  } catch {
    return null
  }
}

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

function decodeBase64Url(value: string): string {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}
