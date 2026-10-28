const fs = require('fs');

const html = fs.readFileSync('public/index.html', 'utf8');

console.log('--- PAGES & TITLES ---');
const pageRe = /id="(page-[^"]+)"[^>]*data-title="([^"]+)"/g;
let m;
while ((m = pageRe.exec(html)) !== null) {
    console.log(m[1], '-->', m[2]);
}

console.log('\n--- SIDEBAR NAV ITEMS ---');
const navRe = /<a href="([^"]+)" class="sidebar-nav-item[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
while ((m = navRe.exec(html)) !== null) {
    const text = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    console.log(m[1], '-->', text);
}
