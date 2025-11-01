import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import InterviewInterface from '@/components/problems/InterviewInterface'

export default async function ProblemPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const resolvedParams = await params
  // Fetch the problem
  const { data: problem, error } = await supabase
    .from('problems')
    .select('*')
    .eq('id', resolvedParams.id)
    .single()

  if (error || !problem) {
    notFound()
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="h-screen flex flex-col">
      <InterviewInterface problem={problem} userId={user?.id!} />
    </div>
  )
}
