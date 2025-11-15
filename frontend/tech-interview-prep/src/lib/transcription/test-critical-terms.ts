/**
 * Critical terms test - Focus on indices, O(n²), O(log n) etc
 * Run with: npx tsx src/lib/transcription/test-critical-terms.ts
 */

import { replaceTechnicalTerms, generateWhisperPrompt, validateTranscription } from './corrector'

console.log('\n🎯 CRITICAL TERMS TEST - Indices & Complexity Notation\n')
console.log('=' .repeat(80))

// Test cases focusing on the most critical misheard terms
const criticalTests = [
  {
    category: "INDEX/INDICES",
    tests: [
      { input: "return the in dex of the element", expected: "index" },
      { input: "we need to check the in this is", expected: "indices" },
      { input: "the index is at position zero", expected: "index" },
      { input: "return the in dices of two numbers", expected: "indices" },
      { input: "use index i and index j", expected: "index i and index j" },
    ]
  },
  {
    category: "O(log n) - LOGARITHMIC",
    tests: [
      { input: "the complexity is no log", expected: "O(log n)" },
      { input: "binary search is o login", expected: "O(log n)" },
      { input: "this runs in o of log n time", expected: "O(log n)" },
      { input: "oh log n is the time", expected: "O(log n)" },
      { input: "logarithmic time", expected: "O(log n)" },
    ]
  },
  {
    category: "O(n²) - QUADRATIC",
    tests: [
      { input: "the time complexity is o n squared", expected: "O(n²)" },
      { input: "nested loops give us o of n squared", expected: "O(n²)" },
      { input: "this is quadratic time", expected: "O(n²)" },
      { input: "the runtime is on squared", expected: "O(n²)" },
      { input: "o n two complexity", expected: "O(n²)" },
    ]
  },
  {
    category: "O(n) - LINEAR",
    tests: [
      { input: "the time is o of n", expected: "O(n)" },
      { input: "we get own time complexity", expected: "O(n)" },
      { input: "linear time solution", expected: "O(n)" },
      { input: "o n space", expected: "O(n)" },
    ]
  },
  {
    category: "O(n log n) - LINEARITHMIC",
    tests: [
      { input: "merge sort is o n log n", expected: "O(n log n)" },
      { input: "the complexity is o of n log n", expected: "O(n log n)" },
      { input: "own login time", expected: "O(n log n)" },
    ]
  },
  {
    category: "OTHER COMPLEXITY",
    tests: [
      { input: "constant time o of 1", expected: "O(1)" },
      { input: "exponential o two to the n", expected: "O(2^n)" },
      { input: "factorial o n factorial", expected: "O(n!)" },
      { input: "o square root n", expected: "O(√n)" },
    ]
  },
  {
    category: "DATA STRUCTURES",
    tests: [
      { input: "use a hash nap to store", expected: "hash map" },
      { input: "traverse the buying a tree", expected: "binary tree" },
      { input: "create a link list", expected: "linked list" },
      { input: "push to the que", expected: "queue" },
    ]
  }
]

console.log('\n📊 Testing Technical Term Replacements:\n')

let totalTests = 0
let passedTests = 0

for (const category of criticalTests) {
  console.log(`\n🔍 ${category.category}`)
  console.log('-'.repeat(80))
  
  for (const test of category.tests) {
    totalTests++
    const result = replaceTechnicalTerms(test.input)
    const passed = result.toLowerCase().includes(test.expected.toLowerCase())
    
    if (passed) {
      passedTests++
      console.log(`  ✅ "${test.input}"`)
      console.log(`     → "${result}"`)
    } else {
      console.log(`  ❌ "${test.input}"`)
      console.log(`     → "${result}"`)
      console.log(`     Expected to contain: "${test.expected}"`)
    }
  }
}

console.log('\n' + '='.repeat(80))
console.log(`\n📈 Results: ${passedTests}/${totalTests} tests passed (${(passedTests/totalTests*100).toFixed(1)}%)\n`)

// Test Whisper prompts
console.log('=' .repeat(80))
console.log('\n🎤 WHISPER PROMPT GENERATION - Enhanced Focus\n')
console.log('=' .repeat(80))

const promptTests = [
  {
    name: "Basic prompt (no context)",
    context: {}
  },
  {
    name: "With Two Sum problem",
    context: {
      problemTitle: "Two Sum",
      problemDescription: "Return indices of two numbers that add up to target"
    }
  },
  {
    name: "With previous O(n²) discussion",
    context: {
      problemTitle: "Three Sum",
      previousText: "The brute force would be O(n²) but we can optimize it."
    }
  },
  {
    name: "With index-heavy previous context",
    context: {
      problemTitle: "Two Sum",
      previousText: "We need to return the indices of the two numbers."
    }
  }
]

for (const test of promptTests) {
  console.log(`\n📝 ${test.name}`)
  console.log('-'.repeat(80))
  const prompt = generateWhisperPrompt(test.context)
  console.log(prompt)
  
  // Check if critical terms are present
  const criticalTerms = ['index', 'indices', 'O(n)', 'O(log n)', 'O(n²)', 'Big O']
  const foundTerms = criticalTerms.filter(term => prompt.includes(term))
  console.log(`\n✓ Critical terms included: ${foundTerms.join(', ')}`)
}

console.log('\n' + '='.repeat(80))
console.log('\n✅ Critical terms testing complete!\n')
