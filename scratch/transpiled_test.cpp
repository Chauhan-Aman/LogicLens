#include "LogicLens.h"
#include <iostream>
#include <vector>

using namespace std;

int main() {
    std::vector<int> nums = {2, 7, 11, 15};
    int target = 9;

    for (int i = 0; i < nums.size(); i++) {
      for (int j = i + 1; j < nums.size(); j++) {
        int sum = nums[i] + nums[j];
        __ll_set_var("sum", sum);
        if (sum == target) {
          __ll_note("Found match!");
          return 0;
        }
      }
    }
    return 0;
}
