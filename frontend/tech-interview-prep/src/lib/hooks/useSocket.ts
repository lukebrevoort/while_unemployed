import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

interface InterviewFeedback {
  overall_grade: string;
  overall_score: number;
  stages_completed: number;
  total_time_minutes: number;
  hints_used: number;
  confidence_level: number;
  stage_grades: Record<string, {
    stage_name: string;
    score: number;
    strengths: string[];
    areas_for_improvement: string[];
    completed: boolean;
  }>;
  key_strengths: string[];
  key_improvements: string[];
  next_steps: string[];
  difficulty_recommendation: string;
}

interface UseInterviewWebSocketProps {
  sessionId: string;
  problemTitle: string;
  problemDescription: string;
  problemId: string;
  onAIResponse: (message: string) => void;
  onTranscriptionEcho: (message: string) => void;
  onInterviewEnded?: (feedback: InterviewFeedback | null) => void;
}

export function useInterviewWebSocket({
  sessionId,
  problemTitle,
  problemDescription,
  problemId,
  onAIResponse,
  onTranscriptionEcho,
  onInterviewEnded,
}: UseInterviewWebSocketProps) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Connect to WebSocket
    const socket = io("http://localhost:8000", {
      path: "/socket.io/",
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("WebSocket connected");
      setIsConnected(true);

      // Send initial problem data
      socket.emit("init_interview", {
        session_id: sessionId,
        problem_title: problemTitle,
        problem_description: problemDescription,
        problem_id: problemId,
      });
    });

    socket.on("disconnect", () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
    });

    socket.on(
      "ai_response",
      (data: { content: string; should_tts: boolean }) => {
        console.log("AI response:", data);
        onAIResponse(data.content);

        // TODO: Implement TTS if should_tts is true
        if (data.should_tts) {
          // playTTS(data.content)
        }
      },
    );

    socket.on("transcription_echo", (data: { content: string }) => {
      console.log("Transcription echo:", data.content);
      onTranscriptionEcho(data.content);
    });

    socket.on("interview_ended", (data: { content: string; feedback: InterviewFeedback | null }) => {
      console.log("Interview ended:", data);
      if (onInterviewEnded) {
        onInterviewEnded(data.feedback);
      }
    });

    socket.on("error", (error: Error) => {
      console.error("WebSocket error:", error);
    });

    return () => {
      socket.disconnect();
    };
  }, [
    sessionId,
    problemTitle,
    problemDescription,
    problemId,
    onAIResponse,
    onTranscriptionEcho,
    onInterviewEnded,
  ]);

  const sendTranscription = (text: string, silenceDuration: number = 0) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("transcription", {
        content: text,
        silence_duration: silenceDuration,
      });
    }
  };

  const sendCodeUpdate = (code: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("code_update", {
        content: code,
      });
    }
  };

  const endInterview = () => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("end_interview", {});
    }
  };

  return {
    isConnected,
    sendTranscription,
    sendCodeUpdate,
    endInterview,
  };
}

export type { InterviewFeedback };
