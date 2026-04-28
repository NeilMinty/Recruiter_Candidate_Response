'use client'

// Client-side fetch helper that injects the admin secret from localStorage
export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const secret =
    typeof window !== 'undefined' ? localStorage.getItem('admin_secret') ?? '' : ''

  return fetch(path, {
    ...options,
    headers: {
      'x-admin-secret': secret,
      ...(options.headers ?? {}),
    },
  })
}
