import { getServiceClient } from '@/lib/supabase'
import NewRoleClient from './NewRoleClient'

export const dynamic = 'force-dynamic'

async function hasGreenhouseKey(): Promise<boolean> {
  const client = getServiceClient()
  const { data } = await client
    .from('settings')
    .select('value')
    .eq('key', 'greenhouse_api_key')
    .maybeSingle()
  return Boolean(data?.value)
}

export default async function NewRolePage() {
  const ghKey = await hasGreenhouseKey()
  return <NewRoleClient hasGreenhouseKey={ghKey} />
}
