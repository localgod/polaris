import type { DependencyNode } from '~~/types/api'

export function dependencyNodeKey(node: Pick<DependencyNode, 'purl' | 'packageManager' | 'group' | 'name' | 'version'>): string {
  return node.purl
    ?? `${node.packageManager ?? ''}:${node.group ?? ''}:${node.name}@${node.version}`
}
