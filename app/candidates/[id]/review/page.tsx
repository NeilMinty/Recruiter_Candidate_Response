import { getServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
import { notFound, redirect } from 'next/navigation'
import ReviewForm from './ReviewForm'

async function getEvaluation(candidateId: string) {
  const client = getServiceClient()
  const { data: candidate, error } = await client
    .from('candidates')
    .select('id, name, email, status, evaluations(*)')
    .eq('id', candidateId)
    .single()

  if (error || !candidate) return null
  return candidate
}

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const candidate = await getEvaluation(id)

  if (!candidate) notFound()

  const evaluation = candidate.evaluations?.[0]
  if (!evaluation) redirect(`/candidates/${id}`)
  if (evaluation.sent_at) redirect(`/candidates/${id}`)

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Review and send</h1>
      <p className="text-sm text-gray-500 mb-6">
        To: {candidate.name} &lt;{candidate.email}&gt;
      </p>

      <div className="space-y-6 max-w-2xl">
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Assessment</h2>
          <div className="p-4 bg-white border border-gray-200 rounded text-sm whitespace-pre-wrap">
            {evaluation.evaluation_text}
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Evidence statement</h2>
          <div className="p-4 bg-white border border-gray-200 rounded text-sm whitespace-pre-wrap">
            {evaluation.evidence_statement}
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Draft message — edit before sending</h2>
          <ReviewForm
            candidateId={id}
            evaluationId={evaluation.id}
            draftMessage={evaluation.draft_message}
          />
        </section>
      </div>
    </div>
  )
}
