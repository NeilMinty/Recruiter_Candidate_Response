'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiFetch } from '@/lib/client'

type ImportState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'done' }
  | { phase: 'error'; message: string }

export default function NewRoleClient({ hasGreenhouseKey }: { hasGreenhouseKey: boolean }) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [imported, setImported] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [ghJobId, setGhJobId] = useState('')
  const [importState, setImportState] = useState<ImportState>({ phase: 'idle' })

  async function handleImport() {
    if (!ghJobId.trim()) return
    setImportState({ phase: 'loading' })
    setImported(false)

    const res = await apiFetch(`/api/greenhouse/job?id=${encodeURIComponent(ghJobId.trim())}`)
    const data = await res.json()

    if (!res.ok) {
      setImportState({ phase: 'error', message: data.error ?? 'Import failed. Please try again.' })
      return
    }

    setTitle(data.title ?? '')
    setJobDescription(data.job_description ?? '')
    setImported(true)
    setImportState({ phase: 'done' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const res = await apiFetch('/api/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, job_description: jobDescription }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Something went wrong')
      setSubmitting(false)
      return
    }

    const role = await res.json()
    router.push(`/roles/${role.id}`)
  }

  const importDisabled = !hasGreenhouseKey || importState.phase === 'loading'

  return (
    <div>
      <Link
        href="/"
        className="text-[11px] font-medium tracking-widest uppercase text-neutral-500 hover:text-foreground transition-colors"
      >
        ← Roles
      </Link>

      <div className="mt-6 mb-8">
        <p className="text-[11px] font-medium tracking-widest uppercase text-neutral-500 mb-0.5">
          Closure
        </p>
        <h1 className="text-xl font-semibold">New role</h1>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Greenhouse import */}
        <div>
          <label className="block text-[11px] font-medium tracking-widest uppercase text-neutral-500 mb-2">
            Import from Greenhouse
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={ghJobId}
              onChange={(e) => setGhJobId(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (!importDisabled) handleImport() } }}
              placeholder="Greenhouse Job ID"
              disabled={!hasGreenhouseKey}
              className="flex-1 border border-neutral-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-foreground transition-colors disabled:opacity-50 disabled:bg-neutral-50"
            />
            <div title={!hasGreenhouseKey ? 'Configure Greenhouse API key in Settings first.' : undefined}>
              <button
                type="button"
                onClick={handleImport}
                disabled={importDisabled}
                className="bg-white border border-neutral-200 text-xs font-medium px-4 py-2.5 tracking-wide hover:border-neutral-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {importState.phase === 'loading' ? 'Importing...' : 'Import job'}
              </button>
            </div>
          </div>
          {!hasGreenhouseKey && (
            <p className="mt-1.5 text-xs text-neutral-400">
              Greenhouse API key not configured.{' '}
              <Link href="/settings" className="text-accent hover:underline">
                Add it in Settings.
              </Link>
            </p>
          )}
          {importState.phase === 'error' && (
            <p className="mt-1.5 text-xs text-red-600">{importState.message}</p>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-neutral-200" />
          <span className="text-[11px] font-medium tracking-widest uppercase text-neutral-400">Or</span>
          <div className="flex-1 h-px bg-neutral-200" />
        </div>

        {/* Manual fields */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[11px] font-medium tracking-widest uppercase text-neutral-500 mb-2">
              Job title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setImported(false) }}
              required
              className={`w-full border bg-white px-3 py-2.5 text-sm focus:outline-none transition-colors ${
                imported ? 'border-accent/50 focus:border-accent' : 'border-neutral-200 focus:border-foreground'
              }`}
              placeholder="e.g. Senior Product Manager"
            />
            {imported && (
              <p className="mt-1 text-[11px] text-accent">Imported from Greenhouse — you can edit this.</p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-medium tracking-widest uppercase text-neutral-500 mb-2">
              Job description
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => { setJobDescription(e.target.value); setImported(false) }}
              required
              rows={16}
              className={`w-full border bg-white px-3 py-2.5 text-sm focus:outline-none transition-colors font-mono resize-y ${
                imported ? 'border-accent/50 focus:border-accent' : 'border-neutral-200 focus:border-foreground'
              }`}
              placeholder="Paste the full job description here..."
            />
            {imported && (
              <p className="mt-1 text-[11px] text-accent">Imported from Greenhouse — you can edit this.</p>
            )}
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="bg-accent text-white text-xs font-medium px-4 py-2 tracking-wide hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create role'}
            </button>
            <Link
              href="/"
              className="text-xs text-neutral-500 hover:text-foreground transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
