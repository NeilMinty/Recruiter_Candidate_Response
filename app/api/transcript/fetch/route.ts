import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'

// TODO: implement Fireflies/Grain/Otter API calls — scaffolded for future integration

const VALID_SOURCES = ['fireflies', 'grain', 'otter'] as const
type TranscriptSource = (typeof VALID_SOURCES)[number]

export async function GET(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const source = req.nextUrl.searchParams.get('source')?.trim() as TranscriptSource | null
  const meetingId = req.nextUrl.searchParams.get('id')?.trim()

  if (!source || !VALID_SOURCES.includes(source)) {
    return NextResponse.json(
      { error: 'source must be one of: fireflies, grain, otter' },
      { status: 400 }
    )
  }

  if (!meetingId) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  console.log(`[transcript/fetch] source=${source} id=${meetingId}`)

  // When implemented, return: { transcript_text: string }
  return NextResponse.json(
    { error: `${source.charAt(0).toUpperCase() + source.slice(1)} integration is not yet implemented.` },
    { status: 501 }
  )
}
