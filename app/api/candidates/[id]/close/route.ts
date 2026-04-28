import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'
import { runEvaluationAgent } from '@/lib/agent'
import { downloadFile } from '@/lib/upload'
import { extractText } from '@/lib/pdf'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const client = getServiceClient()

  // Load candidate with role
  const { data: candidate, error: candError } = await client
    .from('candidates')
    .select('*, roles(job_description)')
    .eq('id', id)
    .single()

  if (candError || !candidate) {
    return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
  }

  if (candidate.status !== 'active') {
    return NextResponse.json(
      { error: 'Candidate is already closed' },
      { status: 400 }
    )
  }

  if (!candidate.cv_path) {
    return NextResponse.json(
      { error: 'CV is required to close a candidate' },
      { status: 400 }
    )
  }

  const jobDescription = candidate.roles?.job_description
  if (!jobDescription) {
    return NextResponse.json(
      { error: 'Role job description not found' },
      { status: 400 }
    )
  }

  // Extract text from CV
  const cvBuffer = await downloadFile(candidate.cv_path)
  const cvExt = candidate.cv_path.split('.').pop()?.toLowerCase()
  const cvMime = cvExt === 'pdf' ? 'application/pdf' : 'text/plain'
  const cvText = await extractText(cvBuffer, cvMime)

  // Extract text from transcript if present
  let transcriptText: string | null = null
  if (candidate.transcript_path) {
    const tBuffer = await downloadFile(candidate.transcript_path)
    const tExt = candidate.transcript_path.split('.').pop()?.toLowerCase()
    const tMime = tExt === 'pdf' ? 'application/pdf' : 'text/plain'
    transcriptText = await extractText(tBuffer, tMime)
  }

  // Run agent
  const result = await runEvaluationAgent({
    jobDescription,
    cvText,
    transcriptText,
    recruiterNotes: candidate.recruiter_notes ?? null,
  })

  // Save evaluation
  const { data: evaluation, error: evalError } = await client
    .from('evaluations')
    .insert({
      candidate_id: id,
      evaluation_text: result.evaluation,
      evidence_statement: result.evidence_statement,
      draft_message: result.draft_message,
    })
    .select()
    .single()

  if (evalError) {
    return NextResponse.json({ error: evalError.message }, { status: 500 })
  }

  // Update candidate status
  await client
    .from('candidates')
    .update({ status: 'closed' })
    .eq('id', id)

  // Audit log
  await client.from('audit_log').insert({
    candidate_id: id,
    event: 'evaluation_generated',
    detail: `Evaluation ${evaluation.id} created`,
  })

  return NextResponse.json(evaluation, { status: 201 })
}
