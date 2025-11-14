"""
Test script for the upgraded LangChain v1+ agent
"""
import asyncio
from agent.agent import create_interviewer_agent, process_transcription


async def test_agent():
    """Test the upgraded agent with a sample interaction"""
    
    # Sample problem
    problem_title = "Two Sum"
    problem_description = """
Given an array of integers nums and an integer target, return indices of the two numbers 
such that they add up to target. You may assume that each input would have exactly one solution, 
and you may not use the same element twice.
"""
    problem_id = "test-1"
    
    print("=" * 60)
    print("Creating interviewer agent with modern LangChain v1+ API...")
    print("=" * 60)
    
    # Create agent
    agent, state = create_interviewer_agent(
        problem_title=problem_title,
        problem_description=problem_description,
        problem_id=problem_id,
    )
    
    print(f"✓ Agent created successfully!")
    print(f"✓ State initialized: {state.problem_title}")
    print()
    
    # Test 1: User starts explaining approach
    print("=" * 60)
    print("Test 1: User explains their approach")
    print("=" * 60)
    
    transcription_1 = "I think I can use a hash map to store the numbers I've seen so far"
    print(f"User: {transcription_1}")
    
    result_1 = await process_transcription(
        agent=agent,
        state=state,
        transcription=transcription_1,
        silence_duration=0.0,
    )
    
    if result_1["should_respond"]:
        print(f"AI: {result_1['response']}")
    else:
        print("AI: [Listening...]")
    print()
    
    # Test 2: User is silent for a while
    print("=" * 60)
    print("Test 2: User is silent for 6 seconds")
    print("=" * 60)
    
    transcription_2 = ""
    print(f"User: [Silent for 6 seconds]")
    
    result_2 = await process_transcription(
        agent=agent,
        state=state,
        transcription=transcription_2,
        silence_duration=6.0,
    )
    
    if result_2["should_respond"]:
        print(f"AI: {result_2['response']}")
    else:
        print("AI: [Listening...]")
    print()
    
    # Test 3: User mentions complexity
    print("=" * 60)
    print("Test 3: User discusses complexity")
    print("=" * 60)
    
    transcription_3 = "The time complexity would be O(n) since we iterate through the array once"
    print(f"User: {transcription_3}")
    
    result_3 = await process_transcription(
        agent=agent,
        state=state,
        transcription=transcription_3,
        silence_duration=0.0,
    )
    
    if result_3["should_respond"]:
        print(f"AI: {result_3['response']}")
    else:
        print("AI: [Listening...]")
    print()
    
    # Print final state summary
    print("=" * 60)
    print("Final Interview State")
    print("=" * 60)
    print(f"Hints given: {state.hints_given}")
    print(f"Questions asked: {len(state.questions_asked)}")
    print(f"Confidence level: {state.confidence_level * 100:.0f}%")
    print(f"Coverage:")
    print(f"  - Approach explained: {state.coverage.approach_explained}")
    print(f"  - Edge cases discussed: {state.coverage.edge_cases_discussed}")
    print(f"  - Complexity analyzed: {state.coverage.complexity_analyzed}")
    print(f"  - Implementation started: {state.coverage.implementation_started}")
    print()
    print("✓ All tests completed successfully!")


if __name__ == "__main__":
    asyncio.run(test_agent())
