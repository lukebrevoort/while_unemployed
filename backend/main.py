from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio
from agent.agent import (
    create_interviewer_agent, 
    process_transcription, 
    generate_interview_feedback,
    InterviewStage
)
from typing import Dict
from datetime import datetime

# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=["http://localhost:3000"],
    logger=True,
    engineio_logger=True,
)

# Create FastAPI app
app = FastAPI()

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store active sessions
active_sessions: Dict[str, tuple] = {}
# Store ongoing transcription buffers for each session
transcription_buffers: Dict[str, list] = {}


@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")
    return True


@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")
    if sid in active_sessions:
        del active_sessions[sid]
    if sid in transcription_buffers:
        del transcription_buffers[sid]


@sio.event
async def init_interview(sid, data):
    """Initialize interview session"""
    print(f"Initializing interview for session {sid}")

    problem_title = data.get("problem_title")
    problem_description = data.get("problem_description")
    problem_id = data.get("problem_id")

    # Create agent
    agent, state = create_interviewer_agent(
        problem_title=problem_title,
        problem_description=problem_description,
        problem_id=problem_id,
    )

    active_sessions[sid] = (agent, state)
    transcription_buffers[sid] = []

    # Don't send initial message - frontend handles this now
    print(f"Session {sid} initialized successfully")


@sio.event
async def transcription(sid, data):
    """Handle complete transcription from client after push-to-talk ends"""
    if sid not in active_sessions:
        print(f"Session not initialized: {sid}")
        return

    agent, state = active_sessions[sid]

    transcription_text = data.get("content", "")
    
    # Only process if there's actual text (complete message from user)
    if transcription_text and transcription_text.strip():
        print(f"Processing complete message from {sid}: {transcription_text}...")
        
        # Process with agent and get response
        # Note: code is already updated in state via code_update WebSocket event
        result = await process_transcription(
            agent=agent,
            state=state,
            transcription=transcription_text,
            silence_duration=0.0,
            should_respond=True,
        )

        # Send AI response with stage information
        if result["should_respond"]:
            print(f"[{result.get('current_stage', 'unknown')}] AI responding to {sid}: {result['response'][:50]}...")

            await sio.emit(
                "ai_response",
                {
                    "content": result["response"],
                    "should_tts": True,
                    "hints_given": state.hints_given,
                    "questions_asked": len(state.questions_asked),
                    "confidence_level": state.confidence_level,
                    "current_stage": result.get("current_stage", "clarification"),
                    "stage_progress": result.get("stage_progress", {}),
                },
                room=sid,
            )
        else:
            await sio.emit(
                "ai_response",
                {
                    "content": result["response"],
                    "should_tts": True,
                    "hints_given": state.hints_given,
                    "questions_asked": len(state.questions_asked),
                    "confidence_level": state.confidence_level,
                    "current_stage": result.get("current_stage", "clarification"),
                    "stage_progress": result.get("stage_progress", {}),
                },
                room=sid,
            )
    else:
        print(f"Received empty message from {sid}, ignoring")


@sio.event
async def code_update(sid, data):
    """Handle real-time code updates from the client"""
    if sid not in active_sessions:
        return

    _, state = active_sessions[sid]
    code = data.get("content", "")
    language = data.get("language", "python")
    
    # Update state with current code
    state.current_code = code
    state.code_language = language
    state.has_written_code = len(code.strip()) > 0
    state.code_lines = len(code.split("\n")) if code else 0
    
    # Auto-advance to implementation stage if they start coding from algorithm design
    if (state.has_written_code and 
        state.current_stage.value == "algorithm_design" and 
        state.stage_progress.algorithm_traced):
        state.current_stage = InterviewStage.IMPLEMENTATION
        state.stage_start_time = datetime.now()
        state.stage_progress.code_started = True
        print(f"[AUTO-ADVANCE] {sid} moved to implementation stage")
    
    print(f"[{state.current_stage.value}] Code updated for {sid}: {state.code_lines} lines")


@sio.event
async def end_interview(sid, data):
    """Handle interview end and generate comprehensive feedback"""
    print(f"Ending interview for {sid}")
    
    if sid not in active_sessions:
        await sio.emit(
            "interview_ended", 
            {
                "content": "Interview session not found.",
                "feedback": None
            }, 
            room=sid
        )
        return

    agent, state = active_sessions[sid]
    
    # Generate comprehensive feedback
    feedback = generate_interview_feedback(state)
    
    # Convert feedback to dict for JSON serialization
    feedback_dict = {
        "overall_grade": feedback.overall_grade,
        "overall_score": round(feedback.overall_score * 100, 1),  # Convert to percentage
        "stages_completed": feedback.stages_completed,
        "total_time_minutes": round(feedback.total_time_minutes, 1),
        "hints_used": feedback.hints_used,
        "confidence_level": round(feedback.confidence_level * 100, 1),
        "stage_grades": {
            stage_name: {
                "stage_name": grade.stage_name,
                "score": round(grade.score * 100, 1),
                "strengths": grade.strengths,
                "areas_for_improvement": grade.areas_for_improvement,
                "completed": grade.completed
            }
            for stage_name, grade in feedback.stage_grades.items()
        },
        "key_strengths": feedback.key_strengths,
        "key_improvements": feedback.key_improvements,
        "next_steps": feedback.next_steps,
        "difficulty_recommendation": feedback.difficulty_recommendation
    }
    
    print(f"Generated feedback for {sid}: Grade {feedback.overall_grade} ({feedback.overall_score:.2f})")

    await sio.emit(
        "interview_ended", 
        {
            "content": f"Interview complete! You earned a {feedback.overall_grade}.",
            "feedback": feedback_dict
        }, 
        room=sid
    )

    # Clean up session
    if sid in active_sessions:
        del active_sessions[sid]
    if sid in transcription_buffers:
        del transcription_buffers[sid]


# Health check endpoints
@app.get("/")
async def root():
    return {
        "message": "Interview AI Agent Socket.IO Server",
        "active_sessions": len(active_sessions),
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "sessions": len(active_sessions)}


# Mount Socket.IO app
socket_app = socketio.ASGIApp(sio, other_asgi_app=app, socketio_path="socket.io")

if __name__ == "__main__":
    import uvicorn

    print("Starting Socket.IO server on http://localhost:8000")
    uvicorn.run(socket_app, host="0.0.0.0", port=8000, log_level="info")
