'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import clsx from 'clsx'

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/clients', label: 'Clients' },
  { href: '/documents', label: 'Documents' },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200 h-16 flex items-center px-4 sm:px-6">
      {/* Logo */}
      <Link href="/dashboard" className="font-serif text-xl font-bold text-ink mr-6 flex-shrink-0">
        Secretary<span className="text-teal">OS</span>
      </Link>

      {/* Desktop nav links */}
      <div className="hidden md:flex items-center gap-0.5 flex-1">
        {links.map(link => (
          <Link key={link.href} href={link.href}
            className={clsx(
              'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              pathname.startsWith(link.href)
                ? 'bg-ink text-white'
                : 'text-gray-500 hover:text-ink hover:bg-gray-100'
            )}>
            {link.label}
          </Link>
        ))}
        <Link href="/mca-data"
          className={clsx(
            'px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5',
            pathname.startsWith('/mca-data')
              ? 'bg-ink text-white'
              : 'text-gray-500 hover:text-ink hover:bg-gray-100'
          )}>
          <span className="w-1.5 h-1.5 rounded-full bg-teal inline-block flex-shrink-0"></span>
          20L+ Companies
        </Link>
      </div>

      {/* Desktop right side */}
      <div className="hidden md:flex items-center gap-3">
        <Link href="/generate"
          className={clsx(
            'btn btn-primary text-xs px-4 py-2',
            pathname.startsWith('/generate') && 'bg-teal-dark'
          )}>
          ✦ Generate
        </Link>
        <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-ink transition-colors">
          Sign out
        </button>
      </div>

      {/* Mobile — Generate shortcut + hamburger */}
      <div className="md:hidden flex items-center gap-2 ml-auto">
        <Link href="/generate" className="btn btn-primary text-xs px-3 py-1.5">
          ✦ Generate
        </Link>
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Menu"
        >
          <div className="w-5 flex flex-col gap-1">
            <span className={clsx('block h-0.5 bg-ink transition-all', menuOpen && 'rotate-45 translate-y-1.5')}></span>
            <span className={clsx('block h-0.5 bg-ink transition-all', menuOpen && 'opacity-0')}></span>
            <span className={clsx('block h-0.5 bg-ink transition-all', menuOpen && '-rotate-45 -translate-y-1.5')}></span>
          </div>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="absolute top-16 left-0 right-0 bg-white border-b border-gray-200 shadow-card md:hidden z-50">
          <div className="px-4 py-3 space-y-1">
            {links.map(link => (
              <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}
                className={clsx(
                  'block px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                  pathname.startsWith(link.href) ? 'bg-ink text-white' : 'text-gray-700 hover:bg-gray-50'
                )}>
                {link.label}
              </Link>
            ))}
            <Link href="/mca-data" onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
              <span className="w-1.5 h-1.5 rounded-full bg-teal"></span>
              20L+ Companies
            </Link>
            <div className="border-t border-gray-100 pt-2 mt-2">
              <button onClick={handleLogout}
                className="block w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50 rounded-lg">
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
