import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { role_id, name, email, cv_path, transcript_path, recruiter_notes } = body

  if (!role_id || !name?.trim() || !email?.trim()) {
    return NextResponse.json(
      { error: 'role_id, name, and email are required' },
      { status: 400 }
    )
  }

  const client = getServiceClient()
  const { data, error } = await client
    .from('candidates')
    .insert({
      role_id,
      name: name.trim(),
      email: email.trim(),
      cv_path: cv_path ?? null,
      transcript_path: transcript_path ?? null,
      recruiter_notes: recruiter_notes?.trim() ?? null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
