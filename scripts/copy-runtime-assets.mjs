import { cp, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const copies = [
  {
    source: join(process.cwd(), 'node_modules/@cyclonedx/cdxgen/data'),
    target: join(process.cwd(), '.output/server/node_modules/@cyclonedx/cdxgen/data'),
    label: '@cyclonedx/cdxgen data files'
  },
  {
    source: join(process.cwd(), 'server/schemas'),
    target: join(process.cwd(), '.output/server/schemas'),
    label: 'SBOM schema files'
  },
  {
    source: join(process.cwd(), 'server/database/queries'),
    target: join(process.cwd(), '.output/server/database/queries'),
    label: 'Cypher query files'
  }
]

for (const { source, target, label } of copies) {
  await mkdir(target, { recursive: true })
  await cp(source, target, { recursive: true, force: true })
  console.log(`Copied ${label} into Nitro output`)
}
