import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-600">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-4">
          <span className='text-pink-400'>while</span><span className='text-sky-400'> unemployed:</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Practice coding interviews with real-time AI feedback
        </p>
        <div className="space-x-4">
          <Link
            href="/signup"
            className="inline-block px-6 py-3 bg-pink-400 text-white font-medium rounded-lg hover:bg-pink-500 transition"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-white text-sky-500 font-medium rounded-lg border-2 border-blue-500 hover:bg-blue-50 transition"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
