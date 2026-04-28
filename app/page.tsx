import Link from 'next/link'
import { getServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

async function getRoles() {
  const client = getServiceClient()
  const { data, error } = await client
    .from('roles')
    .select('id, title, created_at, candidates(id, status)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export default async function DashboardPage() {
  const roles = await getRoles()

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Closure</h1>
          <p className="text-sm text-gray-500 mt-1">Candidate rejection, done properly.</p>
        </div>
        <Link
          href="/roles/new"
          className="bg-gray-900 text-white text-sm px-4 py-2 rounded hover:bg-gray-700"
        >
          New role
        </Link>
      </div>

      {roles.length === 0 ? (
        <p className="text-gray-500 text-sm">No roles yet. Create one to get started.</p>
      ) : (
        <div className="space-y-3">
          {roles.map((role) => {
            const candidates = role.candidates ?? []
            const active = candidates.filter((c: { status: string }) => c.status === 'active').length
            const closed = candidates.filter((c: { status: string }) => c.status === 'closed').length
            return (
              <Link
                key={role.id}
                href={`/roles/${role.id}`}
                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded hover:border-gray-400 transition"
              >
                <div>
                  <p className="font-medium">{role.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {candidates.length} candidate{candidates.length !== 1 ? 's' : ''}
                    {active > 0 && ` · ${active} active`}
                    {closed > 0 && ` · ${closed} closed`}
                  </p>
                </div>
                <span className="text-gray-400 text-sm">→</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
