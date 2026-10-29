const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');
const css = fs.readFileSync('public/style.css', 'utf8');

console.log('=== CSS OVERFLOW & RESPONSIVENESS AUDIT ===');

// Check all grid-template-columns
const grids = css.match(/[^{};]+\{[^}]*grid-template-columns:[^}]*\}/g) || [];
console.log('\nGrid definitions found:', grids.length);
grids.forEach(g => {
    const selector = g.split('{')[0].trim();
    const rule = g.match(/grid-template-columns:[^;]+/)[0];
    console.log(`  - ${selector} => ${rule}`);
});

// Check all tables in HTML
const tables = html.match(/<table[^>]*class="([^"]*)"/g) || [];
console.log('\nTables in HTML:', tables.length);
tables.forEach(t => console.log('  -', t));

// Check pre and code styling
const preCodeRules = css.match(/[^{};]*(pre|code)[^{};]*\{[^}]*\}/g) || [];
console.log('\nPre/Code CSS rules:', preCodeRules.length);
preCodeRules.forEach(r => console.log('  -', r.trim().replace(/\s+/g, ' ').substring(0, 90)));
