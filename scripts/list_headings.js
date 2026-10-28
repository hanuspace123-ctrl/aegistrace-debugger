const fs = require('fs');

const html = fs.readFileSync('public/index.html', 'utf8');

const matches = [];
const headerRe = /<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/g;
let m;
while ((m = headerRe.exec(html)) !== null) {
    const text = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    matches.push(text);
}

console.log('--- ALL HEADINGS IN INDEX.HTML (' + matches.length + ') ---');
console.log(matches.join('\n'));
