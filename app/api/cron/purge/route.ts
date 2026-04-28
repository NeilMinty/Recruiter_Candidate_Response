import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { deleteFile } from '@/lib/upload'

// Called by Vercel Cron. Protected by CRON_SECRET set in vercel.json.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const client = getServiceClient()
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  // Find candidates older than 90 days
  const { data: candidates, error } = await client
    .from('candidates')
    .select('id, cv_path, transcript_path')
    .lt('created_at', cutoff)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let deleted = 0
  for (const candidate of candidates ?? []) {
    // Delete storage files
    if (candidate.cv_path) {
      await deleteFile(candidate.cv_path).catch(() => null)
    }
    if (candidate.transcript_path) {
      await deleteFile(candidate.transcript_path).catch(() => null)
    }

    // Hard-delete candidate (cascades to evaluations and audit_log)
    await client.from('candidates').delete().eq('id', candidate.id)
    deleted++
  }

  return NextResponse.json({ deleted })
}
