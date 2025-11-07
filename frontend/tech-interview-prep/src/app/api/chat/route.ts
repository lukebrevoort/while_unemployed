import { OpenAI } from 'openai'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { messages, problemTitle, problemDescription, code } = await request.json()

    // System prompt for the AI interviewer
    const systemPrompt = `You are an experienced technical interviewer conducting a coding interview. 

The candidate is working on: "${problemTitle}"
Problem: ${problemDescription}

Current code:
\`\`\`
${code || 'No code written yet'}
\`\`\`

Your role:
1. Ask clarifying questions about their approach
2. Provide hints if they're stuck (but don't give away the solution)
3. Ask about time/space complexity
4. Discuss edge cases
5. Be encouraging but professional

Keep responses concise (2-3 sentences). Ask one question at a time.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Cheaper and faster for MVP
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 150,
    })

    const assistantMessage = completion.choices[0].message.content

    return NextResponse.json({ message: assistantMessage })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: 'Failed to get response from interviewer' },
      { status: 500 }
    )
  }
}
