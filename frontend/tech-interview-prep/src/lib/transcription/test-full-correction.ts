/**
 * Full integration test with LLM correction
 * Run with: OPENAI_API_KEY=your_key npx tsx src/lib/transcription/test-full-correction.ts
 */

import { correctTranscription } from './corrector'

const sampleTranscriptions = [
  {
    name: "Hash Map Mishearing with Grammar Issues",
    input: "um so i think we should use hash nap here to store values this give us o of n time",
    context: {
      problemTitle: "Two Sum",
      problemDescription: "Given an array of integers, return indices of the two numbers such that they add up to a specific target."
    }
  },
  {
    name: "Binary Tree with Multiple Errors",
    input: "okay the buying a tree traversal would work we go recursively check each node the big oh is no log n",
    context: {
      problemTitle: "Binary Tree Traversal",
      previousText: "Let me think about the approach."
    }
  },
  {
    name: "Algorithm Discussion",
    input: "i think al gore rhythm for sorting the a ray would be better than brute force approach",
    context: {
      problemTitle: "Sort Array",
      previousText: "We need an efficient sorting solution."
    }
  },
  {
    name: "Queue and Stack",
    input: "we could use que for bfs or maybe stack for dfs depending on problem",
    context: {
      problemTitle: "Graph Traversal"
    }
  }
]

async function runFullTests() {
  console.log('\n🚀 FULL TRANSCRIPTION CORRECTION TEST (with LLM)\n')
  console.log('=' .repeat(80))
  
  for (const test of sampleTranscriptions) {
    console.log(`\n📝 Test: ${test.name}`)
    console.log('-'.repeat(80))
    console.log(`INPUT: "${test.input}"`)
    console.log(`CONTEXT: Problem="${test.context.problemTitle}"`)
    if (test.context.previousText) {
      console.log(`         Previous="${test.context.previousText}"`)
    }
    
    try {
      const result = await correctTranscription(test.input, test.context)
      
      console.log(`\n✨ CORRECTED: "${result.correctedText}"`)
      console.log(`\n📊 Details:`)
      console.log(`   - Was auto-corrected: ${result.wasAutoCorrected}`)
      console.log(`   - Validation confidence: ${(result.validation.confidence * 100).toFixed(0)}%`)
      console.log(`   - Valid: ${result.validation.isValid}`)
      if (result.validation.issues.length > 0) {
        console.log(`   - Issues detected: ${result.validation.issues.join(', ')}`)
      }
      
      console.log(`\n✅ Improvements:`)
      if (result.originalText !== result.correctedText) {
        console.log(`   - Original length: ${result.originalText.length} chars`)
        console.log(`   - Corrected length: ${result.correctedText.length} chars`)
        console.log(`   - Changed by: ${((result.correctedText.length - result.originalText.length) / result.originalText.length * 100).toFixed(1)}%`)
      } else {
        console.log(`   - No changes needed (text was already correct)`)
      }
    } catch (error: any) {
      console.error(`\n❌ ERROR: ${error.message}`)
      if (error.message.includes('Missing credentials')) {
        console.log(`\n⚠️  Set OPENAI_API_KEY environment variable to test LLM correction`)
        console.log(`   Basic corrections (technical terms, punctuation) still work without it.`)
      }
    }
  }
  
  console.log('\n' + '='.repeat(80))
  console.log('\n✅ Full correction tests completed!\n')
}

// Check if API key is set
if (!process.env.OPENAI_API_KEY) {
  console.log('\n⚠️  WARNING: OPENAI_API_KEY not set')
  console.log('Set it to test full LLM grammar correction:')
  console.log('OPENAI_API_KEY=your_key npx tsx src/lib/transcription/test-full-correction.ts\n')
  console.log('Running basic corrections only...\n')
}

runFullTests().catch(console.error)
