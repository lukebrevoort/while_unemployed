import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function ProblemsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: problems } = await supabase
    .from('problems')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back!
        </h1>
        <p className="mt-2 text-gray-600">
          Select a problem to start practicing
        </p>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {problems && problems.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {problems.map((problem) => (
              <li key={problem.id}>
                <Link
                  href={`/problems/${problem.id}`}
                  className="block hover:bg-gray-50 transition"
                >
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-blue-600 hover:text-blue-800">
                          {problem.title}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                          {problem.description?.substring(0, 150)}...
                        </p>
                      </div>
                      <div className="ml-4 flex items-center gap-3">
                        <span
                          className={`inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium ${problem.difficulty === 'Easy'
                              ? 'bg-green-100 text-green-800'
                              : problem.difficulty === 'Medium'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                        >
                          {problem.difficulty}
                        </span>
                        <svg
                          className="h-5 w-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No problems available yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
