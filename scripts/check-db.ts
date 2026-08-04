import { getPayload } from 'payload'
import config from '@payload-config'

const payload = await getPayload({ config })
for (const slug of ['applications', 'certificates', 'events', 'users'] as const) {
  const { totalDocs } = await payload.count({ collection: slug })
  console.log(`${slug}: ${totalDocs}`)
}
process.exit(0)
