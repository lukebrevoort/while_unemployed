import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { toFile } from 'openai/uploads'
import OpenAI from 'openai'

export const runtime = 'nodejs'

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

    // Get audio blob from request
    const formData = await request.formData()
    const audioBlob = formData.get('audio') as Blob

    if (!audioBlob) {
      return NextResponse.json({ error: 'No audio provided' }, { status: 400 })
    }

    // Very small blobs from MediaRecorder mid-stream often lack headers; skip them
    if (audioBlob.size < 8192) {
      return NextResponse.json({ text: '' })
    }

    console.log('Blob type:', audioBlob.type, 'size:', audioBlob.size)

    // Ensure a clean MIME type without codec params so OpenAI can infer the container
    const baseType = (audioBlob.type || 'audio/webm').split(';')[0]
    const ab = await audioBlob.arrayBuffer()
    const cleanBlob = new Blob([ab], { type: baseType })
    const ext = baseType.includes('ogg') ? 'ogg' : baseType.includes('mp4') ? 'mp4' : baseType.includes('wav') ? 'wav' : baseType.includes('mpeg') || baseType.includes('mp3') ? 'mp3' : baseType.includes('webm') ? 'webm' : 'webm'
    const file = await toFile(cleanBlob, `audio.${ext}`)
    console.log('File:', file.name, file.type, file.size)

    // Transcribe with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'en',
    })

    return NextResponse.json({
      text: transcription.text,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Transcription error:', error)
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 },
    )
  }
}
