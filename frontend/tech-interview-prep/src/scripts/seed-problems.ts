import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const sampleProblems = [
  {
    title: 'Two Sum',
    description: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.

Example 1:
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].

Example 2:
Input: nums = [3,2,4], target = 6
Output: [1,2]`,
    difficulty: 'Easy',
    starter_code: {
      python: `def two_sum(nums: List[int], target: int) -> List[int]:
    # Write your code here
    pass`,
      javascript: `function twoSum(nums, target) {
    // Write your code here
}`,
      java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Write your code here
    }
}`
    },
    test_cases: [
      { input: '[2,7,11,15], 9', expected: '[0,1]', hidden: false },
      { input: '[3,2,4], 6', expected: '[1,2]', hidden: false },
      { input: '[3,3], 6', expected: '[0,1]', hidden: false }
    ]
  },
  {
    title: 'Valid Parentheses',
    description: `Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

Example 1:
Input: s = "()"
Output: true

Example 2:
Input: s = "()[]{}"
Output: true

Example 3:
Input: s = "(]"
Output: false`,
    difficulty: 'Easy',
    starter_code: {
      python: `def is_valid(s: str) -> bool:
    # Write your code here
    pass`,
      javascript: `function isValid(s) {
    // Write your code here
}`
    },
    test_cases: [
      { input: '"()"', expected: 'true', hidden: false },
      { input: '"()[]{}"', expected: 'true', hidden: false },
      { input: '"(]"', expected: 'false', hidden: false }
    ]
  },
  {
    title: 'Merge Two Sorted Lists',
    description: `You are given the heads of two sorted linked lists list1 and list2.

Merge the two lists into one sorted list. The list should be made by splicing together the nodes of the first two lists.

Return the head of the merged linked list.

Example 1:
Input: list1 = [1,2,4], list2 = [1,3,4]
Output: [1,1,2,3,4,4]

Example 2:
Input: list1 = [], list2 = []
Output: []

Example 3:
Input: list1 = [], list2 = [0]
Output: [0]`,
    difficulty: 'Medium',
    starter_code: {
      python: `def merge_two_lists(list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:
    # Write your code here
    pass`,
      javascript: `function mergeTwoLists(list1, list2) {
    // Write your code here
}`
    },
    test_cases: [
      { input: '[1,2,4], [1,3,4]', expected: '[1,1,2,3,4,4]', hidden: false },
      { input: '[], []', expected: '[]', hidden: false },
      { input: '[], [0]', expected: '[0]', hidden: false }
    ]
  },
  {
    title: 'Binary Tree Inorder Traversal',
    description: `Given the root of a binary tree, return the inorder traversal of its nodes' values.

Example 1:
Input: root = [1,null,2,3]
Output: [1,3,2]

Example 2:
Input: root = []
Output: []

Example 3:
Input: root = [1]
Output: [1]`,
    difficulty: 'Easy',
    starter_code: {
      python: `def inorder_traversal(root: Optional[TreeNode]) -> List[int]:
    # Write your code here
    pass`,
      javascript: `function inorderTraversal(root) {
    // Write your code here
}`
    },
    test_cases: [
      { input: '[1,null,2,3]', expected: '[1,3,2]', hidden: false },
      { input: '[]', expected: '[]', hidden: false },
      { input: '[1]', expected: '[1]', hidden: false }
    ]
  },
  {
    title: 'Maximum Subarray',
    description: `Given an integer array nums, find the subarray with the largest sum, and return its sum.

Example 1:
Input: nums = [-2,1,-3,4,-1,2,1,-5,4]
Output: 6
Explanation: The subarray [4,-1,2,1] has the largest sum 6.

Example 2:
Input: nums = [1]
Output: 1
Explanation: The subarray [1] has the largest sum 1.

Example 3:
Input: nums = [5,4,-1,7,8]
Output: 23
Explanation: The subarray [5,4,-1,7,8] has the largest sum 23.`,
    difficulty: 'Medium',
    starter_code: {
      python: `def max_subarray(nums: List[int]) -> int:
    # Write your code here
    pass`,
      javascript: `function maxSubArray(nums) {
    // Write your code here
}`
    },
    test_cases: [
      { input: '[-2,1,-3,4,-1,2,1,-5,4]', expected: '6', hidden: false },
      { input: '[1]', expected: '1', hidden: false },
      { input: '[5,4,-1,7,8]', expected: '23', hidden: false }
    ]
  }
]

async function seedProblems() {
  console.log('🌱 Starting to seed problems...\n')

  try {
    // Check if problems already exist
    const { data: existingProblems, error: checkError } = await supabase
      .from('problems')
      .select('title')

    if (checkError) {
      throw checkError
    }

    if (existingProblems && existingProblems.length > 0) {
      console.log('⚠️  Problems already exist in database.')
      console.log(`Found ${existingProblems.length} existing problems.`)
      console.log('\nDo you want to continue? This will add duplicate problems.')
      console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n')

      await new Promise(resolve => setTimeout(resolve, 5000))
    }

    // Insert problems
    const { data, error } = await supabase
      .from('problems')
      .insert(sampleProblems)
      .select()

    if (error) {
      throw error
    }

    console.log('✅ Successfully seeded problems!\n')
    console.log(`Added ${data?.length || 0} problems:`)
    data?.forEach((problem, index) => {
      console.log(`  ${index + 1}. ${problem.title} (${problem.difficulty})`)
    })

    console.log('\n🎉 Seeding complete!')
  } catch (error) {
    console.error('❌ Error seeding problems:', error)
    process.exit(1)
  }
}

seedProblems()
