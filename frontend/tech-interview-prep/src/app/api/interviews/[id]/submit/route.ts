import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { params } = context;
    const { id } = await params;
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { code, language, videoUrl } = await request.json()

    // Update interview session
    const { data: session, error } = await supabase
      .from('interview_sessions')
      .update({
        code_submitted: code,
        language: language,
        video_url: videoUrl,
        ended_at: new Date().toISOString(),
        status: 'completed',
      })
      .eq('id', id)
      .eq('user_id', user.id) // Security: ensure user owns this session
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ session })
  } catch (error) {
    console.error('Submit interview error:', error)
    return NextResponse.json(
      { error: 'Failed to submit interview' },
      { status: 500 }
    )
  }
}
