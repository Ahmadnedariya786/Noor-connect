const fs = require('fs');
const content = fs.readFileSync('src/pages/Profile.tsx', 'utf8');
const en = JSON.parse(fs.readFileSync('src/locales/en.json', 'utf8'));

const matches = [];
const regex = /(?:t|ti18n)\(['"]([^'"]+)['"]\)/g;
let match;
while ((match = regex.exec(content)) !== null) {
  matches.push(match[1]);
}

const uniqueKeys = [...new Set(matches)];
const missing = uniqueKeys.filter(k => !en[k]);

console.log(JSON.stringify(missing, null, 2));
