import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'

const MAX_CANDIDATES = 20

export async function GET(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const jobId = req.nextUrl.searchParams.get('jobId')?.trim()
  if (!jobId) {
    return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
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

  let applications: { id: number; candidate_id: number }[]
  try {
    const res = await fetch(
      `https://harvest.greenhouse.io/v1/applications?job_id=${jobId}&status=active`,
      { headers: { Authorization: authHeader } }
    )
    if (!res.ok) {
      return NextResponse.json(
        { error: `Greenhouse returned ${res.status}. Check the API key.` },
        { status: 502 }
      )
    }
    applications = await res.json()
  } catch {
    return NextResponse.json(
      { error: 'Could not reach Greenhouse. Check your network.' },
      { status: 502 }
    )
  }

  // Deduplicate by candidate_id, cap at MAX_CANDIDATES
  const seen = new Set<number>()
  const candidateIds: number[] = []
  for (const app of applications) {
    if (!seen.has(app.candidate_id)) {
      seen.add(app.candidate_id)
      candidateIds.push(app.candidate_id)
      if (candidateIds.length >= MAX_CANDIDATES) break
    }
  }

  if (candidateIds.length === 0) {
    return NextResponse.json({ candidates: [] })
  }

  // Fetch candidate details in parallel
  const results = await Promise.allSettled(
    candidateIds.map((id) =>
      fetch(`https://harvest.greenhouse.io/v1/candidates/${id}`, {
        headers: { Authorization: authHeader },
      }).then((r) => (r.ok ? r.json() : null))
    )
  )

  const candidates = results
    .map((r, i) => {
      if (r.status !== 'fulfilled' || !r.value) return null
      const c = r.value as { first_name?: string; last_name?: string }
      const name = `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || 'Unknown'
      return { id: candidateIds[i], name }
    })
    .filter((c): c is { id: number; name: string } => c !== null)

  return NextResponse.json({ candidates })
}
