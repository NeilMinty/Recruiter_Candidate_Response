import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { title, job_description } = await req.json()

  if (!title?.trim() || !job_description?.trim()) {
    return NextResponse.json(
      { error: 'title and job_description are required' },
      { status: 400 }
    )
  }

  const client = getServiceClient()
  const { data, error } = await client
    .from('roles')
    .insert({ title: title.trim(), job_description: job_description.trim() })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
