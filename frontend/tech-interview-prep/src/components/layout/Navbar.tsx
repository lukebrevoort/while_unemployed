'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'

export default function Navbar({ user }: { user: User }) {
  const supabase = createClient()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="bg-slate-600 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div className="flex justify-between items-center h-16">
        {/* Left side: Logo, Problems, Profile */}
        <div className="flex items-center space-x-8">
          <Link href="/problems" className="flex items-center">
            <span className="text-xl font-bold">
              <span className='text-pink-400'>while</span>
              <span className='text-sky-400'> unemployed:</span>
            </span>
          </Link>
          <Link
            href="/problems"
            className="inline-flex items-center px-1 pt-1 text-sm font-medium text-yellow-400 hover:text-white"
          >
            Problems
          </Link>
          <Link
            href="/profile"
            className="inline-flex items-center px-1 pt-1 text-sm font-medium text-yellow-400 hover:text-white"
          >
            Profile
          </Link>
        </div>
        {/* Right side: Email, Logout */}
        <div className="flex items-center">
          <span className="text-sm text-pink-400 mr-4">
            {user.email}
          </span>
          <button
            onClick={handleLogout}
            className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-sky-400 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Logout
          </button>
        </div>
      </div>

      </div>
    </nav>
  )
}
