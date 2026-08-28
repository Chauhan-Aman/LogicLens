
#include "LogicLens.h"
#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <map>
#include <unordered_map>
#include <set>
#include <unordered_set>

using namespace std;

// --- INJECTED GLOBAL INPUTS ---

std::vector<int> nums = {-1, 0, 3, 5, 9, 12};
int target = 9;


struct __LL_Init {
    __LL_Init() {
        __ll_set_var("nums", nums);
        __ll_set_var("target", target);

    }
} __ll_init_instance;

// ------------------------------

// --- USER CODE ---
int main() {
// Binary Search C++ â€” O(log n)
int left = 0;
int right = nums.size() - 1;

while (left <= right) {
  int mid = left + (right - left) / 2;
  int midVal = nums[mid];
  
  if (midVal == target) {
    cout << "Found target at index " << mid << endl;
    return 0;
  } else if (midVal < target) {
    cout << "midVal < target, search right half" << endl;
    left = mid + 1;
  } else {
    cout << "midVal > target, search left half" << endl;
    right = mid - 1;
  }
}
return 0;
return 0;
}
// -----------------
