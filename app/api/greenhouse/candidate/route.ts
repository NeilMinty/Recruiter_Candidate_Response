import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'
import { extractText } from '@/lib/pdf'

const BUCKET = 'candidate-files'

async function getApiKey(): Promise<string | null> {
  const client = getServiceClient()
  const { data } = await client
    .from('settings')
    .select('value')
    .eq('key', 'greenhouse_api_key')
    .maybeSingle()
  return data?.value ?? null
}

export async function GET(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const candidateId = req.nextUrl.searchParams.get('id')?.trim()
  const jobId = req.nextUrl.searchParams.get('jobId')?.trim()

  if (!candidateId) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const apiKey = await getApiKey()
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Greenhouse API key not configured. Add it in Settings.' },
      { status: 422 }
    )
  }

  const authHeader = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`

  // Fetch candidate and their applications in parallel
  let ghCandidate: {
    first_name?: string
    last_name?: string
    email_addresses?: { value: string; type: string }[]
    attachments?: { filename?: string; url: string; type: string; content_type?: string }[]
  }

  let applications: {
    id: number
    candidate_id: number
    jobs?: { id: number }[]
  }[]

  try {
    const [candRes, appsRes] = await Promise.all([
      fetch(`https://harvest.greenhouse.io/v1/candidates/${candidateId}`, {
        headers: { Authorization: authHeader },
      }),
      fetch(`https://harvest.greenhouse.io/v1/applications?candidate_id=${candidateId}`, {
        headers: { Authorization: authHeader },
      }),
    ])

    if (candRes.status === 404) {
      return NextResponse.json(
        { error: `Candidate ${candidateId} not found in Greenhouse.` },
        { status: 404 }
      )
    }
    if (!candRes.ok) {
      return NextResponse.json(
        { error: `Greenhouse returned ${candRes.status}. Check the Candidate ID and API key.` },
        { status: 502 }
      )
    }

    ghCandidate = await candRes.json()
    applications = appsRes.ok ? await appsRes.json() : []
  } catch {
    return NextResponse.json(
      { error: 'Could not reach Greenhouse. Check your network.' },
      { status: 502 }
    )
  }

  const name = `${ghCandidate.first_name ?? ''} ${ghCandidate.last_name ?? ''}`.trim() || 'Unknown'
  const email = ghCandidate.email_addresses?.[0]?.value ?? ''

  if (!email) {
    return NextResponse.json(
      { error: 'Candidate has no email address in Greenhouse.' },
      { status: 422 }
    )
  }

  // Find matching application for the given Greenhouse job ID
  let greenhouseApplicationId: number | null = null
  if (jobId) {
    const jobIdNum = parseInt(jobId, 10)
    const match = applications.find((a) =>
      a.jobs?.some((j) => j.id === jobIdNum)
    )
    if (match) greenhouseApplicationId = match.id
  } else if (applications.length > 0) {
    greenhouseApplicationId = applications[0].id
  }

  // Download and upload CV to storage
  let cvPath: string | null = null
  let cvText: string | null = null

  const resume = (ghCandidate.attachments ?? []).find((a) => a.type === 'resume')
  if (resume?.url) {
    try {
      const cvRes = await fetch(resume.url)
      if (cvRes.ok) {
        const contentType = cvRes.headers.get('content-type') ?? 'application/octet-stream'
        const mimeType = contentType.split(';')[0].trim()
        const buffer = Buffer.from(await cvRes.arrayBuffer())
        const filename = resume.filename ?? `greenhouse-cv-${candidateId}.pdf`
        const storagePath = `${Date.now()}-${filename}`

        const client = getServiceClient()
        const { error: uploadError } = await client.storage
          .from(BUCKET)
          .upload(storagePath, buffer, { contentType: mimeType })

        if (!uploadError) {
          cvPath = storagePath
          try {
            cvText = await extractText(buffer, mimeType)
          } catch {
            // non-fatal — CV stored but text extraction failed
          }
        }
      }
    } catch {
      // non-fatal — proceed without CV
    }
  }

  return NextResponse.json({
    name,
    email,
    cv_path: cvPath,
    cv_text: cvText,
    greenhouse_candidate_id: parseInt(candidateId, 10),
    greenhouse_application_id: greenhouseApplicationId,
  })
}
