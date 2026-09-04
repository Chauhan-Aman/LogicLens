import urllib.request
import json

code = """
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
"""

req = urllib.request.Request(
    'http://localhost:3000/api/execute',
    data=json.dumps({"code": code, "input": "{}", "language": "cpp"}).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)

try:
    with urllib.request.urlopen(req) as response:
        res = json.loads(response.read().decode())
        if 'events' in res:
            for i, ev in enumerate(res['events']):
                if ev['type'] == 'VARIABLE_UPDATE' and ev['variable'] == 's':
                    print(f"Step {i}: s = {ev['value']}")
except Exception as e:
    print("Error:", e)
