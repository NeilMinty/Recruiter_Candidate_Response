import { NextRequest } from 'next/server'

export function requireAdmin(req: NextRequest): boolean {
  const secret = req.headers.get('x-admin-secret')
  return secret === process.env.ADMIN_SECRET
}
