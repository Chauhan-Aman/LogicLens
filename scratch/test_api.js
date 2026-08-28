const http = require('http');

const data = JSON.stringify({
  language: 'cpp',
  input: '{"nums":[2,7,11,15], "target":9}',
  code: `
#include <iostream>
#include <vector>
using namespace std;
int main() {
  for (int i = 0; i < nums.size(); i++) {
    for (int j = i + 1; j < nums.size(); j++) {
      int sum = nums[i] + nums[j];
      if (sum == target) {
        __ll_note("Found match!");
        return 0;
      }
    }
  }
}
`
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/execute',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('Response:', body));
});

req.on('error', e => console.error(e));
req.write(data);
req.end();
