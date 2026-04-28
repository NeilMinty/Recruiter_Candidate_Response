import Link from 'next/link'
import { getServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
import { notFound } from 'next/navigation'

async function getRole(id: string) {
  const client = getServiceClient()
  const { data, error } = await client
    .from('roles')
    .select('id, title, job_description, created_at, candidates(id, name, email, status, created_at)')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

function statusBadge(status: string) {
  if (status === 'active') {
    return <span className="inline-block text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">Active</span>
  }
  return <span className="inline-block text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700">Closed</span>
}

export default async function RoleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const role = await getRole(id)
  if (!role) notFound()

  const candidates = role.candidates ?? []

  return (
    <div>
      <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">← Roles</Link>
      <div className="flex items-start justify-between mt-4 mb-6">
        <h1 className="text-xl font-semibold">{role.title}</h1>
        <Link
          href={`/candidates/new?role=${role.id}`}
          className="bg-gray-900 text-white text-sm px-4 py-2 rounded hover:bg-gray-700 whitespace-nowrap"
        >
          Add candidate
        </Link>
      </div>

      <details className="mb-6">
        <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">Job description</summary>
        <pre className="mt-3 text-sm text-gray-700 whitespace-pre-wrap font-sans border border-gray-200 rounded p-4 bg-white">
          {role.job_description}
        </pre>
      </details>

      <h2 className="text-base font-medium mb-3">Candidates</h2>

      {candidates.length === 0 ? (
        <p className="text-sm text-gray-500">No candidates yet.</p>
      ) : (
        <div className="space-y-2">
          {candidates.map((c: { id: string; name: string; email: string; status: string; created_at: string }) => (
            <Link
              key={c.id}
              href={`/candidates/${c.id}`}
              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded hover:border-gray-400 transition"
            >
              <div>
                <p className="font-medium text-sm">{c.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{c.email}</p>
              </div>
              <div className="flex items-center gap-3">
                {statusBadge(c.status)}
                <span className="text-gray-400 text-sm">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
