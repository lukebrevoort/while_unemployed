import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { correctTranscription, generateWhisperPrompt } from '@/lib/transcription/corrector'

export const runtime = 'nodejs'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Store last transcription for context continuity
let lastTranscriptionCache: Record<string, string> = {}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get audio blob and optional context from request
    const formData = await request.formData()
    const audioBlob = formData.get('audio') as Blob
    const problemTitle = formData.get('problemTitle') as string | null
    const problemDescription = formData.get('problemDescription') as string | null

    if (!audioBlob) {
      return NextResponse.json({ error: 'No audio provided' }, { status: 400 })
    }

    // Very small blobs from MediaRecorder mid-stream often lack headers; skip them
    if (audioBlob.size < 8192) {
      return NextResponse.json({ text: '' })
    }

    console.log('Blob type:', audioBlob.type, 'size:', audioBlob.size)

    // Convert to File with proper extension based on mime type
    const arrayBuffer = await audioBlob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Determine file extension from mime type
    let extension = 'webm';
    let mimeType = audioBlob.type || 'audio/webm';
    
    if (mimeType.includes('mp4')) {
      extension = 'mp4';
      mimeType = 'audio/mp4';
    } else if (mimeType.includes('mpeg') || mimeType.includes('mp3')) {
      extension = 'mp3';
      mimeType = 'audio/mpeg';
    } else if (mimeType.includes('ogg')) {
      extension = 'ogg';
      mimeType = 'audio/ogg';
    } else if (mimeType.includes('wav')) {
      extension = 'wav';
      mimeType = 'audio/wav';
    } else {
      // Default to webm
      extension = 'webm';
      mimeType = 'audio/webm';
    }
    
    // Create a File object with proper mime type and extension
    const file = new File([buffer], `audio.${extension}`, { 
      type: mimeType,
    })
    
    console.log('File:', file.name, file.size)

    // Get previous transcription for context
    const userKey = user.id
    const previousText = lastTranscriptionCache[userKey]

    // Generate context-aware Whisper prompt
    const whisperPrompt = generateWhisperPrompt({
      previousText,
      problemTitle: problemTitle || undefined,
      problemDescription: problemDescription || undefined,
    })

    console.log('Whisper prompt:', whisperPrompt)

    // Transcribe with Whisper using context prompt
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'en',
      prompt: whisperPrompt,
    })

    console.log('Raw transcription:', transcription.text)

    // Apply correction pipeline
    const correctionResult = await correctTranscription(transcription.text, {
      previousText,
      problemTitle: problemTitle || undefined,
      problemDescription: problemDescription || undefined,
    })

    console.log('Corrected transcription:', correctionResult.correctedText)
    console.log('Validation:', correctionResult.validation)

    // Update cache with corrected text for next chunk
    lastTranscriptionCache[userKey] = correctionResult.correctedText

    return NextResponse.json({
      text: correctionResult.correctedText,
      original: correctionResult.originalText,
      wasAutoCorrected: correctionResult.wasAutoCorrected,
      validation: correctionResult.validation,
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
