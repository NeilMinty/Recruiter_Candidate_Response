import Link from 'next/link'
import { getServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
import { notFound } from 'next/navigation'
import CloseButton from './CloseButton'

async function getCandidate(id: string) {
  const client = getServiceClient()
  const { data, error } = await client
    .from('candidates')
    .select('*, roles(id, title, job_description), evaluations(*)')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

function statusBadge(status: string, hasSent: boolean) {
  if (status === 'active') {
    return <span className="inline-block text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">Active</span>
  }
  if (hasSent) {
    return <span className="inline-block text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">Closed — sent</span>
  }
  return <span className="inline-block text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700">Closed — pending</span>
}

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const candidate = await getCandidate(id)
  if (!candidate) notFound()

  const evaluation = candidate.evaluations?.[0] ?? null
  const hasSent = !!evaluation?.sent_at

  return (
    <div>
      <Link href={`/roles/${candidate.roles?.id}`} className="text-sm text-gray-500 hover:text-gray-900">
        ← {candidate.roles?.title ?? 'Back'}
      </Link>

      <div className="flex items-start justify-between mt-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold">{candidate.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{candidate.email}</p>
        </div>
        {statusBadge(candidate.status, hasSent)}
      </div>

      <div className="space-y-4 mb-8">
        <div className="p-4 bg-white border border-gray-200 rounded">
          <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">CV</p>
          <p className="text-sm">{candidate.cv_path ? 'Uploaded' : <span className="text-gray-400">Not provided</span>}</p>
        </div>
        <div className="p-4 bg-white border border-gray-200 rounded">
          <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Interview transcript</p>
          <p className="text-sm">{candidate.transcript_path ? 'Uploaded' : <span className="text-gray-400">Not provided</span>}</p>
        </div>
        <div className="p-4 bg-white border border-gray-200 rounded">
          <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Recruiter notes</p>
          <p className="text-sm whitespace-pre-wrap">{candidate.recruiter_notes ?? <span className="text-gray-400">None</span>}</p>
        </div>
      </div>

      {candidate.status === 'active' && (
        <CloseButton candidateId={id} hasCV={!!candidate.cv_path} />
      )}

      {evaluation && (
        <div className="mt-8">
          <h2 className="text-base font-medium mb-4">Evaluation</h2>

          <div className="space-y-4">
            <div className="p-4 bg-white border border-gray-200 rounded">
              <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Assessment</p>
              <p className="text-sm whitespace-pre-wrap">{evaluation.evaluation_text}</p>
            </div>
            <div className="p-4 bg-white border border-gray-200 rounded">
              <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Evidence statement</p>
              <p className="text-sm whitespace-pre-wrap">{evaluation.evidence_statement}</p>
            </div>
            <div className="p-4 bg-white border border-gray-200 rounded">
              <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Draft message</p>
              <p className="text-sm whitespace-pre-wrap">{evaluation.final_message ?? evaluation.draft_message}</p>
            </div>
          </div>

          {!hasSent && (
            <div className="mt-4">
              <Link
                href={`/candidates/${id}/review`}
                className="bg-gray-900 text-white text-sm px-5 py-2 rounded hover:bg-gray-700 inline-block"
              >
                Review and send →
              </Link>
            </div>
          )}

          {hasSent && (
            <p className="mt-4 text-sm text-green-700">
              Email sent {new Date(evaluation.sent_at).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
