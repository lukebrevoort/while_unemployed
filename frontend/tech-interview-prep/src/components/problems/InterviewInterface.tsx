'use client'

import { useState, useRef, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { Camera, CameraOff, Mic, MicOff, Play, Square, Send, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'

interface Problem {
  id: string
  title: string
  description: string
  difficulty: string
  starter_code: Record<string, string>
  test_cases: Array<{ input: string; expected: string; hidden: boolean }>
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function InterviewInterface({ problem, userId }: { problem: Problem; userId: string }) {
  const [language, setLanguage] = useState<'python' | 'javascript'>('python')
  const [code, setCode] = useState(problem.starter_code?.python || '')
  const [isRecording, setIsRecording] = useState(false)
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [isMicOn, setIsMicOn] = useState(false)
  const [output, setOutput] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)

  // AI Chat state
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isAiTyping, setIsAiTyping] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Recording refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const supabase = createClient()

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load starter code
  useEffect(() => {
    const starterCode = problem.starter_code?.[language] || ''
    setCode(starterCode)
  }, [language, problem])

  // Start media stream
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
      console.error('Error accessing media:', error)
      alert('Could not access camera/microphone')
      return null
    }
  }

  const stopMedia = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const toggleCamera = async () => {
    if (isCameraOn) {
      if (streamRef.current) {
        const videoTrack = streamRef.current.getVideoTracks()[0]
        if (videoTrack) videoTrack.stop()
      }
      setIsCameraOn(false)
    } else {
      setIsCameraOn(true)
      if (isMicOn || isRecording) {
        stopMedia()
        await startMedia()
      } else {
        await startMedia()
      }
    }
  }

  const toggleMic = async () => {
    if (isMicOn) {
      if (streamRef.current) {
        const audioTrack = streamRef.current.getAudioTracks()[0]
        if (audioTrack) audioTrack.stop()
      }
      setIsMicOn(false)
    } else {
      setIsMicOn(true)
      if (isCameraOn || isRecording) {
        stopMedia()
        await startMedia()
      } else {
        await startMedia()
      }
    }
  }

  // Start interview
  const startInterview = async () => {
    if (!isCameraOn && !isMicOn) {
      alert('Please enable camera or microphone first')
      return
    }

    try {
      // Create session
      const response = await fetch('/api/interviews/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemId: problem.id }),
      })
      const { session } = await response.json()
      setSessionId(session.id)

      // Start recording
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

      mediaRecorder.start()
      mediaRecorderRef.current = mediaRecorder
      setIsRecording(true)

      // Send initial AI message
      const initialMessage: Message = {
        role: 'assistant',
        content: `Hi! I'm your interviewer today. Let's work on "${problem.title}". Can you start by explaining your initial approach to this problem?`,
      }
      setMessages([initialMessage])
    } catch (error) {
      console.error('Start interview error:', error)
      alert('Failed to start interview')
    }
  }

  // Stop interview
  const stopInterview = async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()

      // Wait for final data
      await new Promise(resolve => setTimeout(resolve, 1000))

      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
      await saveRecording(blob)

      setIsRecording(false)
      stopMedia()
    }
  }

  // Save recording to Supabase Storage
  const saveRecording = async (blob: Blob) => {
    try {
      if (!sessionId) {
        console.error('No session ID')
        return null
      }

      const fileName = `${userId}/${problem.id}/${sessionId}.webm`

      const { data, error } = await supabase.storage
        .from('interview-recordings')
        .upload(fileName, blob, {
          contentType: 'video/webm',
          upsert: true,
        })

      if (error) throw error

      // Get public URL (for display purposes - still private bucket)
      const { data: urlData } = supabase.storage
        .from('interview-recordings')
        .getPublicUrl(fileName)

      const videoUrl = urlData.publicUrl

      // Update session with video URL and code
      await fetch(`/api/interviews/${sessionId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
          videoUrl,
        }),
      })

      alert('Interview submitted successfully!')
      return videoUrl
    } catch (error) {
      console.error('Save recording error:', error)
      alert('Failed to save recording')
      return null
    }
  }

  // Send message to AI
  const sendMessage = async () => {
    if (!inputMessage.trim() || isAiTyping) return

    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsAiTyping(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          problemTitle: problem.title,
          problemDescription: problem.description,
          code,
        }),
      })

      const { message } = await response.json()

      const assistantMessage: Message = {
        role: 'assistant',
        content: message,
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
        },
      ])
    } finally {
      setIsAiTyping(false)
    }
  }

  // Run code (placeholder)
  const runCode = () => {
    setOutput('Code execution coming soon...\n\nYour code:\n' + code)
  }

  // Cleanup
  useEffect(() => {
    return () => {
      stopMedia()
    }
  }, [])

  return (
    <div className="flex h-full">
      {/* Left Panel: Problem Description and Chat Box (Switch key)*/}
      <div className="w-1/3 border-r border-gray-200 overflow-y-auto bg-white">
        <div className="p-6">
          <TabGroup>
            <TabList className="flex justify-around mb-4">
              <Tab className="text-white bg-blue-600 px-3 py-2 rounded-full hover:opacity-90">Description</Tab>
              <Tab className="text-white bg-blue-600 px-3 py-2 rounded-full hover:opacity-90">Interviewer</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>

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
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-3 text-gray-900">Test Cases</h3>
                  {problem.test_cases?.map((testCase, idx) => (
                    <div key={idx} className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="mb-2">
                        <span className="font-medium text-gray-900">Input:</span>
                        <code className="ml-2 text-sm bg-green-100 px-2 py-1 rounded text-gray-800">
                          {testCase.input}
                        </code>
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">Expected:</span>
                        <code className="ml-2 text-sm bg-green-100 px-2 py-1 rounded text-gray-800">
                          {testCase.expected}
                        </code>
                      </div>
                    </div>
                  ))}
                </div>
              </TabPanel>
              <TabPanel>

                {/* Right Panel - AI Chat */}
                <div className="border-l border-gray-200 flex flex-col bg-neutral-50">
                  <div className="p-4 border-b border-gray-200 bg-slate-500">
                    <h3 className="font-bold text-sky-400">AI Interviewer</h3>
                    <p className="text-sm font-bold text-pink-400 mt-1">
                      {isRecording ? 'Interview in progress' : 'Start interview to begin chat'}
                    </p>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-lg text-sm ${msg.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                            }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {isAiTyping && (
                      <div className="flex justify-start">
                        <div className="bg-gray-100 p-3 rounded-lg">
                          <Loader2 className="animate-spin" size={16} />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Input */}
                  <div className="p-4 border-t border-gray-200">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder={isRecording ? 'Type your response...' : 'Start interview first'}
                        disabled={!isRecording || isAiTyping}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-gray-900"
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!isRecording || !inputMessage.trim() || isAiTyping}
                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        <Send size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </TabPanel>
            </TabPanels>
          </TabGroup>





        </div>
      </div>

      {/* Middle Panel - Code Editor */}
      <div className="flex-1 flex flex-col">
        {/* Language Selector */}
        <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setLanguage('python')}
              className={`px-3 py-1 rounded text-sm ${language === 'python'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300'
                }`}
            >
              Python
            </button>
            <button
              onClick={() => setLanguage('javascript')}
              className={`px-3 py-1 rounded text-sm ${language === 'javascript'
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
              className="px-4 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
            >
              Run Code
            </button>
            <button
              onClick={stopInterview}
              disabled={!isRecording}
              className="px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm disabled:bg-gray-600 disabled:cursor-not-allowed"
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



      {/* Messages */}

      {/* Floating Camera Panel - Bottom Right */}
      <div
        className="fixed bottom-6 right-6 bg-gray-800 rounded-2xl shadow-2xl p-4 z-50"
        style={{ width: '320px' }}
      >
        {/* Video Preview */}
        {isCameraOn ? (
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-48 object-cover rounded-lg mb-3"
              style={{ transform: 'scaleX(-1)' }}
            />
            {isRecording && (
              <div className="absolute top-2 right-2 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                REC
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-48 flex items-center justify-center bg-gray-900 rounded-lg mb-3">
            <CameraOff size={48} className="text-gray-600" />
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={toggleCamera}
            className={`p-3 rounded-full transition ${isCameraOn ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'
              } text-white`}
            title={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
          >
            {isCameraOn ? <Camera size={20} /> : <CameraOff size={20} />}
          </button>

          <button
            onClick={toggleMic}
            className={`p-3 rounded-full transition ${isMicOn ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'
              } text-white`}
            title={isMicOn ? 'Turn off microphone' : 'Turn on microphone'}
          >
            {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
          </button>

          <button
            onClick={isRecording ? stopInterview : startInterview}
            disabled={!isCameraOn && !isMicOn && !isRecording}
            className={`px-6 py-3 rounded-full font-medium text-white transition flex items-center gap-2 ${isRecording
              ? 'bg-red-600 hover:bg-red-700 animate-pulse'
              : 'bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed'
              }`}
          >
            {isRecording ? (
              <>
                <Square size={16} />
                Stop
              </>
            ) : (
              <>
                <Play size={16} />
                Start
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
