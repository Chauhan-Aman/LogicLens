
#include <iostream>
#include <vector>

using namespace std;

int main() {
  vector<int> nums = {-1, 0, 3, 5, 9, 12};
  int target = 9;
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
}
