const fs = require('fs');
const assert = require('assert');

console.log('\n===============================================================');
console.log('   AEGISTRACE UX SIMPLIFICATION & GUIDED EXPERIENCE AUDIT     ');
console.log('===============================================================\n');

const html = fs.readFileSync('public/index.html', 'utf8');
const js = fs.readFileSync('public/app.js', 'utf8');
const css = fs.readFileSync('public/style.css', 'utf8');

// 1. Verify Essential Hero Elements
const heroElements = [
    'view-mode-bar',
    'btn-mode-simple',
    'btn-mode-advanced',
    'btn-quick-guide-trigger',
    'hero-action-card',
    'hero-active-store-tag',
    'btn-hero-simulate',
    'hero-btn-sub-text',
    'chip-timeout',
    'chip-stock',
    'chip-latency',
    'chip-declined',
    'chip-healthy',
    'hero-stepper-track',
    'step-hero-1',
    'step-hero-2',
    'step-hero-3',
    'step-hero-4',
    'step-num-1',
    'step-num-2',
    'step-num-3',
    'step-num-4',
    'hero-outcome-banner',
    'hero-outcome-icon',
    'hero-outcome-title',
    'hero-outcome-desc',
    'hero-outcome-pill'
];

console.log('--- 1. Hero Guided Experience DOM Elements ---');
heroElements.forEach(id => {
    assert(html.includes(`id="${id}"`), `Missing hero element: ${id}`);
    console.log(`  [PASS] Element #${id} present in index.html`);
});

// 2. Verify Order Pipeline Elements
console.log('\n--- 2. Order Pipeline (Visual Centerpiece) ---');
const pipelineElements = [
    'visualizer-card',
    'node-checkout',
    'conn-checkout-inventory',
    'node-inventory',
    'conn-inventory-payment',
    'node-payment',
    'conn-payment-fulfillment',
    'node-fulfillment',
    'conn-fulfillment-logistics',
    'node-logistics'
];
pipelineElements.forEach(id => {
    assert(html.includes(`id="${id}"`), `Missing pipeline element: ${id}`);
    console.log(`  [PASS] Pipeline element #${id} present`);
});

// 3. Verify Business Impact & Comparison Cards
console.log('\n--- 3. Business Impact & Founder Comparison ---');
const bizElements = [
    'business-card',
    'biz-revenue',
    'biz-mttr',
    'biz-hours',
    'biz-impact-story-card',
    'story-scenario-tag',
    'story-orders-affected',
    'story-rev-risk',
    'story-ttd',
    'story-mttr',
    'story-rev-protected',
    'before-after-section',
    'comp-without-rev',
    'comp-with-rev',
    'contrast-profile-title',
    'contrast-profile-desc'
];
bizElements.forEach(id => {
    assert(html.includes(`id="${id}"`), `Missing business element: ${id}`);
    console.log(`  [PASS] Business element #${id} present`);
});

// 4. Verify Progressive Disclosure Drawer
console.log('\n--- 4. Progressive Disclosure (Advanced Developer Drawer) ---');
const advancedElements = [
    'advanced-tools-section',
    'btn-toggle-advanced',
    'advanced-drawer-content',
    'autopilot-toggle',
    'remediation-toggle',
    'delay-slider',
    'metric-latency',
    'metric-errors',
    'metric-db-pool',
    'metric-cpu',
    'sla-global-badge'
];
advancedElements.forEach(id => {
    assert(html.includes(`id="${id}"`), `Missing advanced element: ${id}`);
    console.log(`  [PASS] Advanced tool #${id} present`);
});

// 5. Verify CSS Rules
console.log('\n--- 5. CSS Styling & Responsive Animations ---');
const cssClasses = [
    '.view-mode-bar',
    '.hero-action-card',
    '.btn-primary-hero',
    '.hero-chip',
    '.hero-stepper-box',
    '.hero-outcome-banner',
    '.node-alert-failure',
    '.node-alert-healing',
    '.node-alert-healed',
    '.advanced-tools-section',
    '.btn-toggle-advanced-drawer',
    '.advanced-drawer-content.collapsed'
];
cssClasses.forEach(cls => {
    assert(css.includes(cls), `Missing CSS rule: ${cls}`);
    console.log(`  [PASS] CSS class ${cls} defined`);
});

// 6. Verify Dual-File Synchronization
console.log('\n--- 6. Dual-File Synchronization ---');
const rootHtml = fs.readFileSync('index.html', 'utf8');
const rootJs = fs.readFileSync('app.js', 'utf8');
const rootCss = fs.readFileSync('style.css', 'utf8');

assert.strictEqual(html, rootHtml, 'public/index.html and index.html must be identical');
console.log('  [PASS] public/index.html is identical to index.html');

assert.strictEqual(js, rootJs, 'public/app.js and app.js must be identical');
console.log('  [PASS] public/app.js is identical to app.js');

assert.strictEqual(css, rootCss, 'public/style.css and style.css must be identical');
console.log('  [PASS] public/style.css is identical to style.css');

console.log('\n===============================================================');
console.log('   ALL UX REDESIGN TESTS PASSED WITH 100% SUCCESS!             ');
console.log('===============================================================\n');
