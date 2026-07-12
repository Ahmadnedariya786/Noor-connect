const fs = require('fs');
const en = JSON.parse(fs.readFileSync('src/locales/en.json', 'utf8'));

const files = [
  'src/components/PrayerMethodSelector.tsx',
  'src/components/AdhanSelector.tsx',
  'src/components/CustomAdhanUpload.tsx',
  'src/components/PermissionManager.tsx',
  'src/components/HapticSettings.tsx',
  'src/pages/Profile.tsx'
];

const regex = /[^a-zA-Z](?:t|ti18n)\(['"]([^'"]+)['"]\)/g;

files.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    let match;
    const missing = [];
    while ((match = regex.exec(content)) !== null) {
      if (!en[match[1]]) missing.push(match[1]);
    }
    if (missing.length) {
      console.log(file, [...new Set(missing)]);
    }
  } catch (e) {
    console.error(e.message);
  }
});
