'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/client'

export default function ReviewForm({
  candidateId,
  evaluationId,
  draftMessage,
}: {
  candidateId: string
  evaluationId: string
  draftMessage: string
}) {
  const router = useRouter()
  const [message, setMessage] = useState(draftMessage)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  async function handleSend() {
    if (!message.trim()) {
      setError('Message cannot be empty')
      return
    }

    if (
      !confirm(
        'Send this email to the candidate? This action cannot be undone.'
      )
    )
      return

    setError('')
    setSending(true)

    const res = await apiFetch(`/api/candidates/${candidateId}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evaluation_id: evaluationId,
        final_message: message,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Send failed')
      setSending(false)
      return
    }

    router.push(`/candidates/${candidateId}`)
    router.refresh()
  }

  return (
    <div className="space-y-3">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={12}
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-600 font-sans"
      />

      <p className="text-xs text-gray-400">
        {message.trim().split(/\s+/).filter(Boolean).length} words
      </p>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        onClick={handleSend}
        disabled={sending}
        className="bg-gray-900 text-white text-sm px-5 py-2 rounded hover:bg-gray-700 disabled:opacity-50"
      >
        {sending ? 'Sending...' : 'Approve and send'}
      </button>
    </div>
  )
}
