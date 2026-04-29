import { getServiceClient } from '@/lib/supabase'
import NewCandidateClient from './NewCandidateClient'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ role?: string }>
}

export default async function NewCandidatePage({ searchParams }: Props) {
  const { role: roleId = '' } = await searchParams

  let greenhouseJobId: string | null = null
  let hasGreenhouseKey = false

  const client = getServiceClient()

  const [roleResult, settingResult] = await Promise.all([
    roleId
      ? client.from('roles').select('greenhouse_job_id').eq('id', roleId).maybeSingle()
      : Promise.resolve({ data: null }),
    client.from('settings').select('value').eq('key', 'greenhouse_api_key').maybeSingle(),
  ])

  greenhouseJobId = (roleResult.data as { greenhouse_job_id?: string | null } | null)?.greenhouse_job_id ?? null
  hasGreenhouseKey = Boolean((settingResult as { data?: { value?: string } | null }).data?.value)

  return (
    <NewCandidateClient
      roleId={roleId}
      greenhouseJobId={greenhouseJobId}
      hasGreenhouseKey={hasGreenhouseKey}
    />
  )
}
