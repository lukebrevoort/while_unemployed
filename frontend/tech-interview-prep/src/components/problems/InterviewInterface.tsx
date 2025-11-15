"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Editor from "@monaco-editor/react";
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Play,
  Square,
  Send,
  Loader2,
  Wifi,
  WifiOff,
  X,
  Award,
  TrendingUp,
  Target,
  CheckCircle2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import { useInterviewWebSocket, InterviewFeedback } from "@/lib/hooks/useSocket";

interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  starter_code: Record<string, string>;
  test_cases: Array<{ input: string; expected: string; hidden: boolean }>;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  isStreaming?: boolean;
  isSending?: boolean;
}

export default function InterviewInterface({
  problem,
  userId,
}: {
  problem: Problem;
  userId: string;
}) {
  const [language, setLanguage] = useState<"python" | "javascript">("python");
  const [code, setCode] = useState(problem.starter_code?.python || "");
  const [isRecording, setIsRecording] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [output, setOutput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Feedback state
  const [interviewFeedback, setInterviewFeedback] = useState<InterviewFeedback | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // AI Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Push-to-talk state
  const [isPushToTalkActive, setIsPushToTalkActive] = useState(false);
  const [currentTranscription, setCurrentTranscription] = useState("");
  const transcriptionBufferRef = useRef<string[]>([]);
  const pushToTalkAudioRecorderRef = useRef<MediaRecorder | null>(null);

  // Audio listening state
  const [isListening, setIsListening] = useState(false);
  const [silenceDuration, setSilenceDuration] = useState(0);
  const lastSpeechTimeRef = useRef<number>(Date.now());

  // Recording refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Real-time processing refs
  const audioChunksRef = useRef<Blob[]>([]);
  const lastTranscriptionRef = useRef<string>("");
  const audioMimeTypeRef = useRef<string>("audio/webm");

  const supabase = createClient();

  // WebSocket connection
  const handleAIResponse = useCallback((message: string) => {
    console.log("Received AI response:", message);
    
    // Display the response immediately
    setIsAiTyping(false);
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: message,
        timestamp: new Date().toISOString(),
      },
    ]);
  }, []);

  const handleTranscriptionEcho = useCallback((message: string) => {
    // User's transcription confirmed by server
    console.log("Transcription confirmed:", message);
  }, []);

  const handleInterviewEnded = useCallback((feedback: InterviewFeedback | null) => {
    console.log("Interview ended with feedback:", feedback);
    if (feedback) {
      setInterviewFeedback(feedback);
      setShowFeedbackModal(true);
    }
  }, []);

  const {
    isConnected,
    sendTranscription,
    sendCodeUpdate,
    endInterview: wsEndInterview,
  } = useInterviewWebSocket({
    sessionId: sessionId || "temp",
    problemTitle: problem.title,
    problemDescription: problem.description,
    problemId: problem.id,
    onAIResponse: handleAIResponse,
    onTranscriptionEcho: handleTranscriptionEcho,
    onInterviewEnded: handleInterviewEnded,
  });

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load starter code
  useEffect(() => {
    const starterCode = problem.starter_code?.[language] || "";
    setCode(starterCode);
  }, [language, problem]);

  // Track silence duration
  useEffect(() => {
    if (isRecording && isMicOn) {
      const interval = setInterval(() => {
        const timeSinceLastSpeech =
          (Date.now() - lastSpeechTimeRef.current) / 1000;
        setSilenceDuration(timeSinceLastSpeech);

        // Send silence event every 5 seconds if user hasn't spoken
        if (timeSinceLastSpeech >= 5 && timeSinceLastSpeech % 5 < 0.1) {
          sendTranscription("", timeSinceLastSpeech);
        }
      }, 100);

      return () => clearInterval(interval);
    }
  }, [isRecording, isMicOn, sendTranscription]);

  // Send code updates periodically
  useEffect(() => {
    if (isRecording && code) {
      const debounceTimer = setTimeout(() => {
        sendCodeUpdate(code);
      }, 2000); // Send after 2 seconds of no typing

      return () => clearTimeout(debounceTimer);
    }
  }, [code, isRecording, sendCodeUpdate]);

  // Start media stream
  const startMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isCameraOn,
        audio: isMicOn,
      });

      streamRef.current = stream;

      if (videoRef.current && isCameraOn) {
        videoRef.current.srcObject = stream;
      }

      return stream;
    } catch (error) {
      console.error("Error accessing media:", error);
      alert("Could not access camera/microphone");
      return null;
    }
  };

  const stopMedia = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const toggleCamera = async () => {
    if (isCameraOn) {
      if (streamRef.current) {
        const videoTrack = streamRef.current.getVideoTracks()[0];
        if (videoTrack) videoTrack.stop();
      }
      setIsCameraOn(false);
    } else {
      setIsCameraOn(true);
      if (isMicOn || isRecording) {
        stopMedia();
        await startMedia();
      } else {
        await startMedia();
      }
    }
  };

  const toggleMic = async () => {
    if (isMicOn) {
      if (streamRef.current) {
        const audioTrack = streamRef.current.getAudioTracks()[0];
        if (audioTrack) audioTrack.stop();
      }
      setIsMicOn(false);
      setIsListening(false);
    } else {
      setIsMicOn(true);
      if (isCameraOn || isRecording) {
        stopMedia();
        await startMedia();
      } else {
        await startMedia();
      }
    }
  };

  // Push-to-talk: Start listening
  const startPushToTalk = async () => {
    if (!isRecording || !isMicOn) {
      alert("Please start the interview and enable your microphone first");
      return;
    }

    if (isPushToTalkActive) return; // Already active

    console.log("Starting push-to-talk...");
    setIsPushToTalkActive(true);
    setCurrentTranscription("");
    transcriptionBufferRef.current = [];

    // Start audio recording for this push-to-talk session
    try {
      if (!streamRef.current) return;

      const audioStream = new MediaStream(streamRef.current.getAudioTracks());

      let mimeType = "";
      const preferredTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg",
        "audio/mp4",
      ];

      for (const type of preferredTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }

      if (!mimeType) {
        console.error("No supported audio format found");
        return;
      }

      audioMimeTypeRef.current = mimeType;
      const audioRecorder = new MediaRecorder(audioStream, { mimeType });
      audioChunksRef.current = [];

      audioRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      audioRecorder.onstop = async () => {
        // Process when stopped
        console.log("Audio recorder stopped, processing chunks...");
        if (audioChunksRef.current.length > 0) {
          await transcribeAudioChunk();
        }
      };

      // Record in 3-second chunks for real-time transcription
      audioRecorder.start();
      console.log("Audio recorder started");

      const restartInterval = setInterval(() => {
        if (
          pushToTalkAudioRecorderRef.current &&
          pushToTalkAudioRecorderRef.current.state === "recording"
        ) {
          console.log("Stopping and restarting audio recorder for transcription...");
          pushToTalkAudioRecorderRef.current.stop();
          setTimeout(() => {
            if (pushToTalkAudioRecorderRef.current) {
              pushToTalkAudioRecorderRef.current.start();
            }
          }, 100);
        }
      }, 3000);

      (audioRecorder as any).restartInterval = restartInterval;
      pushToTalkAudioRecorderRef.current = audioRecorder;
    } catch (error) {
      console.error("Push-to-talk start error:", error);
      setIsPushToTalkActive(false);
    }
  };

  // Push-to-talk: Stop listening and send message
  const stopPushToTalk = async () => {
    if (!isPushToTalkActive) return;

    console.log("Stopping push-to-talk...");
    setIsPushToTalkActive(false);

    // Stop the audio recorder and wait for final chunk to process
    if (pushToTalkAudioRecorderRef.current) {
      const restartInterval = (pushToTalkAudioRecorderRef.current as any)
        .restartInterval;
      if (restartInterval) {
        clearInterval(restartInterval);
      }

      // Stop the recorder - this triggers onstop which processes final chunk
      if (pushToTalkAudioRecorderRef.current.state !== "inactive") {
        console.log("Stopping recorder for final chunk processing...");
        pushToTalkAudioRecorderRef.current.stop();
        
        // Wait longer for final transcription to complete (increased from 2s to 3s)
        console.log("Waiting for final transcription to process...");
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      pushToTalkAudioRecorderRef.current = null;
    }

    // Use a ref to get the latest transcription value
    const finalTranscription = transcriptionBufferRef.current.join(" ");
    console.log("Final complete transcription to send:", finalTranscription);

    // Send the complete message
    if (finalTranscription.trim()) {
      const userMessage: Message = {
        role: "user",
        content: finalTranscription,
        timestamp: new Date().toISOString(),
        isSending: true,
      };

      setMessages((prev) => [...prev, userMessage]);

      // Clear transcription
      setCurrentTranscription("");
      transcriptionBufferRef.current = [];

      // Send COMPLETE message to backend (not chunks)
      console.log("Sending complete message to backend:", finalTranscription);
      sendTranscription(finalTranscription, 0);

      // Mark as sent and show AI typing
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((msg, idx) =>
            idx === prev.length - 1 ? { ...msg, isSending: false } : msg,
          ),
        );
        setIsAiTyping(true);
        console.log("Waiting for AI response...");
      }, 300);
    } else {
      console.log("No transcription to send");
    }
  };

  // Real-time audio transcription with WebSocket
  const startAudioTranscription = async (stream: MediaStream) => {
    if (!isMicOn) return;

    try {
      const audioStream = new MediaStream(stream.getAudioTracks());

      // Try different mime types in order of preference for OpenAI Whisper
      let mimeType = "";
      const preferredTypes = [
        "audio/mp4",
        "audio/mpeg",
        "audio/ogg",
        "audio/wav",
        "audio/webm;codecs=opus",
        "audio/webm",
      ];

      for (const type of preferredTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }

      if (!mimeType) {
        console.error("No supported audio format found");
        return;
      }

      console.log("Using audio format:", mimeType);
      audioMimeTypeRef.current = mimeType;

      const audioRecorder = new MediaRecorder(audioStream, { mimeType });
      audioChunksRef.current = [];

      audioRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      audioRecorder.onstop = async () => {
        // Process when stopped
        if (audioChunksRef.current.length > 0) {
          await transcribeAudioChunk();
        }
      };

      // Start recording with timeslice - this creates complete chunks with headers
      audioRecorder.start();

      // Stop and restart every 3 seconds to get complete audio files with headers
      const restartInterval = setInterval(() => {
        if (
          audioRecorderRef.current &&
          audioRecorderRef.current.state === "recording"
        ) {
          audioRecorderRef.current.stop();
          // Small delay then restart
          setTimeout(() => {
            if (audioRecorderRef.current) {
              audioRecorderRef.current.start();
            }
          }, 100);
        }
      }, 3000);

      // Store interval reference for cleanup
      (audioRecorder as any).restartInterval = restartInterval;

      audioRecorderRef.current = audioRecorder;
      setIsListening(true);
    } catch (error) {
      console.error("Audio transcription error:", error);
    }
  };

  // Transcribe audio chunk and send via WebSocket
  const transcribeAudioChunk = async () => {
    console.log("transcribeAudioChunk called, chunks:", audioChunksRef.current.length);
    
    if (audioChunksRef.current.length === 0) {
      console.log("No audio chunks to process");
      return;
    }

    try {
      // Create a complete audio blob from all accumulated chunks
      const audioBlob = new Blob(audioChunksRef.current, {
        type: audioMimeTypeRef.current,
      });

      // Clear chunks after creating blob
      audioChunksRef.current = [];

      // Skip very small audio files (likely silence or incomplete)
      if (audioBlob.size < 10000) {
        console.log("Skipping small audio chunk:", audioBlob.size);
        return;
      }
      
      console.log("Sending audio blob to transcription API, size:", audioBlob.size);
      const formData = new FormData();
      formData.append("audio", audioBlob, "audio.webm");
      formData.append("problemTitle", problem.title);
      formData.append("problemDescription", problem.description);

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        console.error("Transcription API error:", response.status);
        return;
      }

      const { text, wasAutoCorrected, validation } = await response.json();
      console.log("Received transcription:", text);
      
      if (wasAutoCorrected) {
        console.log("Transcription was auto-corrected");
      }
      
      if (validation && validation.confidence < 0.7) {
        console.warn("Low confidence transcription:", validation.confidence, validation.issues);
      }

      if (text && text.trim().length > 0) {
        console.log("Processing transcription, text:", text);
        
        // Add transcribed text to buffer for streaming display
        transcriptionBufferRef.current.push(text);

        // Update streaming transcription display (just for user to see)
        setCurrentTranscription((prev) => {
          const newText = prev ? `${prev} ${text}` : text;
          console.log("Updated current transcription:", newText);
          return newText;
        });

        // DON'T send to backend yet - wait until user stops push-to-talk
        console.log("Transcription buffered locally (not sent to backend yet)");
      } else {
        console.log("Empty or whitespace-only transcription");
      }
    } catch (error) {
      console.error("Transcription error:", error);
    }
  };

  // Finalize the user message after 3 seconds of silence
  const finalizeUserMessage = () => {
    if (currentTranscription.trim()) {
      // Show the message as "sending" animation
      const userMessage: Message = {
        role: "user",
        content: currentTranscription,
        timestamp: new Date().toISOString(),
        isSending: true,
      };

      setMessages((prev) => [...prev, userMessage]);

      // Clear the streaming transcription
      setCurrentTranscription("");
      transcriptionBufferRef.current = [];

      // After brief delay, mark as sent and show AI is typing
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((msg, idx) =>
            idx === prev.length - 1 ? { ...msg, isSending: false } : msg,
          ),
        );
        setIsAiTyping(true);
      }, 300);
    }
  };

  // Start interview
  const startInterview = async () => {
    if (!isCameraOn && !isMicOn) {
      alert("Please enable camera or microphone first");
      return;
    }

    if (!isConnected) {
      alert("WebSocket not connected. Please wait...");
      return;
    }

    try {
      // Create session
      const response = await fetch("/api/interviews/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemId: problem.id }),
      });
      const { session } = await response.json();
      setSessionId(session.id);

      // Start recording
      const stream = await startMedia();
      if (!stream) return;

      recordedChunksRef.current = [];

      const options = { mimeType: "video/webm;codecs=vp9,opus" };
      const mediaRecorder = new MediaRecorder(stream, options);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      // Add introductory message when the interview starts
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          role: "assistant",
          content: `Hi! Let's work on ${problem.title}. Take a moment to read the problem, and when you're ready, click "Start Listening" to explain your initial approach.`,
          timestamp: new Date().toISOString(),
        },
      ]);

      // Note: We don't auto-start audio transcription anymore - user clicks button
    } catch (error) {
      console.error("Start interview error:", error);
      alert("Failed to start interview");
    }
  };

  // Stop interview
  const stopInterview = async () => {
    // Stop push-to-talk if active
    if (isPushToTalkActive) {
      await stopPushToTalk();
    }

    // Stop push-to-talk recorder
    if (pushToTalkAudioRecorderRef.current) {
      const restartInterval = (pushToTalkAudioRecorderRef.current as any)
        .restartInterval;
      if (restartInterval) {
        clearInterval(restartInterval);
      }
      pushToTalkAudioRecorderRef.current.stop();
      pushToTalkAudioRecorderRef.current = null;
    }

    // End WebSocket session
    wsEndInterview();

    // Stop main recording
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
      await saveRecording(blob);

      setIsRecording(false);
      stopMedia();
    }
  };

  // Save recording to Supabase Storage
  const saveRecording = async (blob: Blob) => {
    try {
      if (!sessionId) {
        console.error("No session ID");
        return null;
      }

      const fileName = `${userId}/${problem.id}/${sessionId}.webm`;

      const { data, error } = await supabase.storage
        .from("interview-recordings")
        .upload(fileName, blob, {
          contentType: "video/webm",
          upsert: true,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("interview-recordings")
        .getPublicUrl(fileName);

      const videoUrl = urlData.publicUrl;

      await fetch(`/api/interviews/${sessionId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language,
          videoUrl,
        }),
      });

      alert("Interview submitted successfully!");
      return videoUrl;
    } catch (error) {
      console.error("Save recording error:", error);
      alert("Failed to save recording");
      return null;
    }
  };

  // Send message to AI (text fallback when mic is off)
  const sendMessage = async () => {
    if (!inputMessage.trim() || isAiTyping) return;

    const userMessage: Message = {
      role: "user",
      content: inputMessage,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsAiTyping(true);

    // Send via WebSocket
    sendTranscription(inputMessage, 0);
  };

  // Run code
  const runCode = () => {
    setOutput("Code execution coming soon...\n\nYour code:\n" + code);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      stopMedia();
      if (pushToTalkAudioRecorderRef.current) {
        const restartInterval = (pushToTalkAudioRecorderRef.current as any)
          .restartInterval;
        if (restartInterval) {
          clearInterval(restartInterval);
        }
        if (pushToTalkAudioRecorderRef.current.state !== "inactive") {
          pushToTalkAudioRecorderRef.current.stop();
        }
      }
    };
  }, []);

  return (
    <div className="flex h-full">
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Left Panel: Problem Description and Chat Box (Tabbed) */}
      <div className="w-1/3 border-r border-gray-200 overflow-y-auto bg-white">
        <div className="p-6">
          <TabGroup>
            <TabList className="flex justify-around mb-4 gap-2">
              <Tab className="flex-1 text-white bg-blue-600 px-4 py-2 rounded-full hover:bg-blue-700 transition focus:outline-none data-[selected]:bg-blue-800 data-[selected]:font-semibold">
                Description
              </Tab>
              <Tab className="flex-1 text-white bg-blue-600 px-4 py-2 rounded-full hover:bg-blue-700 transition focus:outline-none data-[selected]:bg-blue-800 data-[selected]:font-semibold">
                Interviewer
              </Tab>
            </TabList>

            <TabPanels>
              {/* Description Tab */}
              <TabPanel>
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {problem.title}
                  </h1>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      problem.difficulty === "Easy"
                        ? "bg-green-100 text-green-800"
                        : problem.difficulty === "Medium"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
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
                  <h3 className="text-lg font-semibold mb-3 text-gray-900">
                    Test Cases
                  </h3>
                  {problem.test_cases?.map((testCase, idx) => (
                    <div
                      key={idx}
                      className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200"
                    >
                      <div className="mb-2">
                        <span className="font-medium text-gray-900">
                          Input:
                        </span>
                        <code className="ml-2 text-sm bg-green-100 px-2 py-1 rounded text-gray-800">
                          {testCase.input}
                        </code>
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">
                          Expected:
                        </span>
                        <code className="ml-2 text-sm bg-green-100 px-2 py-1 rounded text-gray-800">
                          {testCase.expected}
                        </code>
                      </div>
                    </div>
                  ))}
                </div>
              </TabPanel>

              {/* Interviewer Tab */}
              <TabPanel>
                <div className="flex flex-col h-[calc(100vh-200px)]">
                  <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-blue-600 rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-white text-lg">
                          AI Interviewer
                        </h3>
                        <p className="text-sm font-medium text-blue-100 mt-1 flex items-center gap-2">
                          {isRecording ? (
                            isPushToTalkActive ? (
                              <>
                                <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                                Recording your response...
                              </>
                            ) : (
                              <>
                                <span className="w-2 h-2 bg-yellow-400 rounded-full" />
                                Click "Start Listening" to speak
                              </>
                            )
                          ) : (
                            "Start interview to begin"
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isConnected ? (
                          <Wifi className="text-green-300" size={20} />
                        ) : (
                          <WifiOff className="text-red-300" size={20} />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                    {messages.length === 0 && !currentTranscription ? (
                      <div className="text-center text-gray-500 mt-8">
                        <p className="text-sm">No messages yet</p>
                        <p className="text-xs mt-2">
                          Enable your camera/mic and click Start to begin!
                        </p>
                      </div>
                    ) : (
                      <>
                        {messages.map((msg, idx) => (
                          <div
                            key={idx}
                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
                          >
                            <div
                              className={`max-w-[85%] p-3 rounded-lg text-sm shadow-sm transition-all ${
                                msg.role === "user"
                                  ? msg.isSending
                                    ? "bg-blue-400 text-white rounded-br-none opacity-70 scale-95"
                                    : "bg-blue-600 text-white rounded-br-none"
                                  : "bg-white text-gray-900 border border-gray-200 rounded-bl-none"
                              }`}
                            >
                              {msg.content}
                            </div>
                          </div>
                        ))}

                        {/* Current streaming transcription */}
                        {currentTranscription && (
                          <div className="flex justify-end">
                            <div className="max-w-[85%] p-3 rounded-lg text-sm shadow-sm bg-blue-300 text-white rounded-br-none border-2 border-blue-400 border-dashed animate-pulse">
                              <span className="inline-flex items-center gap-2">
                                <Mic size={14} className="animate-pulse" />
                                {currentTranscription}
                              </span>
                            </div>
                          </div>
                        )}

                        {isAiTyping && !currentTranscription && (
                          <div className="flex justify-start">
                            <div className="bg-white border border-gray-200 p-3 rounded-lg shadow-sm">
                              <div className="flex gap-1">
                                <div
                                  className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                                  style={{ animationDelay: "0ms" }}
                                ></div>
                                <div
                                  className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                                  style={{ animationDelay: "150ms" }}
                                ></div>
                                <div
                                  className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                                  style={{ animationDelay: "300ms" }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Input - Push-to-talk or text input */}
                  {isMicOn && isRecording ? (
                    <div className="p-4 border-t border-gray-200 bg-white">
                      <div className="flex flex-col gap-3">
                        {/* Push-to-talk button */}
                        <button
                          onClick={
                            isPushToTalkActive
                              ? stopPushToTalk
                              : startPushToTalk
                          }
                          disabled={isAiTyping}
                          className={`w-full py-4 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-3 ${
                            isPushToTalkActive
                              ? "bg-red-600 hover:bg-red-700 animate-pulse shadow-lg"
                              : "bg-green-600 hover:bg-green-700 shadow-md"
                          } disabled:bg-gray-400 disabled:cursor-not-allowed`}
                        >
                          <Mic
                            size={24}
                            className={
                              isPushToTalkActive ? "animate-pulse" : ""
                            }
                          />
                          <span className="text-lg">
                            {isPushToTalkActive
                              ? "Stop Listening"
                              : "Start Listening"}
                          </span>
                        </button>

                        {isPushToTalkActive && currentTranscription && (
                          <div className="text-xs text-gray-600 text-center">
                            <p className="font-medium">
                              Recording... Click "Stop Listening" when done
                            </p>
                          </div>
                        )}

                        {!isPushToTalkActive && !currentTranscription && (
                          <p className="text-xs text-gray-500 text-center">
                            Click the button to start speaking to the AI
                            interviewer
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 border-t border-gray-200 bg-white">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                          placeholder={
                            isRecording
                              ? "Type your response..."
                              : "Start interview first"
                          }
                          disabled={!isRecording || isAiTyping}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-gray-900"
                        />
                        <button
                          onClick={sendMessage}
                          disabled={
                            !isRecording || !inputMessage.trim() || isAiTyping
                          }
                          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                        >
                          <Send size={18} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </TabPanel>
            </TabPanels>
          </TabGroup>
        </div>
      </div>

      {/* Middle Panel - Code Editor */}
      <div className="flex-1 flex flex-col">
        <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setLanguage("python")}
              className={`px-3 py-1 rounded text-sm transition ${
                language === "python"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              Python
            </button>
            <button
              onClick={() => setLanguage("javascript")}
              className={`px-3 py-1 rounded text-sm transition ${
                language === "javascript"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              JavaScript
            </button>
          </div>
          <div className="flex gap-2 items-center">
            {!isConnected && (
              <span className="text-xs text-red-400 flex items-center gap-1">
                <WifiOff size={14} />
                Disconnected
              </span>
            )}
            <button
              onClick={runCode}
              className="px-4 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition"
            >
              Run Code
            </button>
            <button
              onClick={stopInterview}
              disabled={!isRecording}
              className="px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm disabled:bg-gray-600 disabled:cursor-not-allowed transition"
            >
              Submit
            </button>
          </div>
        </div>

        <div className="flex-1">
          <Editor
            height="100%"
            language={language}
            value={code}
            onChange={(value) => setCode(value || "")}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: "on",
              roundedSelection: false,
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        </div>

        <div className="h-32 bg-gray-900 border-t border-gray-700 p-4 overflow-y-auto">
          <div className="text-gray-300 font-mono text-sm whitespace-pre-wrap">
            {output || "Output will appear here..."}
          </div>
        </div>
      </div>

      {/* Floating Camera Panel */}
      <div
        className="fixed bottom-6 right-6 bg-gray-800 rounded-2xl shadow-2xl p-4 z-50"
        style={{ width: "320px" }}
      >
        {isCameraOn ? (
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-48 object-cover rounded-lg mb-3"
              style={{ transform: "scaleX(-1)" }}
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

        <div className="flex items-center justify-center gap-2">
          <button
            onClick={toggleCamera}
            className={`p-3 rounded-full transition ${
              isCameraOn
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-700 hover:bg-gray-600"
            } text-white`}
            title={isCameraOn ? "Turn off camera" : "Turn on camera"}
          >
            {isCameraOn ? <Camera size={20} /> : <CameraOff size={20} />}
          </button>

          <button
            onClick={toggleMic}
            className={`p-3 rounded-full transition ${
              isMicOn
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-700 hover:bg-gray-600"
            } text-white`}
            title={isMicOn ? "Turn off microphone" : "Turn on microphone"}
          >
            {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
          </button>

          <button
            onClick={isRecording ? stopInterview : startInterview}
            disabled={(!isCameraOn && !isMicOn && !isRecording) || !isConnected}
            className={`px-6 py-3 rounded-full font-medium text-white transition flex items-center gap-2 ${
              isRecording
                ? "bg-red-600 hover:bg-red-700 animate-pulse"
                : "bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
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

      {/* Feedback Modal */}
      {showFeedbackModal && interviewFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Award size={40} className="text-yellow-300" />
                  <div>
                    <h2 className="text-3xl font-bold">Interview Complete!</h2>
                    <p className="text-blue-100">Here's your performance feedback</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Overall Grade */}
              <div className="mt-6 bg-white bg-opacity-20 rounded-xl p-6 backdrop-blur">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">Overall Grade</p>
                    <p className="text-6xl font-bold text-white">
                      {interviewFeedback.overall_grade}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-blue-100 text-sm">Score</p>
                    <p className="text-4xl font-bold text-white">
                      {interviewFeedback.overall_score.toFixed(1)}%
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-blue-100 text-xs">Time</p>
                    <p className="text-lg font-semibold">
                      {interviewFeedback.total_time_minutes.toFixed(1)} min
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-100 text-xs">Stages</p>
                    <p className="text-lg font-semibold">
                      {interviewFeedback.stages_completed}/4
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-100 text-xs">Hints Used</p>
                    <p className="text-lg font-semibold">
                      {interviewFeedback.hints_used}/3
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Stage Breakdown */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="text-blue-600" size={24} />
                  <h3 className="text-xl font-bold text-gray-900">Stage Breakdown</h3>
                </div>
                <div className="space-y-4">
                  {Object.entries(interviewFeedback.stage_grades).map(([key, grade]) => (
                    <div
                      key={key}
                      className={`border-2 rounded-xl p-4 ${
                        grade.completed
                          ? "border-green-200 bg-green-50"
                          : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {grade.completed ? (
                            <CheckCircle2 className="text-green-600" size={20} />
                          ) : (
                            <div className="w-5 h-5 border-2 border-gray-400 rounded-full" />
                          )}
                          <h4 className="font-semibold text-gray-900">{grade.stage_name}</h4>
                        </div>
                        <span className="text-lg font-bold text-gray-900">
                          {grade.score.toFixed(0)}%
                        </span>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                        <div
                          className={`h-2 rounded-full ${
                            grade.score >= 80
                              ? "bg-green-600"
                              : grade.score >= 60
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${grade.score}%` }}
                        />
                      </div>

                      {grade.strengths.length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs font-semibold text-green-700 mb-1">
                            Strengths:
                          </p>
                          <ul className="text-sm text-gray-700 space-y-1">
                            {grade.strengths.map((strength, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-green-600 mt-0.5">✓</span>
                                <span>{strength}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {grade.areas_for_improvement.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-orange-700 mb-1">
                            Areas for Improvement:
                          </p>
                          <ul className="text-sm text-gray-700 space-y-1">
                            {grade.areas_for_improvement.map((improvement, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-orange-600 mt-0.5">•</span>
                                <span>{improvement}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Key Strengths */}
              {interviewFeedback.key_strengths.length > 0 && (
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                  <h3 className="text-lg font-bold text-green-900 mb-3 flex items-center gap-2">
                    <CheckCircle2 size={20} />
                    Key Strengths
                  </h3>
                  <ul className="space-y-2">
                    {interviewFeedback.key_strengths.map((strength, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-gray-700">
                        <span className="text-green-600 font-bold mt-0.5">✓</span>
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Key Improvements */}
              {interviewFeedback.key_improvements.length > 0 && (
                <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
                  <h3 className="text-lg font-bold text-orange-900 mb-3 flex items-center gap-2">
                    <Target size={20} />
                    Areas to Focus On
                  </h3>
                  <ul className="space-y-2">
                    {interviewFeedback.key_improvements.map((improvement, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-gray-700">
                        <span className="text-orange-600 font-bold mt-0.5">•</span>
                        <span>{improvement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Next Steps */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <h3 className="text-lg font-bold text-blue-900 mb-3 flex items-center gap-2">
                  <TrendingUp size={20} />
                  Next Steps
                </h3>
                <ul className="space-y-2">
                  {interviewFeedback.next_steps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-700">
                      <span className="text-blue-600 font-bold mt-0.5">→</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Recommended Difficulty: </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        interviewFeedback.difficulty_recommendation === "hard"
                          ? "bg-red-100 text-red-800"
                          : interviewFeedback.difficulty_recommendation === "medium"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {interviewFeedback.difficulty_recommendation.toUpperCase()}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 p-6 rounded-b-2xl border-t border-gray-200">
              <button
                onClick={() => {
                  setShowFeedbackModal(false);
                  // Optionally navigate to problems list
                  window.location.href = "/problems";
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition"
              >
                Continue to Problems
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
