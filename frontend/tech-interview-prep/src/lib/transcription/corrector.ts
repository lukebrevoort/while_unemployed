import OpenAI from 'openai'

// Lazy-load OpenAI client to avoid initialization errors in tests
let openaiClient: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openaiClient
}

// Technical term corrections dictionary for common misheard coding terms
const TECHNICAL_TERMS_MAP: Record<string, string> = {
  // Data structures
  'hash nap': 'hash map',
  'hash map': 'hash map',
  'has map': 'hash map',
  'hash net': 'hash map',
  'linked list': 'linked list',
  'link list': 'linked list',
  'linked-list': 'linked list',
  'buying a tree': 'binary tree',
  'binary tree': 'binary tree',
  'bind tree': 'binary tree',
  'binaries tree': 'binary tree',
  'stack': 'stack',
  'que': 'queue',
  'cue': 'queue',
  'queue': 'queue',
  'q': 'queue',
  'heap': 'heap',
  'graph': 'graph',
  'set': 'set',
  'array': 'array',
  'a ray': 'array',
  'erase': 'arrays',
  
  // Index/Indices (CRITICAL)
  'index': 'index',
  'indices': 'indices',
  'in dex': 'index',
  'in this is': 'indices',
  'in dices': 'indices',
  'indexes': 'indexes',
  'index is': 'index',
  'index at': 'index at',
  'index i': 'index i',
  'index j': 'index j',
  
  // Algorithms
  'sorting': 'sorting',
  'searching': 'searching',
  'traversal': 'traversal',
  'recursion': 'recursion',
  'iteration': 'iteration',
  'dynamic programming': 'dynamic programming',
  'greedy': 'greedy',
  'backtracking': 'backtracking',
  'divide and conquer': 'divide and conquer',
  
  // Complexity - ENHANCED FOCUS
  // Basic Big O
  'big o': 'Big O',
  'big oh': 'Big O',
  'bigo': 'Big O',
  'big-o': 'Big O',
  'biго': 'Big O',
  
  // O(1) - Constant
  'o of 1': 'O(1)',
  'oh of 1': 'O(1)',
  'o 1': 'O(1)',
  'o one': 'O(1)',
  'constant time': 'O(1)',
  
  // O(n) - Linear
  'o of n': 'O(n)',
  'oh of n': 'O(n)',
  'o n': 'O(n)',
  'oh n': 'O(n)',
  'own': 'O(n)',
  'linear time': 'O(n)',
  
  // O(log n) - Logarithmic (HIGH PRIORITY)
  'o log n': 'O(log n)',
  'oh log n': 'O(log n)',
  'o of log n': 'O(log n)',
  'oh of log n': 'O(log n)',
  'no log': 'O(log n)',
  'no log n': 'O(log n)',
  'olog n': 'O(log n)',
  'o login': 'O(log n)',
  'logarithmic': 'O(log n)',
  'logarithmic time': 'O(log n)',
  
  // O(n log n) - Linearithmic
  'o n log n': 'O(n log n)',
  'oh n log n': 'O(n log n)',
  'o of n log n': 'O(n log n)',
  'own log n': 'O(n log n)',
  'o n login': 'O(n log n)',
  'own login': 'O(n log n)',
  
  // O(n²) - Quadratic (HIGH PRIORITY)
  'o of n squared': 'O(n²)',
  'o n squared': 'O(n²)',
  'oh n squared': 'O(n²)',
  'o n 2': 'O(n²)',
  'o n two': 'O(n²)',
  'on squared': 'O(n²)',
  'quadratic': 'O(n²)',
  'quadratic time': 'O(n²)',
  'o n square': 'O(n²)',
  
  // O(n³) - Cubic
  'o of n cubed': 'O(n³)',
  'o n cubed': 'O(n³)',
  'o n 3': 'O(n³)',
  'o n three': 'O(n³)',
  'cubic': 'O(n³)',
  
  // O(2^n) - Exponential
  'o 2 to the n': 'O(2^n)',
  'o 2 n': 'O(2^n)',
  'o two to the n': 'O(2^n)',
  'exponential': 'O(2^n)',
  'exponential time': 'O(2^n)',
  
  // O(n!) - Factorial
  'o n factorial': 'O(n!)',
  'o of n factorial': 'O(n!)',
  'factorial': 'O(n!)',
  
  // O(sqrt(n)) - Square root
  'o square root n': 'O(√n)',
  'o square root of n': 'O(√n)',
  'o sqrt n': 'O(√n)',
  
  // Space complexity
  'space complexity': 'space complexity',
  'time complexity': 'time complexity',
  
  // Common coding terms
  'variable': 'variable',
  'function': 'function',
  'method': 'method',
  'class': 'class',
  'object': 'object',
  'pointer': 'pointer',
  'reference': 'reference',
  'loop': 'loop',
  'for loop': 'for loop',
  'while loop': 'while loop',
  'if statement': 'if statement',
  'else': 'else',
  'return': 'return',
  'null': 'null',
  'none': 'none',
  'undefined': 'undefined',
  'boolean': 'boolean',
  'integer': 'integer',
  'string': 'string',
  'float': 'float',
  
  // Edge cases
  'edge case': 'edge case',
  'edge cases': 'edge cases',
  'base case': 'base case',
  'corner case': 'corner case',
  
  // Common misheard phrases
  'al gore rhythm': 'algorithm',
  'algorithm': 'algorithm',
  'algorithms': 'algorithms',
}

// Common technical vocabulary for Whisper prompting - PRIORITIZED
export const TECHNICAL_VOCABULARY = [
  // HIGHEST PRIORITY - Commonly misheard critical terms
  'index', 'indices', 'indexes',
  'O(n)', 'O(log n)', 'O(n²)', 'O(n log n)', 'O(1)',
  'Big O notation', 'time complexity', 'space complexity',
  
  // Data structures
  'hash map', 'binary tree', 'linked list', 'array', 'stack', 'queue', 'graph',
  
  // Algorithms and patterns
  'algorithm', 'recursion', 'iteration', 'traversal',
  'sorting', 'searching', 'dynamic programming', 'greedy algorithm', 
  'backtracking', 'divide and conquer',
  
  // Common terms
  'edge case', 'base case', 'pointer', 'variable', 'function', 'method', 'loop'
]

interface TranscriptionContext {
  previousText?: string
  problemTitle?: string
  problemDescription?: string
}

interface ValidationResult {
  isValid: boolean
  confidence: number
  issues: string[]
  correctedText?: string
}

/**
 * Replace common technical term mishearings with correct terms
 * Uses longest-match-first strategy to avoid partial replacements
 */
export function replaceTechnicalTerms(text: string): string {
  let corrected = text
  
  // Sort entries by length (longest first) to match complex phrases before simple ones
  const sortedEntries = Object.entries(TECHNICAL_TERMS_MAP)
    .sort((a, b) => b[0].length - a[0].length)
  
  // Case-insensitive replacement with word boundaries
  for (const [incorrect, correct] of sortedEntries) {
    const regex = new RegExp(`\\b${incorrect.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
    corrected = corrected.replace(regex, correct)
  }
  
  return corrected
}

/**
 * Add basic punctuation to improve readability
 */
export function addPunctuation(text: string): string {
  let punctuated = text.trim()
  
  // Capitalize first letter
  punctuated = punctuated.charAt(0).toUpperCase() + punctuated.slice(1)
  
  // Ensure sentence ends with punctuation
  if (!/[.!?]$/.test(punctuated)) {
    punctuated += '.'
  }
  
  return punctuated
}

/**
 * Validate transcription quality
 */
export function validateTranscription(text: string): ValidationResult {
  const issues: string[] = []
  let confidence = 1.0
  
  // Check minimum length
  if (text.trim().length < 3) {
    issues.push('Text too short')
    confidence -= 0.5
  }
  
  // Check maximum length (suspiciously long)
  if (text.length > 1000) {
    issues.push('Text suspiciously long')
    confidence -= 0.2
  }
  
  // Check for repeated words (common transcription error)
  const words = text.toLowerCase().split(/\s+/)
  const wordCounts = words.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const maxRepetition = Math.max(...Object.values(wordCounts))
  if (maxRepetition > words.length * 0.3) {
    issues.push('Excessive word repetition detected')
    confidence -= 0.3
  }
  
  // Check for technical content (at least some technical terms expected)
  const lowerText = text.toLowerCase()
  const hasTechnicalTerms = TECHNICAL_VOCABULARY.some(term => 
    lowerText.includes(term.toLowerCase())
  ) || /\b(hash|tree|list|array|loop|node|algorithm|complexity|stack|queue|graph|sort|search|traverse)\b/i.test(text)
  
  if (text.length > 50 && !hasTechnicalTerms) {
    issues.push('No technical terms detected - may not be coding-related')
    confidence -= 0.2
  }
  
  return {
    isValid: confidence > 0.5,
    confidence: Math.max(0, Math.min(1, confidence)),
    issues,
  }
}

/**
 * Use LLM to correct grammar and improve coherence
 */
export async function grammarCorrection(
  text: string,
  context: TranscriptionContext
): Promise<string> {
  try {
    const openai = getOpenAI()
    
    // Build context for the LLM
    let systemPrompt = `You are a transcription corrector for technical coding interviews. 
Fix grammar, punctuation, and technical term errors while preserving the speaker's meaning and tone.
Return ONLY the corrected text without any explanations or additional formatting.`

    let userPrompt = `Transcription to correct: "${text}"`
    
    if (context.previousText) {
      userPrompt = `Previous context: "${context.previousText}"\n\n${userPrompt}`
    }
    
    if (context.problemTitle) {
      systemPrompt += `\n\nThe interview is about: ${context.problemTitle}`
    }
    
    if (context.problemDescription) {
      systemPrompt += `\n\nProblem context: ${context.problemDescription.substring(0, 200)}...`
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 500,
    })

    const correctedText = response.choices[0].message.content?.trim() || text
    
    // Remove quotes if LLM added them
    return correctedText.replace(/^["']|["']$/g, '')
  } catch (error) {
    console.error('Grammar correction error:', error)
    // Fallback to original text if correction fails
    return text
  }
}

/**
 * Main transcription correction pipeline
 */
export async function correctTranscription(
  text: string,
  context: TranscriptionContext = {}
): Promise<{
  correctedText: string
  originalText: string
  validation: ValidationResult
  wasAutoCorrected: boolean
}> {
  const originalText = text
  
  // Step 1: Validate
  const validation = validateTranscription(text)
  
  // Step 2: Technical term correction
  let corrected = replaceTechnicalTerms(text)
  
  // Step 3: Grammar correction with LLM (only if validation passes basic checks)
  if (validation.confidence > 0.3 && corrected.length > 10) {
    corrected = await grammarCorrection(corrected, context)
  }
  
  // Step 4: Add punctuation
  corrected = addPunctuation(corrected)
  
  const wasAutoCorrected = corrected !== originalText
  
  return {
    correctedText: corrected,
    originalText,
    validation,
    wasAutoCorrected,
  }
}

/**
 * Generate Whisper prompt with technical vocabulary and context
 * Emphasizes critical terms like complexity notation and indices
 */
export function generateWhisperPrompt(context: TranscriptionContext): string {
  const parts: string[] = []
  
  // CRITICAL: Start with most important terms that are commonly misheard
  parts.push('Technical coding interview.')
  parts.push('Key terms: index, indices, O(n), O(log n), O(n²), Big O notation.')
  
  // Add more vocabulary context
  parts.push('Common words: hash map, binary tree, array, algorithm.')
  
  // Add problem context if available
  if (context.problemTitle) {
    parts.push(`Problem: ${context.problemTitle}.`)
  }
  
  // Add previous context for continuity (last sentence only for brevity)
  if (context.previousText) {
    const sentences = context.previousText.split(/[.!?]/).filter(s => s.trim())
    const recentContext = sentences.slice(-1).join('. ').trim()
    if (recentContext && recentContext.length > 10) {
      parts.push(recentContext)
    }
  }
  
  return parts.join(' ')
}
