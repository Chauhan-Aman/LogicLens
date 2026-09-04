
#include "LogicLens.h"

// --- INJECTED GLOBAL INPUTS ---



struct __LL_Init {
    __LL_Init() {

    }
} __ll_init_instance;

// ------------------------------

// --- USER CODE ---

#include <iostream>
#include <string>
using namespace std;

int main() {
  string s = "anagram";
  string t = "nagaram";
  for (int i = 0; i < s.length(); i++) {
    for (int j = i + 1; j < s.length(); j++) {
      if (s[i] > s[j]) { char temp = s[i]; s[i] = s[j]; s[j] = temp; }
    }
  }
  return 0;
}

// -----------------
