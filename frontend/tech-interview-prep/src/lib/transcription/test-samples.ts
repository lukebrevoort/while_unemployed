/**
 * Manual test script for transcription correction
 * Run with: npx ts-node src/lib/transcription/test-samples.ts
 */

import { 
  replaceTechnicalTerms, 
  addPunctuation, 
  validateTranscription,
  correctTranscription,
  generateWhisperPrompt 
} from './corrector'

// Sample broken transcriptions that might come from Whisper
const brokenTranscriptions = [
  {
    name: "Data Structure Mishearing",
    input: "so i think we should use a hash nap to store the values and then we can use a link list for the ordering",
    expectedFixes: ["hash map", "linked list"]
  },
  {
    name: "Complexity Notation",
    input: "the time complexity would be no log n and the space is o of n",
    expectedFixes: ["O(log n)", "O(n)"]
  },
  {
    name: "Algorithm Mishearing",
    input: "we can use an al gore rhythm to sort the a ray",
    expectedFixes: ["algorithm", "array"]
  },
  {
    name: "Missing Punctuation",
    input: "okay so first we need to check if the input is valid then we can proceed with the solution",
    expectedFixes: [".", "capital first letter"]
  },
  {
    name: "Complex Technical Speech",
    input: "i think the buying a tree approach would work here we traverse it recursively the big oh notation would be o of n because we visit each node once",
    expectedFixes: ["binary tree", "Big O", "O(n)"]
  },
  {
    name: "Queue Mishearing",
    input: "we should use a que or maybe a stack to solve this problem",
    expectedFixes: ["queue"]
  },
  {
    name: "Very Short (Invalid)",
    input: "um",
    expectedFixes: ["flagged as too short"]
  },
  {
    name: "Non-Technical Content",
    input: "the weather is nice today and I really enjoyed my lunch yesterday",
    expectedFixes: ["flagged as non-technical"]
  },
  {
    name: "Repetition Error",
    input: "so so so so we need to we need to we need to check check",
    expectedFixes: ["flagged as repetitive"]
  }
]

async function runTests() {
  console.log('\n🧪 TRANSCRIPTION CORRECTION TEST SUITE\n')
  console.log('=' .repeat(80))
  
  for (const test of brokenTranscriptions) {
    console.log(`\n📝 Test: ${test.name}`)
    console.log('-'.repeat(80))
    console.log(`INPUT: "${test.input}"`)
    
    // Step 1: Technical term replacement
    const afterTerms = replaceTechnicalTerms(test.input)
    if (afterTerms !== test.input) {
      console.log(`✓ Technical terms corrected: "${afterTerms}"`)
    }
    
    // Step 2: Add punctuation
    const afterPunctuation = addPunctuation(afterTerms)
    if (afterPunctuation !== afterTerms) {
      console.log(`✓ Punctuation added: "${afterPunctuation}"`)
    }
    
    // Step 3: Validation
    const validation = validateTranscription(test.input)
    console.log(`\n📊 Validation:`)
    console.log(`   - Valid: ${validation.isValid}`)
    console.log(`   - Confidence: ${(validation.confidence * 100).toFixed(0)}%`)
    if (validation.issues.length > 0) {
      console.log(`   - Issues: ${validation.issues.join(', ')}`)
    }
    
    // Step 4: Full correction (without LLM for now - we'll test that separately)
    console.log(`\n✨ After basic correction: "${afterPunctuation}"`)
    console.log(`\n✅ Expected fixes: ${test.expectedFixes.join(', ')}`)
  }
  
  console.log('\n' + '='.repeat(80))
  console.log('\n🧪 WHISPER PROMPT GENERATION TEST\n')
  console.log('=' .repeat(80))
  
  // Test Whisper prompt generation
  const promptTests = [
    {
      name: "No context",
      context: {}
    },
    {
      name: "With problem title",
      context: {
        problemTitle: "Two Sum"
      }
    },
    {
      name: "With previous text",
      context: {
        previousText: "I think we should use a hash map to store the values. This will help us achieve O(n) time complexity."
      }
    },
    {
      name: "Full context",
      context: {
        problemTitle: "Binary Tree Maximum Path Sum",
        problemDescription: "Given a binary tree, find the maximum path sum.",
        previousText: "We need to traverse the tree recursively."
      }
    }
  ]
  
  for (const test of promptTests) {
    console.log(`\n📝 Test: ${test.name}`)
    console.log('-'.repeat(80))
    const prompt = generateWhisperPrompt(test.context)
    console.log(`Generated prompt:\n${prompt}`)
  }
  
  console.log('\n' + '='.repeat(80))
  console.log('\n✅ All basic tests completed!\n')
  console.log('Note: Grammar correction with LLM requires API key and will be tested in integration.')
}

// Run the tests
runTests().catch(console.error)
