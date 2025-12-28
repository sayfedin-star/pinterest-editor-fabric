const fs = require('fs');
const path = require('path');
const os = require('os');
const { registerFont, createCanvas } = require('canvas');

/**
 * Diagnostic script for Server-Side Font Loading
 * Run this in the environment (e.g., Vercel Console or local Node) to verify paths.
 */

console.log('--- Font Diagnostic Start ---');
console.log('Node Version:', process.version);
console.log('Platform:', os.platform());
console.log('CWD:', process.cwd());

// 1. Check Environment Variables
console.log('\n--- Environment Variables ---');
console.log('FONTCONFIG_FILE:', process.env.FONTCONFIG_FILE || '(not set)');
console.log('PANGOCAIRO_BACKEND:', process.env.PANGOCAIRO_BACKEND || '(not set)');

// 2. Scan for Fonts Directory
console.log('\n--- Directory Scan ---');
const possiblePaths = [
    path.join(process.cwd(), 'public', 'fonts'),
    path.join(process.cwd(), '.next', 'server', 'public', 'fonts'),
    '/var/task/public/fonts',
    '/var/task/.next/server/public/fonts',
];

let fontsFound = false;

possiblePaths.forEach(p => {
    const exists = fs.existsSync(p);
    console.log(`Path: ${p} [${exists ? 'EXISTS' : 'MISSING'}]`);
    if (exists) {
        try {
            const files = fs.readdirSync(p);
            console.log(`  Files (${files.length}):`, files.slice(0, 5).join(', ') + (files.length > 5 ? '...' : ''));
            fontsFound = true;
        } catch (e) {
            console.log(`  Error reading directory: ${e.message}`);
        }
    }
});

// 3. Test Canvas Text Rendering
console.log('\n--- Canvas Render Test ---');
try {
    const canvas = createCanvas(200, 50);
    const ctx = canvas.getContext('2d');
    
    // Test System Font
    ctx.font = '30px Arial';
    ctx.fillText('System Font', 10, 40);
    console.log('Rendered Arial: OK');

    // Test Custom Font (if directory found)
    if (fontsFound) {
        // Try to find a Roboto file to register
        // This simulates what serverEngine.ts does
        // Logic skipped for brevity, assumes Roboto-Regular.ttf exists if public/fonts exists
    }

} catch (e) {
    console.error('Canvas Render Error:', e);
}

console.log('\n--- Font Diagnostic End ---');
