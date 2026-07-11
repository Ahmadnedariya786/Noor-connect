import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distMushafDir = path.join(__dirname, '../dist/mushaf');

if (fs.existsSync(distMushafDir)) {
  try {
    fs.rmSync(distMushafDir, { recursive: true, force: true });
    console.log('Successfully removed dist/mushaf to prevent APK asset duplication (~88MB saved).');
  } catch (err) {
    console.error('Failed to remove dist/mushaf:', err);
  }
} else {
  console.log('dist/mushaf directory not found, skipping clean.');
}
