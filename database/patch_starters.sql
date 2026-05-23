UPDATE coding_problems
SET starter_code = starter_code || jsonb_build_object(
  'java',
  'import java.util.*;
import java.io.*;

public class Solution {
    public static void main(String[] args) throws Exception {
        // Write your solution here
    }
}
',
  'cpp',
  '#include <bits/stdc++.h>
using namespace std;

int main() {
    // Write your solution here
    return 0;
}
'
)
WHERE starter_code IS NOT NULL;
