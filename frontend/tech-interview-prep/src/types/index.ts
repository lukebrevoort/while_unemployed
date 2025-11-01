export interface Problem {
  id: string
  title: string
  description: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  starter_code?: Record<string, string>
  test_cases?: TestCase[]
  created_at: string
}

export interface TestCase {
  input: string
  expected: string
  hidden: boolean
}

export interface InterviewSession {
  id: string
  user_id: string
  problem_id: string
  started_at: string
  ended_at?: string
  status: 'in_progress' | 'completed' | 'abandoned'
  code_submitted?: string
  language?: string
}

export interface UserProfile {
  id: string
  username?: string
  avatar_url?: string
  created_at: string
}
