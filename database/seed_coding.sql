-- ============================================================
-- Seed: Coding Problems (questions + coding_problems)
-- ============================================================

-- 1. Two Sum (Easy - Arrays)
WITH q AS (
  INSERT INTO questions (topic_id, title, description, type, difficulty, company_tags, xp_reward)
  VALUES (
    (SELECT id FROM topics WHERE name = 'Arrays'),
    'Two Sum',
    'Given an array of integers `nums` and an integer `target`, return indices of the two numbers that add up to `target`.\n\nYou may assume each input has exactly one solution, and you may not use the same element twice.',
    'coding', 'easy', ARRAY['Amazon','Google','Microsoft'], 10
  ) RETURNING id
)
INSERT INTO coding_problems (question_id, starter_code, test_cases, constraints, examples)
VALUES (
  (SELECT id FROM q),
  '{"python": "def two_sum(nums, target):\n    # Write your solution here\n    pass\n\n# Read input\nnums = list(map(int, input().split()))\ntarget = int(input())\nprint(two_sum(nums, target))", "javascript": "const lines = require(''fs'').readFileSync(''/dev/stdin'',''utf8'').trim().split(''\\n'');\nconst nums = lines[0].split('' '').map(Number);\nconst target = Number(lines[1]);\n\nfunction twoSum(nums, target) {\n  // Write your solution here\n}\n\nconsole.log(twoSum(nums, target));"}',
  '[{"input": "2 7 11 15\n9", "expected_output": "[0, 1]", "is_hidden": false}, {"input": "3 2 4\n6", "expected_output": "[1, 2]", "is_hidden": false}, {"input": "3 3\n6", "expected_output": "[0, 1]", "is_hidden": true}]',
  '2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9',
  '[{"input": "nums = [2,7,11,15], target = 9", "output": "[0,1]", "explanation": "nums[0] + nums[1] = 2 + 7 = 9"}, {"input": "nums = [3,2,4], target = 6", "output": "[1,2]", "explanation": "nums[1] + nums[2] = 2 + 4 = 6"}]'
);

-- 2. Reverse Linked List (Easy - Linked Lists)
WITH q AS (
  INSERT INTO questions (topic_id, title, description, type, difficulty, company_tags, xp_reward)
  VALUES (
    (SELECT id FROM topics WHERE name = 'Linked Lists'),
    'Reverse Linked List',
    'Given the head of a singly linked list, reverse the list and return the reversed list.\n\nFor this problem, represent the linked list as space-separated integers. Output the reversed sequence.',
    'coding', 'easy', ARRAY['Amazon','Microsoft'], 10
  ) RETURNING id
)
INSERT INTO coding_problems (question_id, starter_code, test_cases, constraints, examples)
VALUES (
  (SELECT id FROM q),
  '{"python": "def reverse_list(nums):\n    # Write your solution here\n    pass\n\nnums = list(map(int, input().split()))\nprint(*reverse_list(nums))", "javascript": "const nums = require(''fs'').readFileSync(''/dev/stdin'',''utf8'').trim().split('' '').map(Number);\n\nfunction reverseList(nums) {\n  // Write your solution here\n}\n\nconsole.log(reverseList(nums).join('' ''));"}',
  '[{"input": "1 2 3 4 5", "expected_output": "5 4 3 2 1", "is_hidden": false}, {"input": "1 2", "expected_output": "2 1", "is_hidden": false}, {"input": "1", "expected_output": "1", "is_hidden": true}]',
  '0 <= number of nodes <= 5000\n-5000 <= Node.val <= 5000',
  '[{"input": "1 2 3 4 5", "output": "5 4 3 2 1", "explanation": "Reverse the sequence"}, {"input": "1 2", "output": "2 1", "explanation": null}]'
);

-- 3. Valid Parentheses (Easy - Stacks & Queues)
WITH q AS (
  INSERT INTO questions (topic_id, title, description, type, difficulty, company_tags, xp_reward)
  VALUES (
    (SELECT id FROM topics WHERE name = 'Stacks & Queues'),
    'Valid Parentheses',
    'Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.\n\nAn input string is valid if:\n- Open brackets must be closed by the same type of brackets.\n- Open brackets must be closed in the correct order.\n- Every close bracket has a corresponding open bracket.',
    'coding', 'easy', ARRAY['Amazon','Google','TCS'], 10
  ) RETURNING id
)
INSERT INTO coding_problems (question_id, starter_code, test_cases, constraints, examples)
VALUES (
  (SELECT id FROM q),
  '{"python": "def is_valid(s):\n    # Write your solution here\n    pass\n\ns = input().strip()\nprint(is_valid(s))", "javascript": "const s = require(''fs'').readFileSync(''/dev/stdin'',''utf8'').trim();\n\nfunction isValid(s) {\n  // Write your solution here\n}\n\nconsole.log(isValid(s));"}',
  '[{"input": "()", "expected_output": "True", "is_hidden": false}, {"input": "()[]{}", "expected_output": "True", "is_hidden": false}, {"input": "(]", "expected_output": "False", "is_hidden": false}, {"input": "([)]", "expected_output": "False", "is_hidden": true}, {"input": "{[]}", "expected_output": "True", "is_hidden": true}]',
  '1 <= s.length <= 10^4\ns consists of parentheses only ''()[]{}''\n',
  '[{"input": "()", "output": "True", "explanation": "Matched pair"}, {"input": "()[]{}", "output": "True", "explanation": "All pairs matched"}, {"input": "(]", "output": "False", "explanation": "Mismatched brackets"}]'
);

-- 4. Binary Search (Easy - Binary Search)
WITH q AS (
  INSERT INTO questions (topic_id, title, description, type, difficulty, company_tags, xp_reward)
  VALUES (
    (SELECT id FROM topics WHERE name = 'Binary Search'),
    'Binary Search',
    'Given an array of integers `nums` sorted in ascending order, and an integer `target`, write a function to search `target` in `nums`. If `target` exists, return its index. Otherwise, return `-1`.\n\nYou must write an algorithm with `O(log n)` runtime complexity.',
    'coding', 'easy', ARRAY['Google','Microsoft'], 10
  ) RETURNING id
)
INSERT INTO coding_problems (question_id, starter_code, test_cases, constraints, examples)
VALUES (
  (SELECT id FROM q),
  '{"python": "def binary_search(nums, target):\n    # Write your solution here\n    pass\n\nnums = list(map(int, input().split()))\ntarget = int(input())\nprint(binary_search(nums, target))", "javascript": "const lines = require(''fs'').readFileSync(''/dev/stdin'',''utf8'').trim().split(''\\n'');\nconst nums = lines[0].split('' '').map(Number);\nconst target = Number(lines[1]);\n\nfunction binarySearch(nums, target) {\n  // Write your solution here\n}\n\nconsole.log(binarySearch(nums, target));"}',
  '[{"input": "-1 0 3 5 9 12\n9", "expected_output": "4", "is_hidden": false}, {"input": "-1 0 3 5 9 12\n2", "expected_output": "-1", "is_hidden": false}, {"input": "5\n5", "expected_output": "0", "is_hidden": true}]',
  '1 <= nums.length <= 10^4\n-10^4 <= nums[i], target <= 10^4\nAll integers in nums are unique\nnums is sorted in ascending order',
  '[{"input": "nums = [-1,0,3,5,9,12], target = 9", "output": "4", "explanation": "9 exists at index 4"}, {"input": "nums = [-1,0,3,5,9,12], target = 2", "output": "-1", "explanation": "2 does not exist"}]'
);

-- 5. Maximum Subarray (Medium - Dynamic Programming)
WITH q AS (
  INSERT INTO questions (topic_id, title, description, type, difficulty, company_tags, xp_reward)
  VALUES (
    (SELECT id FROM topics WHERE name = 'Dynamic Programming'),
    'Maximum Subarray',
    'Given an integer array `nums`, find the subarray with the largest sum, and return its sum.\n\nThis is the classic Kadane''s Algorithm problem.',
    'coding', 'medium', ARRAY['Amazon','Google','Microsoft'], 20
  ) RETURNING id
)
INSERT INTO coding_problems (question_id, starter_code, test_cases, constraints, examples)
VALUES (
  (SELECT id FROM q),
  '{"python": "def max_subarray(nums):\n    # Write your solution here\n    pass\n\nnums = list(map(int, input().split()))\nprint(max_subarray(nums))", "javascript": "const nums = require(''fs'').readFileSync(''/dev/stdin'',''utf8'').trim().split('' '').map(Number);\n\nfunction maxSubArray(nums) {\n  // Write your solution here\n}\n\nconsole.log(maxSubArray(nums));"}',
  '[{"input": "-2 1 -3 4 -1 2 1 -5 4", "expected_output": "6", "is_hidden": false}, {"input": "1", "expected_output": "1", "is_hidden": false}, {"input": "5 4 -1 7 8", "expected_output": "23", "is_hidden": false}, {"input": "-1 -2 -3", "expected_output": "-1", "is_hidden": true}]',
  '1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4',
  '[{"input": "[-2,1,-3,4,-1,2,1,-5,4]", "output": "6", "explanation": "Subarray [4,-1,2,1] has the largest sum = 6"}, {"input": "[5,4,-1,7,8]", "output": "23", "explanation": "The whole array is the subarray"}]'
);

-- 6. Number of Islands (Medium - Graphs)
WITH q AS (
  INSERT INTO questions (topic_id, title, description, type, difficulty, company_tags, xp_reward)
  VALUES (
    (SELECT id FROM topics WHERE name = 'Graphs'),
    'Number of Islands',
    'Given an `m x n` 2D binary grid where `"1"` represents land and `"0"` represents water, return the number of islands.\n\nAn island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.\n\nInput: first line is `m n`, then `m` lines each with `n` space-separated values (0 or 1).',
    'coding', 'medium', ARRAY['Amazon','Google','Microsoft'], 20
  ) RETURNING id
)
INSERT INTO coding_problems (question_id, starter_code, test_cases, constraints, examples)
VALUES (
  (SELECT id FROM q),
  '{"python": "def num_islands(grid):\n    # Write your solution here\n    pass\n\nimport sys\nlines = sys.stdin.read().split(''\\n'')\nm, n = map(int, lines[0].split())\ngrid = [lines[i+1].split() for i in range(m)]\nprint(num_islands(grid))", "javascript": "const lines = require(''fs'').readFileSync(''/dev/stdin'',''utf8'').trim().split(''\\n'');\nconst [m, n] = lines[0].split('' '').map(Number);\nconst grid = lines.slice(1, m+1).map(l => l.split('' ''));\n\nfunction numIslands(grid) {\n  // Write your solution here\n}\n\nconsole.log(numIslands(grid));"}',
  '[{"input": "4 5\n1 1 1 1 0\n1 1 0 1 0\n1 1 0 0 0\n0 0 0 0 0", "expected_output": "1", "is_hidden": false}, {"input": "4 5\n1 1 0 0 0\n1 1 0 0 0\n0 0 1 0 0\n0 0 0 1 1", "expected_output": "3", "is_hidden": false}, {"input": "1 1\n1", "expected_output": "1", "is_hidden": true}]',
  '1 <= m, n <= 300\ngrid[i][j] is ''0'' or ''1''',
  '[{"input": "4x5 grid with one connected land mass", "output": "1", "explanation": "All 1s are connected"}, {"input": "4x5 grid with three separate land masses", "output": "3", "explanation": "Three disconnected islands"}]'
);

-- 7. Climbing Stairs (Easy - Dynamic Programming)
WITH q AS (
  INSERT INTO questions (topic_id, title, description, type, difficulty, company_tags, xp_reward)
  VALUES (
    (SELECT id FROM topics WHERE name = 'Dynamic Programming'),
    'Climbing Stairs',
    'You are climbing a staircase. It takes `n` steps to reach the top.\n\nEach time you can either climb `1` or `2` steps. In how many distinct ways can you climb to the top?',
    'coding', 'easy', ARRAY['Amazon','Google','TCS'], 10
  ) RETURNING id
)
INSERT INTO coding_problems (question_id, starter_code, test_cases, constraints, examples)
VALUES (
  (SELECT id FROM q),
  '{"python": "def climb_stairs(n):\n    # Write your solution here\n    pass\n\nn = int(input())\nprint(climb_stairs(n))", "javascript": "const n = parseInt(require(''fs'').readFileSync(''/dev/stdin'',''utf8'').trim());\n\nfunction climbStairs(n) {\n  // Write your solution here\n}\n\nconsole.log(climbStairs(n));"}',
  '[{"input": "2", "expected_output": "2", "is_hidden": false}, {"input": "3", "expected_output": "3", "is_hidden": false}, {"input": "5", "expected_output": "8", "is_hidden": false}, {"input": "10", "expected_output": "89", "is_hidden": true}]',
  '1 <= n <= 45',
  '[{"input": "2", "output": "2", "explanation": "1+1 or 2"}, {"input": "3", "output": "3", "explanation": "1+1+1, 1+2, or 2+1"}]'
);

-- 8. Merge Intervals (Medium - Arrays)
WITH q AS (
  INSERT INTO questions (topic_id, title, description, type, difficulty, company_tags, xp_reward)
  VALUES (
    (SELECT id FROM topics WHERE name = 'Arrays'),
    'Merge Intervals',
    'Given an array of intervals where `intervals[i] = [start_i, end_i]`, merge all overlapping intervals, and return an array of the non-overlapping intervals.\n\nInput: each line is `start end` for one interval. Output: merged intervals one per line.',
    'coding', 'medium', ARRAY['Amazon','Google','Microsoft'], 20
  ) RETURNING id
)
INSERT INTO coding_problems (question_id, starter_code, test_cases, constraints, examples)
VALUES (
  (SELECT id FROM q),
  '{"python": "def merge(intervals):\n    # Write your solution here\n    pass\n\nimport sys\nlines = sys.stdin.read().strip().split(''\\n'')\nintervals = [list(map(int, l.split())) for l in lines]\nfor iv in merge(intervals):\n    print(*iv)", "javascript": "const lines = require(''fs'').readFileSync(''/dev/stdin'',''utf8'').trim().split(''\\n'');\nconst intervals = lines.map(l => l.split('' '').map(Number));\n\nfunction merge(intervals) {\n  // Write your solution here\n}\n\nmerge(intervals).forEach(iv => console.log(iv.join('' '')));"}',
  '[{"input": "1 3\n2 6\n8 10\n15 18", "expected_output": "1 6\n8 10\n15 18", "is_hidden": false}, {"input": "1 4\n4 5", "expected_output": "1 5", "is_hidden": false}, {"input": "1 4\n2 3", "expected_output": "1 4", "is_hidden": true}]',
  '1 <= intervals.length <= 10^4\nintervals[i].length == 2\n0 <= start_i <= end_i <= 10^4',
  '[{"input": "[[1,3],[2,6],[8,10],[15,18]]", "output": "[[1,6],[8,10],[15,18]]", "explanation": "[1,3] and [2,6] overlap → merge to [1,6]"}, {"input": "[[1,4],[4,5]]", "output": "[[1,5]]", "explanation": "Touching intervals merge"}]'
);

-- 9. Word Search (Hard - Recursion)
WITH q AS (
  INSERT INTO questions (topic_id, title, description, type, difficulty, company_tags, xp_reward)
  VALUES (
    (SELECT id FROM topics WHERE name = 'Recursion'),
    'Word Search',
    'Given an `m x n` grid of characters `board` and a string `word`, return `True` if `word` exists in the grid.\n\nThe word can be constructed from letters of sequentially adjacent cells (horizontally or vertically). The same cell may not be used more than once.\n\nInput: first line `m n`, next `m` lines are the board rows (space-separated chars), last line is the word.',
    'coding', 'hard', ARRAY['Amazon','Google','Microsoft'], 30
  ) RETURNING id
)
INSERT INTO coding_problems (question_id, starter_code, test_cases, constraints, examples)
VALUES (
  (SELECT id FROM q),
  '{"python": "def exist(board, word):\n    # Write your solution here\n    pass\n\nimport sys\nlines = sys.stdin.read().strip().split(''\\n'')\nm, n = map(int, lines[0].split())\nboard = [lines[i+1].split() for i in range(m)]\nword = lines[m+1]\nprint(exist(board, word))", "javascript": "const lines = require(''fs'').readFileSync(''/dev/stdin'',''utf8'').trim().split(''\\n'');\nconst [m, n] = lines[0].split('' '').map(Number);\nconst board = lines.slice(1, m+1).map(l => l.split('' ''));\nconst word = lines[m+1];\n\nfunction exist(board, word) {\n  // Write your solution here\n}\n\nconsole.log(exist(board, word));"}',
  '[{"input": "3 4\nA B C E\nS F C S\nA D E E\nABCCED", "expected_output": "True", "is_hidden": false}, {"input": "3 4\nA B C E\nS F C S\nA D E E\nSEE", "expected_output": "True", "is_hidden": false}, {"input": "3 4\nA B C E\nS F C S\nA D E E\nABCB", "expected_output": "False", "is_hidden": true}]',
  '1 <= m, n <= 6\n1 <= word.length <= 15\nboard and word consist of only lowercase and uppercase English letters',
  '[{"input": "board = [[A,B,C,E],[S,F,C,S],[A,D,E,E]], word = ABCCED", "output": "True", "explanation": "Path exists"}, {"input": "board = [[A,B,C,E],[S,F,C,S],[A,D,E,E]], word = ABCB", "output": "False", "explanation": "Cannot reuse cell B"}]'
);
