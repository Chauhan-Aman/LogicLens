const req = {
  code: `if (s.length() != t.length()) {
  __ll_note("Lengths differ, not an anagram");
  return false;
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
    __ll_note("Mismatch found");
    return false;
  }
}

__ll_note("Valid anagram!");
return true;`,
  input: JSON.stringify({ s: 'anagram', t: 'nagaram' }),
  language: 'cpp'
};

fetch('http://localhost:3000/api/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(req)
}).then(res => res.json()).then(console.log).catch(console.error);
