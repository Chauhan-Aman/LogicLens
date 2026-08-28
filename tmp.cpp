
#include "LogicLens.h"

// --- INJECTED GLOBAL INPUTS ---

std::vector<int> nums = {2, 7, 11, 15};
int target = 9;


struct __LL_Init {
    __LL_Init() {
        __ll_set_var("nums", nums);
        __ll_set_var("target", target);

    }
} __ll_init_instance;

// ------------------------------

// --- USER CODE ---
// Brute Force C++ â€” O(nÂ²)
#include <iostream>
#include <vector>

using namespace std;

int main() {
  for (int i = 0; i < nums.size(); i++) {
    for (int j = i + 1; j < nums.size(); j++) {
      int sum = nums[i] + nums[j];
      if (sum == target) {
        cout << "Found match!" << endl;
        return 0;
      }
    }
  }
  return 0;
}
// -----------------
