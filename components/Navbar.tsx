'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import clsx from 'clsx'

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/clients', label: 'Clients' },
  { href: '/documents', label: 'Documents' },
  { href: '/generate', label: 'Generate' },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FDFCF9]/90 backdrop-blur border-b border-slate-100 h-16 flex items-center px-6">
      <Link href="/dashboard" className="font-serif text-xl font-bold text-ink mr-10">
        Secretary<span className="text-gold">OS</span>
      </Link>
      <div className="flex items-center gap-1 flex-1">
        {links.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              pathname.startsWith(link.href)
                ? 'bg-ink text-white'
                : 'text-slate-600 hover:text-ink hover:bg-slate-100'
            )}
          >
            {link.label}
          </Link>
        ))}
      </div>
      <button
        onClick={handleLogout}
        className="text-sm text-slate-500 hover:text-ink transition-colors"
      >
        Sign out
      </button>
    </nav>
  )
}
