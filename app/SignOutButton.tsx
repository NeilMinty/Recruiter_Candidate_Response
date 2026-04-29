'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function SignOutButton() {
  const [visible, setVisible] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (pathname === '/login' || pathname === '/demo') {
      setVisible(false)
      return
    }
    setVisible(Boolean(localStorage.getItem('admin_secret')))
  }, [pathname])

  if (!visible) return null

  function handleSignOut() {
    localStorage.removeItem('admin_secret')
    router.replace('/login')
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-[11px] font-medium tracking-widest uppercase text-neutral-500 hover:text-foreground transition-colors"
    >
      Sign out
    </button>
  )
}
