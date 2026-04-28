/**
 * Package registry description fetchers.
 *
 * Each fetcher retrieves the short description for a package from its public
 * registry API. All fetchers return null on any error (network failure, 404,
 * unexpected response shape) so callers never need to handle exceptions.
 */

async function fetchNpm(name: string, group?: string): Promise<string | null> {
  // npm scoped packages: group may be stored with or without the leading "@"
  // (e.g. "@iconify" or "nuxt"). Normalise to always produce @scope/name.
  const scope = group ? group.replace(/^@/, '') : null
  const packageName = scope ? `@${scope}/${name}` : name
  try {
    const data = await $fetch<{ description?: string }>(
      `https://registry.npmjs.org/${encodeURIComponent(packageName)}`
    )
    return data?.description || null
  } catch {
    return null
  }
}

async function fetchPypi(name: string): Promise<string | null> {
  try {
    const data = await $fetch<{ info?: { summary?: string } }>(
      `https://pypi.org/pypi/${encodeURIComponent(name)}/json`
    )
    return data?.info?.summary || null
  } catch {
    return null
  }
}

async function fetchMaven(_name: string, _group?: string): Promise<string | null> {
  // Maven Central search does not provide package descriptions in a usable
  // form for this utility, so Maven descriptions are intentionally unsupported.
  // Short-circuit to avoid unnecessary external requests and latency.
  return null
}

async function fetchNuget(name: string): Promise<string | null> {
  try {
    const lowerName = name.toLowerCase()
    const data = await $fetch<{
      items?: Array<{
        items?: Array<{
          catalogEntry?: { description?: string }
        }>
      }>
    }>(`https://api.nuget.org/v3/registration5/${encodeURIComponent(lowerName)}/index.json`)
    const lastPage = data?.items?.at(-1)
    const latestItem = lastPage?.items?.at(-1)
    return latestItem?.catalogEntry?.description || null
  } catch {
    return null
  }
}

async function fetchCargo(name: string): Promise<string | null> {
  try {
    const data = await $fetch<{ crate?: { description?: string } }>(
      `https://crates.io/api/v1/crates/${encodeURIComponent(name)}`,
      { headers: { 'User-Agent': 'Polaris/1.0 (https://github.com/localgod/polaris)' } }
    )
    return data?.crate?.description || null
  } catch {
    return null
  }
}

async function fetchGolang(name: string, group?: string): Promise<string | null> {
  // Go module paths are typically group/name (e.g. github.com/gin-gonic/gin)
  const modulePath = group ? `${group}/${name}` : name
  try {
    const html = await $fetch<string>(
      `https://pkg.go.dev/${modulePath}`,
      { responseType: 'text' }
    )
    // Extract <meta name="description" content="...">
    const match = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)
    return match?.[1] || null
  } catch {
    return null
  }
}

/**
 * Fetch the description for a package from its public registry.
 *
 * Returns null when the package manager is unsupported, the registry is
 * unreachable, or the package has no description.
 */
export async function fetchRegistryDescription(
  name: string,
  packageManager: string,
  group?: string
): Promise<string | null> {
  const pm = packageManager.toLowerCase()

  switch (pm) {
    case 'npm':
      return fetchNpm(name, group)
    case 'pypi':
      return fetchPypi(name)
    case 'maven':
      return fetchMaven(name, group)
    case 'nuget':
      return fetchNuget(name)
    case 'cargo':
      return fetchCargo(name)
    case 'golang':
    case 'go':
      return fetchGolang(name, group)
    default:
      return null
  }
}
