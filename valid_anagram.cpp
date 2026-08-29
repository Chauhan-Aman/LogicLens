// Brute Force Sorting C++ — O(n log n)
#include <iostream>
#include <string>

using namespace std;

int main() {
  if (s.length() != t.length()) {
    cout << "Lengths differ, not an anagram" << endl;
    return 0;
  }

  for (int i = 0; i < s.length(); i++) {
    for (int j = i + 1; j < s.length(); j++) {
      if (s[i] > s[j]) { char temp = s[i]; s[i] = s[j]; s[j] = temp; }
    }
  }
  for (int i = 0; i < t.length(); i++) {
    for (int j = i + 1; j < t.length(); j++) {
      if (t[i] > t[j]) { char temp = t[i]; t[i] = t[j]; t[j] = temp; }
    }
  }

  for (int i = 0; i < s.length(); i++) {
    if (s[i] != t[i]) {
      cout << "Mismatch found" << endl;
      return 0;
    }
  }

  cout << "Valid anagram!" << endl;
  return 0;
}
