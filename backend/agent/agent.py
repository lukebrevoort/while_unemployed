from langchain_openai import ChatOpenAI
from langchain.agents import create_agent
from langchain_core.tools import tool
from typing import List, Optional, Dict, Any, Annotated
from enum import Enum
from pydantic import BaseModel, Field
from datetime import datetime
from dotenv import load_dotenv
import re

load_dotenv()

# ============================================
# STATE MODELS - Microsoft Interview Philosophy
# ============================================


class InterviewStage(str, Enum):
    """4-stage Microsoft interview philosophy"""
    CLARIFICATION = "clarification"  # Stage 1: Understanding the problem
    ALGORITHM_DESIGN = "algorithm_design"  # Stage 2: Designing solution approach
    IMPLEMENTATION = "implementation"  # Stage 3: Writing code
    ANALYSIS = "analysis"  # Stage 4: Testing and trade-off analysis


class UserFocus(str, Enum):
    THINKING = "thinking"
    EXPLAINING = "explaining"
    CODING = "coding"
    STUCK = "stuck"
    SILENT = "silent"


class StageProgress(BaseModel):
    """Track progress through each stage"""
    # Stage 1: Clarification
    clarifying_questions_asked: int = 0
    input_output_understood: bool = False
    constraints_discussed: bool = False
    
    # Stage 2: Algorithm Design
    brute_force_discussed: bool = False
    optimization_discussed: bool = False
    algorithm_traced: bool = False
    complexity_analyzed: bool = False
    trade_offs_discussed: bool = False
    
    # Stage 3: Implementation
    code_started: bool = False
    code_complete: bool = False
    syntax_issues_count: int = 0
    
    # Stage 4: Analysis
    edge_cases_tested: bool = False
    runtime_analysis_complete: bool = False
    space_analysis_complete: bool = False


class ProblemCoverage(BaseModel):
    approach_explained: bool = False
    edge_cases_discussed: bool = False
    complexity_analyzed: bool = False
    implementation_started: bool = False


class StageGrade(BaseModel):
    """Grade for a specific stage"""
    stage_name: str
    score: float = 0.0  # 0.0 to 1.0
    strengths: List[str] = Field(default_factory=list)
    areas_for_improvement: List[str] = Field(default_factory=list)
    completed: bool = False


class InterviewFeedback(BaseModel):
    """Comprehensive feedback for the interview"""
    overall_grade: str = "F"  # A+, A, B+, B, C+, C, D, F
    overall_score: float = 0.0  # 0.0 to 1.0
    
    stage_grades: Dict[str, StageGrade] = Field(default_factory=dict)
    
    # Summary
    key_strengths: List[str] = Field(default_factory=list)
    key_improvements: List[str] = Field(default_factory=list)
    
    # Metrics
    total_time_minutes: float = 0.0
    hints_used: int = 0
    stages_completed: int = 0
    confidence_level: float = 0.5
    
    # Recommendations
    next_steps: List[str] = Field(default_factory=list)
    difficulty_recommendation: str = "medium"  # easy, medium, hard


class InterviewState(BaseModel):
    """State management for the interview session following Microsoft philosophy"""

    problem_id: str
    problem_title: str
    problem_description: str

    # Microsoft interview stages
    current_stage: InterviewStage = InterviewStage.CLARIFICATION
    stage_progress: StageProgress = Field(default_factory=StageProgress)
    stage_start_time: datetime = Field(default_factory=datetime.now)

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
    current_code: str = ""
    code_language: str = "python"


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
# AGENT TOOLS - Microsoft Interview Philosophy
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
def check_stage_progress(transcription: str) -> str:
    """Check progress within the current interview stage and determine if ready to transition.
    Use this to understand what the candidate has covered in the current stage.

    Args:
        transcription: The text transcription of what the user said
    """
    state = get_current_state()
    lower_text = transcription.lower()
    current_stage = state.current_stage
    progress = state.stage_progress

    analysis = {"stage": current_stage.value, "progress": {}, "ready_to_advance": False}

    if current_stage == InterviewStage.CLARIFICATION:
        # Check for clarifying questions
        if "?" in transcription or any(q in lower_text for q in ["what is", "can i", "should i", "do we", "are there"]):
            progress.clarifying_questions_asked += 1
        
        # Check understanding of inputs/outputs
        if any(word in lower_text for word in ["input", "output", "return", "parameter", "argument"]):
            progress.input_output_understood = True
        
        # Check constraints discussion
        if any(word in lower_text for word in ["constraint", "limit", "size", "range", "valid"]):
            progress.constraints_discussed = True
        
        analysis["progress"] = {
            "questions_asked": progress.clarifying_questions_asked,
            "io_understood": progress.input_output_understood,
            "constraints_discussed": progress.constraints_discussed
        }
        
        # Ready to advance if asked questions and understands problem
        if progress.clarifying_questions_asked >= 2 and progress.input_output_understood:
            analysis["ready_to_advance"] = True

    elif current_stage == InterviewStage.ALGORITHM_DESIGN:
        # Check for brute force discussion
        if any(word in lower_text for word in ["brute force", "naive", "simple approach", "first approach"]):
            progress.brute_force_discussed = True
        
        # Check for optimization discussion
        if any(word in lower_text for word in ["optimize", "better", "improve", "efficient"]):
            progress.optimization_discussed = True
        
        # Check for algorithm tracing
        if any(word in lower_text for word in ["example", "walk through", "trace", "step by step", "let's say"]):
            progress.algorithm_traced = True
        
        # Check for complexity analysis
        if any(word in lower_text for word in ["o(", "time complexity", "space complexity", "runtime"]):
            progress.complexity_analyzed = True
        
        # Check for trade-offs
        if any(word in lower_text for word in ["trade-off", "tradeoff", "sacrifice", "versus", "vs"]):
            progress.trade_offs_discussed = True
        
        analysis["progress"] = {
            "brute_force": progress.brute_force_discussed,
            "optimization": progress.optimization_discussed,
            "traced": progress.algorithm_traced,
            "complexity": progress.complexity_analyzed,
            "trade_offs": progress.trade_offs_discussed
        }
        
        # Ready to advance if discussed approach and traced it
        if progress.algorithm_traced and (progress.brute_force_discussed or progress.optimization_discussed):
            analysis["ready_to_advance"] = True

    elif current_stage == InterviewStage.IMPLEMENTATION:
        # Check if code has been written
        if state.has_written_code:
            progress.code_started = True
        
        # Check for code completion signals
        if any(word in lower_text for word in ["done with code", "finished coding", "code complete"]):
            progress.code_complete = True
        
        analysis["progress"] = {
            "code_started": progress.code_started,
            "code_complete": progress.code_complete,
            "syntax_issues": progress.syntax_issues_count,
            "code_lines": state.code_lines
        }
        
        # Ready to advance if code is written and looks complete
        if progress.code_started and state.code_lines > 5:
            analysis["ready_to_advance"] = True

    elif current_stage == InterviewStage.ANALYSIS:
        # Check for edge case testing
        if any(word in lower_text for word in ["edge case", "test", "empty", "null", "zero", "negative"]):
            progress.edge_cases_tested = True
        
        # Check for runtime analysis
        if any(word in lower_text for word in ["runtime", "time complexity", "o("]):
            progress.runtime_analysis_complete = True
        
        # Check for space analysis
        if any(word in lower_text for word in ["space", "memory", "storage"]):
            progress.space_analysis_complete = True
        
        analysis["progress"] = {
            "edge_cases": progress.edge_cases_tested,
            "runtime": progress.runtime_analysis_complete,
            "space": progress.space_analysis_complete
        }
        
        # Interview essentially complete after thorough analysis
        if progress.edge_cases_tested and progress.runtime_analysis_complete:
            analysis["ready_to_advance"] = True
            analysis["interview_complete"] = True

    return f"Stage progress: {analysis}"


@tool
def advance_stage() -> str:
    """Advance to the next interview stage when current stage requirements are met.
    Only use this when check_stage_progress indicates ready_to_advance is True.
    """
    state = get_current_state()
    current = state.current_stage
    
    transitions = {
        InterviewStage.CLARIFICATION: InterviewStage.ALGORITHM_DESIGN,
        InterviewStage.ALGORITHM_DESIGN: InterviewStage.IMPLEMENTATION,
        InterviewStage.IMPLEMENTATION: InterviewStage.ANALYSIS,
    }
    
    if current in transitions:
        next_stage = transitions[current]
        state.current_stage = next_stage
        state.stage_start_time = datetime.now()
        return f"Advanced from {current.value} to {next_stage.value} stage"
    
    return f"Already in final stage: {current.value}"


@tool
def analyze_code_quality() -> str:
    """Analyze the candidate's current code for quality and issues.
    Use this during IMPLEMENTATION stage to see their code and provide feedback.
    No arguments needed - reads from current state.
    """
    state = get_current_state()
    code = state.current_code
    
    if not code or not code.strip():
        return "No code written yet"
    
    issues = []
    suggestions = []
    
    lines = code.split('\n')
    
    # Basic checks
    if 'def ' not in code and 'function ' not in code:
        issues.append("No function definition found")
    
    if len(lines) < 3:
        suggestions.append("Code seems short - might be incomplete")
    
    if 'return' not in code.lower():
        issues.append("Missing return statement")
    
    # Edge case handling
    edge_keywords = ['if', 'else', 'null', 'None', 'empty', '== 0', 'len(']
    has_edge_cases = any(kw in code for kw in edge_keywords)
    if not has_edge_cases:
        suggestions.append("Consider edge case handling")
    
    # Track issues
    if issues:
        state.stage_progress.syntax_issues_count += len(issues)
    
    return f"Code: {len(lines)} lines. Issues: {issues if issues else 'None'}. Suggestions: {suggestions if suggestions else 'Looks good'}"


@tool
def check_problem_coverage(transcription: str) -> str:
    """Legacy tool maintained for compatibility. Use check_stage_progress instead for stage-based tracking.
    
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
def get_stage_guidance() -> str:
    """Get guidance on what the interviewer should focus on in the current stage.
    Use this to understand what questions to ask and what to look for.
    """
    state = get_current_state()
    stage = state.current_stage
    progress = state.stage_progress
    
    guidance = {
        "stage": stage.value,
        "focus": "",
        "key_questions": [],
        "red_flags": []
    }
    
    if stage == InterviewStage.CLARIFICATION:
        guidance["focus"] = "Help candidate understand inputs, outputs, and constraints"
        guidance["key_questions"] = [
            "What questions do you have about the problem?",
            "What should the function return?",
            "Are there any constraints we should consider?",
            "Can you give me an example of the input and expected output?"
        ]
        guidance["red_flags"] = [
            "Jumping to code without asking questions",
            "Not discussing edge cases or constraints",
            "Unclear about input/output format"
        ]
        
        if progress.clarifying_questions_asked == 0:
            guidance["next_action"] = "Encourage them to ask clarifying questions"
        elif not progress.input_output_understood:
            guidance["next_action"] = "Ask them to explain what the function should return"
        elif not progress.constraints_discussed:
            guidance["next_action"] = "Prompt discussion about constraints and edge cases"
    
    elif stage == InterviewStage.ALGORITHM_DESIGN:
        guidance["focus"] = "Guide candidate through solution design from brute force to optimized"
        guidance["key_questions"] = [
            "What's a simple brute force approach?",
            "Can you walk me through an example?",
            "What's the time complexity of this approach?",
            "How could we optimize this?",
            "What trade-offs are we making?"
        ]
        guidance["red_flags"] = [
            "Not starting with brute force",
            "Not tracing through an example",
            "Not analyzing complexity",
            "Jumping to code without clear algorithm"
        ]
        
        if not progress.brute_force_discussed:
            guidance["next_action"] = "Ask for a brute force solution first"
        elif not progress.algorithm_traced:
            guidance["next_action"] = "Ask them to trace through an example"
        elif not progress.complexity_analyzed:
            guidance["next_action"] = "Ask about time and space complexity"
        elif not progress.optimization_discussed:
            guidance["next_action"] = "Prompt them to think about optimizations"
    
    elif stage == InterviewStage.IMPLEMENTATION:
        guidance["focus"] = "Monitor code quality and provide hints on syntax, not solutions"
        guidance["key_questions"] = [
            "How are you handling the edge case of...?",
            "Walk me through this section of code",
            "What does this variable represent?"
        ]
        guidance["red_flags"] = [
            "Too many syntax errors (should write clean code)",
            "Not handling edge cases",
            "Confusing variable names",
            "Logic errors in implementation"
        ]
        
        if not progress.code_started:
            guidance["next_action"] = "Encourage them to start coding"
        elif progress.syntax_issues_count > 3:
            guidance["next_action"] = "Point out syntax pattern to help them write cleaner code"
        elif state.code_lines < 5:
            guidance["next_action"] = "Let them continue coding, observe silently"
    
    elif stage == InterviewStage.ANALYSIS:
        guidance["focus"] = "Test understanding of algorithm behavior and trade-offs"
        guidance["key_questions"] = [
            "What edge cases should we test?",
            "What happens if the input is empty?",
            "What's the actual runtime of your implementation?",
            "How much space does this use?",
            "What trade-offs did you make?"
        ]
        guidance["red_flags"] = [
            "Not considering edge cases",
            "Incorrect complexity analysis",
            "Can't explain their own code"
        ]
        
        if not progress.edge_cases_tested:
            guidance["next_action"] = "Ask them to identify edge cases to test"
        elif not progress.runtime_analysis_complete:
            guidance["next_action"] = "Ask them to analyze the runtime"
        elif not progress.space_analysis_complete:
            guidance["next_action"] = "Ask about space complexity"
    
    return f"Stage guidance: {guidance}"


@tool
def should_intervene(silence_duration: float) -> str:
    """Decide if you should speak now based on silence duration and interview state.
    Use this to determine whether to respond or keep listening.

    Args:
        silence_duration: How long the user has been silent in seconds
    """
    state = get_current_state()
    reasons = []

    # Check silence - 5 seconds means user finished speaking
    if silence_duration >= 5.0:
        reasons.append("User finished speaking (5+ seconds of silence)")

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
        if time_since_response < 20:  # Don't speak within 20 seconds
            return f"Should NOT intervene: Too soon since last response ({time_since_response:.1f}s ago)"

    if reasons:
        return f"Should INTERVENE: {', '.join(reasons)}"
    else:
        return "Should NOT intervene: User is progressing well, keep listening"


@tool
def get_interview_context() -> str:
    """Get current interview state including stage, time, code status.
    Use this to understand the overall progress and if candidate is coding.
    """
    state = get_current_state()
    elapsed = (datetime.now() - state.start_time).total_seconds()
    stage_elapsed = (datetime.now() - state.stage_start_time).total_seconds()

    context = {
        "current_stage": state.current_stage.value,
        "stage_time": f"{stage_elapsed // 60:.0f}m {stage_elapsed % 60:.0f}s",
        "total_time": f"{elapsed // 60:.0f}m {elapsed % 60:.0f}s",
        "hints_given": state.hints_given,
        "questions_asked": len(state.questions_asked),
        "confidence_level": f"{state.confidence_level * 100:.0f}%",
        "user_focus": state.user_focus.value,
        "has_code": state.has_written_code,
        "code_lines": state.code_lines,
        "current_code_preview": state.current_code[:200] if state.current_code else "No code yet",
    }

    return f"Interview context: {context}"


# ============================================
# FEEDBACK GENERATION
# ============================================


def generate_interview_feedback(state: InterviewState) -> InterviewFeedback:
    """Generate comprehensive feedback based on interview performance
    
    Args:
        state: The complete interview state
        
    Returns:
        InterviewFeedback with grades, strengths, and improvement areas
    """
    progress = state.stage_progress
    elapsed = (datetime.now() - state.start_time).total_seconds()
    total_minutes = elapsed / 60.0
    
    # Initialize feedback
    feedback = InterviewFeedback(
        total_time_minutes=total_minutes,
        hints_used=state.hints_given,
        confidence_level=state.confidence_level,
    )
    
    # Count stages completed
    stages_reached = [
        InterviewStage.CLARIFICATION,
        InterviewStage.ALGORITHM_DESIGN,
        InterviewStage.IMPLEMENTATION,
        InterviewStage.ANALYSIS,
    ]
    current_stage_index = stages_reached.index(state.current_stage)
    feedback.stages_completed = current_stage_index + 1
    
    # Grade Stage 1: Clarification
    clarification_grade = StageGrade(stage_name="Problem Clarification")
    clarification_score = 0.0
    
    if progress.clarifying_questions_asked >= 3:
        clarification_score += 0.4
        clarification_grade.strengths.append("Asked multiple clarifying questions")
    elif progress.clarifying_questions_asked >= 2:
        clarification_score += 0.3
    elif progress.clarifying_questions_asked >= 1:
        clarification_score += 0.2
        clarification_grade.areas_for_improvement.append("Ask more clarifying questions before jumping to solutions")
    else:
        clarification_grade.areas_for_improvement.append("Always start by asking clarifying questions about inputs, outputs, and constraints")
    
    if progress.input_output_understood:
        clarification_score += 0.3
        clarification_grade.strengths.append("Demonstrated understanding of inputs and outputs")
    else:
        clarification_grade.areas_for_improvement.append("Ensure you fully understand what the function should return")
    
    if progress.constraints_discussed:
        clarification_score += 0.3
        clarification_grade.strengths.append("Discussed constraints and edge cases early")
    else:
        clarification_grade.areas_for_improvement.append("Discuss constraints and potential edge cases upfront")
    
    clarification_grade.score = clarification_score
    clarification_grade.completed = current_stage_index >= 1
    feedback.stage_grades["clarification"] = clarification_grade
    
    # Grade Stage 2: Algorithm Design
    algorithm_grade = StageGrade(stage_name="Algorithm Design")
    algorithm_score = 0.0
    
    if progress.brute_force_discussed:
        algorithm_score += 0.25
        algorithm_grade.strengths.append("Started with brute force approach")
    else:
        algorithm_grade.areas_for_improvement.append("Always discuss a brute force solution first, even if simple")
    
    if progress.algorithm_traced:
        algorithm_score += 0.25
        algorithm_grade.strengths.append("Traced through algorithm with concrete example")
    else:
        algorithm_grade.areas_for_improvement.append("Walk through your algorithm with a specific example before coding")
    
    if progress.complexity_analyzed:
        algorithm_score += 0.25
        algorithm_grade.strengths.append("Analyzed time and space complexity")
    else:
        algorithm_grade.areas_for_improvement.append("Always analyze time and space complexity of your approach")
    
    if progress.optimization_discussed:
        algorithm_score += 0.15
        algorithm_grade.strengths.append("Discussed optimization opportunities")
    
    if progress.trade_offs_discussed:
        algorithm_score += 0.1
        algorithm_grade.strengths.append("Considered trade-offs between different approaches")
    
    algorithm_grade.score = algorithm_score
    algorithm_grade.completed = current_stage_index >= 2
    feedback.stage_grades["algorithm_design"] = algorithm_grade
    
    # Grade Stage 3: Implementation
    implementation_grade = StageGrade(stage_name="Code Implementation")
    implementation_score = 0.0
    
    if progress.code_started:
        implementation_score += 0.3
        implementation_grade.strengths.append("Successfully began implementation")
    else:
        implementation_grade.areas_for_improvement.append("Practice translating algorithms into working code")
    
    if state.code_lines >= 5:
        implementation_score += 0.2
        if state.code_lines >= 10:
            implementation_grade.strengths.append("Wrote substantial implementation")
    else:
        implementation_grade.areas_for_improvement.append("Work on completing full implementations")
    
    # Syntax quality
    if progress.syntax_issues_count == 0:
        implementation_score += 0.3
        implementation_grade.strengths.append("Clean, bug-free code")
    elif progress.syntax_issues_count <= 2:
        implementation_score += 0.2
        implementation_grade.strengths.append("Mostly clean code with minimal errors")
    elif progress.syntax_issues_count <= 4:
        implementation_score += 0.1
        implementation_grade.areas_for_improvement.append("Focus on writing cleaner code with fewer syntax errors")
    else:
        implementation_grade.areas_for_improvement.append("Practice writing bug-free code - too many syntax errors")
    
    if progress.code_complete:
        implementation_score += 0.2
        implementation_grade.strengths.append("Completed full working implementation")
    
    implementation_grade.score = implementation_score
    implementation_grade.completed = current_stage_index >= 3
    feedback.stage_grades["implementation"] = implementation_grade
    
    # Grade Stage 4: Analysis
    analysis_grade = StageGrade(stage_name="Testing & Analysis")
    analysis_score = 0.0
    
    if progress.edge_cases_tested:
        analysis_score += 0.4
        analysis_grade.strengths.append("Identified and tested edge cases")
    else:
        analysis_grade.areas_for_improvement.append("Always test edge cases like empty input, single element, negatives, etc.")
    
    if progress.runtime_analysis_complete:
        analysis_score += 0.3
        analysis_grade.strengths.append("Analyzed runtime complexity of implementation")
    else:
        analysis_grade.areas_for_improvement.append("Practice analyzing the actual runtime of your code")
    
    if progress.space_analysis_complete:
        analysis_score += 0.3
        analysis_grade.strengths.append("Analyzed space complexity")
    else:
        analysis_grade.areas_for_improvement.append("Don't forget to discuss space complexity and memory usage")
    
    analysis_grade.score = analysis_score
    analysis_grade.completed = current_stage_index >= 4
    feedback.stage_grades["analysis"] = analysis_grade
    
    # Calculate overall score (weighted by stage importance)
    weights = {
        "clarification": 0.15,
        "algorithm_design": 0.35,
        "implementation": 0.35,
        "analysis": 0.15,
    }
    
    overall_score = sum(
        feedback.stage_grades[stage].score * weight 
        for stage, weight in weights.items()
    )
    
    # Apply penalties
    if state.hints_given > 3:
        overall_score *= 0.9  # Too many hints
    
    if total_minutes < 10:
        overall_score *= 0.85  # Rushed through too fast
    elif total_minutes > 45:
        overall_score *= 0.9  # Took too long
    
    feedback.overall_score = overall_score
    
    # Determine letter grade
    if overall_score >= 0.95:
        feedback.overall_grade = "A+"
    elif overall_score >= 0.90:
        feedback.overall_grade = "A"
    elif overall_score >= 0.85:
        feedback.overall_grade = "A-"
    elif overall_score >= 0.80:
        feedback.overall_grade = "B+"
    elif overall_score >= 0.75:
        feedback.overall_grade = "B"
    elif overall_score >= 0.70:
        feedback.overall_grade = "B-"
    elif overall_score >= 0.65:
        feedback.overall_grade = "C+"
    elif overall_score >= 0.60:
        feedback.overall_grade = "C"
    elif overall_score >= 0.55:
        feedback.overall_grade = "C-"
    elif overall_score >= 0.50:
        feedback.overall_grade = "D"
    else:
        feedback.overall_grade = "F"
    
    # Compile key strengths (top 3)
    all_strengths = []
    for grade in feedback.stage_grades.values():
        all_strengths.extend(grade.strengths)
    feedback.key_strengths = all_strengths[:3] if all_strengths else ["Participated in the interview"]
    
    # Compile key improvements (top 3-5)
    all_improvements = []
    for grade in feedback.stage_grades.values():
        all_improvements.extend(grade.areas_for_improvement)
    feedback.key_improvements = all_improvements[:5]
    
    # Generate next steps
    if feedback.overall_score >= 0.85:
        feedback.next_steps = [
            "You're performing well! Try harder difficulty problems",
            "Focus on optimizing solutions and discussing trade-offs",
            "Practice explaining your thought process even more clearly"
        ]
        feedback.difficulty_recommendation = "hard"
    elif feedback.overall_score >= 0.70:
        feedback.next_steps = [
            "Continue practicing medium difficulty problems",
            "Focus on the areas for improvement identified above",
            "Practice tracing through algorithms with examples"
        ]
        feedback.difficulty_recommendation = "medium"
    else:
        feedback.next_steps = [
            "Start with easier problems to build confidence",
            "Focus on understanding problem requirements first",
            "Practice the 4-stage approach: Clarify → Design → Code → Test",
            "Don't rush to code - spend time on algorithm design"
        ]
        feedback.difficulty_recommendation = "easy"
    
    # Add time-specific feedback
    if total_minutes < 10:
        feedback.next_steps.append("Take more time to think through solutions thoroughly")
    elif total_minutes > 45:
        feedback.next_steps.append("Work on being more concise and efficient with your time")
    
    # Add hint-specific feedback
    if state.hints_given >= 3:
        feedback.next_steps.append("Try to rely less on hints - trust your problem-solving instincts")
    
    return feedback


# ============================================
# AGENT CREATION
# ============================================


def create_interviewer_agent(
    problem_title: str, problem_description: str, problem_id: str
):
    """Create the interviewer agent using modern LangChain v1+ API with Microsoft interview philosophy"""

    # Initialize state
    state = InterviewState(
        problem_id=problem_id,
        problem_title=problem_title,
        problem_description=problem_description,
    )

    # Set global state for tool access
    set_current_state(state)

    # Define tools for the agent - now with stage-based tools
    tools = [
        analyze_user_state,
        check_stage_progress,
        advance_stage,
        analyze_code_quality,
        get_stage_guidance,
        get_interview_context,
        check_problem_coverage,  # Legacy support
    ]

    # Create system prompt - passive and observational
    system_prompt = f"""You are a technical interviewer for: "{problem_title}"

{problem_description}

YOUR ROLE: Be a supportive listener. Let the candidate drive the conversation.

CONVERSATION STYLE:
- Keep responses under 2 sentences
- Use natural reactions: "Got it", "Makes sense", "Interesting"
- Ask clarifying questions only when needed
- NEVER direct them: no "First do X" or "Now let's Y"
- LISTEN MORE, TALK LESS

WHAT TO OBSERVE (silently track for grading later):
- Do they ask about inputs/outputs/constraints?
- Do they explain approach before coding?
- Do they trace through examples?
- Do they mention complexity?
- Is their code clean?
- Do they test edge cases?

CODE AWARENESS:
- You receive real-time code updates via WebSocket
- Use get_interview_context to see code preview
- Use analyze_code_quality to check their code
- Only comment on code if they ask or if there's a critical issue

WHEN TO SPEAK:
1. They ask you a question - answer briefly
2. They finish explaining - acknowledge with "Got it" or ask a follow-up
3. They're stuck - ask "What are you thinking?"
4. They mention they're done coding - you can ask about testing

WHEN TO STAY QUIET:
- They're actively coding
- They're thinking out loud
- They're explaining their approach

DON'T ASK REDUNDANT QUESTIONS:
- If they already explained something, don't ask again
- Read conversation history before responding

Tools (use silently):
- get_interview_context: see stage/time/code status
- check_stage_progress: see what they covered
- analyze_code_quality: check their current code
- advance_stage: move stages silently

Current Stage: {state.current_stage.value}
Hints: 3 max (syntax help free)

Be a good listener. Let them shine."""

    # Initialize LLM
    llm = ChatOpenAI(
        model="gpt-4o",
        temperature=0.3,  # Lower temperature for more consistent, less probing responses
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
    should_respond: bool = True,
) -> Dict[str, Any]:
    """Process a transcription and decide if AI should respond

    Args:
        agent: The LangChain agent
        state: The interview state
        transcription: User's speech text
        silence_duration: How long user has been silent
        should_respond: Whether to actually generate a response
    """

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

    # If not ready to respond, just update state and return
    if not should_respond:
        return {
            "should_respond": False,
            "response": None,
            "state": state,
        }

    # Create minimal input message - let agent use tools to get context
    user_message = f"""Candidate: "{transcription}"

Check conversation history. Use tools to see progress. Respond naturally (1-2 sentences).
Don't repeat questions they already answered."""

    # Build messages list with conversation history
    messages = []
    
    # Add previous messages
    for msg in state.conversation_buffer:
        messages.append({
            "role": msg["role"],
            "content": msg["content"]
        })
    
    # Add current message
    messages.append({"role": "user", "content": user_message})
    
    print(f"[{state.current_stage.value}] Message {len(messages)}")

    # Run agent
    try:
        result = await agent.ainvoke({"messages": messages})
        output_messages = result.get("messages", [])
        if output_messages:
            last_message = output_messages[-1]
            output = last_message.content if hasattr(last_message, "content") else str(last_message)
        else:
            output = "Got it."
    except Exception as e:
        print(f"Error: {e}")
        output = "I understand."

    # Always respond now
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
    if any(word in output.lower() for word in ["hint", "try", "consider", "suggestion"]):
        state.hints_given += 1

    return {
        "should_respond": True,
        "response": output,
        "state": state,
        "current_stage": state.current_stage.value,
        "stage_progress": {
            "clarification": state.stage_progress.clarifying_questions_asked,
            "algorithm_traced": state.stage_progress.algorithm_traced,
            "code_started": state.stage_progress.code_started,
            "edge_cases_tested": state.stage_progress.edge_cases_tested,
        }
    }
