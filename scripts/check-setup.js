#!/usr/bin/env node

/**
 * CaribPredict Setup Checker
 * Verifies all required files and configurations are in place
 */

const fs = require('fs');
const path = require('path');

const checks = {
  passed: [],
  failed: [],
  warnings: [],
};

function checkFile(filePath, required = true) {
  const fullPath = path.join(__dirname, '..', filePath);
  if (fs.existsSync(fullPath)) {
    checks.passed.push(`✅ ${filePath}`);
    return true;
  } else {
    if (required) {
      checks.failed.push(`❌ ${filePath} - MISSING`);
    } else {
      checks.warnings.push(`⚠️  ${filePath} - Optional file missing`);
    }
    return false;
  }
}

function checkDirectory(dirPath, required = true) {
  const fullPath = path.join(__dirname, '..', dirPath);
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
    checks.passed.push(`✅ ${dirPath}/`);
    return true;
  } else {
    if (required) {
      checks.failed.push(`❌ ${dirPath}/ - MISSING`);
    } else {
      checks.warnings.push(`⚠️  ${dirPath}/ - Optional directory missing`);
    }
    return false;
  }
}

console.log('🌴 CaribPredict Setup Checker\n');
console.log('Checking project structure...\n');

// Core files
console.log('📄 Core Configuration:');
checkFile('package.json');
checkFile('tsconfig.json');
checkFile('next.config.js');
checkFile('tailwind.config.ts');
checkFile('.env.local');

// App structure
console.log('\n📱 App Structure:');
checkDirectory('app');
checkDirectory('app/api');
checkDirectory('app/api/markets');
checkDirectory('app/api/trade');
checkDirectory('app/market/[id]');
checkDirectory('app/profile');
checkFile('app/layout.tsx');
checkFile('app/page.tsx');
checkFile('app/globals.css');

// Components
console.log('\n🧩 Components:');
checkDirectory('components');
checkFile('components/MarketCard.tsx');
checkFile('components/TradingInterface.tsx');
checkFile('components/CountryFilter.tsx');
checkFile('components/BalanceDisplay.tsx');

// Library
console.log('\n📚 Library:');
checkDirectory('lib');
checkFile('lib/types.ts');
checkFile('lib/supabase.ts');
checkFile('lib/amm.ts');

// Public assets
console.log('\n🎨 Public Assets:');
checkDirectory('public');
checkFile('public/manifest.json');
checkDirectory('public/icons');
checkFile('public/robots.txt');

// Documentation
console.log('\n📖 Documentation:');
checkFile('README.md');
checkFile('QUICKSTART.md');
checkFile('PROJECT_SUMMARY.md');

// Scripts
console.log('\n🔧 Scripts:');
checkDirectory('scripts');
checkFile('scripts/seed-markets.ts');

// Check environment variables
console.log('\n🔐 Environment Variables:');
try {
  const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
  if (envContent.includes('NEXT_PUBLIC_SUPABASE_URL')) {
    checks.passed.push('✅ NEXT_PUBLIC_SUPABASE_URL');
  } else {
    checks.failed.push('❌ NEXT_PUBLIC_SUPABASE_URL - Not found in .env.local');
  }
  if (envContent.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY')) {
    checks.passed.push('✅ NEXT_PUBLIC_SUPABASE_ANON_KEY');
  } else {
    checks.failed.push('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY - Not found in .env.local');
  }
} catch (err) {
  checks.failed.push('❌ Could not read .env.local');
}

// Check node_modules
console.log('\n📦 Dependencies:');
if (checkDirectory('node_modules')) {
  checks.passed.push('✅ Dependencies installed');
} else {
  checks.failed.push('❌ Dependencies not installed - Run: npm install');
}

// Print summary
console.log('\n' + '='.repeat(60));
console.log('📊 Summary:\n');

if (checks.passed.length > 0) {
  console.log(`✅ Passed: ${checks.passed.length} checks`);
}

if (checks.warnings.length > 0) {
  console.log(`⚠️  Warnings: ${checks.warnings.length} items`);
  checks.warnings.forEach(w => console.log(`   ${w}`));
}

if (checks.failed.length > 0) {
  console.log(`❌ Failed: ${checks.failed.length} checks`);
  checks.failed.forEach(f => console.log(`   ${f}`));
}

console.log('\n' + '='.repeat(60));

if (checks.failed.length === 0) {
  console.log('\n🎉 All required files are present!');
  console.log('\n📝 Next steps:');
  console.log('   1. npm run dev          - Start development server');
  console.log('   2. npx tsx scripts/seed-markets.ts  - Create sample markets');
  console.log('   3. Open http://localhost:3000');
  console.log('\n🌴 Happy predicting!');
  process.exit(0);
} else {
  console.log('\n⚠️  Some required files are missing. Please fix the issues above.');
  process.exit(1);
}
