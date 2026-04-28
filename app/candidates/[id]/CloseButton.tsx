'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/client'

export default function CloseButton({
  candidateId,
  hasCV,
}: {
  candidateId: string
  hasCV: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleClose() {
    if (!confirm('Generate evaluation and close this candidate? This cannot be undone.')) return

    setError('')
    setLoading(true)

    const res = await apiFetch(`/api/candidates/${candidateId}/close`, {
      method: 'POST',
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Something went wrong')
      setLoading(false)
      return
    }

    router.refresh()
  }

  if (!hasCV) {
    return (
      <p className="text-sm text-gray-400">
        Upload a CV before closing this candidate.
      </p>
    )
  }

  return (
    <div>
      <button
        onClick={handleClose}
        disabled={loading}
        className="bg-gray-900 text-white text-sm px-5 py-2 rounded hover:bg-gray-700 disabled:opacity-50"
      >
        {loading ? 'Generating evaluation...' : 'Close candidate'}
      </button>
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
    </div>
  )
}
