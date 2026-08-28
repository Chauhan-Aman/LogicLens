# Remaining Tasks for Phase 6 (C++ Backend)

We have successfully implemented basic C++ execution, global variable initialization, and loop variable tracking. 

However, full C++ structure tracking is not yet complete. To achieve parity with the JavaScript visualization engine, the following tasks must be completed in the future:

## 1. Array and Vector Access Tracking (`ARRAY_ACCESS`)
Currently, `transpiler.py` ignores array accesses like `nums[i]`. 
When the user accesses an array, the cell should flash yellow in the visualizer.
- **Action**: Update `transpiler.py` to identify `CXXOperatorCallExpr` (e.g., `operator[]`) and `ArraySubscriptExpr`.
- **Injection**: Inject `__ll_array_access("nums", i);` before the statement where the access occurs.

## 2. Array and Vector Modification Tracking (`ARRAY_WRITE`)
Currently, modifying an array (e.g., `nums[0] = 5;` or `nums.push_back(5);`) is not tracked.
- **Action**: Update `transpiler.py` to intercept assignments to array subscripts and calls to standard vector methods (`push_back`, `pop_back`, etc.).
- **Injection**: Inject `__ll_array_write("nums", 0, 5);` immediately after the assignment or method call.

## 3. HashMap and HashSet Tracking
C++ standard library maps (`std::unordered_map`) and sets (`std::unordered_set`) are not yet tracked.
- **Action**: Identify calls to `.insert()`, `.erase()`, `.count()`, `.find()`, and the `[]` operator for maps.
- **Injection**: Inject `__ll_map_insert`, `__ll_map_lookup`, `__ll_map_delete`, etc.

## Note on Windows libclang
When parsing C++ STL headers (`<vector>`, `<unordered_map>`) with `clang.cindex` on Windows, `libclang` often fails to locate the standard MSVC/MinGW include directories unless explicitly provided in the `args` array. This causes the AST to drop the `vector` nodes entirely. 
**Solution**: Before implementing AST tracking for containers, you will need to add a header search path discovery function to `transpiler.py` that dynamically locates the local `include` folders (or pass `-I` paths via the frontend).
