'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiFetch } from '@/lib/client'

type ImportState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'done' }
  | { phase: 'error'; message: string }

type NoteTakerSource = 'fireflies' | 'grain' | 'otter'

const NOTE_TAKER_LABELS: Record<NoteTakerSource, string> = {
  fireflies: 'Fireflies',
  grain: 'Grain',
  otter: 'Otter',
}

type NoteTakerFetchState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'done' }
  | { phase: 'error'; message: string }

type BrowseState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'done'; candidates: { id: number; name: string }[] }
  | { phase: 'error'; message: string }

interface ImportedData {
  cv_path: string | null
  cv_text: string | null
  greenhouse_candidate_id: number | null
  greenhouse_application_id: number | null
}

interface Props {
  roleId: string
  greenhouseJobId: string | null
  hasGreenhouseKey: boolean
}

export default function NewCandidateClient({ roleId, greenhouseJobId, hasGreenhouseKey }: Props) {
  const router = useRouter()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [recruiterNotes, setRecruiterNotes] = useState('')
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const cvInputRef = useRef<HTMLInputElement>(null)
  const transcriptInputRef = useRef<HTMLInputElement>(null)

  const [ghCandidateId, setGhCandidateId] = useState('')
  const [importState, setImportState] = useState<ImportState>({ phase: 'idle' })
  const [browseState, setBrowseState] = useState<BrowseState>({ phase: 'idle' })
  const [importedData, setImportedData] = useState<ImportedData | null>(null)

  const [noteTakerSource, setNoteTakerSource] = useState<NoteTakerSource | null>(null)
  const [noteTakerId, setNoteTakerId] = useState('')
  const [noteTakerState, setNoteTakerState] = useState<NoteTakerFetchState>({ phase: 'idle' })

  const ghDisabled = !hasGreenhouseKey
  const ghNoJob = hasGreenhouseKey && !greenhouseJobId

  async function handleImport(candidateId?: string) {
    const id = (candidateId ?? ghCandidateId).trim()
    if (!id) return

    setImportState({ phase: 'loading' })
    setImportedData(null)
    setBrowseState({ phase: 'idle' })

    const params = new URLSearchParams({ id })
    if (greenhouseJobId) params.set('jobId', greenhouseJobId)

    const res = await apiFetch(`/api/greenhouse/candidate?${params}`)
    const data = await res.json()

    if (!res.ok) {
      setImportState({ phase: 'error', message: data.error ?? 'Import failed. Please try again.' })
      return
    }

    setName(data.name ?? '')
    setEmail(data.email ?? '')
    setImportedData({
      cv_path: data.cv_path ?? null,
      cv_text: data.cv_text ?? null,
      greenhouse_candidate_id: data.greenhouse_candidate_id ?? null,
      greenhouse_application_id: data.greenhouse_application_id ?? null,
    })
    setCvFile(null)
    setImportState({ phase: 'done' })
  }

  async function handleBrowse() {
    if (!greenhouseJobId) return
    setBrowseState({ phase: 'loading' })

    const res = await apiFetch(`/api/greenhouse/candidates?jobId=${encodeURIComponent(greenhouseJobId)}`)
    const data = await res.json()

    if (!res.ok) {
      setBrowseState({ phase: 'error', message: data.error ?? 'Browse failed. Please try again.' })
      return
    }

    setBrowseState({ phase: 'done', candidates: data.candidates ?? [] })
  }

  async function handleSelectCandidate(id: number) {
    setGhCandidateId(String(id))
    setBrowseState({ phase: 'idle' })
    await handleImport(String(id))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!cvFile && !importedData?.cv_path) {
      setError('CV is required')
      return
    }
    setError('')
    setSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('role_id', roleId)
      formData.append('name', name)
      formData.append('email', email)
      if (cvFile) {
        formData.append('cv', cvFile)
      } else if (importedData?.cv_path) {
        formData.append('cv_path', importedData.cv_path)
        if (importedData.cv_text) formData.append('cv_text', importedData.cv_text)
      }
      if (transcriptFile) formData.append('transcript', transcriptFile)
      if (recruiterNotes.trim()) formData.append('recruiter_notes', recruiterNotes.trim())
      if (importedData?.greenhouse_candidate_id != null) {
        formData.append('greenhouse_candidate_id', String(importedData.greenhouse_candidate_id))
      }
      if (importedData?.greenhouse_application_id != null) {
        formData.append('greenhouse_application_id', String(importedData.greenhouse_application_id))
      }

      const res = await apiFetch('/api/candidates', { method: 'POST', body: formData })

      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Failed to create candidate')
      }

      const candidate = await res.json()
      router.push(`/candidates/${candidate.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  async function handleFetchTranscript() {
    if (!noteTakerSource || !noteTakerId.trim()) return
    setNoteTakerState({ phase: 'loading' })

    const params = new URLSearchParams({ source: noteTakerSource, id: noteTakerId.trim() })
    const res = await apiFetch(`/api/transcript/fetch?${params}`)
    const data = await res.json()

    if (!res.ok) {
      setNoteTakerState({ phase: 'error', message: data.error ?? 'Failed to fetch transcript.' })
      return
    }

    if (data.transcript_text) {
      const blob = new Blob([data.transcript_text], { type: 'text/plain' })
      const file = new File([blob], `${noteTakerSource}-transcript.txt`, { type: 'text/plain' })
      setTranscriptFile(file)
    }
    setNoteTakerState({ phase: 'done' })
  }

  function selectNoteTaker(source: NoteTakerSource) {
    setNoteTakerSource(source)
    setNoteTakerId('')
    setNoteTakerState({ phase: 'idle' })
  }

  const imported = importState.phase === 'done' && importedData !== null

  return (
    <div>
      <Link
        href={roleId ? `/roles/${roleId}` : '/'}
        className="text-[11px] font-medium tracking-widests uppercase text-neutral-500 hover:text-foreground transition-colors"
      >
        ← Back
      </Link>

      <div className="mt-6 mb-8">
        <p className="text-[11px] font-medium tracking-widest uppercase text-neutral-500 mb-0.5">
          Candidate
        </p>
        <h1 className="text-xl font-semibold">Add candidate</h1>
      </div>

      <div className="max-w-2xl space-y-6">

        {/* Greenhouse import */}
        <div>
          <label className="block text-[11px] font-medium tracking-widest uppercase text-neutral-500 mb-2">
            Import from Greenhouse
          </label>

          {ghDisabled ? (
            <p className="text-xs text-neutral-400">
              Greenhouse API key not configured.{' '}
              <Link href="/settings" className="text-accent hover:underline">
                Add it in Settings.
              </Link>
            </p>
          ) : ghNoJob ? (
            <p className="text-xs text-neutral-400">
              This role is not linked to a Greenhouse job. Import a role from Greenhouse or add the
              Greenhouse Job ID in the role settings.
            </p>
          ) : (
            <div className="space-y-3">
              {/* Candidate ID input + import button */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={ghCandidateId}
                  onChange={(e) => setGhCandidateId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); handleImport() }
                  }}
                  placeholder="Greenhouse Candidate ID"
                  className="flex-1 border border-neutral-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-foreground transition-colors"
                />
                <button
                  type="button"
                  onClick={() => handleImport()}
                  disabled={importState.phase === 'loading' || !ghCandidateId.trim()}
                  className="bg-white border border-neutral-200 text-xs font-medium px-4 py-2.5 tracking-wide hover:border-neutral-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {importState.phase === 'loading' ? 'Importing...' : 'Import candidate'}
                </button>
              </div>

              {/* Browse button */}
              <div>
                <button
                  type="button"
                  onClick={handleBrowse}
                  disabled={browseState.phase === 'loading'}
                  className="text-[11px] font-medium tracking-widest uppercase text-neutral-500 hover:text-foreground transition-colors disabled:opacity-40"
                >
                  {browseState.phase === 'loading' ? 'Loading...' : 'Browse candidates for this role →'}
                </button>
              </div>

              {/* Browse results */}
              {browseState.phase === 'done' && (
                browseState.candidates.length === 0 ? (
                  <p className="text-xs text-neutral-400">No active candidates found for this role in Greenhouse.</p>
                ) : (
                  <div className="border border-neutral-200 divide-y divide-neutral-100">
                    {browseState.candidates.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectCandidate(c.id)}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-neutral-50 transition-colors flex items-center justify-between"
                      >
                        <span>{c.name}</span>
                        <span className="text-xs text-neutral-400 ml-4">ID {c.id}</span>
                      </button>
                    ))}
                  </div>
                )
              )}
              {browseState.phase === 'error' && (
                <p className="text-xs text-red-600">{browseState.message}</p>
              )}

              {importState.phase === 'error' && (
                <p className="text-xs text-red-600">{importState.message}</p>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-neutral-200" />
          <span className="text-[11px] font-medium tracking-widest uppercase text-neutral-400">Or</span>
          <div className="flex-1 h-px bg-neutral-200" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[11px] font-medium tracking-widest uppercase text-neutral-500 mb-2">
              Full name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setImportedData(d => d ? { ...d } : null) }}
              required
              className={`w-full border bg-white px-3 py-2.5 text-sm focus:outline-none transition-colors ${
                imported ? 'border-accent/50 focus:border-accent' : 'border-neutral-200 focus:border-foreground'
              }`}
            />
            {imported && (
              <p className="mt-1 text-[11px] text-accent">Imported from Greenhouse — you can edit this.</p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-medium tracking-widest uppercase text-neutral-500 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={`w-full border bg-white px-3 py-2.5 text-sm focus:outline-none transition-colors ${
                imported ? 'border-accent/50 focus:border-accent' : 'border-neutral-200 focus:border-foreground'
              }`}
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium tracking-widest uppercase text-neutral-500 mb-2">
              CV <span className="normal-case font-normal tracking-normal">— required to generate evaluation</span>
            </label>
            {imported && importedData?.cv_path ? (
              <div className="border border-dashed border-accent/50 bg-white px-4 py-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-accent">CV imported from Greenhouse</p>
                  <p className="text-xs text-neutral-400 mt-0.5">Stored and ready for evaluation</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setImportedData(null); setImportState({ phase: 'idle' }) }}
                  className="text-xs text-neutral-400 hover:text-foreground transition-colors ml-4"
                >
                  Replace
                </button>
              </div>
            ) : imported && !importedData?.cv_path ? (
              <div className="border border-dashed border-neutral-300 bg-neutral-50 px-4 py-5">
                <p className="text-sm text-neutral-500">No CV found in Greenhouse — upload manually below.</p>
              </div>
            ) : null}
            {!imported || !importedData?.cv_path ? (
              <>
                <button
                  type="button"
                  onClick={() => cvInputRef.current?.click()}
                  className={`w-full border border-dashed px-4 py-8 text-center transition-colors ${
                    cvFile
                      ? 'border-neutral-400 bg-white'
                      : 'border-neutral-300 bg-white hover:border-neutral-400'
                  } ${imported && !importedData?.cv_path ? 'mt-2' : ''}`}
                >
                  {cvFile ? (
                    <div>
                      <p className="text-sm font-medium">{cvFile.name}</p>
                      <p className="text-xs text-neutral-400 mt-1">Click to replace</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-neutral-500">Click to upload CV</p>
                      <p className="text-xs text-neutral-400 mt-1">PDF or .txt · max 10 MB</p>
                    </div>
                  )}
                </button>
                <input
                  ref={cvInputRef}
                  type="file"
                  accept=".pdf,.txt,text/plain,application/pdf"
                  onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
              </>
            ) : null}
          </div>

          <div>
            <label className="block text-[11px] font-medium tracking-widest uppercase text-neutral-500 mb-2">
              Interview transcript <span className="normal-case font-normal tracking-normal">— optional</span>
            </label>
            <div className="border border-dashed border-neutral-300 grid grid-cols-[1fr_auto_1fr]">

              {/* Left: Upload */}
              <div className="p-4 flex flex-col">
                <p className="text-[11px] font-medium tracking-widest uppercase text-neutral-400 mb-3">
                  Upload transcript
                </p>
                <button
                  type="button"
                  onClick={() => transcriptInputRef.current?.click()}
                  className="flex-1 flex flex-col items-center justify-center py-6 text-center hover:bg-neutral-50 transition-colors"
                >
                  {transcriptFile ? (
                    <>
                      <p className="text-sm font-medium">{transcriptFile.name}</p>
                      <p className="text-xs text-neutral-400 mt-1">Click to replace</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-neutral-500">Click to upload transcript</p>
                      <p className="text-xs text-neutral-400 mt-1">PDF or .txt · Teams/Zoom exports accepted · max 10 MB</p>
                    </>
                  )}
                </button>
                <input
                  ref={transcriptInputRef}
                  type="file"
                  accept=".pdf,.txt,text/plain,application/pdf"
                  onChange={(e) => setTranscriptFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
              </div>

              {/* Vertical OR divider */}
              <div className="flex flex-col items-center justify-center px-3">
                <div className="flex-1 w-px bg-neutral-200" />
                <span className="text-[11px] font-medium tracking-widest uppercase text-neutral-400 py-3">Or</span>
                <div className="flex-1 w-px bg-neutral-200" />
              </div>

              {/* Right: Note-taker import */}
              <div className="p-4 flex flex-col">
                <p className="text-[11px] font-medium tracking-widest uppercase text-neutral-400 mb-3">
                  Import from note-taker
                </p>

                {/* Source selector */}
                <div className="flex gap-2 mb-3">
                  {(Object.keys(NOTE_TAKER_LABELS) as NoteTakerSource[]).map((src) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => selectNoteTaker(src)}
                      className={`text-xs font-medium px-3 py-1.5 border transition-colors ${
                        noteTakerSource === src
                          ? 'border-foreground bg-white text-foreground'
                          : 'border-neutral-200 bg-white text-neutral-500 hover:border-neutral-400'
                      }`}
                    >
                      {NOTE_TAKER_LABELS[src]}
                    </button>
                  ))}
                </div>

                {noteTakerSource && (
                  <div className="space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <input
                        type="text"
                        value={noteTakerId}
                        onChange={(e) => { setNoteTakerId(e.target.value); setNoteTakerState({ phase: 'idle' }) }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleFetchTranscript() } }}
                        placeholder="Meeting URL or meeting ID"
                        className="w-full border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-foreground transition-colors"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={handleFetchTranscript}
                        disabled={!noteTakerId.trim() || noteTakerState.phase === 'loading'}
                        className="w-full bg-white border border-neutral-200 text-xs font-medium px-3 py-2 tracking-wide hover:border-neutral-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {noteTakerState.phase === 'loading' ? 'Fetching...' : 'Fetch transcript'}
                      </button>
                      {noteTakerState.phase === 'done' && (
                        <p className="text-xs text-accent">Transcript imported.</p>
                      )}
                      {noteTakerState.phase === 'error' && (
                        <p className="text-xs text-red-600">{noteTakerState.message}</p>
                      )}
                    </div>
                  </div>
                )}

                {!noteTakerSource && (
                  <p className="text-xs text-neutral-400 mt-1">Select a platform above.</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium tracking-widest uppercase text-neutral-500 mb-2">
              Recruiter notes <span className="normal-case font-normal tracking-normal">— optional</span>
            </label>
            <textarea
              value={recruiterNotes}
              onChange={(e) => setRecruiterNotes(e.target.value)}
              rows={5}
              className="w-full border border-neutral-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-foreground transition-colors resize-y"
              placeholder="Any observations from the interview..."
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="bg-accent text-white text-xs font-medium px-4 py-2 tracking-wide hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting ? 'Uploading and saving...' : 'Save candidate'}
            </button>
            <Link
              href={roleId ? `/roles/${roleId}` : '/'}
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
