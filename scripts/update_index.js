const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'public', 'index.html');
let content = fs.readFileSync(indexPath, 'utf8');

const startTag = '<section class="page-view active" id="page-dashboard" data-title="Dashboard">';
const endTag = '<!-- ==========================================================================\n                     PAGE 2: FAULT INJECTION LAB';

const startIdx = content.indexOf(startTag);
if (startIdx === -1) {
    console.error('Could not find startTag');
    process.exit(1);
}

const endIdx = content.indexOf(endTag, startIdx);
if (endIdx === -1) {
    console.error('Could not find endTag');
    process.exit(1);
}

const newDashboard = `<section class="page-view active" id="page-dashboard" data-title="Dashboard">

                    <!-- Top View Mode & Fast Reset Bar -->
                    <div class="view-mode-bar" id="view-mode-bar">
                        <div class="mode-toggle-group" role="group" aria-label="View Mode">
                            <button type="button" class="mode-switch-btn active" id="btn-mode-simple" data-mode="guided" title="Simplified, guided walkthrough for founders and non-technical stakeholders">
                                ✨ Guided Mode (Recommended)
                            </button>
                            <button type="button" class="mode-switch-btn" id="btn-mode-advanced" data-mode="developer" title="Deep DevOps, APM metrics, OTLP traces & raw microservice controls">
                                🛠️ Developer View
                            </button>
                        </div>
                        <div class="mode-bar-actions">
                            <button type="button" class="btn btn-secondary btn-small" id="btn-quick-guide-trigger" title="Open 30-Second Guided Tour">
                                📖 Quick Tour
                            </button>
                            <button type="button" class="btn btn-secondary btn-small" id="btn-reset" title="Reset all telemetry metrics and active counters">
                                🔄 Reset Demo
                            </button>
                        </div>
                    </div>

                    <!-- 1. HERO GUIDED ACTION CARD (Primary Action & Interactive Stepper) -->
                    <div class="panel-card hero-action-card" id="hero-action-card">
                        <div class="hero-top-row">
                            <div class="hero-text-block">
                                <div class="hero-badge-row">
                                    <span class="hero-pulse-badge">
                                        <span class="pulse-dot"></span>
                                        INTERACTIVE 30-SECOND DEMO
                                    </span>
                                    <span class="hero-store-tag" id="hero-active-store-tag">Active Store: Growing DTC ($200k/mo)</span>
                                </div>
                                <h1 class="hero-headline">See How AegisTrace Protects Checkout Sales</h1>
                                <p class="hero-tagline">
                                    When checkout fails, small stores lose thousands in minutes. Click below to simulate an outage and watch AegisTrace detect, calculate lost revenue, and self-heal automatically.
                                </p>
                            </div>

                            <!-- Store Profile Switcher Pills right inside the Hero -->
                            <div class="hero-profile-selector" id="store-profile-strip">
                                <span class="profile-label">Simulated Store Profile:</span>
                                <div class="profile-pills-row" id="profile-pills-group">
                                    <button type="button" class="hero-profile-btn profile-pill-btn" data-profile="small" id="pill-profile-small" title="Small boutique store: $60k-$100k/mo revenue, AOV $70, normal traffic">
                                        <span class="hp-icon">🏪</span>
                                        <span class="hp-info">
                                            <strong>Small Store</strong>
                                            <small>~$80k/mo • AOV $70 • 38 ord/day</small>
                                        </span>
                                    </button>
                                    <button type="button" class="hero-profile-btn profile-pill-btn active" data-profile="growing" id="pill-profile-growing" title="Growing DTC brand: $150k-$250k/mo revenue, AOV $85, moderate complexity">
                                        <span class="hp-icon">🏬</span>
                                        <span class="hp-info">
                                            <strong>Growing Store</strong>
                                            <small>~$200k/mo • AOV $85 • 78 ord/day</small>
                                        </span>
                                    </button>
                                    <button type="button" class="hero-profile-btn profile-pill-btn" data-profile="sale-day" id="pill-profile-sale" title="Sale-day flash surge: 3.5x-5x traffic, high DB lock and gateway timeout risk">
                                        <span class="hp-icon">⚡</span>
                                        <span class="hp-info">
                                            <strong>Sale-Day Surge</strong>
                                            <small>3.5x Traffic • AOV $85 • 275 ord/day</small>
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Hero Big CTA Area -->
                        <div class="hero-cta-box">
                            <button type="button" class="btn-primary-hero" id="btn-hero-simulate" title="Click to trigger a realistic checkout outage and watch AegisTrace self-heal">
                                <span class="hero-btn-icon">⚡</span>
                                <div class="hero-btn-labels">
                                    <span class="hero-btn-main">Simulate a Checkout Problem</span>
                                    <span class="hero-btn-sub" id="hero-btn-sub-text">1-Click Live Test • Stripe Payment Timeout (504)</span>
                                </div>
                            </button>

                            <div class="hero-chips-container">
                                <span class="chips-label">Or pick another real-world problem:</span>
                                <div class="chips-flex" id="hero-chips-flex">
                                    <button type="button" class="hero-chip active" data-scenario="gateway-timeout" id="chip-timeout" title="Stripe/PayPal hangs (504). AegisTrace fails over to Adyen.">
                                        💳 Payment Timeout (504)
                                    </button>
                                    <button type="button" class="hero-chip" data-scenario="out-of-stock" id="chip-stock" title="Warehouse stockout (422). AegisTrace auto-replenishes buffer.">
                                        📦 Inventory Sync Delay (422)
                                    </button>
                                    <button type="button" class="hero-chip" data-scenario="checkout-latency" id="chip-latency" title="Checkout API slow (>3s). AegisTrace warms cache & scales.">
                                        ⏳ Latency Spike (>3s)
                                    </button>
                                    <button type="button" class="hero-chip" data-scenario="card-declined" id="chip-declined" title="Soft decline (402). AegisTrace dispatches 1-click rescue link.">
                                        🛒 Card Soft Decline (402)
                                    </button>
                                    <button type="button" class="hero-chip" data-scenario="healthy" id="chip-healthy" title="Normal healthy customer checkout flow.">
                                        ✅ Normal Checkout
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- 4-Step Visual Journey Stepper -->
                        <div class="hero-stepper-box">
                            <div class="stepper-track" id="hero-stepper-track">
                                <div class="stepper-item active" id="step-hero-1">
                                    <div class="step-num" id="step-num-1">1</div>
                                    <div class="step-body">
                                        <strong>1. Trigger Problem</strong>
                                        <span id="step-1-label">Click button above</span>
                                    </div>
                                </div>
                                <div class="stepper-line" id="stepper-line-1"></div>
                                <div class="stepper-item" id="step-hero-2">
                                    <div class="step-num" id="step-num-2">2</div>
                                    <div class="step-body">
                                        <strong>2. Detect in &lt;1s</strong>
                                        <span id="step-2-label">Instant visual alert</span>
                                    </div>
                                </div>
                                <div class="stepper-line" id="stepper-line-2"></div>
                                <div class="stepper-item" id="step-hero-3">
                                    <div class="step-num" id="step-num-3">3</div>
                                    <div class="step-body">
                                        <strong>3. Calculate Risk</strong>
                                        <span id="step-3-label">Orders &amp; $ at risk</span>
                                    </div>
                                </div>
                                <div class="stepper-line" id="stepper-line-3"></div>
                                <div class="stepper-item" id="step-hero-4">
                                    <div class="step-num" id="step-num-4">4</div>
                                    <div class="step-body">
                                        <strong>4. Auto-Healed</strong>
                                        <span id="step-4-label">Revenue protected</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Plain English Dynamic Outcome Banner -->
                        <div class="hero-outcome-banner" id="hero-outcome-banner">
                            <div class="outcome-icon" id="hero-outcome-icon">💡</div>
                            <div class="outcome-content">
                                <strong id="hero-outcome-title">Ready for Live Test</strong>
                                <p id="hero-outcome-desc">
                                    Click <strong>"Simulate a Checkout Problem"</strong> above to see how AegisTrace protects your store when payments fail. Watch the pipeline below light up in real time!
                                </p>
                            </div>
                            <div class="outcome-tag-box">
                                <span class="outcome-pill" id="hero-outcome-pill">Ready</span>
                            </div>
                        </div>
                    </div>

                    <!-- 2. LIVE ORDER PIPELINE TRACING (The Visual Centerpiece) -->
                    <div class="panel-card visualizer-card" id="visualizer-card">
                        <div class="card-header">
                            <div>
                                <h2>Live Order Pipeline Tracing <span class="info-tip" data-tooltip="Visual trace of orders flowing across 5 microservices in real time.">?</span></h2>
                                <span class="sub-header-desc">Watch customer transactions flow through each step from checkout to delivery</span>
                            </div>
                            <div class="pipeline-header-badges">
                                <span class="badge trace-id-badge" id="trace-id-badge" title="W3C Correlation Trace ID propagated across all 5 microservices">
                                    <span class="trace-icon">🔗</span>
                                    <span class="trace-label">Trace:</span>
                                    <strong id="current-trace-id">trace_idle</strong>
                                    <button type="button" class="btn-copy-trace" id="btn-copy-trace" title="Copy Trace ID to Clipboard">
                                        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                                    </button>
                                </span>
                                <span class="badge" id="order-id-badge">Order: IDLE</span>
                                <button type="button" class="btn btn-secondary btn-small btn-toggle-pipeline-layout" id="btn-toggle-pipeline-layout" title="Toggle Pipeline Layout (Horizontal Flow / Vertical Stack)">
                                    <span id="pipeline-layout-icon">↕</span> <span id="pipeline-layout-text">Stack</span>
                                </button>
                            </div>
                        </div>
                        <div class="pipeline-scroll-hint" id="pipeline-scroll-hint">
                            <span>👈 Swipe horizontally to trace all microservices</span>
                            <span style="color: #60a5fa; font-weight: 600;">5 Order Stages</span>
                        </div>
                        <div class="pipeline-wrapper">
                            <!-- Node 1: Checkout -->
                            <div class="pipeline-node" id="node-checkout" data-service="checkout" data-tooltip="Checkout API (:5001) - Validates cart, customer pricing, and begins transaction.">
                                <div class="node-icon">
                                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="9" cy="21" r="1"/>
                                        <circle cx="20" cy="21" r="1"/>
                                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                                    </svg>
                                </div>
                                <div class="node-name">1. Checkout API</div>
                                <div class="node-status-text">IDLE</div>
                            </div>

                            <!-- Connector 1 -->
                            <div class="pipeline-connector" id="conn-checkout-inventory">
                                <div class="connector-line"></div>
                                <div class="connector-pulse"></div>
                            </div>

                            <!-- Node 2: Inventory -->
                            <div class="pipeline-node" id="node-inventory" data-service="inventory" data-tooltip="Inventory Service (:5002) - Checks warehouse stock and locks items. Self-heals on stockout.">
                                <div class="node-icon">
                                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                                        <ellipse cx="12" cy="5" rx="9" ry="3"/>
                                        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                                        <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/>
                                    </svg>
                                </div>
                                <div class="node-name">2. Inventory DB</div>
                                <div class="node-status-text">IDLE</div>
                            </div>

                            <!-- Connector 2 -->
                            <div class="pipeline-connector" id="conn-inventory-payment">
                                <div class="connector-line"></div>
                                <div class="connector-pulse"></div>
                            </div>

                            <!-- Node 3: Payment -->
                            <div class="pipeline-node" id="node-payment" data-service="payment" data-tooltip="Payment Gateway (:5003) - Charges cards via Stripe. Fails over to Adyen on timeout.">
                                <div class="node-icon">
                                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                                        <line x1="1" y1="10" x2="23" y2="10"/>
                                    </svg>
                                </div>
                                <div class="node-name">3. Payment Gateway</div>
                                <div class="node-status-text">IDLE</div>
                            </div>

                            <!-- Connector 3 -->
                            <div class="pipeline-connector" id="conn-payment-fulfillment">
                                <div class="connector-line"></div>
                                <div class="connector-pulse"></div>
                            </div>

                            <!-- Node 4: Fulfillment -->
                            <div class="pipeline-node" id="node-fulfillment" data-service="fulfillment" data-tooltip="Fulfillment Service (:5004) - Packs orders and manages database pool. Recycles on 500.">
                                <div class="node-icon">
                                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
                                        <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
                                    </svg>
                                </div>
                                <div class="node-name">4. Fulfillment API</div>
                                <div class="node-status-text">IDLE</div>
                            </div>

                            <!-- Connector 4 -->
                            <div class="pipeline-connector" id="conn-fulfillment-logistics">
                                <div class="connector-line"></div>
                                <div class="connector-pulse"></div>
                            </div>

                            <!-- Node 5: Logistics -->
                            <div class="pipeline-node" id="node-logistics" data-service="logistics" data-tooltip="Logistics API (:5005) - Issues shipping labels. Buffers to RabbitMQ queue on carrier outage.">
                                <div class="node-icon">
                                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="1" y="3" width="15" height="13"/>
                                        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                                        <circle cx="5.5" cy="18.5" r="2.5"/>
                                        <circle cx="18.5" cy="18.5" r="2.5"/>
                                    </svg>
                                </div>
                                <div class="node-name">5. Logistics API</div>
                                <div class="node-status-text">IDLE</div>
                            </div>
                        </div>
                    </div>

                    <!-- 3. BUSINESS IMPACT & PRESERVED VALUE CARD -->
                    <div class="panel-card business-card" id="business-card" style="margin-top: 1.25rem;">
                        <div class="card-header">
                            <div>
                                <h2>Business Preserved Metrics <span class="info-tip" data-tooltip="Direct bottom-line revenue rescued by AegisTrace autonomous self-healing.">?</span></h2>
                                <span class="sub-header-desc">Quantified financial value and downtime reduction</span>
                            </div>
                            <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: var(--success-color); border: 1px solid rgba(16, 185, 129, 0.3);">LIVE Preserved</span>
                        </div>

                        <!-- Live Revenue Protection Rolling Ticker -->
                        <div class="biz-rolling-container">
                            <div class="biz-rolling-status" id="biz-rolling-status">
                                <span class="pulse-dot-green"></span>
                                <span id="biz-rolling-text">Live: <strong>$0.00</strong> protected in last 15 min across 0 auto-healed outages</span>
                            </div>
                        </div>

                        <div class="business-grid">
                            <div class="biz-box">
                                <span class="biz-label">Preserved Revenue <span class="info-tip" data-tooltip="Total dollars protected from failed checkouts by automated self-healing.">?</span></span>
                                <span class="biz-value text-green">$<span id="biz-revenue">0.00</span></span>
                            </div>
                            <div class="biz-box">
                                <span class="biz-label">Recovery Speed (MTTR) <span class="info-tip" data-tooltip="Mean Time To Recover: Average seconds AegisTrace takes to diagnose and repair an outage.">?</span></span>
                                <span class="biz-value text-cyan" id="biz-mttr">0.00s</span>
                            </div>
                            <div class="biz-box">
                                <span class="biz-label">Eng. Hours Saved <span class="info-tip" data-tooltip="Estimated developer on-call engineering hours saved by autonomous remediation.">?</span></span>
                                <span class="biz-value text-purple" id="biz-hours">0.0</span>
                            </div>
                            <div class="biz-box biz-box-risk hidden" id="biz-box-risk">
                                <span class="biz-label">Active Revenue at Risk <span class="info-tip" data-tooltip="Estimated dollar value of orders in the pipeline during active failure.">?</span></span>
                                <span class="biz-value text-red" id="biz-revenue-at-risk">$0.00</span>
                            </div>
                        </div>

                        <!-- ROI Incident Cost Summary Callout -->
                        <div class="biz-incident-cost-banner" id="biz-incident-cost-banner">
                            <div class="incident-cost-title">💡 Traditional Manual APM Comparison</div>
                            <p class="incident-cost-text" id="incident-cost-text">
                                Without AegisTrace, an order path outage averages <strong>45 min MTTR</strong>, costing an estimated <strong>$<span id="biz-traditional-cost">3,850.00</span></strong> in abandoned checkouts and on-call fire drills.
                            </p>
                        </div>

                        <!-- Business Impact Live Incident Narrative -->
                        <div class="biz-impact-story-card" id="biz-impact-story-card">
                            <div class="story-header-row">
                                <span class="story-badge">💼 Real-World Business Impact</span>
                                <span class="story-scenario-tag" id="story-scenario-tag">Scenario: Payment Gateway Timeout (Stripe/PayPal)</span>
                            </div>
                            <p class="story-text" id="biz-impact-story-text">
                                "In this 18-minute incident, 47 orders were affected. Estimated revenue at risk: $3,995. AegisTrace detected the issue in 42 seconds and restored the flow in 2.1 minutes."
                            </p>
                            <div class="story-metrics-grid">
                                <div class="sm-card">
                                    <span class="sm-label">Orders Affected</span>
                                    <span class="sm-value text-amber" id="story-orders-affected">47</span>
                                </div>
                                <div class="sm-card">
                                    <span class="sm-label">Revenue at Risk</span>
                                    <span class="sm-value text-red" id="story-rev-risk">$3,995</span>
                                </div>
                                <div class="sm-card">
                                    <span class="sm-label">Time to Detect (TTD)</span>
                                    <span class="sm-value text-cyan" id="story-ttd">42s</span>
                                </div>
                                <div class="sm-card">
                                    <span class="sm-label">Time to Recover (MTTR)</span>
                                    <span class="sm-value text-green" id="story-mttr">2.1 min</span>
                                </div>
                                <div class="sm-card sm-highlight">
                                    <span class="sm-label">Revenue Protected</span>
                                    <span class="sm-value text-green font-bold" id="story-rev-protected">$3,795</span>
                                </div>
                            </div>
                        </div>

                        <!-- Industry Benchmark Badges -->
                        <div class="industry-benchmarks-strip">
                            <div class="benchmark-pill" data-tooltip="Baymard Institute: 69.9% avg cart drop. Latency >2s triggers instant checkout bounce.">
                                <span class="bm-icon">🛒</span>
                                <span><strong>Cart Abandonment ~70%:</strong> Shoppers leave immediately if checkout stalls &gt; 2 seconds.</span>
                            </div>
                            <div class="benchmark-pill" data-tooltip="Stripe State of Checkout: checkout and gateway errors cause permanent customer loss.">
                                <span class="bm-icon">💳</span>
                                <span><strong>Payment Drops:</strong> Payment timeouts are the #1 technical driver of abandoned shopping carts.</span>
                            </div>
                            <div class="benchmark-pill" data-tooltip="Retail Systems Research: small stores lose thousands even during brief 30-min outages.">
                                <span class="bm-icon">📉</span>
                                <span><strong>Incident Cost:</strong> Even smaller stores lose $1,000–$5,000+ during short technical incidents.</span>
                            </div>
                        </div>

                        <!-- Action Triggers -->
                        <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem; flex-wrap: wrap;">
                            <button type="button" class="btn btn-secondary btn-small" id="btn-open-roi-card" style="flex: 1 1 200px;">
                                📊 Configure Revenue Model
                            </button>
                            <button type="button" class="btn btn-secondary btn-small" id="btn-open-before-after" style="flex: 1 1 200px;">
                                ⚖️ View Before vs After Impact
                            </button>
                            <button type="button" class="btn btn-secondary btn-small hidden" id="btn-view-incident-card" style="flex: 1 1 200px; color: #f87171; border-color: rgba(248, 113, 113, 0.4);">
                                🚨 View Incident Card
                            </button>
                        </div>
                    </div>

                    <!-- 4. BEFORE VS AFTER COMPARISON CARD -->
                    <div class="panel-card before-after-card" id="before-after-section" style="margin-top: 1.25rem;">
                        <div class="card-header">
                            <div>
                                <h2>Before vs After AegisTrace <span class="info-tip" data-tooltip="Direct side-by-side contrast between traditional manual troubleshooting and autonomous revenue protection.">?</span></h2>
                                <span class="sub-header-desc">Quantified impact for small to mid-sized e-commerce operations</span>
                            </div>
                            <span class="badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3);">Founder Comparison</span>
                        </div>

                        <div class="before-after-table-wrap">
                            <table class="before-after-table">
                                <thead>
                                    <tr>
                                        <th style="width: 25%;">Operational Area</th>
                                        <th style="width: 37%; color: #f87171; background: rgba(239, 68, 68, 0.05);">❌ Without AegisTrace (Manual Trouble)</th>
                                        <th style="width: 38%; color: #34d399; background: rgba(16, 185, 129, 0.08);">🛡️ With AegisTrace (Autonomous Protection)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><strong>Detection Time (TTD)</strong></td>
                                        <td class="col-without"><strong class="text-red">25 – 90 minutes</strong><br><span class="comp-subtext">Discovered only after angry customer emails or lost orders</span></td>
                                        <td class="col-with"><strong class="text-green">Under 1 minute (&lt; 45s)</strong><br><span class="comp-subtext">Real-time W3C distributed trace anomaly detection</span></td>
                                    </tr>
                                    <tr>
                                        <td><strong>Recovery Time (MTTR)</strong></td>
                                        <td class="col-without"><strong class="text-red">1 – 4 hours</strong><br><span class="comp-subtext">Engineer woke up, triaged logs, patched or restarted pods manually</span></td>
                                        <td class="col-with"><strong class="text-green">2 – 8 minutes (&lt; 2.5m avg)</strong><br><span class="comp-subtext">Autonomous self-healing (cache invalidation, gateway failover)</span></td>
                                    </tr>
                                    <tr>
                                        <td><strong>Revenue Impact</strong></td>
                                        <td class="col-without"><strong class="text-red" id="comp-without-rev">High ($1,200 – $15,000+ lost)</strong><br><span class="comp-subtext">Shoppers hit error screens and buy from competitors</span></td>
                                        <td class="col-with"><strong class="text-green" id="comp-with-rev">Significantly Reduced (95%+ saved)</strong><br><span class="comp-subtext">Orders buffered and retried with 0 dropped customer carts</span></td>
                                    </tr>
                                    <tr>
                                        <td><strong>Engineering Effort</strong></td>
                                        <td class="col-without"><strong class="text-red">High (Manual On-Call Toil)</strong><br><span class="comp-subtext">Stressful 3 AM fire-drills, log digging, and emergency deploys</span></td>
                                        <td class="col-with"><strong class="text-green">Low (Autonomous Protection)</strong><br><span class="comp-subtext">Zero developer intervention needed; automated post-mortem generated</span></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <!-- Live Store Profile Contrast Card -->
                        <div class="profile-contrast-callout">
                            <span class="contrast-icon">📊</span>
                            <div class="contrast-content">
                                <strong id="contrast-profile-title">Active Profile: Growing Store ($200k/mo)</strong>
                                <p id="contrast-profile-desc">
                                    Without AegisTrace, an unmonitored checkout blip costs ~$3,850 and loses ~47 customers. With AegisTrace, detection happens in 42 seconds and self-healing preserves 95%+ of at-risk sales.
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- 5. PROGRESSIVE DISCLOSURE: ADVANCED DEVELOPER DRAWER -->
                    <div class="advanced-tools-section" id="advanced-tools-section">
                        <button type="button" class="btn-toggle-advanced-drawer" id="btn-toggle-advanced" aria-expanded="false" title="Expand raw metrics, SLA uptime, and simulation controls">
                            <span style="display: flex; align-items: center; gap: 0.5rem;">
                                <span class="toggle-icon" id="advanced-toggle-icon">🛠️</span>
                                <span class="toggle-text" id="advanced-toggle-text">Show Advanced Developer Tools &amp; Deep Telemetry</span>
                            </span>
                            <span class="toggle-arrow" id="advanced-toggle-arrow">▾</span>
                        </button>

                        <div class="advanced-drawer-content collapsed" id="advanced-drawer-content">
                            <!-- Dashboard Executive Simulation Strip -->
                            <div class="dashboard-sim-strip" style="background: rgba(17, 24, 39, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(37, 99, 235, 0.15); border-radius: 12px; padding: 0.85rem 1.25rem; margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
                                <div style="display: flex; align-items: center; gap: 0.85rem; flex-wrap: wrap;">
                                    <span class="status-indicator">
                                        <span class="status-dot healthy" id="global-status"></span>
                                        <span class="status-text">Pipeline Operational</span>
                                    </span>
                                    <div class="toggle-group" data-tooltip="Streams background orders continuously to simulate live traffic.">
                                        <span class="toggle-label">Auto-Pilot</span>
                                        <label class="switch">
                                            <input type="checkbox" id="autopilot-toggle" checked>
                                            <span class="slider"></span>
                                        </label>
                                    </div>
                                    <div class="toggle-group" data-tooltip="Automatically diagnoses and repairs failures to keep error rate &le; 1.0%.">
                                        <span class="toggle-label">Auto-Remediation</span>
                                        <label class="switch">
                                            <input type="checkbox" id="remediation-toggle" checked>
                                            <span class="slider"></span>
                                        </label>
                                    </div>
                                    <div class="toggle-group" data-tooltip="Execution speed per pipeline stage (100ms - 2000ms).">
                                        <span class="toggle-label">Speed: <span id="delay-val">400</span>ms</span>
                                        <input type="range" id="delay-slider" min="100" max="2000" step="100" value="400" class="speed-slider">
                                    </div>
                                </div>
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <button class="btn btn-pitch" id="btn-pitch" title="Toggle High-Impact Pitch Demo Mode">
                                        <span id="pitch-icon">★</span>
                                        <span id="pitch-text">Pitch Mode</span>
                                    </button>
                                    <button class="btn btn-secondary btn-small btn-help" id="btn-open-help" title="Open Onboarding Guide &amp; Tour">
                                        📖 Quick Guide
                                    </button>
                                </div>
                            </div>

                            <!-- Metrics and Uptime Side by Side -->
                            <div class="dashboard-split-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.25rem;">
                                <div class="panel-card metrics-card">
                                    <div class="card-header">
                                        <h2>System Metrics Monitor <span class="info-tip" data-tooltip="Live telemetry across all active microservices.">?</span></h2>
                                    </div>
                                    <div class="metrics-grid">
                                        <div class="metric-box">
                                            <span class="metric-label">API Latency <span class="info-tip" data-tooltip="Average round-trip response time across all 5 microservices. Target: &lt; 250ms.">?</span></span>
                                            <div class="metric-value-wrapper">
                                                <span class="metric-value" id="metric-latency">124</span>
                                                <span class="metric-unit">ms</span>
                                            </div>
                                            <div class="progress-bar-bg">
                                                <div class="progress-bar-fill" id="fill-latency" style="width: 25%"></div>
                                            </div>
                                        </div>

                                        <div class="metric-box">
                                            <span class="metric-label">Service Error Rate <span class="info-tip" data-tooltip="Percentage of failed transactions. AegisTrace auto-healing keeps this target &le; 1.0%.">?</span></span>
                                            <div class="metric-value-wrapper">
                                                <span class="metric-value" id="metric-errors">0.0</span>
                                                <span class="metric-unit">%</span>
                                            </div>
                                            <div class="progress-bar-bg">
                                                <div class="progress-bar-fill" id="fill-errors" style="width: 0%"></div>
                                            </div>
                                        </div>

                                        <div class="metric-box">
                                            <span class="metric-label">DB Connection Pool <span class="info-tip" data-tooltip="Active Postgres connection handles in Fulfillment service. Auto-recycled on capacity.">?</span></span>
                                            <div class="metric-value-wrapper">
                                                <span class="metric-value" id="metric-db-pool">8 / 20</span>
                                            </div>
                                            <div class="progress-bar-bg">
                                                <div class="progress-bar-fill" id="fill-db" style="width: 40%"></div>
                                            </div>
                                        </div>

                                        <div class="metric-box">
                                            <span class="metric-label">CPU System Load <span class="info-tip" data-tooltip="Simulated CPU utilization across microservice container nodes.">?</span></span>
                                            <div class="metric-value-wrapper">
                                                <span class="metric-value" id="metric-cpu">18</span>
                                                <span class="metric-unit">%</span>
                                            </div>
                                            <div class="progress-bar-bg">
                                                <div class="progress-bar-fill" id="fill-cpu" style="width: 18%"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="panel-card uptime-card">
                                    <div class="card-header">
                                        <h2>SLA Target Compliance Monitor</h2>
                                        <span class="badge" id="sla-global-badge" style="background: rgba(16, 185, 129, 0.15); color: var(--success-color); border: 1px solid rgba(16, 185, 129, 0.3);">SLA COMPLIANT (99.98%)</span>
                                    </div>
                                    <div class="uptime-row-container">
                                        <!-- Checkout -->
                                        <div class="uptime-service-row" data-service="checkout">
                                            <div class="uptime-service-meta">
                                                <span class="uptime-service-name">Checkout API</span>
                                                <span class="uptime-service-pct" id="uptime-pct-checkout">99.99%</span>
                                            </div>
                                            <div class="uptime-bar" id="uptime-bar-checkout"></div>
                                        </div>
                                        <!-- Inventory -->
                                        <div class="uptime-service-row" data-service="inventory">
                                            <div class="uptime-service-meta">
                                                <span class="uptime-service-name">Inventory Service</span>
                                                <span class="uptime-service-pct" id="uptime-pct-inventory">99.98%</span>
                                            </div>
                                            <div class="uptime-bar" id="uptime-bar-inventory"></div>
                                        </div>
                                        <!-- Payment -->
                                        <div class="uptime-service-row" data-service="payment">
                                            <div class="uptime-service-meta">
                                                <span class="uptime-service-name">Payment Gateway</span>
                                                <span class="uptime-service-pct" id="uptime-pct-payment">99.96%</span>
                                            </div>
                                            <div class="uptime-bar" id="uptime-bar-payment"></div>
                                        </div>
                                        <!-- Fulfillment -->
                                        <div class="uptime-service-row" data-service="fulfillment">
                                            <div class="uptime-service-meta">
                                                <span class="uptime-service-name">Fulfillment API</span>
                                                <span class="uptime-service-pct" id="uptime-pct-fulfillment">99.99%</span>
                                            </div>
                                            <div class="uptime-bar" id="uptime-bar-fulfillment"></div>
                                        </div>
                                        <!-- Logistics -->
                                        <div class="uptime-service-row" data-service="logistics">
                                            <div class="uptime-service-meta">
                                                <span class="uptime-service-name">Logistics Carrier API</span>
                                                <span class="uptime-service-pct" id="uptime-pct-logistics">99.97%</span>
                                            </div>
                                            <div class="uptime-bar" id="uptime-bar-logistics"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </section>\n\n                `;

const updatedContent = content.slice(0, startIdx) + newDashboard + content.slice(endIdx);
fs.writeFileSync(indexPath, updatedContent, 'utf8');
console.log('Successfully updated public/index.html with redesigned page-dashboard!');
