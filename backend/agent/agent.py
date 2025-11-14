from langchain_openai import ChatOpenAI
from langchain.agents import create_agent
from langchain_core.tools import tool
from typing import List, Optional, Dict, Any, Annotated
from enum import Enum
from pydantic import BaseModel, Field
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# ============================================
# STATE MODELS
# ============================================


class UserFocus(str, Enum):
    THINKING = "thinking"
    EXPLAINING = "explaining"
    CODING = "coding"
    STUCK = "stuck"
    SILENT = "silent"


class ProblemCoverage(BaseModel):
    approach_explained: bool = False
    edge_cases_discussed: bool = False
    complexity_analyzed: bool = False
    implementation_started: bool = False


class InterviewState(BaseModel):
    """State management for the interview session"""

    problem_id: str
    problem_title: str
    problem_description: str

    # Problem tracking
    coverage: ProblemCoverage = Field(default_factory=ProblemCoverage)

    # User state
    user_focus: UserFocus = UserFocus.THINKING
    confidence_level: float = 0.5  # 0.0 to 1.0
    last_spoke_at: Optional[datetime] = None
    silence_duration: float = 0.0  # seconds

    # Interview tracking
    hints_given: int = 0
    questions_asked: List[str] = Field(default_factory=list)
    conversation_buffer: List[Dict[str, str]] = Field(default_factory=list)

    # Timing
    start_time: datetime = Field(default_factory=datetime.now)
    last_ai_response: Optional[datetime] = None

    # Code tracking
    has_written_code: bool = False
    code_lines: int = 0


# ============================================
# GLOBAL STATE HOLDER
# ============================================
# This is a simple way to pass state to tools
# In production, consider using a more robust state management solution
_current_state: Optional[InterviewState] = None


def set_current_state(state: InterviewState):
    """Set the current interview state for tool access"""
    global _current_state
    _current_state = state


def get_current_state() -> InterviewState:
    """Get the current interview state"""
    global _current_state
    if _current_state is None:
        raise RuntimeError("Interview state not initialized")
    return _current_state


# ============================================
# AGENT TOOLS (using @tool decorator)
# ============================================


@tool
def analyze_user_state(transcription: str) -> str:
    """Analyze the user's current state from their speech.
    Use this when you receive new transcription to understand if the user is struggling, confident, or stuck.

    Args:
        transcription: The text transcription of what the user said
    """
    state = get_current_state()
    lower_text = transcription.lower()

    # Detect struggle signals
    struggle_keywords = ["stuck", "not sure", "don't know", "confused", "hmm", "uh"]
    is_struggling = any(keyword in lower_text for keyword in struggle_keywords)

    # Detect confidence
    confident_keywords = ["i think", "definitely", "so we can", "the approach is"]
    is_confident = any(keyword in lower_text for keyword in confident_keywords)

    # Detect completion phrases
    completion_keywords = ["done", "finished", "that's it", "does that make sense"]
    is_complete = any(keyword in lower_text for keyword in completion_keywords)

    analysis = {
        "is_struggling": is_struggling,
        "is_confident": is_confident,
        "is_complete": is_complete,
        "text_length": len(transcription.split()),
    }

    # Update state
    if is_struggling:
        state.user_focus = UserFocus.STUCK
        state.confidence_level = max(0.2, state.confidence_level - 0.1)
    elif is_confident:
        state.confidence_level = min(1.0, state.confidence_level + 0.1)

    return f"User state analysis: {analysis}"


@tool
def check_problem_coverage(transcription: str) -> str:
    """Check what parts of the problem the user has covered so far.
    Use this to understand what aspects still need to be discussed.

    Args:
        transcription: The text transcription of what the user said
    """
    state = get_current_state()
    lower_text = transcription.lower()

    # Check for approach explanation
    if any(
        word in lower_text for word in ["approach", "algorithm", "solution", "method"]
    ):
        state.coverage.approach_explained = True

    # Check for edge cases
    if any(
        word in lower_text
        for word in ["edge case", "empty", "null", "zero", "negative"]
    ):
        state.coverage.edge_cases_discussed = True

    # Check for complexity
    if any(
        word in lower_text
        for word in ["time complexity", "o(n)", "space complexity", "runtime"]
    ):
        state.coverage.complexity_analyzed = True

    # Check for implementation mentions
    if any(word in lower_text for word in ["implement", "code", "write", "function"]):
        state.coverage.implementation_started = True

    coverage_summary = {
        "approach": state.coverage.approach_explained,
        "edge_cases": state.coverage.edge_cases_discussed,
        "complexity": state.coverage.complexity_analyzed,
        "implementation": state.coverage.implementation_started,
    }

    return f"Problem coverage: {coverage_summary}"


@tool
def should_intervene(silence_duration: float) -> str:
    """Decide if you should speak now based on silence duration and interview state.
    Use this to determine whether to respond or keep listening.

    Args:
        silence_duration: How long the user has been silent in seconds
    """
    state = get_current_state()
    reasons = []

    # Check silence
    if silence_duration > 5.0:
        reasons.append("User has been silent for over 5 seconds")

    # Check if stuck
    if state.user_focus == UserFocus.STUCK:
        reasons.append("User appears to be stuck")

    # Check time since last AI response
    if state.last_ai_response:
        time_since_response = (datetime.now() - state.last_ai_response).total_seconds()
        if time_since_response > 120:  # 2 minutes
            reasons.append("Haven't spoken in 2 minutes")

    # Check if coverage is incomplete after significant time
    elapsed = (datetime.now() - state.start_time).total_seconds()
    if elapsed > 300 and not state.coverage.approach_explained:  # 5 minutes
        reasons.append("5 minutes passed but approach not explained")

    # Cooldown - don't speak too frequently
    if state.last_ai_response:
        time_since_response = (datetime.now() - state.last_ai_response).total_seconds()
        if time_since_response < 30:  # Don't speak within 30 seconds
            return f"Should NOT intervene: Too soon since last response ({time_since_response:.1f}s ago)"

    if reasons:
        return f"Should INTERVENE: {', '.join(reasons)}"
    else:
        return "Should NOT intervene: User is progressing well, keep listening"


@tool
def get_interview_context() -> str:
    """Get a summary of the current interview state including time elapsed,
    hints given, coverage, and confidence level. Use this to understand the overall progress.
    """
    state = get_current_state()
    elapsed = (datetime.now() - state.start_time).total_seconds()

    context = {
        "time_elapsed": f"{elapsed // 60:.0f}m {elapsed % 60:.0f}s",
        "hints_given": state.hints_given,
        "questions_asked": len(state.questions_asked),
        "confidence_level": f"{state.confidence_level * 100:.0f}%",
        "user_focus": state.user_focus.value,
        "coverage": {
            "approach": state.coverage.approach_explained,
            "edge_cases": state.coverage.edge_cases_discussed,
            "complexity": state.coverage.complexity_analyzed,
        },
    }

    return f"Interview context: {context}"


# ============================================
# AGENT CREATION
# ============================================


def create_interviewer_agent(
    problem_title: str, problem_description: str, problem_id: str
):
    """Create the interviewer agent using modern LangChain v1+ API"""

    # Initialize state
    state = InterviewState(
        problem_id=problem_id,
        problem_title=problem_title,
        problem_description=problem_description,
    )

    # Set global state for tool access
    set_current_state(state)

    # Define tools for the agent
    tools = [
        analyze_user_state,
        check_problem_coverage,
        should_intervene,
        get_interview_context,
    ]

    # Create system prompt
    system_prompt = f"""You are an experienced technical interviewer conducting a coding interview for: "{problem_title}"

Problem Description:
{problem_description}

Your Role:
- Guide the candidate through the problem-solving process
- Ask clarifying questions about their approach
- Provide hints ONLY when the candidate is stuck (limit 3 hints)
- Evaluate their understanding of time/space complexity
- Encourage them to consider edge cases
- Be professional but friendly and supportive

Interview Guidelines:
1. Let the candidate think and speak - don't interrupt unnecessarily
2. Ask open-ended questions to understand their thought process
3. Only intervene when: they're stuck, silent for 5+ seconds, or haven't covered key aspects
4. Challenge them with follow-up questions if they're doing well
5. Keep responses concise (2-3 sentences max)
6. Track what they've covered and guide them to uncovered areas

Tools Available:
- analyze_user_state: Check if user is struggling, confident, or stuck
- check_problem_coverage: See what problem aspects they've addressed
- should_intervene: Determine if you should speak now
- get_interview_context: Get time elapsed, hints given, etc.

Decision Process:
1. Use tools to analyze the current situation
2. Decide: Should I speak or keep listening?
3. If speaking: What type of response? (Question/Hint/Encouragement/Challenge)
4. Keep responses SHORT and NATURAL

Remember: Quality over quantity. It's better to listen more and speak less strategically.
"""

    # Initialize LLM
    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.7,
    )

    # Create agent using LangGraph's create_react_agent
    agent = create_agent(
        model=llm,
        tools=tools,
        system_prompt=system_prompt,
    )

    return agent, state


# ============================================
# AGENT INVOCATION
# ============================================


async def process_transcription(
    agent,
    state: InterviewState,
    transcription: str,
    silence_duration: float = 0.0,
) -> Dict[str, Any]:
    """Process a transcription and decide if AI should respond"""

    # Update global state
    set_current_state(state)

    # Add to conversation buffer
    state.conversation_buffer.append(
        {
            "role": "user",
            "content": transcription,
            "timestamp": datetime.now().isoformat(),
        }
    )
    state.last_spoke_at = datetime.now()
    state.silence_duration = silence_duration

    # Create input message for agent
    user_message = f"""
New transcription from user: "{transcription}"

Silence duration: {silence_duration} seconds

Instructions:
1. First, use 'analyze_user_state' tool with the transcription
2. Then use 'check_problem_coverage' tool with the transcription  
3. Then use 'should_intervene' tool with silence duration
4. Based on the tool results, decide:
   - If should intervene: Provide your response (question/hint/encouragement)
   - If should NOT intervene: Say "LISTENING" (I will keep listening)

Remember: Only speak if necessary. Quality > Quantity.
"""

    # Build messages list for agent
    messages = [{"role": "user", "content": user_message}]

    # Run agent (new API returns a dict with 'messages' key)
    try:
        result = await agent.ainvoke({"messages": messages})

        # Extract the last message from the agent
        output_messages = result.get("messages", [])
        if output_messages:
            last_message = output_messages[-1]
            # Get content from the message
            if hasattr(last_message, "content"):
                output = last_message.content
            else:
                output = str(last_message)
        else:
            output = "LISTENING"

    except Exception as e:
        print(f"Error running agent: {e}")
        output = "LISTENING"

    # Check if agent decided to speak
    should_respond = "LISTENING" not in output.upper()

    if should_respond:
        state.last_ai_response = datetime.now()
        state.conversation_buffer.append(
            {
                "role": "assistant",
                "content": output,
                "timestamp": datetime.now().isoformat(),
            }
        )

        # Track questions/hints
        if "?" in output:
            state.questions_asked.append(output)
        if any(word in output.lower() for word in ["hint", "try", "consider"]):
            state.hints_given += 1

    return {
        "should_respond": should_respond,
        "response": output if should_respond else None,
        "state": state,
    }
