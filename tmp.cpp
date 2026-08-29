
#include "LogicLens.h"

// --- INJECTED GLOBAL INPUTS ---

std::vector<int> prices = {7, 1, 5, 3, 6, 4};


struct __LL_Init {
    __LL_Init() {
        __ll_set_var("prices", prices);

    }
} __ll_init_instance;

// ------------------------------

// --- USER CODE ---
// Sliding Window C++ â€” O(n)
#include <iostream>
#include <vector>

using namespace std;

int main() {
  int minPrice = 2147483647;
  int maxProfit = 0;

  for (int i = 0; i < prices.size(); i++) {
    int price = prices[i];
    if (price < minPrice) {
      minPrice = price;
      cout << "New min price: " << minPrice << endl;
    } else {
      int profit = price - minPrice;
      if (profit > maxProfit) {
        maxProfit = profit;
        cout << "New max profit: " << maxProfit << endl;
      }
    }
  }
  return 0;
}
// -----------------
