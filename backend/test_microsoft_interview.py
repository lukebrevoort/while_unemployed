"""
Test script for the Microsoft-style interview agent
This tests the 4-stage interview process and feedback generation
"""
import asyncio
from agent.agent import (
    create_interviewer_agent, 
    process_transcription, 
    generate_interview_feedback,
    InterviewStage
)


async def simulate_interview():
    """Simulate a complete interview cycle"""
    
    # Setup problem
    problem_title = "Two Sum"
    problem_description = """
Given an array of integers nums and an integer target, return indices of the two numbers 
such that they add up to target. You may assume that each input would have exactly one 
solution, and you may not use the same element twice.

Example:
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Because nums[0] + nums[1] == 9, we return [0, 1].
"""
    
    print("=" * 60)
    print("MICROSOFT INTERVIEW SIMULATION")
    print("=" * 60)
    print(f"Problem: {problem_title}\n")
    
    # Create agent
    agent, state = create_interviewer_agent(
        problem_title=problem_title,
        problem_description=problem_description,
        problem_id="test-1"
    )
    
    print(f"Initial Stage: {state.current_stage.value}\n")
    
    # Stage 1: CLARIFICATION
    print("\n--- STAGE 1: CLARIFICATION ---")
    
    test_messages = [
        # Stage 1: Questions
        "Can I assume the array is sorted?",
        "What should I return if there's no solution? And are the numbers always positive?",
        "So I return the indices, not the values themselves, correct?",
        
        # Stage 2: Algorithm Design
        "Okay, so a brute force approach would be to check every pair of numbers with nested loops.",
        "Let me walk through an example with [2,7,11,15] and target 9. We'd check 2+7=9, found it at indices 0 and 1.",
        "The brute force is O(n²) time and O(1) space. We could optimize with a hash map to get O(n) time.",
        
        # Stage 3: Implementation
        "Let me start coding this with the hash map approach.",
        # Simulate code being written
        
        # Stage 4: Analysis
        "For edge cases, we should test empty array, single element, and negative numbers.",
        "The runtime is O(n) because we iterate once through the array.",
        "Space complexity is O(n) for the hash map in worst case.",
    ]
    
    for i, message in enumerate(test_messages):
        print(f"\n[User {i+1}]: {message}")
        
        # Simulate code update during implementation
        code = None
        if i == 7:  # When they say they'll start coding
            code = """
def twoSum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []
"""
        
        result = await process_transcription(
            agent=agent,
            state=state,
            transcription=message,
            code_update=code
        )
        
        print(f"\n[Interviewer]: {result['response']}")
        print(f"Stage: {result.get('current_stage', 'unknown')}")
        print(f"Hints Given: {state.hints_given}/3")
        
        # Show stage progress
        progress = result.get('stage_progress', {})
        if progress:
            print(f"Progress: {progress}")
        
        await asyncio.sleep(0.5)  # Brief pause between messages
    
    print("\n" + "=" * 60)
    print("GENERATING INTERVIEW FEEDBACK")
    print("=" * 60)
    
    # Generate feedback
    feedback = generate_interview_feedback(state)
    
    print(f"\n📊 OVERALL GRADE: {feedback.overall_grade}")
    print(f"   Score: {feedback.overall_score * 100:.1f}%")
    print(f"   Time: {feedback.total_time_minutes:.1f} minutes")
    print(f"   Stages Completed: {feedback.stages_completed}/4")
    print(f"   Hints Used: {feedback.hints_used}/3")
    
    print("\n📈 STAGE BREAKDOWN:")
    for stage_name, grade in feedback.stage_grades.items():
        status = "✅" if grade.completed else "⏸️"
        print(f"\n{status} {grade.stage_name}: {grade.score * 100:.0f}%")
        if grade.strengths:
            print("   Strengths:")
            for strength in grade.strengths:
                print(f"   ✓ {strength}")
        if grade.areas_for_improvement:
            print("   Areas for Improvement:")
            for improvement in grade.areas_for_improvement:
                print(f"   • {improvement}")
    
    print("\n💪 KEY STRENGTHS:")
    for strength in feedback.key_strengths:
        print(f"   ✓ {strength}")
    
    print("\n🎯 KEY AREAS FOR IMPROVEMENT:")
    for improvement in feedback.key_improvements:
        print(f"   • {improvement}")
    
    print("\n📚 NEXT STEPS:")
    for step in feedback.next_steps:
        print(f"   → {step}")
    
    print(f"\n🎲 RECOMMENDED DIFFICULTY: {feedback.difficulty_recommendation.upper()}")
    
    print("\n" + "=" * 60)
    print("INTERVIEW SIMULATION COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    print("Starting Microsoft-style interview agent test with feedback...\n")
    asyncio.run(simulate_interview())
