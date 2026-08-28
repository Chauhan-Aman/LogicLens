const fs = require('fs');
const execOutput = '{"type": "VARIABLE_UPDATE", "payload": {"name": "sum", "value": 9}}\r\n{"type": "ANNOTATION", "payload": {"message": "Found match!"}}\r\n';

const events = execOutput.split('\n')
  .filter(line => line.trim().startsWith('{'))
  .map(line => {
    try { 
      return JSON.parse(line); 
    } catch (e) { 
      console.log('Error parsing line:', line, e);
      return null; 
    }
  })
  .filter(e => e !== null);

console.log(events);
