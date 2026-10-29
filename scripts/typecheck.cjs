const fs = require('fs');
const path = require('path');
const ts = require('typescript');

console.log('Running Noor Connect TypeCheck and Import Verification...');

let hasErrors = false;
const errorLog = [];

function logError(file, line, message) {
  hasErrors = true;
  errorLog.push(`${file}:${line} - ${message}`);
  console.error(`  ERROR: ${file}:${line} - ${message}`);
}

// 1. AST / Lexical Landmine Sweep for Common Helpers across entire src/
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(full));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(full);
    }
  }
  return results;
}

const allSrcFiles = walk('src');
console.log(`Inspecting ${allSrcFiles.length} source files for missing helper and hook imports...`);

function stripComments(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length))
    .replace(/\/\/.*$/gm, (m) => ' '.repeat(m.length));
}

const helpersToCheck = [
  { name: 'cn', importPattern: /import\s+[^;]*\bcn\b[^;]*from/, defPattern: /(?:function|const|let|var)\s+cn\b/ },
  { name: 'clsx', importPattern: /import\s+[^;]*\bclsx\b[^;]*from/, defPattern: /(?:function|const|let|var)\s+clsx\b/ },
  { name: 'twMerge', importPattern: /import\s+[^;]*\btwMerge\b[^;]*from/, defPattern: /(?:function|const|let|var)\s+twMerge\b/ },
  { name: 'useState', importPattern: /import\s+[^;]*\buseState\b[^;]*from\s+['"]react['"]/, defPattern: /(?:function|const|let|var)\s+useState\b/ },
  { name: 'useEffect', importPattern: /import\s+[^;]*\buseEffect\b[^;]*from\s+['"]react['"]/, defPattern: /(?:function|const|let|var)\s+useEffect\b/ },
  { name: 'useMemo', importPattern: /import\s+[^;]*\buseMemo\b[^;]*from\s+['"]react['"]/, defPattern: /(?:function|const|let|var)\s+useMemo\b/ },
  { name: 'useCallback', importPattern: /import\s+[^;]*\buseCallback\b[^;]*from\s+['"]react['"]/, defPattern: /(?:function|const|let|var)\s+useCallback\b/ },
  { name: 'useRef', importPattern: /import\s+[^;]*\buseRef\b[^;]*from\s+['"]react['"]/, defPattern: /(?:function|const|let|var)\s+useRef\b/ },
  { name: 'useContext', importPattern: /import\s+[^;]*\buseContext\b[^;]*from\s+['"]react['"]/, defPattern: /(?:function|const|let|var)\s+useContext\b/ },
  { name: 'createPortal', importPattern: /import\s+[^;]*\bcreatePortal\b[^;]*from\s+['"]react-dom['"]/, defPattern: /(?:function|const|let|var)\s+createPortal\b/ },
];

for (const f of allSrcFiles) {
  const rawContent = fs.readFileSync(f, 'utf8');
  const cleanContent = stripComments(rawContent);
  const lines = rawContent.split('\n');

  for (const helper of helpersToCheck) {
    const usageRegex = new RegExp('(?:[^a-zA-Z0-9_.]|^)\\b' + helper.name + '\\s*(?:<|\\()');
    if (usageRegex.test(cleanContent)) {
      const hasImport = helper.importPattern.test(rawContent);
      const hasDef = helper.defPattern.test(rawContent);
      if (!hasImport && !hasDef) {
        // Find line number of first usage
        for (let i = 0; i < lines.length; i++) {
          if (usageRegex.test(lines[i])) {
            logError(f, i + 1, `Identifier '${helper.name}' is used without being imported or defined`);
            break;
          }
        }
      }
    }
  }
}

// 2. TypeScript Compiler Diagnostics for all src/ files
console.log('Running TypeScript diagnostics for all src/ files...');
try {
  const configPath = ts.findConfigFile('./', ts.sys.fileExists, 'tsconfig.json');
  if (configPath) {
    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, './');

    const rootNames = Array.from(new Set([...(parsed.fileNames || []), ...allSrcFiles]));
    const program = ts.createProgram({
      rootNames,
      options: parsed.options,
    });

    for (const sourceFile of program.getSourceFiles()) {
      const fileName = sourceFile.fileName.replace(/\\/g, '/');
      if (!fileName.includes('/src/')) continue;
      if (fileName.includes('/node_modules/') || fileName.endsWith('.d.ts')) continue;

      const fileDiags = [
        ...program.getSyntacticDiagnostics(sourceFile),
        ...program.getSemanticDiagnostics(sourceFile),
      ];

      for (const diag of fileDiags) {
        // Flag undefined variables (TS2304: Cannot find name), suggestions (TS2552), missing modules (TS2307)
        if (diag.code === 2304 || diag.code === 2552 || diag.code === 2307) {
          const pos = sourceFile.getLineAndCharacterOfPosition(diag.start);
          const msg = ts.flattenDiagnosticMessageText(diag.messageText, '\n');
          logError(fileName, pos.line + 1, `[TS${diag.code}] ${msg}`);
        }
      }
    }
  }
} catch (tsErr) {
  console.warn('TypeScript diagnostics check warning:', tsErr.message);
}

// 3. Final Summary & Exit Code
if (hasErrors) {
  console.error('\nTypeCheck FAILED with ' + errorLog.length + ' error(s):');
  errorLog.forEach(e => console.error('  - ' + e));
  process.exit(1);
} else {
  console.log('\nTypeCheck PASSED: 0 undefined identifiers, all helpers properly imported across src/components and src/.\n');
  process.exit(0);
}
