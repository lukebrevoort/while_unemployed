import asyncio
from agent.agent import create_interviewer_agent, process_transcription


async def test_interview_agent():
    """Test the interviewer agent with simulated transcriptions"""

    # Create agent for Two Sum problem
    problem_title = "Two Sum"
    problem_description = """
    Given an array of integers nums and an integer target, return indices of the 
    two numbers such that they add up to target. You may assume that each input 
    would have exactly one solution, and you may not use the same element twice.
    """

    agent_executor, state = create_interviewer_agent(
        problem_title=problem_title,
        problem_description=problem_description,
        problem_id="test-123",
    )

    print("=" * 60)
    print("INTERVIEW AGENT TEST")
    print("=" * 60)

    # Simulate conversation
    test_transcriptions = [
        ("Okay so for this problem... umm... I'm thinking about the approach", 0.0),
        ("I think we need to use a hash map to store the numbers", 0.0),
        (
            "We can iterate through the array and for each number, check if the complement exists",
            0.0,
        ),
        ("", 6.0),  # 6 seconds of silence
        ("Hmm, I'm not sure about the edge cases actually", 0.0),
        ("What if the array is empty? Or has only one element?", 0.0),
        ("", 5.5),  # 5.5 seconds of silence
        ("Okay so the time complexity would be O(n) because we iterate once", 0.0),
        ("And space complexity is also O(n) for the hash map", 0.0),
        ("I think I can start coding now", 0.0),
    ]

    for i, (transcription, silence) in enumerate(test_transcriptions):
        print(f"\n--- Turn {i + 1} ---")

        if transcription:
            print(f"👤 USER: {transcription}")
        else:
            print(f"🔇 SILENCE: {silence} seconds")

        result = await process_transcription(
            agent_executor=agent_executor,
            state=state,
            transcription=transcription,
            silence_duration=silence,
        )

        if result["should_respond"]:
            print(f"🤖 AI: {result['response']}")
            print(
                f"   (Hints given: {state.hints_given}, Questions asked: {len(state.questions_asked)})"
            )
        else:
            print("🎧 AI: [Listening...]")

        # Show coverage
        print(
            f"   Coverage: Approach={state.coverage.approach_explained}, "
            f"Edge Cases={state.coverage.edge_cases_discussed}, "
            f"Complexity={state.coverage.complexity_analyzed}"
        )

        await asyncio.sleep(0.5)  # Small delay for readability

    print("\n" + "=" * 60)
    print("INTERVIEW COMPLETE")
    print("=" * 60)
    print(f"Total hints given: {state.hints_given}")
    print(f"Total questions asked: {len(state.questions_asked)}")
    print(f"User confidence: {state.confidence_level * 100:.0f}%")


if __name__ == "__main__":
    asyncio.run(test_interview_agent())
