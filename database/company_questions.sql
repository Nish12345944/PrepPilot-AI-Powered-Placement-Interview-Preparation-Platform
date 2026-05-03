-- ============================================================
-- PrepPilot Interview Questions by Company Level
-- ============================================================

-- Add more companies with different difficulty levels
INSERT INTO companies (name, difficulty, rounds, focus_areas) VALUES
('Wipro', 'medium', '[{"name":"Aptitude","type":"aptitude"},{"name":"Technical","type":"technical"},{"name":"HR","type":"hr"}]', ARRAY['Aptitude','Programming','DBMS','Networking']),
('Accenture', 'medium', '[{"name":"Online Test","type":"aptitude"},{"name":"Technical","type":"technical"},{"name":"HR","type":"hr"}]', ARRAY['Aptitude','Communication','Problem Solving']),
('Cognizant', 'medium', '[{"name":"Aptitude","type":"aptitude"},{"name":"Coding","type":"coding"},{"name":"Technical","type":"technical"}]', ARRAY['Programming','DBMS','Web Technologies']),
('Meta', 'hard', '[{"name":"Phone Screen","type":"coding"},{"name":"Onsite x4","type":"technical"},{"name":"Behavioral","type":"behavioral"}]', ARRAY['DSA','System Design','Product Sense']),
('Apple', 'hard', '[{"name":"Phone Screen","type":"coding"},{"name":"Onsite x3","type":"technical"},{"name":"Design","type":"system_design"}]', ARRAY['DSA','System Design','iOS Development']),
('Netflix', 'hard', '[{"name":"Phone Screen","type":"coding"},{"name":"Onsite x4","type":"technical"},{"name":"Culture Fit","type":"behavioral"}]', ARRAY['DSA','System Design','Microservices']);

-- ============================================================
-- EASY LEVEL QUESTIONS (TCS, Infosys, Entry Level)
-- ============================================================

-- Programming Basics Questions
INSERT INTO questions (topic_id, title, description, type, difficulty, company_tags, role_tags, options, correct_answer, explanation, hints, time_limit_sec, xp_reward) VALUES

-- Basic Programming
(14, 'What is OOP?', 'Explain the concept of Object-Oriented Programming and its main principles.', 'subjective', 'easy', ARRAY['TCS','Infosys','Wipro'], ARRAY['SDE','Developer'], NULL, 'Object-Oriented Programming is a programming paradigm based on objects and classes. Main principles: Encapsulation, Inheritance, Polymorphism, Abstraction.', 'OOP is a programming paradigm that uses objects and classes to structure code. The four main principles are encapsulation (data hiding), inheritance (code reuse), polymorphism (multiple forms), and abstraction (hiding complexity).', ARRAY['Think about real-world objects','Consider code reusability','Focus on the four pillars'], 300, 10),

(14, 'Difference between Class and Object', 'What is the difference between a class and an object in programming?', 'subjective', 'easy', ARRAY['TCS','Infosys','Cognizant'], ARRAY['SDE','Developer'], NULL, 'Class is a blueprint/template, Object is an instance of a class.', 'A class is a blueprint or template that defines the structure and behavior of objects. An object is an actual instance of a class with specific values for its attributes.', ARRAY['Class is like a blueprint','Object is like a house built from blueprint'], 240, 10),

-- Basic MCQs
(14, 'Which is not an OOP principle?', 'Which of the following is NOT a principle of Object-Oriented Programming?', 'mcq', 'easy', ARRAY['TCS','Infosys'], ARRAY['SDE'], 
'[{"text":"Encapsulation","is_correct":false},{"text":"Inheritance","is_correct":false},{"text":"Compilation","is_correct":true},{"text":"Polymorphism","is_correct":false}]', 
'Compilation', 'Compilation is a process of converting source code to machine code, not an OOP principle. The four OOP principles are Encapsulation, Inheritance, Polymorphism, and Abstraction.', ARRAY['Think about the four pillars of OOP'], 120, 5),

-- DBMS Questions
(12, 'What is DBMS?', 'Explain Database Management System and its advantages.', 'subjective', 'easy', ARRAY['TCS','Infosys','Wipro'], ARRAY['SDE','Database Developer'], NULL, 'DBMS is software that manages databases. Advantages: Data security, integrity, reduced redundancy, concurrent access.', 'Database Management System (DBMS) is software that provides an interface to interact with databases. It ensures data security, integrity, consistency, and allows multiple users to access data concurrently.', ARRAY['Think about data organization','Consider multiple user access'], 300, 10),

(12, 'Primary Key vs Foreign Key', 'What is the difference between Primary Key and Foreign Key?', 'mcq', 'easy', ARRAY['TCS','Infosys','Cognizant'], ARRAY['SDE','Database Developer'],
'[{"text":"Primary key uniquely identifies a record, Foreign key references another table","is_correct":true},{"text":"Primary key can be null, Foreign key cannot","is_correct":false},{"text":"Primary key references another table, Foreign key is unique","is_correct":false},{"text":"No difference","is_correct":false}]',
'Primary key uniquely identifies a record, Foreign key references another table', 'Primary key uniquely identifies each record in a table and cannot be null. Foreign key is a field that references the primary key of another table, establishing relationships between tables.', ARRAY['Think about table relationships','Consider uniqueness'], 180, 8),

-- Basic Aptitude
(17, 'Simple Interest Calculation', 'If principal is Rs. 1000, rate is 10% per annum, and time is 2 years, what is the simple interest?', 'mcq', 'easy', ARRAY['TCS','Infosys','Wipro','Accenture'], ARRAY['SDE','Analyst'],
'[{"text":"Rs. 100","is_correct":false},{"text":"Rs. 200","is_correct":true},{"text":"Rs. 300","is_correct":false},{"text":"Rs. 400","is_correct":false}]',
'Rs. 200', 'Simple Interest = (Principal × Rate × Time) / 100 = (1000 × 10 × 2) / 100 = Rs. 200', ARRAY['Use SI formula: PRT/100'], 120, 5),

-- HR Questions
(16, 'Tell me about yourself', 'This is a common HR question. How would you structure your answer?', 'subjective', 'easy', ARRAY['TCS','Infosys','Wipro','Accenture'], ARRAY['SDE','Analyst','Developer'], NULL, 'Structure: Present (education/current role), Past (relevant experience), Future (career goals and why this company).', 'Structure your answer in Present-Past-Future format. Present: current education/role, Past: relevant experiences and achievements, Future: career goals and how this role fits your aspirations.', ARRAY['Keep it professional','Focus on relevant experiences','Connect to the role'], 300, 8);

-- ============================================================
-- MEDIUM LEVEL QUESTIONS (Wipro, Accenture, Mid-tier)
-- ============================================================

INSERT INTO questions (topic_id, title, description, type, difficulty, company_tags, role_tags, options, correct_answer, explanation, hints, time_limit_sec, xp_reward) VALUES

-- DSA Medium
(1, 'Two Sum Problem', 'Given an array of integers and a target sum, find two numbers that add up to the target.', 'coding', 'medium', ARRAY['Wipro','Accenture','Cognizant'], ARRAY['SDE','Developer'], NULL, 'Use hash map to store complements', 'Use a hash map to store each number and its index. For each element, check if its complement (target - current) exists in the map.', ARRAY['Think about using extra space','Hash map for O(1) lookup'], 600, 20),

(3, 'Binary Tree Traversal', 'Implement inorder traversal of a binary tree.', 'coding', 'medium', ARRAY['Wipro','Accenture'], ARRAY['SDE'], NULL, 'Recursive: visit left, root, right', 'Inorder traversal visits nodes in Left-Root-Right order. Can be implemented recursively or iteratively using a stack.', ARRAY['Left-Root-Right order','Use recursion or stack'], 450, 18),

-- System Design Basics
(15, 'Design a URL Shortener', 'Design a basic URL shortening service like bit.ly. Explain the key components.', 'subjective', 'medium', ARRAY['Wipro','Accenture','Microsoft'], ARRAY['SDE','Senior Developer'], NULL, 'Key components: URL encoding/decoding, database storage, caching, load balancing.', 'A URL shortener needs: 1) Encoding algorithm (base62), 2) Database to store mappings, 3) Cache for popular URLs, 4) Load balancer for scalability, 5) Analytics tracking.', ARRAY['Think about encoding algorithms','Consider scalability','Database design'], 900, 25),

-- Advanced Programming
(14, 'Multithreading Concepts', 'Explain the difference between process and thread. What are the advantages of multithreading?', 'subjective', 'medium', ARRAY['Wipro','Accenture','Cognizant'], ARRAY['SDE','Senior Developer'], NULL, 'Process is independent program execution, Thread is lightweight unit within process. Advantages: parallelism, resource sharing, responsiveness.', 'Process is an independent program in execution with its own memory space. Thread is a lightweight execution unit within a process that shares memory. Multithreading enables parallelism, better resource utilization, and improved responsiveness.', ARRAY['Think about memory sharing','Consider parallelism benefits'], 420, 15),

-- Database Advanced
(12, 'Database Normalization', 'What is database normalization? Explain 1NF, 2NF, and 3NF with examples.', 'subjective', 'medium', ARRAY['Wipro','Accenture','Cognizant'], ARRAY['SDE','Database Developer'], NULL, '1NF: Atomic values, 2NF: No partial dependency, 3NF: No transitive dependency', 'Normalization eliminates redundancy. 1NF: Each cell contains atomic values. 2NF: 1NF + no partial functional dependency. 3NF: 2NF + no transitive functional dependency.', ARRAY['Think about eliminating redundancy','Focus on dependencies'], 600, 20);

-- ============================================================
-- HARD LEVEL QUESTIONS (FAANG, Top-tier)
-- ============================================================

INSERT INTO questions (topic_id, title, description, type, difficulty, company_tags, role_tags, options, correct_answer, explanation, hints, time_limit_sec, xp_reward) VALUES

-- Advanced DSA
(5, 'Longest Increasing Subsequence', 'Find the length of the longest increasing subsequence in an array using dynamic programming.', 'coding', 'hard', ARRAY['Google','Amazon','Microsoft','Meta'], ARRAY['SDE','Senior SDE'], NULL, 'DP solution: O(n²) or Binary Search: O(n log n)', 'Can be solved using DP in O(n²) time or optimized using binary search in O(n log n). The key insight is maintaining the smallest tail element for each subsequence length.', ARRAY['Think about optimal substructure','Consider binary search optimization'], 1200, 40),

(4, 'Detect Cycle in Directed Graph', 'Implement an algorithm to detect if a directed graph contains a cycle.', 'coding', 'hard', ARRAY['Google','Amazon','Apple'], ARRAY['SDE','Senior SDE'], NULL, 'Use DFS with color coding (white, gray, black)', 'Use DFS with three colors: white (unvisited), gray (visiting), black (visited). A back edge to a gray node indicates a cycle.', ARRAY['Think about DFS traversal','Use coloring technique'], 900, 35),

-- System Design Advanced
(15, 'Design WhatsApp', 'Design a messaging system like WhatsApp. Consider scalability, real-time messaging, and reliability.', 'subjective', 'hard', ARRAY['Meta','Google','Amazon'], ARRAY['Senior SDE','Staff Engineer'], NULL, 'Key components: WebSocket connections, message queues, database sharding, CDN for media, push notifications.', 'WhatsApp design requires: 1) WebSocket for real-time messaging, 2) Message queues for reliability, 3) Database sharding for scalability, 4) CDN for media files, 5) Push notification service, 6) Load balancers, 7) Caching layer.', ARRAY['Think about real-time communication','Consider message delivery guarantees','Plan for billions of users'], 1800, 50),

(15, 'Design Distributed Cache', 'Design a distributed caching system like Redis Cluster. Explain partitioning, replication, and consistency.', 'subjective', 'hard', ARRAY['Netflix','Amazon','Google'], ARRAY['Senior SDE','Principal Engineer'], NULL, 'Consistent hashing for partitioning, master-slave replication, eventual consistency with conflict resolution.', 'Distributed cache needs: 1) Consistent hashing for data partitioning, 2) Replication for fault tolerance, 3) Consensus algorithms for consistency, 4) Cache eviction policies, 5) Monitoring and auto-scaling.', ARRAY['Think about data distribution','Consider fault tolerance','Plan for consistency models'], 2100, 55),

-- Advanced Algorithms
(5, 'Edit Distance (Levenshtein)', 'Find the minimum number of operations (insert, delete, replace) to convert one string to another.', 'coding', 'hard', ARRAY['Google','Microsoft','Amazon'], ARRAY['SDE','Senior SDE'], NULL, 'Dynamic Programming: dp[i][j] = min operations to convert s1[0..i-1] to s2[0..j-1]', 'Use 2D DP where dp[i][j] represents minimum operations to convert first i characters of string1 to first j characters of string2. Consider three operations: insert, delete, replace.', ARRAY['Think about optimal substructure','Consider all three operations'], 1500, 45),

-- Behavioral Questions for Senior Roles
(16, 'Leadership Experience', 'Describe a time when you had to lead a team through a challenging project. What was your approach?', 'behavioral', 'hard', ARRAY['Amazon','Google','Meta','Apple'], ARRAY['Senior SDE','Tech Lead','Manager'], NULL, 'Use STAR method: Situation, Task, Action, Result. Focus on leadership skills, decision-making, and team management.', 'Structure using STAR method. Highlight: 1) How you motivated the team, 2) Difficult decisions you made, 3) How you handled conflicts, 4) Measurable outcomes, 5) Lessons learned and applied.', ARRAY['Use STAR method','Focus on leadership qualities','Quantify results'], 600, 30),

(16, 'Technical Decision Making', 'Tell me about a time you had to make a difficult technical decision with limited information. How did you approach it?', 'behavioral', 'hard', ARRAY['Netflix','Amazon','Google'], ARRAY['Senior SDE','Principal Engineer'], NULL, 'Demonstrate analytical thinking, risk assessment, stakeholder communication, and learning from outcomes.', 'Show: 1) How you gathered available information, 2) Risk analysis and trade-offs considered, 3) Stakeholder consultation, 4) Decision rationale, 5) Monitoring and course correction, 6) Lessons learned.', ARRAY['Show analytical thinking','Discuss trade-offs','Mention stakeholder impact'], 720, 35);

-- ============================================================
-- CODING PROBLEMS WITH TEST CASES
-- ============================================================

-- Two Sum Problem
INSERT INTO coding_problems (question_id, starter_code, test_cases, constraints, examples, solution_code, time_complexity, space_complexity) 
SELECT id, 
'{"python": "def two_sum(nums, target):\n    # Your code here\n    pass", "java": "public int[] twoSum(int[] nums, int target) {\n    // Your code here\n    return new int[0];\n}", "cpp": "vector<int> twoSum(vector<int>& nums, int target) {\n    // Your code here\n    return {};\n}"}',
'[{"input": "[2,7,11,15], 9", "expected_output": "[0,1]", "is_hidden": false}, {"input": "[3,2,4], 6", "expected_output": "[1,2]", "is_hidden": false}, {"input": "[3,3], 6", "expected_output": "[0,1]", "is_hidden": true}]',
'Array length: 2 ≤ nums.length ≤ 10^4, -10^9 ≤ nums[i] ≤ 10^9, -10^9 ≤ target ≤ 10^9',
'[{"input": "[2,7,11,15], target = 9", "output": "[0,1]", "explanation": "nums[0] + nums[1] = 2 + 7 = 9"}]',
'{"python": "def two_sum(nums, target):\n    num_map = {}\n    for i, num in enumerate(nums):\n        complement = target - num\n        if complement in num_map:\n            return [num_map[complement], i]\n        num_map[num] = i\n    return []"}',
'O(n)', 'O(n)'
FROM questions WHERE title = 'Two Sum Problem';

-- LIS Problem
INSERT INTO coding_problems (question_id, starter_code, test_cases, constraints, examples, solution_code, time_complexity, space_complexity)
SELECT id,
'{"python": "def length_of_lis(nums):\n    # Your code here\n    pass", "java": "public int lengthOfLIS(int[] nums) {\n    // Your code here\n    return 0;\n}", "cpp": "int lengthOfLIS(vector<int>& nums) {\n    // Your code here\n    return 0;\n}"}',
'[{"input": "[10,9,2,5,3,7,101,18]", "expected_output": "4", "is_hidden": false}, {"input": "[0,1,0,3,2,3]", "expected_output": "4", "is_hidden": false}, {"input": "[7,7,7,7,7,7,7]", "expected_output": "1", "is_hidden": true}]',
'1 ≤ nums.length ≤ 2500, -10^4 ≤ nums[i] ≤ 10^4',
'[{"input": "[10,9,2,5,3,7,101,18]", "output": "4", "explanation": "The longest increasing subsequence is [2,3,7,18]"}]',
'{"python": "def length_of_lis(nums):\n    if not nums:\n        return 0\n    dp = [1] * len(nums)\n    for i in range(1, len(nums)):\n        for j in range(i):\n            if nums[i] > nums[j]:\n                dp[i] = max(dp[i], dp[j] + 1)\n    return max(dp)"}',
'O(n²)', 'O(n)'
FROM questions WHERE title = 'Longest Increasing Subsequence';

-- ============================================================
-- COMPANY-QUESTION MAPPINGS
-- ============================================================

-- Map questions to companies with frequency
INSERT INTO company_questions (company_id, question_id, frequency)
SELECT c.id, q.id, 
    CASE 
        WHEN c.difficulty = 'easy' THEN 5
        WHEN c.difficulty = 'medium' THEN 3  
        WHEN c.difficulty = 'hard' THEN 2
    END as frequency
FROM companies c
CROSS JOIN questions q
WHERE c.name = ANY(q.company_tags);

-- ============================================================
-- ADDITIONAL SEED DATA
-- ============================================================

-- Add more topics for comprehensive coverage
INSERT INTO topics (name, category, parent_id) VALUES
('String Algorithms', 'DSA', NULL),
('Bit Manipulation', 'DSA', NULL),
('Greedy Algorithms', 'DSA', NULL),
('Backtracking', 'DSA', NULL),
('Trie', 'DSA', 3),
('Heap', 'DSA', NULL),
('Union Find', 'DSA', NULL),
('Segment Tree', 'DSA', NULL),
('Microservices', 'System Design', 15),
('Load Balancing', 'System Design', 15),
('Caching Strategies', 'System Design', 15),
('Database Scaling', 'System Design', 15);

COMMIT;