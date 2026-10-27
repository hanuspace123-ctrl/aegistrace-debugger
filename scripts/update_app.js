const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '..', 'public', 'app.js');
let content = fs.readFileSync(appPath, 'utf8');

// 1. Hook init()
if (!content.includes('initGuidedExperience();')) {
    content = content.replace(
        'initOnboarding();',
        'initOnboarding();\n    initGuidedExperience();'
    );
}

// 2. Hook setStoreProfile
const targetProfileLog = 'logConsole(`[STORE PROFILE] Switched store model to ${profile.name} (AOV ${profile.aov.toFixed(2)}, ${profile.dailyOrders} ord/day, ${profile.badge})`, \'system\');';
const profileHook = `const heroTag = document.getElementById('hero-active-store-tag');
    if (heroTag) heroTag.textContent = \`Active Store: \${profile.name} (\${profile.badge})\`;
    document.querySelectorAll('.hero-profile-btn').forEach(btn => {
        if (btn.dataset.profile === profileKey) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    ${targetProfileLog}`;

if (content.includes(targetProfileLog) && !content.includes('hero-active-store-tag')) {
    content = content.replace(targetProfileLog, profileHook);
}

// 3. Define initGuidedExperience, updateHeroStepper, and updateHeroOutcomeBanner
const guidedModule = `
// --- GUIDED & SIMPLIFIED EXPERIENCE CONTROLLER ---
function updateHeroStepper(stepNum, status = 'active') {
    const stepEls = [
        document.getElementById('step-hero-1'),
        document.getElementById('step-hero-2'),
        document.getElementById('step-hero-3'),
        document.getElementById('step-hero-4')
    ];
    const numEls = [
        document.getElementById('step-num-1'),
        document.getElementById('step-num-2'),
        document.getElementById('step-num-3'),
        document.getElementById('step-num-4')
    ];
    const lineEls = [
        document.getElementById('stepper-line-1'),
        document.getElementById('stepper-line-2'),
        document.getElementById('stepper-line-3')
    ];

    stepEls.forEach((el, idx) => {
        if (!el) return;
        const currentStep = idx + 1;
        el.className = 'stepper-item';
        
        if (currentStep < stepNum) {
            el.classList.add('complete');
            if (numEls[idx]) numEls[idx].textContent = '✓';
            if (idx < lineEls.length && lineEls[idx]) lineEls[idx].className = 'stepper-line complete';
        } else if (currentStep === stepNum) {
            el.classList.add(status);
            if (numEls[idx]) {
                if (status === 'complete') numEls[idx].textContent = '✓';
                else if (status === 'alert-state') numEls[idx].textContent = '!';
                else numEls[idx].textContent = currentStep;
            }
            if (idx > 0 && lineEls[idx - 1]) {
                lineEls[idx - 1].className = 'stepper-line active';
            }
        } else {
            if (numEls[idx]) numEls[idx].textContent = currentStep;
            if (idx > 0 && lineEls[idx - 1]) lineEls[idx - 1].className = 'stepper-line';
        }
    });
}

function updateHeroOutcomeBanner({ icon, title, desc, pill, pillClass = 'healthy', bannerClass = '' }) {
    const banner = document.getElementById('hero-outcome-banner');
    const iconEl = document.getElementById('hero-outcome-icon');
    const titleEl = document.getElementById('hero-outcome-title');
    const descEl = document.getElementById('hero-outcome-desc');
    const pillEl = document.getElementById('hero-outcome-pill');

    if (banner) {
        banner.className = 'hero-outcome-banner' + (bannerClass ? ' ' + bannerClass : '');
    }
    if (iconEl && icon) iconEl.textContent = icon;
    if (titleEl && title) titleEl.textContent = title;
    if (descEl && desc) descEl.textContent = desc;
    if (pillEl && pill) {
        pillEl.textContent = pill;
        pillEl.className = 'outcome-pill ' + pillClass;
    }
}

function initGuidedExperience() {
    const btnModeSimple = document.getElementById('btn-mode-simple');
    const btnModeAdvanced = document.getElementById('btn-mode-advanced');
    const advancedDrawer = document.getElementById('advanced-drawer-content');
    const btnToggleAdvanced = document.getElementById('btn-toggle-advanced');
    const btnQuickGuideTrigger = document.getElementById('btn-quick-guide-trigger');

    let activeMode = localStorage.getItem('aegis_view_mode') || 'guided';

    function setViewMode(mode) {
        activeMode = mode;
        localStorage.setItem('aegis_view_mode', mode);
        if (mode === 'developer') {
            if (btnModeSimple) btnModeSimple.classList.remove('active');
            if (btnModeAdvanced) btnModeAdvanced.classList.add('active');
            if (advancedDrawer) advancedDrawer.classList.remove('collapsed');
            if (btnToggleAdvanced) {
                btnToggleAdvanced.classList.add('expanded');
                btnToggleAdvanced.setAttribute('aria-expanded', 'true');
            }
            logConsole('[VIEW] Switched to Developer View (Deep metrics & microservice telemetry)', 'system');
        } else {
            if (btnModeAdvanced) btnModeAdvanced.classList.remove('active');
            if (btnModeSimple) btnModeSimple.classList.add('active');
            if (advancedDrawer) advancedDrawer.classList.add('collapsed');
            if (btnToggleAdvanced) {
                btnToggleAdvanced.classList.remove('expanded');
                btnToggleAdvanced.setAttribute('aria-expanded', 'false');
            }
            logConsole('[VIEW] Switched to Guided Mode (Simplified walkthrough for founders)', 'system');
        }
    }

    if (btnModeSimple) {
        btnModeSimple.addEventListener('click', () => setViewMode('guided'));
    }
    if (btnModeAdvanced) {
        btnModeAdvanced.addEventListener('click', () => setViewMode('developer'));
    }
    if (btnToggleAdvanced && advancedDrawer) {
        btnToggleAdvanced.addEventListener('click', () => {
            const isCollapsed = advancedDrawer.classList.contains('collapsed');
            if (isCollapsed) {
                advancedDrawer.classList.remove('collapsed');
                btnToggleAdvanced.classList.add('expanded');
                btnToggleAdvanced.setAttribute('aria-expanded', 'true');
            } else {
                advancedDrawer.classList.add('collapsed');
                btnToggleAdvanced.classList.remove('expanded');
                btnToggleAdvanced.setAttribute('aria-expanded', 'false');
            }
        });
    }

    if (btnQuickGuideTrigger) {
        btnQuickGuideTrigger.addEventListener('click', () => {
            showOnboardingModal('overview');
        });
    }

    // Hero Store profile buttons
    document.querySelectorAll('.hero-profile-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const profileKey = btn.dataset.profile;
            if (profileKey) setStoreProfile(profileKey);
        });
    });

    // Primary Hero Simulation Button
    const btnHeroSimulate = document.getElementById('btn-hero-simulate');
    const heroBtnSubText = document.getElementById('hero-btn-sub-text');
    let selectedHeroScenario = 'gateway-timeout';

    const chipTimeout = document.getElementById('chip-timeout');
    const chipStock = document.getElementById('chip-stock');
    const chipLatency = document.getElementById('chip-latency');
    const chipDeclined = document.getElementById('chip-declined');
    const chipHealthy = document.getElementById('chip-healthy');
    const heroChips = [chipTimeout, chipStock, chipLatency, chipDeclined, chipHealthy].filter(Boolean);

    const scenarioLabels = {
        'gateway-timeout': '1-Click Live Test • Stripe Payment Timeout (504)',
        'out-of-stock': '1-Click Live Test • Inventory Sync Delay (422)',
        'checkout-latency': '1-Click Live Test • Latency Spike (>3s)',
        'card-declined': '1-Click Live Test • Card Soft Decline (402)',
        'healthy': '1-Click Live Test • Healthy Order Flow (200 OK)'
    };

    function selectHeroChip(scenarioKey) {
        selectedHeroScenario = scenarioKey;
        heroChips.forEach(c => {
            if (c.dataset.scenario === scenarioKey) {
                c.classList.add('active');
            } else {
                c.classList.remove('active');
            }
        });
        if (heroBtnSubText && scenarioLabels[scenarioKey]) {
            heroBtnSubText.textContent = scenarioLabels[scenarioKey];
        }
        state.currentScenario = scenarioKey;
    }

    heroChips.forEach(chip => {
        chip.addEventListener('click', () => {
            selectHeroChip(chip.dataset.scenario);
            triggerHeroSimulation(chip.dataset.scenario);
        });
    });

    function triggerHeroSimulation(scenarioKey) {
        if (state.pipelineActive || state.remediationInProgress) {
            logConsole('[SIMULATION] Pipeline currently active. Awaiting current order completion.', 'warn');
            return;
        }

        updateHeroStepper(1, 'complete');
        updateHeroStepper(2, 'active');

        // Reset visual alert classes from all nodes
        Object.values(dom.nodes).forEach(n => {
            n.classList.remove('node-alert-failure', 'node-alert-healing', 'node-alert-healed');
        });

        updateHeroOutcomeBanner({
            icon: '🔍',
            title: '1. Tracing Order Across 5 Microservices...',
            desc: \`Testing live order flow for SKU-8829 (\$\${state.roi.aov.toFixed(2)}). Checking Checkout API, Inventory DB, and Payment Gateway...\`,
            pill: 'Tracing',
            pillClass: 'healthy',
            bannerClass: ''
        });

        // Sync with scenario buttons if present
        if (dom.scenarios) {
            Object.values(dom.scenarios).forEach(b => { if (b) b.classList.remove('active'); });
            const scenKey = scenarioKey === 'out-of-stock' ? 'stock' : 
                             scenarioKey === 'card-declined' ? 'declined' : 
                             scenarioKey === 'gateway-timeout' ? 'timeout' : 
                             scenarioKey === 'fulfillment-db-crash' ? 'db' : 
                             scenarioKey === 'logistics-api-down' ? 'logistics' : 
                             scenarioKey === 'checkout-latency' ? 'latency' : 'healthy';
            if (dom.scenarios[scenKey]) dom.scenarios[scenKey].classList.add('active');
        }

        triggerSimulation(scenarioKey);

        const visualizerCard = document.getElementById('visualizer-card');
        if (visualizerCard) {
            visualizerCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    if (btnHeroSimulate) {
        btnHeroSimulate.addEventListener('click', () => {
            triggerHeroSimulation(selectedHeroScenario);
        });
    }

    setViewMode(activeMode);
}
`;

if (!content.includes('function initGuidedExperience()')) {
    content = content.replace(
        'window.selectStoreProfile = setStoreProfile;',
        `window.selectStoreProfile = setStoreProfile;\n${guidedModule}`
    );
}

// 4. Hook handlePipelineFailure
const failureHookTarget = 'renderBusinessImpactStory(scenarioType);';
const failureHookCode = `renderBusinessImpactStory(scenarioType);
    
    // Update Hero Stepper & Outcome Banner (Guided Mode)
    updateHeroStepper(2, 'alert-state');
    if (failedSvc && dom.nodes[failedSvc]) {
        dom.nodes[failedSvc].classList.add('node-alert-failure');
    }
    updateHeroOutcomeBanner({
        icon: '🚨',
        title: \`2. Problem Detected in 42ms: \${sc.name}!\`,
        desc: \`\${sc.rcaDescription}. Traditional monitoring takes 45+ min to discover. Estimated \$\${revRisk.toLocaleString()} at risk across \${ordersAtRisk} orders.\`,
        pill: 'Outage Detected',
        pillClass: 'alert',
        bannerClass: 'banner-alert'
    });`;

if (content.includes(failureHookTarget) && !content.includes('Problem Detected in 42ms:')) {
    content = content.replace(failureHookTarget, failureHookCode);
}

// 5. Hook triggerAutoRemediation
const remHookTarget = 'dom.globalStatusText.textContent = \'REMEDIATING SYSTEM\';';
const remHookCode = `dom.globalStatusText.textContent = \'REMEDIATING SYSTEM\';
    
    // Update Hero Stepper & Outcome Banner (Guided Mode)
    updateHeroStepper(3, 'active');
    if (failedSvc && dom.nodes[failedSvc]) {
        dom.nodes[failedSvc].classList.remove('node-alert-failure');
        dom.nodes[failedSvc].classList.add('node-alert-healing');
    }
    updateHeroOutcomeBanner({
        icon: '⚙️',
        title: \`3. Self-Healing in Progress: \${policy.name}\`,
        desc: \`Executing mitigation: \${policy.remedyTitle}. Rerouting checkout flow to secondary cluster with zero dropped carts...\`,
        pill: 'Auto-Healing',
        pillClass: 'healing',
        bannerClass: 'banner-healing'
    });`;

if (content.includes(remHookTarget) && !content.includes('Self-Healing in Progress:')) {
    content = content.replace(remHookTarget, remHookCode);
}

// 6. Hook runVerificationOrder completion
const verifyTarget = 'logConsole(`[REMEDY-ENGINE] Verification SUCCESS. All services responsive. System restored to normal state.`, \'success\');';
const verifyCode = `logConsole(\`[REMEDY-ENGINE] Verification SUCCESS. All services responsive. System restored to normal state.\`, 'success');
                
                // Update Hero Stepper & Outcome Banner (Guided Mode)
                updateHeroStepper(4, 'complete');
                Object.values(dom.nodes).forEach(n => {
                    n.classList.remove('node-alert-failure', 'node-alert-healing');
                    n.classList.add('node-alert-healed');
                    setTimeout(() => n.classList.remove('node-alert-healed'), 4000);
                });
                const mttrSec = state.avgMttr > 0 ? state.avgMttr.toFixed(1) + 's' : '1.8s';
                updateHeroOutcomeBanner({
                    icon: '🎉',
                    title: \`4. All Fixed in \${mttrSec}! Preserved \$\${state.preservedRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\`,
                    desc: \`Autonomous self-healing restored nominal flow with zero dropped orders! Saved an estimated \${state.totalHoursSaved.toFixed(1)} engineering on-call hours.\`,
                    pill: 'Revenue Protected',
                    pillClass: 'healed',
                    bannerClass: 'banner-healed'
                });`;

if (content.includes(verifyTarget) && !content.includes('4. All Fixed in')) {
    content = content.replace(verifyTarget, verifyCode);
}

// 7. Hook btnReset
const resetTarget = 'logConsole(\'System metrics and simulation state reset cleanly.\', \'system\');';
const resetCode = `logConsole(\'System metrics and simulation state reset cleanly.\', \'system\');
            
            // Reset Guided Experience Stepper & Banner
            updateHeroStepper(1, 'active');
            const step1 = document.getElementById('step-hero-1');
            if (step1) {
                step1.className = 'stepper-item active';
                const num1 = document.getElementById('step-num-1');
                if (num1) num1.textContent = '1';
            }
            updateHeroOutcomeBanner({
                icon: '💡',
                title: 'Ready for Live Test',
                desc: 'Click "Simulate a Checkout Problem" above to see how AegisTrace protects your store when payments fail. Watch the pipeline below light up in real time!',
                pill: 'Ready',
                pillClass: 'healthy',
                bannerClass: ''
            });
            Object.values(dom.nodes).forEach(n => {
                n.classList.remove('node-alert-failure', 'node-alert-healing', 'node-alert-healed');
            });`;

if (content.includes(resetTarget) && !content.includes('Reset Guided Experience Stepper & Banner')) {
    content = content.replace(resetTarget, resetCode);
}

fs.writeFileSync(appPath, content, 'utf8');
console.log('Successfully updated public/app.js with Guided Experience Controller!');
