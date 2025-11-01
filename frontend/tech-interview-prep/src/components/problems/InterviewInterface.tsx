'use client'

import { useState, useRef, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { Camera, CameraOff, Mic, MicOff, Play, Square, Upload } from 'lucide-react'
import { useInterviewStore } from '@/lib/store/interviewStore'

interface Problem {
  id: string
  title: string
  description: string
  difficulty: string
  starter_code: Record<string, string>
  test_cases: Array<{ input: string; expected: string; hidden: boolean }>
}

interface InterviewInterfaceProps {
  problem: Problem
  userId: string
}

export default function InterviewInterface({ problem, userId }: InterviewInterfaceProps) {
  const [language, setLanguage] = useState<'python' | 'javascript'>('python')
  const [code, setCode] = useState(problem.starter_code?.python || '')
  const [isRecording, setIsRecording] = useState(false)
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [isMicOn, setIsMicOn] = useState(false)
  const [output, setOutput] = useState('')

  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  // Load starter code when language changes
  useEffect(() => {
    const starterCode = problem.starter_code?.[language] || ''
    setCode(starterCode)
  }, [language, problem])

  // Start camera/microphone
  const startMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isCameraOn,
        audio: isMicOn,
      })

      streamRef.current = stream

      if (videoRef.current && isCameraOn) {
        videoRef.current.srcObject = stream
      }

      return stream
    } catch (error) {
      console.error('Error accessing media devices:', error)
      alert('Could not access camera/microphone. Please check permissions.')
      return null
    }
  }

  // Stop media stream
  const stopMedia = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  // Toggle camera
  const toggleCamera = async () => {
    if (isCameraOn) {
      // Turn off camera
      if (streamRef.current) {
        const videoTrack = streamRef.current.getVideoTracks()[0]
        if (videoTrack) videoTrack.stop()
      }
      setIsCameraOn(false)
    } else {
      // Turn on camera
      setIsCameraOn(true)
      if (isMicOn || isRecording) {
        // Restart stream with video
        stopMedia()
        await startMedia()
      }
    }
  }

  // Toggle microphone
  const toggleMic = async () => {
    if (isMicOn) {
      // Turn off mic
      if (streamRef.current) {
        const audioTrack = streamRef.current.getAudioTracks()[0]
        if (audioTrack) audioTrack.stop()
      }
      setIsMicOn(false)
    } else {
      // Turn on mic
      setIsMicOn(true)
      if (isCameraOn || isRecording) {
        // Restart stream with audio
        stopMedia()
        await startMedia()
      }
    }
  }

  // Start recording
  const startRecording = async () => {
    if (!isCameraOn && !isMicOn) {
      alert('Please enable camera or microphone to start recording')
      return
    }

    const stream = await startMedia()
    if (!stream) return

    recordedChunksRef.current = []

    const options = { mimeType: 'video/webm;codecs=vp9,opus' }
    const mediaRecorder = new MediaRecorder(stream, options)

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data)
      }
    }

    mediaRecorder.onstop = async () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
      await saveRecording(blob)
    }

    mediaRecorder.start()
    mediaRecorderRef.current = mediaRecorder
    setIsRecording(true)
  }

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  // Save recording to Supabase Storage
  const saveRecording = async (blob: Blob) => {
    try {
      const fileName = `${userId}/${problem.id}/${Date.now()}.webm`

      // We'll implement this in the next step with Supabase Storage
      console.log('Recording saved:', blob.size, 'bytes')
      alert('Recording saved! (Storage integration coming next)')

      // Download locally for now
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `interview-${problem.id}-${Date.now()}.webm`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error saving recording:', error)
    }
  }

  // Run code (placeholder for now)
  const runCode = () => {
    setOutput('Code execution coming in next phase...\n\nYour code:\n' + code)
  }

  // Submit code
  const submitCode = async () => {
    stopRecording()
    stopMedia()

    // We'll implement full submission logic later
    alert('Interview submitted! (Full implementation coming next)')
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMedia()
    }
  }, [])

  return (
    <div className="flex h-full">
      {/* Left Panel - Problem Description */}
      <div className="w-1/3 border-r border-gray-200 overflow-y-auto bg-white">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">{problem.title}</h1>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${problem.difficulty === 'Easy'
                ? 'bg-green-100 text-green-800'
                : problem.difficulty === 'Medium'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
                }`}
            >
              {problem.difficulty}
            </span>
          </div>

          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-gray-700">
              {problem.description}
            </div>
          </div>

          {/* Test Cases */}
          <div className="mt-6 text-black">
            <h3 className="text-lg font-semibold mb-3">Test Cases</h3>
            {problem.test_cases?.map((testCase, idx) => (
              <div key={idx} className="mb-4 p-4 bg-green-100 rounded-lg">
                <div className="mb-2">
                  <span className="font-medium text-black">Input:</span>
                  <code className="ml-2 text-sm bg-green-200 px-2 py-1 rounded">
                    {testCase.input}
                  </code>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Expected:</span>
                  <code className="ml-2 text-sm bg-green-200 px-2 py-1 rounded"> {testCase.expected}
                  </code>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Code Editor & Video */}
      <div className="flex-1 flex flex-col">
        {/* Video Preview */}

        {/* Language Selector */}
        <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setLanguage('python')}
              className={`px-4 py-1 rounded ${language === 'python'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300'
                }`}
            >
              Python
            </button>
            <button
              onClick={() => setLanguage('javascript')}
              className={`px-4 py-1 rounded ${language === 'javascript'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300'
                }`}
            >
              JavaScript
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={runCode}
              className="px-4 py-1 bg-green-600 hover:bg-green-700 text-white rounded"
            >
              Run Code
            </button>
            <button
              onClick={submitCode}
              className="px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded"
            >
              Submit
            </button>
          </div>
        </div>

        {/* Code Editor */}
        <div className="flex-1">
          <Editor
            height="100%"
            language={language}
            value={code}
            onChange={(value) => setCode(value || '')}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              roundedSelection: false,
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        </div>

        {/* Output Console */}
        <div className="h-32 bg-gray-900 border-t border-gray-700 p-4 overflow-y-auto">
          <div className="text-gray-300 font-mono text-sm whitespace-pre-wrap">
            {output || 'Output will appear here...'}
          </div>
        </div>
      </div>
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 1000,
          background: 'rgba(30,41,59,0.95)',
          borderRadius: '16px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          padding: '16px',
          width: '320px',
        }}
        className="flex flex-col items-center"
      >
        {isCameraOn ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-40 object-cover rounded-lg mb-2"
            style={{ transform: 'scaleX(-1)' }}
          />
        ) : (
          <div className="w-full h-40 flex items-center justify-center text-gray-500 bg-gray-800 rounded-lg mb-2">
            <CameraOff size={48} />
          </div>
        )}
        {/* Controls */}
        <div className="flex gap-2 mt-2">
          <button
            onClick={toggleCamera}
            className={`p-3 rounded-full ${isCameraOn ? 'bg-blue-600' : 'bg-gray-700'
              } text-white hover:opacity-80 transition`}
          >
            {isCameraOn ? <Camera size={20} /> : <CameraOff size={20} />}
          </button>
          <button
            onClick={toggleMic}
            className={`p-3 rounded-full ${isMicOn ? 'bg-blue-600' : 'bg-gray-700'
              } text-white hover:opacity-80 transition`}
          >
            {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
          </button>
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`px-6 py-3 rounded-full font-medium ${isRecording
              ? 'bg-red-600 hover:bg-red-700 animate-pulse'
              : 'bg-green-600 hover:bg-green-700'
              } text-white transition`}
          >
            {isRecording ? (
              <>
                <Square size={16} className="inline mr-2" />
                Stop
              </>
            ) : (
              <>
                <Play size={16} className="inline mr-2" />
                Record
              </>
            )}
          </button>
        </div>
      </div>

    </div>
  )
}
