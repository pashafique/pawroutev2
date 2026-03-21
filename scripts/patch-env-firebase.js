// Reads Firebase service account JSON and patches .env files
// Run: node scripts/patch-env-firebase.js
const fs = require('fs');
const path = require('path');

const JSON_PATH = 'C:/Users/LENOVO/Downloads/pawroute-b5cab-firebase-adminsdk-fbsvc-3b6310d9ee.json';
const API_ENV   = 'C:/pawroutev2/apps/api/.env';
const ROOT_ENV  = 'C:/pawroutev2/.env';

const fb = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));

const PROJECT_ID   = fb.project_id;
const CLIENT_EMAIL = fb.client_email;
// Replace each actual newline (0x0A) with the two-char sequence \n
// so the key fits on one line in .env
const KEY_ONELINE  = fb.private_key.split('\n').join('\\n');

console.log('Project ID:    ', PROJECT_ID);
console.log('Client Email:  ', CLIENT_EMAIL);
console.log('Key one-line?  ', !KEY_ONELINE.includes('\n'));
console.log('Key (first 60):', KEY_ONELINE.substring(0, 60));

function patchEnv(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // FIREBASE_PRIVATE_KEY might currently span multiple lines (quoted value with real newlines).
  // We need to collapse that into a single line.
  // Strategy: split on lines, find the FIREBASE_PRIVATE_KEY line, remove lines until
  // we hit the closing quote, then replace with the correct single line.
  const lines = content.split('\n');
  const newLines = [];
  let inKey = false;

  for (const line of lines) {
    if (line.startsWith('FIREBASE_PRIVATE_KEY=')) {
      // Replace (and skip until end of the value)
      newLines.push(`FIREBASE_PRIVATE_KEY="${KEY_ONELINE}"`);
      // If the value started with a quote and the line doesn't close it, skip following lines
      const val = line.slice('FIREBASE_PRIVATE_KEY='.length);
      const quoteCount = (val.match(/"/g) || []).length;
      if (quoteCount < 2) {
        inKey = true; // value continues on next lines
      }
    } else if (inKey) {
      // Skip lines that are continuation of the broken multi-line key value
      if (line.includes('"') || line.startsWith('FIREBASE_') || line.startsWith('#') || line.trim() === '') {
        inKey = false;
        if (!line.startsWith('FIREBASE_PRIVATE_KEY=')) {
          newLines.push(line);
        }
      }
      // else: skip (part of the broken multi-line value)
    } else if (line.startsWith('FIREBASE_PROJECT_ID=')) {
      newLines.push(`FIREBASE_PROJECT_ID=${PROJECT_ID}`);
    } else if (line.startsWith('FIREBASE_CLIENT_EMAIL=')) {
      newLines.push(`FIREBASE_CLIENT_EMAIL=${CLIENT_EMAIL}`);
    } else {
      newLines.push(line);
    }
  }

  fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');

  // Verify
  const check = fs.readFileSync(filePath, 'utf8');
  const keyLine = check.split('\n').find(l => l.startsWith('FIREBASE_PRIVATE_KEY='));
  console.log(`\n${path.basename(path.dirname(filePath))}/.env:`);
  console.log('  FIREBASE_PROJECT_ID:   ', check.split('\n').find(l => l.startsWith('FIREBASE_PROJECT_ID='))?.substring(0,50));
  console.log('  FIREBASE_PRIVATE_KEY:  ', keyLine?.substring(0, 70) + '...');
  console.log('  FIREBASE_CLIENT_EMAIL: ', check.split('\n').find(l => l.startsWith('FIREBASE_CLIENT_EMAIL='))?.substring(0,70));
  console.log('  Is single line key?', keyLine && !keyLine.slice('FIREBASE_PRIVATE_KEY='.length).includes('\n'));
}

patchEnv(API_ENV);
patchEnv(ROOT_ENV);

console.log('\n✅ Done. Firebase credentials patched into both .env files.');
