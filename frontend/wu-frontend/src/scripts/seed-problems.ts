import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const sampleProblems = [
  {
    title: 'Two Sum',
    description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
    difficulty: 'Easy',
    starter_code: {
      python: 'def two_sum(nums: List[int], target: int) -> List[int]:\n    pass',
      javascript: 'function twoSum(nums, target) {\n    // your code here\n}'
    },
    test_cases: [
      { input: '[2,7,11,15], 9', expected: '[0,1]', hidden: false },
      { input: '[3,2,4], 6', expected: '[1,2]', hidden: false }
    ]
  },
  {
    title: 'Valid Parentheses',
    description: 'Given a string s containing just the characters \'(\', \')\', \'{\', \'}\', \'[\' and \']\', determine if the input string is valid.',
    difficulty: 'Easy',
    starter_code: {
      python: 'def is_valid(s: str) -> bool:\n    pass',
      javascript: 'function isValid(s) {\n    // your code here\n}'
    },
    test_cases: [
      { input: '"()"', expected: 'true', hidden: false },
      { input: '"()[]{}"', expected: 'true', hidden: false }
    ]
  },
  {
    title: 'Merge Two Sorted Lists',
    description: 'You are given the heads of two sorted linked lists list1 and list2. Merge the two lists into one sorted list.',
    difficulty: 'Medium',
    starter_code: {
      python: 'def merge_two_lists(list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:\n    pass',
      javascript: 'function mergeTwoLists(list1, list2) {\n    // your code here\n}'
    },
    test_cases: [
      { input: '[1,2,4], [1,3,4]', expected: '[1,1,2,3,4,4]', hidden: false }
    ]
  }
]

async function seedProblems() {
  console.log('Seeding problems...')

  const { data, error } = await supabase
    .from('problems')
    .insert(sampleProblems)

  if (error) {
    console.error('Error seeding problems:', error)
  } else {
    console.log('Successfully seeded problems:', data)
  }
}

seedProblems()
