// fix-typeorm.js
const fs = require('fs');
const path = require('path');

console.log('🔧 Preparing TypeORM fix...');

const typeormDir = path.join(__dirname, 'node_modules', 'typeorm');

// Create if doesn't exist yet
if (!fs.existsSync(typeormDir)) {
  console.log('⚠️ TypeORM not installed yet. Run after installing typeorm.');
  process.exit(0);
}

// Fix 1: Create missing globals file
const browserDir = path.join(typeormDir, 'browser');
const globalsFile = path.join(browserDir, 'globals.js');

if (!fs.existsSync(browserDir)) {
  fs.mkdirSync(browserDir, { recursive: true });
}

// Create an empty globals file
fs.writeFileSync(globalsFile, '// Empty globals file to fix import\n', 'utf8');
console.log('✅ Created missing globals.js');

// Fix 2: Modify browser/index.js
const browserIndex = path.join(browserDir, 'index.js');
if (fs.existsSync(browserIndex)) {
  let content = fs.readFileSync(browserIndex, 'utf8');
  content = content.replace(`import "./globals";`, `// import "./globals";`);
  fs.writeFileSync(browserIndex, content, 'utf8');
  console.log('✅ Fixed browser/index.js');
}

// Fix 3: Modify package.json
const packageJsonPath = path.join(typeormDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Remove browser-specific exports
if (pkg.exports) {
  if (pkg.exports['.'].browser) {
    delete pkg.exports['.'].browser;
  }
  if (pkg.exports['./package.json']) {
    delete pkg.exports['./package.json'];
  }
}

// Add explicit Node.js entry points
pkg.exports = {
  ".": {
    "import": "./index.mjs",
    "require": "./index.js"
  }
};

fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2), 'utf8');
console.log('✅ Fixed package.json exports');

console.log('🎉 TypeORM fix applied!');