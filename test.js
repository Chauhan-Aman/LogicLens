async function test() {
  const code = `
const s = __input.s;
const t = __input.t;
const freq = __ll.map('freq');

__ll.note(\`Counting chars in s="\${s}"\`);
for (let i = 0; i < s.length; i++) {
  __ll.setVar('i', i);
  __ll.setVar('char', s[i]);
  const cur = freq.get(s[i]) || 0;
  freq.set(s[i], cur + 1);
}

__ll.note(\`Decrementing with t="\${t}"\`);
for (let i = 0; i < t.length; i++) {
  __ll.setVar('i', i);
  __ll.setVar('char', t[i]);
  const cur = freq.get(t[i]) || 0;
  if (cur === 0) {
    __ll.note(\`'\${t[i]}' not found — not an anagram\`);
    return false;
  }
  freq.set(t[i], cur - 1);
}

__ll.note('Valid anagram!');
return true;
`;

  try {
    const input = JSON.stringify({ s: 'a', t: 'a' });
    const { executeCode } = require('./src/engine/executor.ts');
  } catch(e) {
    console.error("Fetch Error:", e);
  }
}
test();
