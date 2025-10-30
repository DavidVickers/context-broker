// Debug OAuth sessions
const fs = require('fs');
const path = require('path');

console.log('🔍 Debugging OAuth sessions...');

// Check if there are any session files or in-memory storage
console.log('Current working directory:', process.cwd());

// Try to find any session storage
const possiblePaths = [
  './sessions.json',
  './data/sessions.json',
  './tmp/sessions.json',
  './src/data/sessions.json'
];

possiblePaths.forEach(p => {
  if (fs.existsSync(p)) {
    console.log(`Found session file: ${p}`);
    try {
      const data = fs.readFileSync(p, 'utf8');
      console.log('Content:', data);
    } catch (error) {
      console.log('Error reading file:', error.message);
    }
  } else {
    console.log(`No file at: ${p}`);
  }
});

// Check if there's a token manager instance running
console.log('\nTrying to connect to broker API...');
