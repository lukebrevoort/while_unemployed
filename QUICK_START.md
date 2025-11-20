# Quick Start - Code Analysis Feature

## What Was Fixed
The AI agent can now see and analyze your code! Previously, the agent couldn't access the code you wrote in the editor, making it impossible to provide meaningful feedback.

## How It Works Now

### User Experience
1. **Write Code** → Type in the Monaco Editor
2. **Start Listening** → Click the green button to speak
3. **Ask Question** → Say something like "Can you help me?" or "I'm stuck"
4. **Stop Listening** → Click the red button
5. **Get Feedback** → Agent analyzes your code and responds with specific advice

### Behind the Scenes
```
┌─────────────────────────────────────────────────────────────┐
│  USER WRITES CODE IN EDITOR                                 │
│  def two_sum(nums, target):                                 │
│      for i in range(len(nums)):                             │
│          for j in range(i+1, len(nums)):                    │
│              if nums[i] + nums[j] == target:                │
│                  return [i, j]                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  USER CLICKS "STOP LISTENING"                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND SENDS:                                            │
│  1. Latest code snapshot (sendCodeUpdate)                   │
│  2. User's transcription (sendTranscription)                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  BACKEND AGENT ANALYZES:                                    │
│  ✓ Code structure (12 lines)                               │
│  ✓ Has function definition                                 │
│  ✓ Has return statement                                    │
│  ✓ Uses nested loops                                       │
│  ✓ Has conditional logic                                   │
│  ⚠ Time complexity: O(n²) - could be optimized            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  AGENT RESPONDS:                                            │
│  "I see you're using a nested loop approach. That works!   │
│   Have you considered using a hash map to improve the      │
│   time complexity?"                                         │
└─────────────────────────────────────────────────────────────┘
```

## Key Features

### ✅ Real-time Code Tracking
- Code is monitored every 2 seconds while recording
- Latest snapshot sent when you stop speaking

### ✅ Intelligent Analysis
Agent detects:
- Function definitions
- Return statements
- Loops and iterations
- Conditional logic
- Edge case handling
- Data structures used

### ✅ Context-Aware Responses
Agent provides:
- Specific feedback on your code
- Hints based on what you've written
- Suggestions for improvement
- Help when you're stuck

### ✅ Visual Feedback
- See "💡 Your code will be analyzed" message
- Console logs confirm code is being sent
- Clear indication of what's happening

## Testing It Out

### Quick Test
1. Start the backend:
   ```bash
   cd backend
   python main.py
   ```

2. Start the frontend:
   ```bash
   cd frontend/tech-interview-prep
   npm run dev
   ```

3. In the interview interface:
   - Enable microphone
   - Start interview
   - Write some code (even just a function definition)
   - Click "Start Listening"
   - Say "Can you review my code?"
   - Click "Stop Listening"
   - Watch the agent respond with code-specific feedback!

### What to Look For

**In Browser Console:**
```
Sending current code snapshot: 245 characters
Sending complete message to backend: Can you review my code?
```

**In Backend Console:**
```
[implementation] Code updated for abc123: 12 lines
Processing complete message from abc123: Can you review my code?
Candidate has written 12 lines of code. Use analyze_code_quality()...
```

**In Agent Response:**
The agent should mention specific things about your code, like:
- "I see you're using a loop..."
- "Your function definition looks good..."
- "Consider adding edge case handling for..."

## Common Scenarios

### Scenario 1: Stuck on Implementation
**User:** "I'm not sure how to approach this"
**Agent:** *Checks code* → "I see you've started with a loop. That's a good approach. What are you trying to accomplish in each iteration?"

### Scenario 2: Code Review Request
**User:** "Can you check my code?"
**Agent:** *Analyzes code* → "Your solution looks solid! I see you're handling the edge case for empty arrays. Have you tested it with the example inputs?"

### Scenario 3: Asking for Hints
**User:** "I need a hint"
**Agent:** *Reviews code* → "I notice you're using nested loops. Consider whether a hash map could help you achieve the same result more efficiently."

## Troubleshooting

### Agent Doesn't Mention Code
- Check browser console for "Sending current code snapshot"
- Verify backend is running and connected
- Make sure you've written some code in the editor

### Code Not Being Sent
- Ensure WebSocket connection is established (green indicator)
- Check that interview has been started
- Verify microphone is enabled

### Agent Gives Generic Responses
- Make sure you have code written (more than just whitespace)
- Try asking more specific questions about your code
- Check backend logs to see if `analyze_code_quality` is being called

## Next Steps

Now that code analysis is working:
1. Test with different problem types
2. Try various code patterns
3. Ask for specific feedback on different aspects
4. Practice explaining your code while the agent reviews it

## Documentation

For detailed technical information, see:
- `CODE_ANALYSIS_IMPLEMENTATION.md` - Complete technical documentation
- `backend/agent/agent.py` - Agent implementation
- `frontend/tech-interview-prep/src/components/problems/InterviewInterface.tsx` - Frontend implementation

---

**Status:** ✅ Production Ready

This feature is now fully functional and ready for deployment!
