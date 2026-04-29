import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const jobId = req.nextUrl.searchParams.get('id')?.trim()
  if (!jobId) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const client = getServiceClient()
  const { data: setting } = await client
    .from('settings')
    .select('value')
    .eq('key', 'greenhouse_api_key')
    .maybeSingle()

  if (!setting?.value) {
    return NextResponse.json(
      { error: 'Greenhouse API key not configured. Add it in Settings.' },
      { status: 422 }
    )
  }

  const authHeader = `Basic ${Buffer.from(`${setting.value}:`).toString('base64')}`

  let ghJob: { name?: string; title?: string; notes?: string }
  try {
    const res = await fetch(`https://harvest.greenhouse.io/v1/jobs/${jobId}`, {
      headers: { Authorization: authHeader },
    })
    if (res.status === 404) {
      return NextResponse.json({ error: `Job ${jobId} not found in Greenhouse.` }, { status: 404 })
    }
    if (!res.ok) {
      return NextResponse.json(
        { error: `Greenhouse returned ${res.status}. Check the Job ID and API key.` },
        { status: 502 }
      )
    }
    ghJob = await res.json()
  } catch {
    return NextResponse.json({ error: 'Could not reach Greenhouse. Check your network.' }, { status: 502 })
  }

  const title = ghJob.name ?? ghJob.title ?? ''
  const job_description = ghJob.notes ?? ''

  if (!title) {
    return NextResponse.json({ error: 'Greenhouse job has no title.' }, { status: 422 })
  }

  return NextResponse.json({ title, job_description })
}
