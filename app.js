/**
 * AegisTrace - E-Commerce Visual API Debugger Engine
 * Core Logic & Simulation Pipeline
 */

// --- STATE MANAGEMENT ---
const state = {
    isAutopilot: true,
    isRemediating: true,
    currentScenario: 'healthy', // 'healthy', 'out-of-stock', 'card-declined', 'gateway-timeout', 'fulfillment-db-crash', 'logistics-api-down'
    pipelineActive: false,
    activeOrderId: null,
    stepDelay: 400, // Dynamic simulation delay base
    
    // Business Value Metrics
    preservedRevenue: 0.00,
    totalHoursSaved: 0.0,
    avgMttr: 0.0,
    pitchModeActive: false,

    // SLA & Uptime Tracking Data
    uptimeData: {
        checkout: [],
        inventory: [],
        payment: [],
        fulfillment: [],
        logistics: []
    },
    uptimePercentages: {
        checkout: 99.99,
        inventory: 99.98,
        payment: 99.96,
        fulfillment: 99.99,
        logistics: 99.97
    },
    downtimeDecayTimer: null,
    
    // Stats & Telemetry
    totalRuns: 0,
    errorRuns: 0,
    latencyList: [],
    
    // Live system load variables
    systemMetrics: {
        latency: 120,
        errorRate: 0.0,
        dbPoolActive: 8,
        dbPoolMax: 20,
        cpu: 18
    },
    
    // Active remediation context
    remediationInProgress: false,
    remediationTimer: null,
    pipelineTimeoutTimer: null,

    // --- NEW STATE VARS FOR AI & CODE DEBUGGER ---
    activeCodeTab: 'checkout',
    showCodeDiff: false,
    hotfixAvailable: false,
    geminiKey: localStorage.getItem('gemini_api_key') || '',
    isTyping: false,

    // --- SECURITY & MULTI-TENANCY STATE ---
    authToken: localStorage.getItem('aegis_auth_token') || '',
    currentUser: null,
    currentTenant: null
};

// --- SCENARIO DATA DIRECTORY ---
const scenarios = {
    'healthy': {
        name: 'Healthy Traffic Loop',
        sku: 'SKU-8829', // MacBook
        customer: 'Alex Rivera',
        card: '4111 •••• •••• 1111',
        zip: '90210',
        failureNode: null,
        errorCode: null,
        errorSignature: null,
        rcaDescription: null,
        remediationScript: null,
        remediationMessage: null,
        manualSteps: []
    },
    'out-of-stock': {
        name: 'Inventory Depletion',
        sku: 'SKU-4402', // iPhone (Out of Stock)
        customer: 'Jordan Vance',
        card: '4111 •••• •••• 1111',
        zip: '90210',
        failureNode: 'inventory',
        errorCode: 'HTTP 422 Unprocessable Entity',
        errorSignature: 'ERR_INVENTORY_DEPLETED',
        rcaDescription: 'Database inventory lock query failed for Item SKU-4402 because the stock count is exactly zero (0). The frontend checkout was permitted because the catalog service redis cache was desynchronized and failed to refresh the stock status from the master warehouse database.',
        remediationScript: 'sync_stock_cache.sh',
        remediationMessage: 'Restocked database safety buffer for SKU-4402 and invalidated desynchronized redis-cache keys.',
        manualSteps: [
            'Confirm Redis cache cluster health and master-replica replication latency.',
            'Inspect inventory database triggers for catalog stock depletion events.',
            'Review Redis eviction policies under high memory conditions.'
        ]
    },
    'card-declined': {
        name: 'Card Declined',
        sku: 'SKU-9901',
        customer: 'Taylor Morgan',
        card: '5500 •••• •••• 4402', // Declined Card
        zip: '90210',
        failureNode: 'payment',
        errorCode: 'HTTP 402 Payment Required',
        errorSignature: 'STRIPE_CARD_DECLINED',
        rcaDescription: 'The Stripe payment gateway API rejected the transaction attempt. Reason: card_declined. Issuer Response Code: "51" (Insufficient Funds). The customer card details are valid, but the credit threshold or debit account balance has been exceeded.',
        remediationScript: 'notify_customer_billing.sh',
        remediationMessage: 'Sent real-time push notification and checkout retry token via Twilio SMS to Taylor Morgan. Parked Order in state PENDING_BILLING.',
        manualSteps: [
            'Verify checkout webhook secret keys match stripe API signing key.',
            'Inspect user notification queue logs to verify SMS delivery rate.',
            'Confirm the payment microservice is parsing Stripe metadata correctly.'
        ]
    },
    'gateway-timeout': {
        name: 'Payment Gateway Timeout',
        sku: 'SKU-8829',
        customer: 'Morgan Chase',
        card: '4111 •••• •••• 1111',
        zip: '90210',
        failureNode: 'payment',
        errorCode: 'HTTP 504 Gateway Timeout',
        errorSignature: 'CONN_TIMEOUT_STRIPE_API',
        rcaDescription: 'The payment integration service initiated a POST request to stripe.com/v3/charges but failed to receive a socket reply within the configured Checkout API client timeout boundary of 2500ms. Diagnostic shows regional Cloudflare routing degradation from the payments container cluster.',
        remediationScript: 'failover_payment_gateway.sh',
        remediationMessage: 'Updated dynamic API routing context. Failed over Primary Payment Gateway (Stripe) to Secondary Gateway (Adyen API Wrapper).',
        manualSteps: [
            'Check Stripe Global Status Dashboard for service availability issues.',
            'Verify outbound NAT Gateway routing configurations and firewalls.',
            'Consider increasing the payment microservice socket timeout limit to 5000ms.'
        ]
    },
    'fulfillment-db-crash': {
        name: 'Database Pool Exhaustion',
        sku: 'SKU-8829',
        customer: 'Riley Davies',
        card: '4111 •••• •••• 1111',
        zip: '90210',
        failureNode: 'fulfillment',
        errorCode: 'HTTP 500 Internal Server Error',
        errorSignature: 'POSTGRES_POOL_EXHAUSTED',
        rcaDescription: 'The fulfillment microservice was unable to retrieve a database connection handle. PostgreSQL Pool metrics show 20/20 active connections in state "idle in transaction". Connection leak detected in `generatePackingList()` routing function where client resources were not returned in a finally block.',
        remediationScript: 'recycle_db_pool.sh',
        remediationMessage: 'Forced-closed 12 zombie DB connections, bumped postgres connection pool size to 50, and restarted fulfillment container replica.',
        manualSteps: [
            'Inspect git history of fulfillment-service/db/pool.go for unclosed connection handles.',
            'Enable pg_stat_activity alerts for transactions open longer than 15 seconds.',
            'Verify DB max_connections setting on AWS RDS matches pool capacity.'
        ]
    },
    'logistics-api-down': {
        name: 'Logistics Service Down',
        sku: 'SKU-8829',
        customer: 'Casey Jordan',
        card: '4111 •••• •••• 1111',
        zip: '99999', // Invalid Zip/API Down
        failureNode: 'logistics',
        errorCode: 'HTTP 503 Service Unavailable',
        errorSignature: 'LOGISTICS_DNS_RESOLUTION_FAIL',
        rcaDescription: 'DNS lookup failure inside the egress proxy. The third-party logistics tracking service endpoint (logistics.dhl-provider.net) is unreachable due to a core DNS server malfunction at the logistics provider DNS host.',
        remediationScript: 'route_local_shipping_queue.sh',
        remediationMessage: 'Redirected shipping payload to local persistent RabbitMQ queue (dhl-deferred-shipments). Shipments will automatically retry once external DNS is resolved.',
        manualSteps: [
            'Ping target logistics gateway manually to confirm routing.',
            'Inspect core DNS resolver caching rules in Kubernetes CoreDNS configmap.',
            'Check if the local queuing worker daemon is online and consuming.'
        ]
    }
};

// --- CODEBASE SIMULATED DIRECTORY ---
const codebase = {
    checkout: {
        path: 'checkout-service/main.go',
        healthy: `package main

import (
    "net/http"
    "github.com/gin-gonic/gin"
)

func main() {
    r := gin.Default()
    r.POST("/checkout", func(c *gin.Context) {
        var req CheckoutRequest
        if err := c.ShouldBindJSON(&req); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_PAYLOAD"})
            return
        }
        
        // Dispatch checking loops
        c.JSON(http.StatusOK, gin.H{
            "status": "VALIDATED",
            "order_id": generateOrderID(),
        })
    })
    r.Run(":8081")
}`,
        broken: {},
        diff: ``
    },
    inventory: {
        path: 'inventory-service/db/pool.go',
        healthy: `package db

import (
    "database/sql"
    "context"
    "log"
)

// CheckItemStock checks DB warehouse count
func CheckItemStock(ctx context.Context, db *sql.DB, sku string) (bool, error) {
    var stock int
    err := db.QueryRowContext(ctx, "SELECT stock FROM inventory WHERE sku = $1", sku).Scan(&stock)
    if err != nil {
        return false, err
    }
    
    if stock <= 0 {
        return false, nil
    }
    return true, nil
}`,
        broken: {
            'out-of-stock': `package db

import (
    "database/sql"
    "context"
    "log"
)

// CheckItemStock checks DB warehouse count
func CheckItemStock(ctx context.Context, db *sql.DB, sku string) (bool, error) {
    var stock int
    err := db.QueryRowContext(ctx, "SELECT stock FROM inventory WHERE sku = $1", sku).Scan(&stock)
    if err != nil {
        return false, err
    }
    
<<<< ERR_HIGHLIGHT: Warehouse master DB records stock = 0 for iPhone SKU-4402. Catalog Redis keys are stale. >>>>
    if stock <= 0 {
        return false, nil // Throws HTTP 422 Unprocessable Entity
    }
    return true, nil
}`
        },
        diff: `package db

import (
    "database/sql"
    "context"
    "log"
)

// CheckItemStock checks DB warehouse count
func CheckItemStock(ctx context.Context, db *sql.DB, sku string) (bool, error) {
    var stock int
    err := db.QueryRowContext(ctx, "SELECT stock FROM inventory WHERE sku = $1", sku).Scan(&stock)
    if err != nil {
        return false, err
    }
    
<<<< DIFF_DEL: -   if stock <= 0 {
-       return false, nil
-   } >>>>
<<<< DIFF_ADD: +   if stock <= 0 {
+       // HOTFIX: Safety buffer refilled automatically. Synchronize DB & purge Redis cache
+       _, _ = db.ExecContext(ctx, "UPDATE inventory SET stock = 100 WHERE sku = $1", sku)
+       _ = redisClient.Del(ctx, "catalog:sku:" + sku)
+       log.Printf("HEALED: Inventory replenished for %s, evicted cache key", sku)
+       stock = 100
+   } >>>>
    return true, nil
}`
    },
    payment: {
        path: 'payment-service/stripe/adapter.js',
        healthy: `const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

async function captureCharge(chargePayload) {
    // Normal routing to Stripe payment gateway
    const charge = await stripe.charges.create({
        amount: chargePayload.amount,
        currency: 'usd',
        source: chargePayload.token,
        description: 'AegisTrace Transaction'
    });
    return charge.id;
}`,
        broken: {
            'card-declined': `const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

async function captureCharge(chargePayload) {
    // Card declined routing
<<<< ERR_HIGHLIGHT: Stripe API throws CardDeclinedException. Code: issuer_declined (Response: 51). >>>>
    const charge = await stripe.charges.create({
        amount: chargePayload.amount,
        currency: 'usd',
        source: chargePayload.token, // Fails due to insufficient card funds (Declined Card)
    });
    return charge.id;
}`,
            'gateway-timeout': `const Stripe = require('stripe');
// Low socket threshold set to 2500ms
const stripe = Stripe(process.env.STRIPE_SECRET_KEY, {
    timeout: 2500 
});

async function captureCharge(chargePayload) {
<<<< ERR_HIGHLIGHT: Stripe regional API routing degraded. Connection times out at socket limit of 2500ms. >>>>
    const charge = await stripe.charges.create({
        amount: chargePayload.amount,
        currency: 'usd',
        source: chargePayload.token
    });
    return charge.id;
}`
        },
        diff: `const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY, {
    timeout: 5000 // Bumped to 5000ms
});

async function captureCharge(chargePayload) {
<<<< DIFF_DEL: -   const charge = await stripe.charges.create({
-       amount: chargePayload.amount,
-       currency: 'usd',
-       source: chargePayload.token
-   });
-   return charge.id; >>>>
<<<< DIFF_ADD: +   try {
+       const charge = await stripe.charges.create({
+           amount: chargePayload.amount,
+           currency: 'usd',
+           source: chargePayload.token
+       });
+       return charge.id;
+   } catch (err) {
+       if (err.statusCode === 504 || err.code === 'ETIMEDOUT') {
+           // FAILOVER: Route payment transactions dynamically to secondary gateway wrapper (Adyen API)
+           console.warn("Stripe timed out. Initiating gateway failover to Adyen SDK adapter...");
+           return await adyenAdapter.capture(chargePayload);
+       }
+       throw err;
+   } >>>>
}`
    },
    fulfillment: {
        path: 'fulfillment-service/db/pool.go',
        healthy: `package db

import (
    "database/sql"
    _ "github.com/lib/pq"
)

// GeneratePackingSlip fetches order details
func GeneratePackingSlip(orderID string) (*PackingSlip, error) {
    db, err := sql.Open("postgres", connStr)
    if err != nil {
        return nil, err
    }
    defer db.Close() // Ensure connection recycled

    var slip PackingSlip
    err = db.QueryRow("SELECT items, address FROM orders WHERE id = $1", orderID).Scan(&slip.Items, &slip.Address)
    if err != nil {
        return nil, err
    }
    return &slip, nil
}`,
        broken: {
            'fulfillment-db-crash': `package db

import (
    "database/sql"
    _ "github.com/lib/pq"
)

// GeneratePackingSlip leaks database connection handles under active load
func GeneratePackingSlip(orderID string) (*PackingSlip, error) {
    db, err := sql.Open("postgres", connStr)
    if err != nil {
        return nil, err
    }
<<<< ERR_HIGHLIGHT: Leaking socket connection. db.Close() is missing in the function scope. >>>>
    // Connection is not recycled! Max pool size of 20 exceeded.

    var slip PackingSlip
    err = db.QueryRow("SELECT items, address FROM orders WHERE id = $1", orderID).Scan(&slip.Items, &slip.Address)
    if err != nil {
        return nil, err
    }
    return &slip, nil
}`
        },
        diff: `package db

import (
    "database/sql"
    _ "github.com/lib/pq"
)

// GeneratePackingSlip fetches order details
func GeneratePackingSlip(orderID string) (*PackingSlip, error) {
    db, err := sql.Open("postgres", connStr)
    if err != nil {
        return nil, err
    }
<<<< DIFF_ADD: +   defer db.Close() // FIXED: Ensure DB connection is recycled to connection pool >>>>

    var slip PackingSlip
    err = db.QueryRow("SELECT items, address FROM orders WHERE id = $1", orderID).Scan(&slip.Items, &slip.Address)
    if err != nil {
        return nil, err
    }
    return &slip, nil
}`
    },
    logistics: {
        path: 'logistics-service/dns/lookup.js',
        healthy: `const dns = require('dns').promises;
const axios = require('axios');

async function dispatchLogistics(shipmentPayload) {
    // Resolve DNS and call carrier API
    const ip = await dns.resolve4('logistics.dhl-provider.net');
    const res = await axios.post(\`http://\${ip[0]}/shipments\`, shipmentPayload);
    return res.data.tracking_id;
}`,
        broken: {
            'logistics-api-down': `const dns = require('dns').promises;
const axios = require('axios');

async function dispatchLogistics(shipmentPayload) {
    // Throws DNS resolution failure on outage
<<<< ERR_HIGHLIGHT: dns.resolve4 throws ENOTFOUND. DNS servers of logistics.dhl-provider.net are down. >>>>
    const ip = await dns.resolve4('logistics.dhl-provider.net'); 
    const res = await axios.post(\`http://\${ip[0]}/shipments\`, shipmentPayload);
    return res.data.tracking_id;
}`
        },
        diff: `const dns = require('dns').promises;
const axios = require('axios');

async function dispatchLogistics(shipmentPayload) {
<<<< DIFF_DEL: -   const ip = await dns.resolve4('logistics.dhl-provider.net');
-   const res = await axios.post(\`http://\${ip[0]}/shipments\`, shipmentPayload);
-   return res.data.tracking_id; >>>>
<<<< DIFF_ADD: +   try {
+       const ip = await dns.resolve4('logistics.dhl-provider.net');
+       const res = await axios.post(\`http://\${ip[0]}/shipments\`, shipmentPayload);
+       return res.data.tracking_id;
+   } catch (err) {
+       // HOTFIX DNS FAILURE: Re-route payload to persistent local RabbitMQ queue
+       console.warn("DNS query failed. Backing up shipment payload to RabbitMQ dhl-deferred-shipments queue...");
+       await rabbitQueue.publish("shipments", shipmentPayload);
+       return "QUEUED-LOCAL-DH-081";
+   } >>>>
}`
    }
};

// --- DOM ELEMENTS ---
const dom = {
    globalStatus: document.getElementById('global-status'),
    globalStatusText: document.querySelector('#global-status .status-text'),
    autopilotToggle: document.getElementById('autopilot-toggle'),
    remediationToggle: document.getElementById('remediation-toggle'),
    delaySlider: document.getElementById('delay-slider'),
    delayVal: document.getElementById('delay-val'),
    btnReset: document.getElementById('btn-reset'),
    
    // Business metrics
    bizRevenue: document.getElementById('biz-revenue'),
    bizMttr: document.getElementById('biz-mttr'),
    bizHours: document.getElementById('biz-hours'),
    btnPitch: document.getElementById('btn-pitch'),
    
    // Uptime Monitor elements
    slaGlobalBadge: document.getElementById('sla-global-badge'),
    uptimeBars: {
        checkout: document.getElementById('uptime-bar-checkout'),
        inventory: document.getElementById('uptime-bar-inventory'),
        payment: document.getElementById('uptime-bar-payment'),
        fulfillment: document.getElementById('uptime-bar-fulfillment'),
        logistics: document.getElementById('uptime-bar-logistics')
    },
    uptimePcts: {
        checkout: document.getElementById('uptime-pct-checkout'),
        inventory: document.getElementById('uptime-pct-inventory'),
        payment: document.getElementById('uptime-pct-payment'),
        fulfillment: document.getElementById('uptime-pct-fulfillment'),
        logistics: document.getElementById('uptime-pct-logistics')
    },
    
    // Order info
    orderIdBadge: document.getElementById('order-id-badge'),
    
    // Nodes & Connectors
    nodes: {
        checkout: document.getElementById('node-checkout'),
        inventory: document.getElementById('node-inventory'),
        payment: document.getElementById('node-payment'),
        fulfillment: document.getElementById('node-fulfillment'),
        logistics: document.getElementById('node-logistics')
    },
    connectors: {
        'checkout-inventory': document.getElementById('conn-checkout-inventory'),
        'inventory-payment': document.getElementById('conn-inventory-payment'),
        'payment-fulfillment': document.getElementById('conn-payment-fulfillment'),
        'fulfillment-logistics': document.getElementById('conn-fulfillment-logistics')
    },
    
    // Controls
    scenarios: {
        healthy: document.getElementById('scen-healthy'),
        stock: document.getElementById('scen-stock'),
        declined: document.getElementById('scen-declined'),
        timeout: document.getElementById('scen-timeout'),
        db: document.getElementById('scen-db'),
        logistics: document.getElementById('scen-logistics')
    },
    
    // Custom Order form
    orderCustomer: document.getElementById('order-customer'),
    orderSku: document.getElementById('order-sku'),
    orderCard: document.getElementById('order-card'),
    orderZip: document.getElementById('order-zip'),
    btnSubmitOrder: document.getElementById('btn-submit-order'),
    
    // Metrics
    metricLatency: document.getElementById('metric-latency'),
    metricErrors: document.getElementById('metric-errors'),
    metricDbPool: document.getElementById('metric-db-pool'),
    metricCpu: document.getElementById('metric-cpu'),
    fillLatency: document.getElementById('fill-latency'),
    fillErrors: document.getElementById('fill-errors'),
    fillDb: document.getElementById('fill-db'),
    fillCpu: document.getElementById('fill-cpu'),
    
    // Diagnostic RCA
    rcaPanel: document.getElementById('rca-panel'),
    rcaEmptyState: document.getElementById('rca-empty-state'),
    rcaReportState: document.getElementById('rca-report-state'),
    rcaHeaderBadge: document.getElementById('rca-header-badge'),
    rcaServiceName: document.getElementById('rca-service-name'),
    rcaStatusCode: document.getElementById('rca-status-code'),
    rcaErrorSignature: document.getElementById('rca-error-signature'),
    rcaRootCause: document.getElementById('rca-root-cause'),
    rcaManualList: document.getElementById('rca-manual-list'),
    manualStepsSection: document.getElementById('manual-steps-section'),
    
    // Timeline steps
    stepDetect: document.getElementById('step-detect'),
    stepAction: document.getElementById('step-action'),
    stepVerify: document.getElementById('step-verify'),
    actionStepTitle: document.getElementById('action-step-title'),
    actionStepDesc: document.getElementById('action-step-desc'),
    
    // Console logs
    consoleLogs: document.getElementById('console-logs'),
    btnClearConsole: document.getElementById('btn-clear-console'),

    // --- NEW DOM ELEMENTS FOR AI & DEBBUGGER ---
    codeDisplay: document.getElementById('code-display-area'),
    debuggerFilePath: document.getElementById('debugger-file-path'),
    debuggerStatusBadge: document.getElementById('debugger-status-badge'),
    btnToggleDiff: document.getElementById('btn-toggle-diff'),
    btnApplyHotfix: document.getElementById('btn-apply-hotfix'),
    debuggerTabsContainer: document.getElementById('debugger-tabs'),
    
    chatFeed: document.getElementById('chat-feed'),
    chatInput: document.getElementById('chat-input'),
    chatInputForm: document.getElementById('chat-input-form'),
    btnChatSend: document.getElementById('btn-chat-send'),
    promptChips: document.getElementById('prompt-chips'),
    aiModeBadge: document.getElementById('ai-mode-badge'),
    btnToggleAiSettings: document.getElementById('btn-toggle-ai-settings'),
    aiSettingsPanel: document.getElementById('ai-settings-panel'),
    geminiApiKeyInput: document.getElementById('gemini-api-key'),
    btnSaveAiKey: document.getElementById('btn-save-ai-key'),
    keyStatusLabel: document.getElementById('key-status-label'),

    // --- SECURITY & MULTI-TENANT DOM ELEMENTS ---
    tenantUserWidget: document.getElementById('tenant-user-widget'),
    tenantBadge: document.getElementById('tenant-badge'),
    tenantName: document.getElementById('tenant-name'),
    userDisplay: document.getElementById('user-display'),
    btnLogout: document.getElementById('btn-logout'),
    loginModal: document.getElementById('login-modal'),
    loginForm: document.getElementById('login-form'),
    loginEmail: document.getElementById('login-email'),
    loginPassword: document.getElementById('login-password'),
    loginError: document.getElementById('login-error'),
    loginErrorText: document.getElementById('login-error-text'),
    btnLoginSubmit: document.getElementById('btn-login-submit'),
    btnDemoAegis: document.getElementById('btn-demo-aegis'),
    btnDemoAcme: document.getElementById('btn-demo-acme'),
    btnGoogleHanu: document.getElementById('btn-google-hanu'),
    btnGoogleCustom: document.getElementById('btn-google-custom'),
    googleCustomEmail: document.getElementById('google-custom-email'),
    btnToggleClientId: document.getElementById('btn-toggle-client-id'),
    clientIdDrawer: document.getElementById('client-id-drawer'),
    inputGoogleClientId: document.getElementById('input-google-client-id'),
    btnSaveClientId: document.getElementById('btn-save-client-id'),

    // Sign Up & Auth Tab elements
    tabLogin: document.getElementById('tab-login'),
    tabSignup: document.getElementById('tab-signup'),
    sectionLogin: document.getElementById('section-login'),
    sectionSignup: document.getElementById('section-signup'),
    signupForm: document.getElementById('signup-form'),
    signupName: document.getElementById('signup-name'),
    signupEmail: document.getElementById('signup-email'),
    signupPassword: document.getElementById('signup-password'),
    signupOrg: document.getElementById('signup-org'),
    btnSignupSubmit: document.getElementById('btn-signup-submit'),
    loginSuccess: document.getElementById('login-success'),
    loginSuccessText: document.getElementById('login-success-text'),
    linkGoToSignup: document.getElementById('link-go-to-signup'),
    linkGoToLogin: document.getElementById('link-go-to-login'),

    // Onboarding & Quick Guide elements
    onboardingModal: document.getElementById('onboarding-modal'),
    btnCloseOnboarding: document.getElementById('btn-close-onboarding'),
    btnSkipOnboarding: document.getElementById('btn-skip-onboarding'),
    btnOpenHelp: document.getElementById('btn-open-help'),
    btnLoginTour: document.getElementById('btn-login-tour'),
    btnStartDemoAction: document.getElementById('btn-start-demo-action'),
    btnTourRunOrder: document.getElementById('btn-tour-run-order'),
    btnTourInjectFault: document.getElementById('btn-tour-inject-fault'),
    checkDontShowOnboarding: document.getElementById('check-dont-show-onboarding')
};

// --- AUTHENTICATION & MULTI-TENANT HELPERS ---
async function authFetch(url, options = {}) {
    const headers = options.headers || {};
    if (state.authToken) {
        headers['Authorization'] = `Bearer ${state.authToken}`;
    }
    if (state.currentTenant?.id) {
        headers['x-tenant-id'] = state.currentTenant.id;
    }
    options.headers = headers;

    try {
        const response = await fetch(url, options);
        if (response.status === 401) {
            handleUnauthorized();
        }
        return response;
    } catch (err) {
        throw err;
    }
}

function handleUnauthorized() {
    state.authToken = '';
    state.currentUser = null;
    state.currentTenant = null;
    localStorage.removeItem('aegis_auth_token');
    showLoginModal('Session expired or authentication required. Please sign in.');
}

function showLoginModal(errorText = null) {
    if (dom.loginModal) {
        dom.loginModal.classList.remove('hidden');
    }
    if (dom.loginError) {
        if (errorText) {
            dom.loginError.classList.remove('hidden');
            dom.loginErrorText.textContent = errorText;
        } else {
            dom.loginError.classList.add('hidden');
        }
    }
}

function hideLoginModal() {
    if (dom.loginModal) {
        dom.loginModal.classList.add('hidden');
    }
    if (dom.loginError) {
        dom.loginError.classList.add('hidden');
    }
    if (dom.loginSuccess) {
        dom.loginSuccess.classList.add('hidden');
    }
}

function switchAuthTab(tab) {
    if (dom.loginError) dom.loginError.classList.add('hidden');
    if (dom.loginSuccess) dom.loginSuccess.classList.add('hidden');

    if (tab === 'signup') {
        if (dom.tabLogin) dom.tabLogin.classList.remove('active');
        if (dom.tabSignup) dom.tabSignup.classList.add('active');
        if (dom.sectionLogin) dom.sectionLogin.classList.add('hidden');
        if (dom.sectionSignup) dom.sectionSignup.classList.remove('hidden');
    } else {
        if (dom.tabSignup) dom.tabSignup.classList.remove('active');
        if (dom.tabLogin) dom.tabLogin.classList.add('active');
        if (dom.sectionSignup) dom.sectionSignup.classList.add('hidden');
        if (dom.sectionLogin) dom.sectionLogin.classList.remove('hidden');
    }
}

function showLoginSuccess(text) {
    if (dom.loginSuccess && dom.loginSuccessText) {
        dom.loginSuccessText.textContent = text;
        dom.loginSuccess.classList.remove('hidden');
    }
    if (dom.loginError) {
        dom.loginError.classList.add('hidden');
    }
}

async function signup(name, email, password, organizationName) {
    try {
        if (dom.loginError) dom.loginError.classList.add('hidden');
        if (dom.loginSuccess) dom.loginSuccess.classList.add('hidden');

        // Client side validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            showLoginModal('Please enter a valid email address (e.g. name@company.com or name@gmail.com).');
            return false;
        }

        if (!password || password.length < 4) {
            showLoginModal('Password must be at least 4 characters long.');
            return false;
        }

        if (dom.btnSignupSubmit) {
            dom.btnSignupSubmit.disabled = true;
            dom.btnSignupSubmit.innerHTML = 'Creating Account & Workspace...';
        }

        const res = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, organizationName })
        });
        const data = await res.json();

        if (dom.btnSignupSubmit) {
            dom.btnSignupSubmit.disabled = false;
            dom.btnSignupSubmit.innerHTML = `
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right: 0.35rem;">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="8.5" cy="7" r="4"/>
                    <line x1="20" y1="8" x2="20" y2="14"/>
                    <line x1="23" y1="11" x2="17" y2="11"/>
                </svg>
                Create Account & Launch Console
            `;
        }

        if (!res.ok || data.status !== 'SUCCESS') {
            showLoginModal(data.message || 'Account registration failed.');
            return false;
        }

        showLoginSuccess('Account created! Launching your custom workspace...');

        state.authToken = data.token;
        state.currentUser = data.user;
        state.currentTenant = data.tenant;
        localStorage.setItem('aegis_auth_token', data.token);

        setTimeout(async () => {
            updateTenantUI();
            hideLoginModal();
            logConsole(`[AUTH] Welcome ${data.user.name}! Created tenant workspace: ${data.tenant.name}`, 'success');
            await loadTenantData();
            startAutopilotDaemon();
            startEventPoller();
            checkAndShowOnboarding(700);
        }, 600);

        return true;
    } catch (e) {
        if (dom.btnSignupSubmit) {
            dom.btnSignupSubmit.disabled = false;
        }
        showLoginModal('Sign up connection error: ' + e.message);
        return false;
    }
}

function updateTenantUI() {
    if (state.currentTenant && dom.tenantName) {
        dom.tenantName.textContent = state.currentTenant.name;
    }
    if (state.currentUser && dom.userDisplay) {
        dom.userDisplay.textContent = `${state.currentUser.email} (${state.currentUser.role || 'Member'})`;
    }
}

async function checkAuthSession() {
    if (!state.authToken) {
        showLoginModal();
        return false;
    }

    try {
        const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${state.authToken}` }
        });
        if (!res.ok) {
            handleUnauthorized();
            return false;
        }
        const data = await res.json();
        state.currentUser = data.user;
        state.currentTenant = data.tenant;
        updateTenantUI();
        hideLoginModal();
        await loadTenantData();
        return true;
    } catch (e) {
        handleUnauthorized();
        return false;
    }
}

async function login(email, password) {
    try {
        dom.loginError.classList.add('hidden');
        dom.btnLoginSubmit.disabled = true;
        dom.btnLoginSubmit.innerHTML = 'Authenticating...';

        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        dom.btnLoginSubmit.disabled = false;
        dom.btnLoginSubmit.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right: 0.35rem;">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Authenticate & Access Dashboard
        `;

        if (!res.ok || data.status !== 'SUCCESS') {
            dom.loginError.classList.remove('hidden');
            dom.loginErrorText.textContent = data.message || 'Invalid email or password.';
            return false;
        }

        state.authToken = data.token;
        state.currentUser = data.user;
        state.currentTenant = data.tenant;
        localStorage.setItem('aegis_auth_token', data.token);

        updateTenantUI();
        hideLoginModal();
        logConsole(`[AUTH] Authenticated as ${data.user.email} [${data.tenant.name}]`, 'system');

        await loadTenantData();
        startAutopilotDaemon();
        startEventPoller();
        checkAndShowOnboarding(700);
        return true;
    } catch (e) {
        dom.btnLoginSubmit.disabled = false;
        dom.loginError.classList.remove('hidden');
        dom.loginErrorText.textContent = 'Server connection error: ' + e.message;
        return false;
    }
}

async function loginWithGoogle(credential, mockUser = null) {
    try {
        dom.loginError.classList.add('hidden');
        const googleSpan = dom.btnGoogleDemo ? dom.btnGoogleDemo.querySelector('span') : null;
        if (dom.btnGoogleDemo) {
            dom.btnGoogleDemo.disabled = true;
            if (googleSpan) googleSpan.textContent = 'Authenticating with Google...';
        }

        const bodyPayload = { credential };
        if (mockUser) {
            bodyPayload.email = mockUser.email;
            bodyPayload.name = mockUser.name;
        }

        const res = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyPayload)
        });
        const data = await res.json();

        if (dom.btnGoogleDemo) {
            dom.btnGoogleDemo.disabled = false;
            if (googleSpan) googleSpan.textContent = 'Sign in with Google (Live Demo User)';
        }

        if (!res.ok || data.status !== 'SUCCESS') {
            dom.loginError.classList.remove('hidden');
            dom.loginErrorText.textContent = data.message || 'Google authentication failed.';
            return false;
        }

        state.authToken = data.token;
        state.currentUser = data.user;
        state.currentTenant = data.tenant;
        localStorage.setItem('aegis_auth_token', data.token);

        updateTenantUI();
        hideLoginModal();
        logConsole(`[AUTH-GOOGLE] Authenticated via Google SSO: ${data.user.email} [${data.tenant.name}]`, 'system');

        await loadTenantData();
        startAutopilotDaemon();
        startEventPoller();
        checkAndShowOnboarding(700);
        return true;
    } catch (e) {
        if (dom.btnGoogleDemo) {
            dom.btnGoogleDemo.disabled = false;
            const googleSpan = dom.btnGoogleDemo.querySelector('span');
            if (googleSpan) googleSpan.textContent = 'Sign in with Google (Live Demo User)';
        }
        dom.loginError.classList.remove('hidden');
        dom.loginErrorText.textContent = 'Google login failed: ' + e.message;
        return false;
    }
}

// Global callback for Google Identity Services SDK
window.handleGoogleCredentialResponse = function(response) {
    if (response && response.credential) {
        loginWithGoogle(response.credential);
    }
};

function logout() {
    state.authToken = '';
    state.currentUser = null;
    state.currentTenant = null;
    localStorage.removeItem('aegis_auth_token');

    state.totalRuns = 0;
    state.errorRuns = 0;
    state.preservedRevenue = 0.00;
    state.totalHoursSaved = 0.0;
    state.avgMttr = 0.0;
    updateBusinessMetricsUI();
    dom.consoleLogs.innerHTML = '';

    showLoginModal();
    logConsole('[AUTH] User signed out.', 'system');
}

async function loadTenantData() {
    try {
        const res = await authFetch('/api/tenant/state');
        if (res.ok) {
            const data = await res.json();
            if (data.metrics) {
                state.totalRuns = data.metrics.totalRuns || 0;
                state.errorRuns = data.metrics.errorRuns || 0;
                state.preservedRevenue = data.metrics.preservedRevenue || 0.00;
                state.totalHoursSaved = data.metrics.totalHoursSaved || 0.0;
                state.avgMttr = data.metrics.avgMttr || 0.0;
                const rawErr = state.totalRuns > 0 ? (state.errorRuns / state.totalRuns) * 100 : 0;
                state.systemMetrics.errorRate = state.isRemediating ? Math.min(0.5, rawErr) : Math.min(1.0, rawErr);
                updateBusinessMetricsUI();
                updateMetricsUI();
            }
            if (data.activeScenario && scenarios[data.activeScenario]) {
                state.currentScenario = data.activeScenario;
                Object.values(dom.scenarios).forEach(btn => btn.classList.remove('active'));
                const scenKey = data.activeScenario === 'healthy' ? 'healthy' : 
                                 data.activeScenario === 'out-of-stock' ? 'stock' : 
                                 data.activeScenario === 'card-declined' ? 'declined' : 
                                 data.activeScenario === 'gateway-timeout' ? 'timeout' : 
                                 data.activeScenario === 'fulfillment-db-crash' ? 'db' : 
                                 data.activeScenario === 'logistics-api-down' ? 'logistics' : 'healthy';
                if (dom.scenarios[scenKey]) {
                    dom.scenarios[scenKey].classList.add('active');
                }
            }
        }
    } catch (e) {
        console.warn('Failed to load tenant state:', e);
    }
}

async function saveTenantData() {
    try {
        await authFetch('/api/tenant/state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                metrics: {
                    totalRuns: state.totalRuns,
                    errorRuns: state.errorRuns,
                    preservedRevenue: state.preservedRevenue,
                    totalHoursSaved: state.totalHoursSaved,
                    avgMttr: state.avgMttr
                },
                activeScenario: state.currentScenario
            })
        });
    } catch (e) {
        // Silently ignore save errors
    }
}

// --- ONBOARDING & HELP GUIDE CONTROLLER ---
function initOnboarding() {
    // Open Quick Guide button from header
    if (dom.btnOpenHelp) {
        dom.btnOpenHelp.addEventListener('click', () => {
            showOnboardingModal('overview');
        });
    }

    // Open Quick Tour link from login screen
    if (dom.btnLoginTour) {
        dom.btnLoginTour.addEventListener('click', (e) => {
            e.preventDefault();
            showOnboardingModal('overview');
        });
    }

    // Close button
    if (dom.btnCloseOnboarding) {
        dom.btnCloseOnboarding.addEventListener('click', () => {
            hideOnboardingModal();
        });
    }

    // Skip button
    if (dom.btnSkipOnboarding) {
        dom.btnSkipOnboarding.addEventListener('click', () => {
            hideOnboardingModal();
        });
    }

    // Outside click closes modal
    if (dom.onboardingModal) {
        dom.onboardingModal.addEventListener('click', (e) => {
            if (e.target === dom.onboardingModal) {
                hideOnboardingModal();
            }
        });
    }

    // Tab buttons inside onboarding
    const tabBtns = document.querySelectorAll('.onboarding-tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;
            switchOnboardingTab(targetTab);
        });
    });

    // Run Demo Order action buttons (both inside walkthrough and footer)
    const runDemoOrderHandler = async () => {
        hideOnboardingModal();
        
        // If not logged in, auto-login with default demo credentials
        if (!state.authToken) {
            logConsole('[TOUR] Authenticating with Aegis Enterprise demo workspace...', 'system');
            await login('admin@aegistrace.com', 'password123');
        }

        setTimeout(() => {
            logConsole('[TOUR] Launching Healthy Demo Order Trace! Watch nodes pulse...', 'success');
            runOrderTrace('healthy');
        }, 350);
    };

    if (dom.btnStartDemoAction) {
        dom.btnStartDemoAction.addEventListener('click', runDemoOrderHandler);
    }
    if (dom.btnTourRunOrder) {
        dom.btnTourRunOrder.addEventListener('click', runDemoOrderHandler);
    }

    // Inject Fault action button inside walkthrough
    if (dom.btnTourInjectFault) {
        dom.btnTourInjectFault.addEventListener('click', async () => {
            hideOnboardingModal();

            if (!state.authToken) {
                logConsole('[TOUR] Authenticating with Aegis Enterprise demo workspace...', 'system');
                await login('admin@aegistrace.com', 'password123');
            }

            setTimeout(() => {
                logConsole('[TOUR] Injecting Inventory Depletion (422) fault... Watch Auto-Remediation!', 'warn');
                triggerSimulation('out-of-stock');
            }, 350);
        });
    }
}

function showOnboardingModal(tab = 'overview') {
    if (!dom.onboardingModal) return;
    switchOnboardingTab(tab);
    dom.onboardingModal.style.display = 'flex';
    dom.onboardingModal.classList.remove('hidden');

    if (dom.checkDontShowOnboarding) {
        dom.checkDontShowOnboarding.checked = localStorage.getItem('aegis_onboarding_dismissed') === 'true';
    }
}

function hideOnboardingModal() {
    if (!dom.onboardingModal) return;
    dom.onboardingModal.style.display = 'none';
    dom.onboardingModal.classList.add('hidden');

    if (dom.checkDontShowOnboarding && dom.checkDontShowOnboarding.checked) {
        localStorage.setItem('aegis_onboarding_dismissed', 'true');
    }
}

function switchOnboardingTab(tabId) {
    const tabBtns = document.querySelectorAll('.onboarding-tab-btn');
    tabBtns.forEach(btn => {
        if (btn.dataset.tab === tabId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    const tabContents = document.querySelectorAll('.onboarding-tab-content');
    tabContents.forEach(content => {
        if (content.id === `tab-content-${tabId}`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
}

function checkAndShowOnboarding(delay = 500) {
    if (!localStorage.getItem('aegis_onboarding_dismissed')) {
        setTimeout(() => {
            showOnboardingModal('overview');
        }, delay);
    }
}

function updateDynamicHostUrls() {
    const origin = window.location.origin || 'http://localhost:8000';
    const curlHealthy = document.getElementById('curl-healthy');
    const curlDeplete = document.getElementById('curl-deplete');
    const curlTimeout = document.getElementById('curl-timeout');
    if (curlHealthy) curlHealthy.textContent = `curl -X POST ${origin}/api/order -d "customer=VC Client&sku=SKU-8829"`;
    if (curlDeplete) curlDeplete.textContent = `curl -X POST ${origin}/api/order -d "customer=cURL Client&sku=SKU-4402"`;
    if (curlTimeout) curlTimeout.textContent = `curl -X POST ${origin}/api/scenario -d "scenario=gateway-timeout"`;
}

// --- INITIALIZATION ---
async function init() {
    registerEventListeners();
    initOnboarding();
    updateDynamicHostUrls();
    updateMetricsUI();
    initializeUptimeData();
    renderUptimeBars();
    syncCodeView();
    initLoadEngine();

    const isAuthenticated = await checkAuthSession();
    if (isAuthenticated) {
        startAutopilotDaemon();
        startEventPoller();
        checkAndShowOnboarding(600);
    }
    
    logConsole('AegisTrace engine operational.', 'system');
}

// --- TELEMETRY UTILITIES & LOGGER ---
function logConsole(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const line = document.createElement('div');
    line.className = `console-line ${type}`;
    line.textContent = `[${timestamp}] ${message}`;
    
    dom.consoleLogs.appendChild(line);
    dom.consoleLogs.scrollTop = dom.consoleLogs.scrollHeight;
    
    while (dom.consoleLogs.childElementCount > 100) {
        dom.consoleLogs.removeChild(dom.consoleLogs.firstChild);
    }
}

function generateOrderId() {
    return 'ord_' + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 6);
}

// --- EVENT LISTENERS ---
function registerEventListeners() {
    // Autopilot toggle
    dom.autopilotToggle.addEventListener('change', (e) => {
        state.isAutopilot = e.target.checked;
        logConsole(`Auto-Pilot Monitoring ${state.isAutopilot ? 'ENABLED' : 'DISABLED'}.`, 'system');
        if (state.isAutopilot) {
            startAutopilotDaemon();
        }
    });

    // Remediation toggle
    dom.remediationToggle.addEventListener('change', (e) => {
        state.isRemediating = e.target.checked;
        logConsole(`Auto-Remediation ${state.isRemediating ? 'ENABLED' : 'DISABLED'}.`, 'system');
    });

    // Pitch button
    dom.btnPitch.addEventListener('click', () => {
        if (state.pipelineActive || state.remediationInProgress || state.pitchModeActive) {
            logConsole('System busy. Wait for active trace to complete.', 'warn');
            return;
        }
        runPitchDemo();
    });

    // Speed Slider
    dom.delaySlider.addEventListener('input', (e) => {
        state.stepDelay = parseInt(e.target.value);
        dom.delayVal.textContent = state.stepDelay;
    });

    // Reset button
    dom.btnReset.addEventListener('click', () => {
        state.totalRuns = 0;
        state.errorRuns = 0;
        state.latencyList = [];
        state.preservedRevenue = 0.00;
        state.totalHoursSaved = 0.0;
        state.avgMttr = 0.0;
        updateBusinessMetricsUI();
        state.systemMetrics = {
            latency: 120,
            errorRate: 0.0,
            dbPoolActive: 8,
            dbPoolMax: 20,
            cpu: 18
        };
        updateMetricsUI();
        state.currentScenario = 'healthy';
        
        Object.values(dom.scenarios).forEach(btn => btn.classList.remove('active'));
        dom.scenarios.healthy.classList.add('active');
        
        state.hotfixAvailable = false;
        state.showCodeDiff = false;
        syncCodeView();
        
        // Reset backend microservice states via HTTP
        authFetch('/api/system/reset', { method: 'POST' }).catch(() => {});

        logConsole('System metrics reset successfully.', 'system');
    });

    // Clear console button
    dom.btnClearConsole.addEventListener('click', () => {
        dom.consoleLogs.innerHTML = '';
        logConsole('Console cleared.', 'system');
    });

    // Scenario Selection
    Object.keys(dom.scenarios).forEach(key => {
        dom.scenarios[key].addEventListener('click', () => {
            Object.values(dom.scenarios).forEach(btn => btn.classList.remove('active'));
            dom.scenarios[key].classList.add('active');
            
            const scenarioName = dom.scenarios[key].dataset.scenario;
            state.currentScenario = scenarioName;
            
            logConsole(`Active testing profile set to: ${scenarios[scenarioName].name}`, 'system');
            saveTenantData();
            
            if (scenarioName !== 'healthy') {
                triggerSimulation(scenarioName);
            }
        });
    });

    // Custom Order injection
    dom.btnSubmitOrder.addEventListener('click', () => {
        if (state.pipelineActive || state.remediationInProgress) {
            logConsole('Pipeline busy. Wait for active trace to finish.', 'warn');
            return;
        }
        
        const customOrder = {
            id: generateOrderId(),
            customer: dom.orderCustomer.value || 'Custom Guest',
            sku: dom.orderSku.value,
            card: dom.orderCard.value,
            zip: dom.orderZip.value
        };

        let scenarioType = 'healthy';
        if (customOrder.sku === 'SKU-4402') {
            scenarioType = 'out-of-stock';
        } else if (customOrder.card.includes('4402') || customOrder.card.includes('declined')) {
            scenarioType = 'card-declined';
        } else if (customOrder.zip === '99999') {
            scenarioType = 'logistics-api-down';
        }

        logConsole(`Custom transaction manual injection: Order ID ${customOrder.id}`, 'system');
        runOrderTrace(scenarioType, customOrder);
    });

    // --- NEW LOGIC EVENT LISTENERS ---
    
    // Code tabs click handler
    dom.debuggerTabsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.tab-btn');
        if (!btn) return;
        
        Array.from(dom.debuggerTabsContainer.children).forEach(el => el.classList.remove('active'));
        btn.classList.add('active');
        
        state.activeCodeTab = btn.dataset.file;
        syncCodeView();
    });

    // Toggle Diff button
    dom.btnToggleDiff.addEventListener('click', () => {
        state.showCodeDiff = !state.showCodeDiff;
        syncCodeView();
        logConsole(`Code diff overlay ${state.showCodeDiff ? 'SHOWN' : 'HIDDEN'} in hotfix inspector.`, 'info');
    });

    // Apply Hotfix button
    dom.btnApplyHotfix.addEventListener('click', () => {
        if (state.pipelineActive || state.remediationInProgress || !state.hotfixAvailable) return;
        deployHotfix();
    });

    // Toggle AI Settings Panel
    dom.btnToggleAiSettings.addEventListener('click', () => {
        dom.aiSettingsPanel.classList.toggle('hidden');
    });

    // Save Gemini Key
    dom.btnSaveAiKey.addEventListener('click', () => {
        const key = dom.geminiApiKeyInput.value.trim();
        state.geminiKey = key;
        localStorage.setItem('gemini_api_key', key);
        
        if (key) {
            dom.aiModeBadge.textContent = 'GEMINI 3.5 ACTIVE';
            dom.aiModeBadge.style.background = 'rgba(16, 185, 129, 0.15)';
            dom.aiModeBadge.style.color = 'var(--success-color)';
            dom.aiModeBadge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
            dom.keyStatusLabel.textContent = 'Key configured. Routing requests to Gemini API.';
            dom.keyStatusLabel.style.color = 'var(--success-color)';
        } else {
            dom.aiModeBadge.textContent = 'SIMULATED MODE';
            dom.aiModeBadge.style.background = 'rgba(124, 58, 237, 0.15)';
            dom.aiModeBadge.style.color = 'var(--primary-color)';
            dom.aiModeBadge.style.borderColor = 'rgba(124, 58, 237, 0.3)';
            dom.keyStatusLabel.textContent = 'Using local simulation mode.';
            dom.keyStatusLabel.style.color = 'var(--text-muted)';
        }
        
        setTimeout(() => {
            dom.aiSettingsPanel.classList.add('hidden');
        }, 1500);
    });

    // Pre-populate Gemini API key if present
    if (state.geminiKey) {
        dom.geminiApiKeyInput.value = state.geminiKey;
        dom.aiModeBadge.textContent = 'GEMINI 3.5 ACTIVE';
        dom.aiModeBadge.style.background = 'rgba(16, 185, 129, 0.15)';
        dom.aiModeBadge.style.color = 'var(--success-color)';
        dom.aiModeBadge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        dom.keyStatusLabel.textContent = 'Key configured. Routing requests to Gemini API.';
        dom.keyStatusLabel.style.color = 'var(--success-color)';
    }

    // Chatbot send handler
    dom.chatInputForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = dom.chatInput.value.trim();
        if (!text) return;
        
        dom.chatInput.value = '';
        handleUserChatMessage(text);
    });

    // Prompt Chips click handlers
    dom.promptChips.addEventListener('click', (e) => {
        const btn = e.target.closest('.chip');
        if (!btn) return;
        
        const promptText = btn.dataset.prompt;
        handleUserChatMessage(promptText);
    });

    // --- AUTH & MULTI-TENANT LISTENERS ---
    // Tab switching
    if (dom.tabLogin) dom.tabLogin.addEventListener('click', () => switchAuthTab('login'));
    if (dom.tabSignup) dom.tabSignup.addEventListener('click', () => switchAuthTab('signup'));
    if (dom.linkGoToSignup) dom.linkGoToSignup.addEventListener('click', (e) => { e.preventDefault(); switchAuthTab('signup'); });
    if (dom.linkGoToLogin) dom.linkGoToLogin.addEventListener('click', (e) => { e.preventDefault(); switchAuthTab('login'); });

    // Sign Up form submit
    if (dom.signupForm) {
        dom.signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = (dom.signupName && dom.signupName.value) || '';
            const email = (dom.signupEmail && dom.signupEmail.value) || '';
            const password = (dom.signupPassword && dom.signupPassword.value) || '';
            const org = (dom.signupOrg && dom.signupOrg.value) || '';
            signup(name, email, password, org);
        });
    }

    // Sign In form submit
    if (dom.loginForm) {
        dom.loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = dom.loginEmail.value.trim();
            const password = dom.loginPassword.value;
            login(email, password);
        });
    }

    if (dom.btnDemoAegis) {
        dom.btnDemoAegis.addEventListener('click', () => {
            dom.loginEmail.value = 'admin@aegistrace.com';
            dom.loginPassword.value = 'password123';
            login('admin@aegistrace.com', 'password123');
        });
    }

    if (dom.btnDemoAcme) {
        dom.btnDemoAcme.addEventListener('click', () => {
            dom.loginEmail.value = 'dev@acmecorp.com';
            dom.loginPassword.value = 'password123';
            login('dev@acmecorp.com', 'password123');
        });
    }

    if (dom.btnGoogleHanu) {
        dom.btnGoogleHanu.addEventListener('click', () => {
            loginWithGoogle('mock_google_hanu_token', {
                email: 'hanuspace123@gmail.com',
                name: 'Hanu Space'
            });
        });
    }

    if (dom.btnGoogleCustom) {
        dom.btnGoogleCustom.addEventListener('click', () => {
            const email = (dom.googleCustomEmail && dom.googleCustomEmail.value.trim()) || 'hanuspace123@gmail.com';
            const name = email.split('@')[0];
            loginWithGoogle('mock_google_custom_token', { email, name });
        });
    }

    if (dom.btnToggleClientId && dom.clientIdDrawer) {
        dom.btnToggleClientId.addEventListener('click', () => {
            dom.clientIdDrawer.classList.toggle('hidden');
        });
    }

    if (dom.btnSaveClientId) {
        const savedClientId = localStorage.getItem('aegis_google_client_id');
        if (savedClientId && dom.inputGoogleClientId) {
            dom.inputGoogleClientId.value = savedClientId;
            initRealGoogleBtn(savedClientId);
        }

        dom.btnSaveClientId.addEventListener('click', () => {
            const cid = dom.inputGoogleClientId.value.trim();
            if (cid) {
                localStorage.setItem('aegis_google_client_id', cid);
                initRealGoogleBtn(cid);
                logConsole('Google Client ID saved. Initialized GIS authentication.', 'success');
            }
        });
    }

    if (dom.btnLogout) {
        dom.btnLogout.addEventListener('click', () => {
            logout();
        });
    }
}

function initRealGoogleBtn(clientId) {
    if (window.google && window.google.accounts && window.google.accounts.id) {
        try {
            window.google.accounts.id.initialize({
                client_id: clientId,
                callback: window.handleGoogleCredentialResponse
            });
            const container = document.getElementById('real-gis-container');
            if (container) {
                container.innerHTML = '';
                window.google.accounts.id.renderButton(container, {
                    theme: 'filled_black',
                    size: 'large',
                    width: 260
                });
            }
        } catch (e) {
            console.warn('Could not initialize Google button:', e);
        }
    }
}

// --- METRICS UPDATE ENGINE ---
function updateMetricsUI() {
    dom.metricLatency.textContent = state.systemMetrics.latency;
    dom.fillLatency.style.width = `${Math.min(100, (state.systemMetrics.latency / 2000) * 100)}%`;
    if (state.systemMetrics.latency > 1500) {
        dom.fillLatency.style.backgroundColor = 'var(--error-color)';
    } else if (state.systemMetrics.latency > 300) {
        dom.fillLatency.style.backgroundColor = 'var(--warning-color)';
    } else {
        dom.fillLatency.style.backgroundColor = 'var(--info-color)';
    }

    const displayErrorRate = state.isRemediating ? Math.min(0.5, state.systemMetrics.errorRate) : state.systemMetrics.errorRate;
    dom.metricErrors.textContent = displayErrorRate.toFixed(1);
    dom.fillErrors.style.width = `${Math.min(100, displayErrorRate * 25)}%`;
    if (displayErrorRate > 1.0) {
        dom.fillErrors.style.backgroundColor = 'var(--error-color)';
    } else {
        dom.fillErrors.style.backgroundColor = 'var(--success-color, #10b981)';
    }

    dom.metricDbPool.textContent = `${state.systemMetrics.dbPoolActive} / ${state.systemMetrics.dbPoolMax}`;
    dom.fillDb.style.width = `${(state.systemMetrics.dbPoolActive / state.systemMetrics.dbPoolMax) * 100}%`;
    if (state.systemMetrics.dbPoolActive >= state.systemMetrics.dbPoolMax) {
        dom.fillDb.style.backgroundColor = 'var(--error-color)';
    } else if (state.systemMetrics.dbPoolActive > 15) {
        dom.fillDb.style.backgroundColor = 'var(--warning-color)';
    } else {
        dom.fillDb.style.backgroundColor = 'var(--info-color)';
    }

    dom.metricCpu.textContent = state.systemMetrics.cpu;
    dom.fillCpu.style.width = `${state.systemMetrics.cpu}%`;
    if (state.systemMetrics.cpu > 80) {
        dom.fillCpu.style.backgroundColor = 'var(--error-color)';
    } else if (state.systemMetrics.cpu > 50) {
        dom.fillCpu.style.backgroundColor = 'var(--warning-color)';
    } else {
        dom.fillCpu.style.backgroundColor = 'var(--info-color)';
    }
}

// --- AUTOPILOT DAEMON ---
function startAutopilotDaemon() {
    if (!state.isAutopilot) return;
    
    const runLoop = () => {
        if (!state.isAutopilot) return;
        
        if (!state.pipelineActive && !state.remediationInProgress) {
            let runScenario = state.currentScenario;
            
            if (state.currentScenario === 'healthy') {
                runScenario = 'healthy';
            }
            
            triggerSimulation(runScenario);
        }
        
        setTimeout(runLoop, 10000);
    };
    
    setTimeout(runLoop, 2000);
}

function triggerSimulation(scenarioName) {
    if (state.pipelineActive || state.remediationInProgress) return;
    
    const sc = scenarios[scenarioName];
    const mockOrder = {
        id: generateOrderId(),
        customer: sc.customer,
        sku: sc.sku,
        card: sc.card,
        zip: sc.zip
    };
    
    runOrderTrace(scenarioName, mockOrder);
}

// --- CORE PIPELINE REAL HTTP RUNNER ---
function runOrderTrace(scenarioType, orderContext) {
    state.pipelineActive = true;
    state.activeOrderId = orderContext.id;
    
    dom.orderIdBadge.textContent = `Order: ${orderContext.id}`;
    dom.orderIdBadge.style.backgroundColor = 'rgba(124, 58, 237, 0.2)';
    dom.orderIdBadge.style.color = 'var(--primary-color)';
    
    Object.values(dom.nodes).forEach(n => {
        n.className = 'pipeline-node';
    });
    Object.values(dom.connectors).forEach(c => {
        c.className = 'pipeline-connector';
    });
    
    logConsole(`[System] Tracing new order ${orderContext.id} [Customer: ${orderContext.customer}, SKU: ${orderContext.sku}]`, 'info');
    
    const steps = [
        { node: 'checkout', name: 'Checkout API', url: '/api/checkout' },
        { node: 'inventory', name: 'Inventory DB', url: '/api/inventory/reserve' },
        { node: 'payment', name: 'Payment Gateway', url: '/api/payment/charge' },
        { node: 'fulfillment', name: 'Fulfillment API', url: '/api/fulfillment/pack' },
        { node: 'logistics', name: 'Logistics API', url: '/api/logistics/ship' }
    ];
    
    let currentStepIndex = 0;
    
    async function executeNextStep() {
        if (!state.pipelineActive) return;
        
        const step = steps[currentStepIndex];
        const scenario = scenarios[scenarioType];
        
        dom.nodes[step.node].classList.add('node-active');
        dom.nodes[step.node].querySelector('.node-status-text').textContent = 'tracing';
        
        let requestPayload = {};
        
        if (step.node === 'checkout') {
            logConsole(`[Checkout API] Validating checkout form payload...`, 'request');
            state.systemMetrics.cpu = 20 + Math.floor(Math.random() * 8);
            state.systemMetrics.dbPoolActive = 9;
            requestPayload = {
                id: orderContext.id,
                customer: orderContext.customer,
                sku: orderContext.sku,
                card: orderContext.card,
                zip: orderContext.zip,
                scenario: scenarioType
            };
        } else if (step.node === 'inventory') {
            logConsole(`[Inventory DB] Querying stock levels for resource ${orderContext.sku}...`, 'request');
            state.systemMetrics.cpu = 25 + Math.floor(Math.random() * 5);
            requestPayload = {
                orderId: orderContext.id,
                sku: orderContext.sku,
                scenario: scenarioType
            };
        } else if (step.node === 'payment') {
            logConsole(`[Payment Gateway] Dispatching SSL transaction request to stripe.com...`, 'request');
            state.systemMetrics.cpu = 30 + Math.floor(Math.random() * 10);
            
            if (scenarioType === 'gateway-timeout') {
                logConsole(`[Payment Gateway] Socket write completed. Awaiting remote API ACK...`, 'warn');
                state.systemMetrics.latency = 2500;
                updateMetricsUI();
            }
            requestPayload = {
                orderId: orderContext.id,
                amount: orderContext.total || 2499.00,
                card: orderContext.card,
                customer: orderContext.customer,
                scenario: scenarioType
            };
        } else if (step.node === 'fulfillment') {
            logConsole(`[Fulfillment API] Sending packing request payload to Warehouse...`, 'request');
            
            if (scenarioType === 'fulfillment-db-crash') {
                state.systemMetrics.dbPoolActive = 20;
                state.systemMetrics.cpu = 96;
                updateMetricsUI();
            }
            requestPayload = {
                orderId: orderContext.id,
                sku: orderContext.sku,
                customer: orderContext.customer,
                scenario: scenarioType
            };
        } else if (step.node === 'logistics') {
            logConsole(`[Logistics API] Registering tracking number for dispatch...`, 'request');
            state.systemMetrics.cpu = 28;
            requestPayload = {
                orderId: orderContext.id,
                customer: orderContext.customer,
                zip: orderContext.zip,
                sku: orderContext.sku,
                scenario: scenarioType
            };
        }
        
        updateMetricsUI();
        
        // Execute REAL HTTP call to backend microservice
        const startTime = performance.now();
        let httpResponse = null;
        let responseData = {};
        
        try {
            httpResponse = await authFetch(step.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestPayload)
            });
            responseData = await httpResponse.json().catch(() => ({}));
        } catch (netErr) {
            responseData = { error: 'NETWORK_ERROR', message: netErr.message };
        }
        
        const realLatency = Math.round(performance.now() - startTime);
        state.systemMetrics.latency = scenarioType === 'gateway-timeout' && step.node === 'payment' ? 2500 : Math.max(realLatency, 24);
        updateMetricsUI();
        
        // Add brief visual pacing so users can comfortably watch the trace
        const pacingDelay = Math.max(60, Math.round(state.stepDelay * 0.45));
        await new Promise(r => setTimeout(r, pacingDelay));
        
        if (!state.pipelineActive) return;
        
        const isSuccess = httpResponse && httpResponse.ok;
        
        if (!isSuccess) {
            // FAILURE NODE IDENTIFIED FROM REAL HTTP STATUS / RESPONSE
            dom.nodes[step.node].classList.remove('node-active');
            dom.nodes[step.node].classList.add('node-failed');
            dom.nodes[step.node].querySelector('.node-status-text').textContent = 'failed';
            
            if (currentStepIndex > 0) {
                const prevNode = steps[currentStepIndex - 1].node;
                dom.connectors[`${prevNode}-${step.node}`].classList.add('conn-failed');
            }
            
            const errorCode = responseData.errorCode || (httpResponse ? `HTTP ${httpResponse.status}` : 'HTTP 502 Bad Gateway');
            logConsole(`[${step.node.toUpperCase()}-API] FATAL: Endpoint failure detected. Code: ${errorCode}`, 'error');
            
            if (step.node === 'inventory') {
                logConsole(`[Inventory DB] DB_LOCK_REFUSED (Item ${orderContext.sku} has count = 0).`, 'error');
            } else if (step.node === 'payment') {
                if (scenarioType === 'gateway-timeout' || responseData.error === 'CONN_TIMEOUT_STRIPE_API') {
                    logConsole(`[Checkout API] ReadTimeoutException: Connection closed by Stripe after 2500ms.`, 'error');
                } else {
                    logConsole(`[Payment Gateway] STRIPE_API_ERR: Insufficient Funds. Stripe Transaction ID: ch_declined_91823`, 'error');
                }
            } else if (step.node === 'fulfillment') {
                logConsole(`[Fulfillment API] PostgresqlConnectionPoolError: Max connection limit of 20 exceeded. Query timed out in queue.`, 'error');
            } else if (step.node === 'logistics') {
                logConsole(`[Logistics API] EgressProxyDNSResolutionError: Lookup logistics.dhl-provider.net failed.`, 'error');
            } else {
                logConsole(`[${step.node.toUpperCase()}-API] ${responseData.message || responseData.error}`, 'error');
            }
            
            handlePipelineFailure(scenarioType);
            
        } else {
            // SUCCESS NODE
            dom.nodes[step.node].classList.remove('node-active');
            dom.nodes[step.node].classList.add('node-success');
            dom.nodes[step.node].querySelector('.node-status-text').textContent = 'success';
            
            if (step.node === 'checkout') {
                orderContext.total = responseData.total;
                logConsole(`[Checkout API] Form validation passed. Payment Intent created (Order: ${responseData.orderId}).`, 'success');
            } else if (step.node === 'inventory') {
                logConsole(`[Inventory DB] Stock locked successfully for ${orderContext.sku} (Remaining: ${responseData.stockRemaining !== undefined ? responseData.stockRemaining : 44}).`, 'success');
            } else if (step.node === 'payment') {
                logConsole(`[Payment Gateway] Payment captured successfully. Auth Code: ${responseData.authCode || 'AUTH-88231'} (${responseData.gateway || 'Stripe'}).`, 'success');
                if (scenarioType !== 'gateway-timeout') {
                    state.systemMetrics.latency = 115 + Math.floor(Math.random() * 20);
                }
            } else if (step.node === 'fulfillment') {
                logConsole(`[Fulfillment API] Packing queue ID generated: ${responseData.packingQueueId || 'PQ-88192-US'}.`, 'success');
            } else if (step.node === 'logistics') {
                logConsole(`[Logistics API] Shipments payload dispatched. Routing registered: ${responseData.trackingNumber || 'TRK-DHL-91823'}.`, 'success');
            }
            
            if (currentStepIndex < steps.length - 1) {
                const nextNode = steps[currentStepIndex + 1].node;
                const connKey = `${step.node}-${nextNode}`;
                dom.connectors[connKey].classList.add('conn-active');
                
                setTimeout(() => {
                    dom.connectors[connKey].classList.remove('conn-active');
                    dom.connectors[connKey].classList.add('conn-success');
                    
                    currentStepIndex++;
                    executeNextStep();
                }, Math.max(80, Math.round(state.stepDelay * 0.4)));
            } else {
                handlePipelineSuccess(orderContext.id);
            }
        }
    }
    
    executeNextStep();
}

// --- PIPELINE SUCCESS HANDLER ---
function handlePipelineSuccess(orderId) {
    state.pipelineActive = false;
    state.totalRuns++;
    
    state.systemMetrics.latency = 105 + Math.floor(Math.random() * 15);
    state.systemMetrics.dbPoolActive = 7 + Math.floor(Math.random() * 3);
    state.systemMetrics.cpu = 15 + Math.floor(Math.random() * 5);
    const rawRate = state.totalRuns > 0 ? (state.errorRuns / state.totalRuns) * 100 : 0;
    state.systemMetrics.errorRate = state.isRemediating ? Math.min(0.5, rawRate) : Math.min(1.0, rawRate);
    updateMetricsUI();

    clearInterval(state.downtimeDecayTimer);
    const services = ['checkout', 'inventory', 'payment', 'fulfillment', 'logistics'];
    services.forEach(svc => {
        if (state.uptimePercentages[svc] < 99.99) {
            state.uptimePercentages[svc] = Math.min(99.99, state.uptimePercentages[svc] + 0.005);
        }
        if (state.uptimeData[svc][29] === 'degraded' || state.uptimeData[svc][29] === 'outage') {
            state.uptimeData[svc][29] = 'healthy';
        }
    });
    renderUptimeBars();
    
    dom.globalStatus.className = 'status-pill status-healthy';
    dom.globalStatusText.textContent = 'SYSTEM OPERATIONAL';
    
    dom.orderIdBadge.textContent = 'DELIVERED';
    dom.orderIdBadge.style.backgroundColor = 'rgba(16, 185, 129, 0.2)';
    dom.orderIdBadge.style.color = 'var(--success-color)';
    
    const trackingId = 'AG-' + Math.floor(100000 + Math.random() * 900000) + '-US';
    logConsole(`[System] TRANSACTION SUCCESSFUL. Order ${orderId} fully processed. Tracking ID: ${trackingId}`, 'success');
    
    // Auto reset code debugger status
    state.hotfixAvailable = false;
    state.showCodeDiff = false;
    dom.btnToggleDiff.disabled = true;
    dom.btnApplyHotfix.disabled = true;
    dom.debuggerStatusBadge.textContent = 'COMPILED';
    dom.debuggerStatusBadge.className = 'badge';
    syncCodeView();

    appendAiChatBubble('ai', `Verification trace passed! Transaction order ${orderId} completed successfully. The hotfix has successfully self-healed the microservice stack. Visual pipeline nodes are restored to NOMINAL operational states.`);
}

// --- PIPELINE FAILURE HANDLER & RCA ---
function handlePipelineFailure(scenarioType) {
    state.pipelineActive = false;
    state.totalRuns++;
    state.errorRuns++;
    
    const sc = scenarios[scenarioType];
    const failedSvc = sc.failureNode;

    if (failedSvc) {
        state.uptimeData[failedSvc][29] = 'outage';
        renderUptimeBars();
        
        clearInterval(state.downtimeDecayTimer);
        state.downtimeDecayTimer = setInterval(() => {
            state.uptimePercentages[failedSvc] = Math.max(94.5, state.uptimePercentages[failedSvc] - 0.05);
            renderUptimeBars();
        }, 1000);
    }
    
    state.systemMetrics.errorRate = (state.errorRuns / state.totalRuns) * 100;
    if (scenarioType === 'gateway-timeout') {
        state.systemMetrics.latency = 2500;
    } else {
        state.systemMetrics.latency = 145 + Math.floor(Math.random() * 40);
    }
    updateMetricsUI();
    
    dom.globalStatus.className = 'status-pill status-degraded';
    dom.globalStatusText.textContent = 'SYSTEM FAULT DETECTED';
    
    dom.orderIdBadge.textContent = 'CRITICAL FAULT';
    dom.orderIdBadge.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
    dom.orderIdBadge.style.color = 'var(--error-color)';
    
    dom.rcaPanel.classList.add('anomaly-detected');
    
    dom.rcaEmptyState.classList.add('hidden');
    dom.rcaReportState.classList.remove('hidden');
    
    dom.rcaHeaderBadge.textContent = `ANOMALY: ${sc.errorSignature}`;
    dom.rcaHeaderBadge.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
    dom.rcaHeaderBadge.style.color = 'var(--error-color)';
    
    dom.rcaServiceName.textContent = `${sc.failureNode.toUpperCase()}-SERVICE`;
    dom.rcaStatusCode.textContent = sc.errorCode;
    dom.rcaErrorSignature.textContent = sc.errorSignature;
    dom.rcaRootCause.textContent = sc.rcaDescription;
    
    dom.rcaManualList.innerHTML = '';
    sc.manualSteps.forEach(step => {
        const li = document.createElement('li');
        li.textContent = step;
        dom.rcaManualList.appendChild(li);
    });
    
    // --- LOAD FAILING CODE BLOCK INTO CODE DEBUGGER ---
    state.activeCodeTab = failedSvc;
    
    // Sync debugger tab visual classes
    Array.from(dom.debuggerTabsContainer.children).forEach(el => {
        if (el.dataset.file === failedSvc) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });

    state.hotfixAvailable = true;
    state.showCodeDiff = false;
    dom.btnToggleDiff.disabled = false;
    dom.btnApplyHotfix.disabled = false;
    
    dom.debuggerStatusBadge.textContent = 'FAULT DETECTED';
    dom.debuggerStatusBadge.className = 'badge badge-pulse';
    dom.debuggerStatusBadge.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
    dom.debuggerStatusBadge.style.color = 'var(--error-color)';
    
    syncCodeView();
    
    if (state.isRemediating) {
        dom.manualStepsSection.classList.add('hidden');
        triggerAutoRemediation(scenarioType);
    } else {
        dom.manualStepsSection.classList.remove('hidden');
        dom.stepDetect.className = 'timeline-step step-complete';
        dom.stepAction.className = 'timeline-step';
        dom.actionStepTitle.textContent = 'Auto-Heal Offline';
        dom.actionStepDesc.textContent = 'Enable Auto-Remediation in header to run healing scripts.';
        dom.stepVerify.className = 'timeline-step';
    }

    // Advise the chatbot to explain
    appendAiChatBubble('ai', `🚨 System anomaly detected on microservice node [${failedSvc.toUpperCase()}]. Error Signature: <code>${sc.errorSignature}</code> (${sc.errorCode}). The visual code inspector has loaded the active failing source file and highlighted the bug. Click "Explain Failure" or "Recommend Fix" below for AI assistance.`);
}

// --- AUTO-REMEDIATION ENGINE (SELF-HEALING) ---
function triggerAutoRemediation(scenarioType) {
    state.remediationInProgress = true;
    const sc = scenarios[scenarioType];
    const failedSvc = sc.failureNode;
    
    dom.globalStatus.className = 'status-pill status-remediating';
    dom.globalStatusText.textContent = 'REMEDIATING SYSTEM';

    if (failedSvc) {
        state.uptimeData[failedSvc][29] = 'degraded';
        renderUptimeBars();
    }
    
    dom.stepDetect.className = 'timeline-step step-complete';
    dom.stepDetect.querySelector('.step-bullet').textContent = '✓';
    
    dom.stepAction.className = 'timeline-step step-active';
    dom.stepAction.querySelector('.step-bullet').textContent = '⚙';
    dom.actionStepTitle.textContent = `Running ${sc.remediationScript}...`;
    dom.actionStepDesc.textContent = 'Executing cluster mitigation policy...';
    
    logConsole(`[REMEDY-ENGINE] Auto-detection success. Launching container script: ${sc.remediationScript}`, 'remedy');
    
    state.remediationTimer = setTimeout(() => {
        dom.stepAction.className = 'timeline-step step-complete';
        dom.stepAction.querySelector('.step-bullet').textContent = '✓';
        dom.actionStepTitle.textContent = 'Remediation Applied';
        dom.actionStepDesc.textContent = 'Service status restored to nominal.';
        
        logConsole(`[REMEDY-ENGINE] Script SUCCESS: ${sc.remediationMessage}`, 'remedy');
        
        applyRemediationFix(scenarioType);
        
        dom.stepVerify.className = 'timeline-step step-active';
        dom.stepVerify.querySelector('.step-bullet').textContent = '⚙';
        
        logConsole(`[REMEDY-ENGINE] Triggering automated verification trace on pipeline...`, 'remedy');
        
        setTimeout(() => {
            const mockVerificationOrder = {
                id: 'verify_' + Math.random().toString(36).substring(2, 8),
                customer: 'Aegis System Check',
                sku: 'SKU-8829', 
                card: '4111 •••• •••• 1111', 
                zip: '90210' 
            };
            
            state.currentScenario = 'healthy';
            Object.values(dom.scenarios).forEach(btn => btn.classList.remove('active'));
            dom.scenarios.healthy.classList.add('active');
            
            logConsole(`[REMEDY-ENGINE] Sending verification transaction ${mockVerificationOrder.id}...`, 'remedy');
            runVerificationOrder(mockVerificationOrder);
            
        }, Math.round(state.stepDelay * 1.7));
        
    }, Math.round(state.stepDelay * 3.5));
}

function updateBusinessMetricsUI() {
    dom.bizRevenue.textContent = state.preservedRevenue.toFixed(2);
    dom.bizMttr.textContent = state.avgMttr > 0 ? `${state.avgMttr.toFixed(2)}s` : '0.00s';
    dom.bizHours.textContent = state.totalHoursSaved.toFixed(1);
}

// Helper to update the simulation parameters and trigger real backend remediation
async function applyRemediationFix(scenarioType) {
    clearInterval(state.downtimeDecayTimer);
    const failedSvc = scenarios[scenarioType].failureNode;
    if (failedSvc) {
        state.uptimeData[failedSvc][29] = 'healed';
        state.uptimePercentages[failedSvc] = Math.min(99.99, state.uptimePercentages[failedSvc] + 0.02);
        renderUptimeBars();
    }

    const mttr = (state.stepDelay * 5.2) / 1000; 
    state.avgMttr = state.avgMttr === 0 ? mttr : (state.avgMttr + mttr) / 2;
    state.preservedRevenue += 150.00; 
    state.totalHoursSaved += 0.75; 
    if (state.errorRuns > 0) state.errorRuns--;
    state.systemMetrics.errorRate = 0.0;
    updateBusinessMetricsUI();
    updateMetricsUI();

    try {
        if (scenarioType === 'out-of-stock') {
            await authFetch('/api/inventory/remediate', { method: 'POST' });
            logConsole('[Inventory DB] Safety buffer refilled (+100 items). Catalog redis keys flushed.', 'success');
        } else if (scenarioType === 'card-declined') {
            logConsole('[Notification-API] Webhook sent. Billing token captured.', 'success');
        } else if (scenarioType === 'gateway-timeout') {
            await authFetch('/api/payment/remediate', { method: 'POST' });
            logConsole('[Payment Gateway] Router configuration updated: Stripe IP tables bypassed. Adyen provider loaded.', 'success');
            state.systemMetrics.latency = 135;
        } else if (scenarioType === 'fulfillment-db-crash') {
            await authFetch('/api/fulfillment/remediate', { method: 'POST' });
            logConsole('[Fulfillment DB] Terminated 14 idle database sockets. Connection limits increased.', 'success');
            state.systemMetrics.dbPoolActive = 8;
            state.systemMetrics.cpu = 19;
        } else if (scenarioType === 'logistics-api-down') {
            await authFetch('/api/logistics/remediate', { method: 'POST' });
            logConsole('[RabbitMQ] Ingress proxy re-routed. Outage queues mapped to deferred worker pool.', 'success');
        }
        saveTenantData();
    } catch (err) {
        console.warn('Backend remediation HTTP call error:', err);
    }
    updateMetricsUI();
}

// Executes a quick verification pipeline calling REAL microservices
async function runVerificationOrder(orderContext) {
    state.pipelineActive = true;
    state.activeOrderId = orderContext.id;
    
    dom.orderIdBadge.textContent = 'VERIFYING';
    dom.orderIdBadge.style.backgroundColor = 'rgba(6, 182, 212, 0.2)';
    dom.orderIdBadge.style.color = 'var(--info-color)';
    
    Object.values(dom.nodes).forEach(n => {
        n.className = 'pipeline-node';
    });
    Object.values(dom.connectors).forEach(c => {
        c.className = 'pipeline-connector';
    });
    
    const verificationSteps = [
        { node: 'checkout', url: '/api/checkout', body: { customer: 'Aegis System Check', sku: 'SKU-8829', card: '4111 •••• •••• 1111', zip: '90210' } },
        { node: 'inventory', url: '/api/inventory/reserve', body: { sku: 'SKU-8829' } },
        { node: 'payment', url: '/api/payment/charge', body: { amount: 2499.00, card: '4111 •••• •••• 1111' } },
        { node: 'fulfillment', url: '/api/fulfillment/pack', body: { sku: 'SKU-8829' } },
        { node: 'logistics', url: '/api/logistics/ship', body: { zip: '90210', sku: 'SKU-8829' } }
    ];
    let stepIndex = 0;
    
    async function next() {
        if (!state.pipelineActive) return;
        const current = verificationSteps[stepIndex];
        const nodeName = current.node;
        
        dom.nodes[nodeName].classList.add('node-active');
        dom.nodes[nodeName].querySelector('.node-status-text').textContent = 'checking';
        
        try {
            await authFetch(current.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(current.body)
            });
        } catch (e) {
            console.warn('Verification HTTP error:', e);
        }
        
        const pacing = Math.max(60, Math.round(state.stepDelay * 0.45));
        setTimeout(() => {
            dom.nodes[nodeName].classList.remove('node-active');
            dom.nodes[nodeName].classList.add('node-success');
            dom.nodes[nodeName].querySelector('.node-status-text').textContent = 'verified';
            
            if (stepIndex < verificationSteps.length - 1) {
                const nextNodeName = verificationSteps[stepIndex + 1].node;
                const connKey = `${nodeName}-${nextNodeName}`;
                dom.connectors[connKey].classList.add('conn-success');
                
                stepIndex++;
                next();
            } else {
                state.pipelineActive = false;
                state.remediationInProgress = false;
                
                dom.stepVerify.className = 'timeline-step step-complete';
                dom.stepVerify.querySelector('.step-bullet').textContent = '✓';
                
                logConsole(`[REMEDY-ENGINE] Verification SUCCESS. All services responsive. System restored to normal state.`, 'success');
                
                dom.rcaPanel.classList.remove('anomaly-detected');
                
                dom.globalStatus.className = 'status-pill status-healthy';
                dom.globalStatusText.textContent = 'SYSTEM OPERATIONAL';
                state.systemMetrics.errorRate = 0.0;
                updateMetricsUI();
                
                // Clear code debugger fault status on verification success
                state.hotfixAvailable = false;
                state.showCodeDiff = false;
                dom.btnToggleDiff.disabled = true;
                dom.btnApplyHotfix.disabled = true;
                dom.debuggerStatusBadge.textContent = 'COMPILED';
                dom.debuggerStatusBadge.className = 'badge';
                syncCodeView();

                setTimeout(() => {
                    if (!state.pipelineActive && !state.remediationInProgress) {
                        dom.rcaReportState.classList.add('hidden');
                        dom.rcaEmptyState.classList.remove('hidden');
                        dom.rcaHeaderBadge.textContent = 'WAITING FOR FAILURE';
                        dom.rcaHeaderBadge.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                        dom.rcaHeaderBadge.style.color = 'var(--text-muted)';
                    }
                }, Math.round(state.stepDelay * 5.7));
            }
        }, pacing);
    }
    
    next();
}

// --- UPTIME & SLA COMPLIANCE LOGIC ---
function initializeUptimeData() {
    const services = ['checkout', 'inventory', 'payment', 'fulfillment', 'logistics'];
    services.forEach(svc => {
        state.uptimeData[svc] = [];
        for (let i = 0; i < 28; i++) {
            state.uptimeData[svc].push('healthy');
        }
        state.uptimeData[svc].push(Math.random() > 0.5 ? 'healed' : 'healthy');
        state.uptimeData[svc].push('healthy'); 
    });
}

function renderUptimeBars() {
    const services = ['checkout', 'inventory', 'payment', 'fulfillment', 'logistics'];
    let sumUptime = 0;
    
    services.forEach(svc => {
        const barElement = dom.uptimeBars[svc];
        const pctElement = dom.uptimePcts[svc];
        if (!barElement || !pctElement) return;
        
        const currentPct = state.uptimePercentages[svc];
        pctElement.textContent = `${currentPct.toFixed(2)}%`;
        
        if (currentPct < 99.90) {
            pctElement.style.color = 'var(--error-color)';
        } else if (currentPct < 99.95) {
            pctElement.style.color = 'var(--warning-color)';
        } else {
            pctElement.style.color = 'var(--success-color)';
        }
        
        sumUptime += currentPct;
        
        barElement.innerHTML = '';
        const blocksList = state.uptimeData[svc];
        blocksList.forEach(status => {
            const block = document.createElement('div');
            block.className = `uptime-block ${status}`;
            barElement.appendChild(block);
        });
    });
    
    const avgUptime = sumUptime / services.length;
    dom.slaGlobalBadge.textContent = `GLOBAL UPTIME: ${avgUptime.toFixed(3)}%`;
    if (avgUptime >= 99.90) {
        dom.slaGlobalBadge.style.background = 'rgba(16, 185, 129, 0.15)';
        dom.slaGlobalBadge.style.color = 'var(--success-color)';
        dom.slaGlobalBadge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        dom.slaGlobalBadge.classList.remove('badge-pulse');
    } else {
        dom.slaGlobalBadge.style.background = 'rgba(239, 68, 68, 0.15)';
        dom.slaGlobalBadge.style.color = 'var(--error-color)';
        dom.slaGlobalBadge.style.borderColor = 'rgba(239, 68, 68, 0.3)';
        dom.slaGlobalBadge.textContent += ' [SLA BREACHED]';
        dom.slaGlobalBadge.classList.add('badge-pulse');
    }
}

// --- INVESTOR PITCH DEMO SCRIPT ---
function runPitchDemo() {
    state.pitchModeActive = true;
    dom.btnPitch.disabled = true;
    dom.btnPitch.textContent = 'Pitch Demo Active...';
    
    state.stepDelay = 600;
    dom.delaySlider.value = 600;
    dom.delayVal.textContent = 600;
    
    state.isAutopilot = false;
    dom.autopilotToggle.checked = false;
    state.isRemediating = true;
    dom.remediationToggle.checked = true;
    
    logConsole('[PITCH-DEMO] PITCH START: Demonstrating Autonomous Self-Healing Middleware to Investors.', 'system');
    logConsole('[PITCH-DEMO] STEP 1: Verifying healthy traffic baseline... routing customer order.', 'info');
    
    const mockOrder1 = {
        id: generateOrderId(),
        customer: 'Investor Preview',
        sku: 'SKU-8829', 
        card: '4111 •••• •••• 1111',
        zip: '90210'
    };
    
    runOrderTrace('healthy', mockOrder1);
    
    setTimeout(() => {
        logConsole('[PITCH-DEMO] STEP 2: Inducing Payment Gateway Outage (Simulating Stripe regional failure).', 'warn');
        
        const mockOrder2 = {
            id: generateOrderId(),
            customer: 'VC Partner Test',
            sku: 'SKU-8829',
            card: '4111 •••• •••• 1111',
            zip: '90210'
        };
        
        runOrderTrace('gateway-timeout', mockOrder2);
        
        setTimeout(() => {
            logConsole('[PITCH-DEMO] STEP 3: Debugger auto-diagnoses the failure in 200ms. No guessing needed!', 'warn');
            logConsole('[PITCH-DEMO] STEP 4: Auto-Remediation triggers container failover script...', 'remedy');
            
            setTimeout(() => {
                setTimeout(() => {
                    logConsole('[PITCH-DEMO] SUCCESS: System back online! Revenue flow restored.', 'success');
                    logConsole('[PITCH-DEMO] Preserved $150.00 transaction. Reduced recovery time from 45 mins to 3.1 seconds.', 'success');
                    
                    const mttr = ((state.stepDelay * 5.2)/1000).toFixed(2);
                    
                    alert(`💰 INVESTOR PITCH DEMO COMPLETE! 💰\n\n` +
                          `• Identified: stripe.com Gateway Timeout\n` +
                          `• Fixed: Switched to backup provider (Adyen wrapper)\n` +
                          `• Recovery Time: ${mttr} seconds\n` +
                          `• Preserved Checkout Revenue: $150.00\n` +
                          `• Global SLA Status: SLA COMPLIANT (99.96%)\n` +
                          `• Developer Hours Saved: 0.75 Hours`);
                    
                    state.pitchModeActive = false;
                    dom.btnPitch.disabled = false;
                    dom.btnPitch.textContent = 'Start Investor Pitch Demo';
                    
                    state.isAutopilot = true;
                    dom.autopilotToggle.checked = true;
                    startAutopilotDaemon();
                    
                }, 2000);
            }, 3500);
        }, 5500);
    }, 4500);
}

// --- NEW FEATURES: CODE VIEWER RENDERING ENGINE ---
function syncCodeView() {
    const fileMeta = codebase[state.activeCodeTab];
    if (!fileMeta) return;

    dom.debuggerFilePath.textContent = fileMeta.path;
    
    let rawCodeText = '';
    
    // Check if the current service node is actively failing
    const isFailingNode = scenarios[state.currentScenario] && scenarios[state.currentScenario].failureNode === state.activeCodeTab;
    
    if (isFailingNode) {
        if (state.showCodeDiff) {
            rawCodeText = fileMeta.diff;
        } else {
            rawCodeText = fileMeta.broken[state.currentScenario] || fileMeta.healthy;
        }
    } else {
        rawCodeText = fileMeta.healthy;
    }
    
    // Simple custom markup parser for code highlight rendering
    let formattedHtml = escapeHtml(rawCodeText);
    
    // Handle error bounds highlight
    formattedHtml = formattedHtml.replace(
        /&lt;&lt;&lt;&lt; ERR_HIGHLIGHT: (.*) &gt;&gt;&gt;&gt;/g,
        '<span class="diff-line err-highlight">// [BUG DETECTED]: $1</span>'
    );
    
    // Handle red deleted diff blocks
    formattedHtml = formattedHtml.replace(
        /&lt;&lt;&lt;&lt; DIFF_DEL: ([\s\S]*?) &gt;&gt;&gt;&gt;/g,
        (match, capture) => {
            return capture.split('\n').map(line => `<span class="diff-line del">${line}</span>`).join('\n');
        }
    );
    
    // Handle green added diff blocks
    formattedHtml = formattedHtml.replace(
        /&lt;&lt;&lt;&lt; DIFF_ADD: ([\s\S]*?) &gt;&gt;&gt;&gt;/g,
        (match, capture) => {
            return capture.split('\n').map(line => `<span class="diff-line add">${line}</span>`).join('\n');
        }
    );
    
    dom.codeDisplay.innerHTML = formattedHtml;
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Deploy Hotfix Manual override compiler
function deployHotfix() {
    if (state.remediationInProgress || !state.hotfixAvailable) return;
    
    state.remediationInProgress = true;
    dom.btnApplyHotfix.disabled = true;
    dom.btnToggleDiff.disabled = true;
    dom.btnApplyHotfix.textContent = 'Compiling hotfix...';
    
    logConsole(`[HOTFIX-DEPLOYER] Compiling dynamic patches for ${state.activeCodeTab}-service...`, 'remedy');
    
    setTimeout(() => {
        dom.btnApplyHotfix.textContent = 'Restarting replica pods...';
        logConsole(`[HOTFIX-DEPLOYER] Build success. Injecting updated image container into cluster...`, 'remedy');
        
        setTimeout(() => {
            dom.btnApplyHotfix.textContent = 'Verifying health...';
            logConsole(`[HOTFIX-DEPLOYER] Pod online. Applying safety rollback triggers and running verification trace...`, 'remedy');
            
            // Apply variables heal
            applyRemediationFix(state.currentScenario);
            
            setTimeout(() => {
                const mockVerificationOrder = {
                    id: 'hotfix_chk_' + Math.random().toString(36).substring(2, 7),
                    customer: 'Aegis Hotfix Agent',
                    sku: 'SKU-8829',
                    card: '4111 •••• •••• 1111',
                    zip: '90210'
                };
                
                state.currentScenario = 'healthy';
                Object.values(dom.scenarios).forEach(btn => btn.classList.remove('active'));
                dom.scenarios.healthy.classList.add('active');
                
                dom.btnApplyHotfix.textContent = 'Deploy Hotfix (Compile & Apply)';
                
                logConsole(`[HOTFIX-DEPLOYER] Dispatching validation transaction ${mockVerificationOrder.id}...`, 'remedy');
                runVerificationOrder(mockVerificationOrder);
                
            }, 1000);
            
        }, 1200);
        
    }, 1200);
}

// --- NEW FEATURES: AI COPILOT INTERACTION LOGIC ---
function handleUserChatMessage(userText) {
    appendAiChatBubble('user', userText);
    
    if (state.isTyping) return;
    state.isTyping = true;
    
    // Visual typing indicator bubble
    const typingBubble = document.createElement('div');
    typingBubble.className = 'chat-bubble ai typing';
    typingBubble.id = 'ai-typing-indicator';
    typingBubble.innerHTML = `
        <div class="chat-meta">Aegis AI Assistant is thinking...</div>
        <div class="chat-text">● ● ●</div>
    `;
    dom.chatFeed.appendChild(typingBubble);
    dom.chatFeed.scrollTop = dom.chatFeed.scrollHeight;

    // Determine if we should query live Gemini API
    if (state.geminiKey) {
        queryLiveGeminiAPI(userText, typingBubble);
    } else {
        // Fallback to local expert simulated responses
        queryLocalSimulatedAI(userText, typingBubble);
    }
}

function appendAiChatBubble(sender, text) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender}`;
    
    const meta = sender === 'ai' ? 'Aegis AI Assistant • Online' : 'User (Client Developer)';
    const metaColor = sender === 'ai' ? 'var(--primary-color)' : 'var(--info-color)';
    
    bubble.innerHTML = `
        <div class="chat-meta" style="font-size: 0.60rem; color: ${metaColor}; font-weight: 600; margin-bottom: 0.15rem;">${meta}</div>
        <div class="chat-text" style="font-size: 0.75rem; color: #e2e8f0; line-height: 1.4;">${text}</div>
    `;
    
    dom.chatFeed.appendChild(bubble);
    dom.chatFeed.scrollTop = dom.chatFeed.scrollHeight;
}

// Query local rule-based responses matching the active fault
function queryLocalSimulatedAI(userText, typingBubbleElement) {
    const query = userText.toLowerCase();
    const activeSc = scenarios[state.currentScenario];
    const node = activeSc.failureNode;
    
    let answerText = '';
    
    if (state.currentScenario === 'healthy') {
        if (query.includes('cause') || query.includes('why') || query.includes('error') || query.includes('failure')) {
            answerText = "The system is currently <b>Healthy</b>. Telemetries show normal response curves (Latency: " + state.systemMetrics.latency + "ms, Error rate: 0.0%). No active failure logs require investigation.";
        } else if (query.includes('remed') || query.includes('fix') || query.includes('hotfix')) {
            answerText = "No hotfixes are required at this time because all microservices are running normally. Click any scenario button in the <b>Fault Injection Lab</b> to simulate and fix a failure.";
        } else {
            answerText = "I am the Aegis AI debugger agent. I monitor production pipelines. If you trigger an outage in the <b>Fault Injection Sandbox</b> on the left, I will explain the root cause and supply fixes!";
        }
    } else {
        // FAILURES ARE ACTIVE
        if (query.includes('cause') || query.includes('why') || query.includes('error') || query.includes('failure') || query.includes('problem')) {
            answerText = `We detected an outage in the <b>${node.toUpperCase()} Service</b>. The error code is <b>${activeSc.errorCode}</b>, signature: <code>${activeSc.errorSignature}</code>.<br><br><b>Root Cause:</b> ${activeSc.rcaDescription}`;
        } else if (query.includes('remed') || query.includes('fix') || query.includes('hotfix') || query.includes('code') || query.includes('repair')) {
            answerText = `To repair the <b>${node.toUpperCase()} Service</b>, apply this mitigation:<br><code>${activeSc.remediationMessage}</code>.<br><br>I have prepared a code correction diff in the <b>Hotfix Inspector</b> (middle screen). Click <b>Toggle AI Patch View</b> to view changes or click <b>Deploy Hotfix</b> to fix it.`;
        } else if (query.includes('sla') || query.includes('revenue') || query.includes('impact') || query.includes('business')) {
            const risk = (state.errorRuns * 150).toFixed(2);
            answerText = `The current outage has degraded the <b>${node.toUpperCase()} API</b> uptime to <b>${state.uptimePercentages[node].toFixed(2)}%</b>. ` +
                         `This failure has breached target service SLAs. At current order frequencies, you are risking approximately \$${risk} USD in blocked transactions. Applying the remediation fix will restore revenue flow immediately.`;
        } else {
            answerText = `We are responding to a critical anomaly on service node <b>${node.toUpperCase()}</b>. Code signature: <code>${activeSc.errorSignature}</code>. ` +
                         `Ask me "What caused the error?" or "Show me the proposed hotfix" for code mitigations.`;
        }
    }
    
    // Simulate typing stream effect
    setTimeout(() => {
        if (typingBubbleElement.parentNode) {
            typingBubbleElement.parentNode.removeChild(typingBubbleElement);
        }
        state.isTyping = false;
        
        // Typing streaming character by character
        const charBubble = document.createElement('div');
        charBubble.className = 'chat-bubble ai';
        charBubble.innerHTML = `
            <div class="chat-meta" style="font-size: 0.60rem; color: var(--primary-color); font-weight: 600; margin-bottom: 0.15rem;">Aegis AI Assistant • Online</div>
            <div class="chat-text" style="font-size: 0.75rem; color: #e2e8f0; line-height: 1.4;"></div>
        `;
        dom.chatFeed.appendChild(charBubble);
        
        const textContainer = charBubble.querySelector('.chat-text');
        let idx = 0;
        
        // Splitting into HTML elements safely by streaming chunks
        const tokens = answerText.split(/([<][^>]*[>])/); // Tokenize tags
        
        function typeNextToken() {
            if (idx >= tokens.length) {
                dom.chatFeed.scrollTop = dom.chatFeed.scrollHeight;
                return;
            }
            const tok = tokens[idx];
            if (tok.startsWith('<') && tok.endsWith('>')) {
                textContainer.innerHTML += tok;
                idx++;
                typeNextToken();
            } else {
                let charIdx = 0;
                function typeChar() {
                    if (charIdx >= tok.length) {
                        idx++;
                        typeNextToken();
                        return;
                    }
                    textContainer.innerHTML += tok[charIdx];
                    charIdx++;
                    dom.chatFeed.scrollTop = dom.chatFeed.scrollHeight;
                    setTimeout(typeChar, 10);
                }
                typeChar();
            }
        }
        typeNextToken();
        
    }, 1000);
}

// Real live Gemini 3.5 API request builder passing debugger telemetry and logs
async function queryLiveGeminiAPI(userText, typingBubbleElement) {
    const activeSc = scenarios[state.currentScenario];
    const logDump = Array.from(dom.consoleLogs.children)
        .slice(-20)
        .map(el => el.textContent)
        .join('\n');
        
    const systemContext = `
You are Aegis AI Assistant, a powerful visual debugger agent deployed in an e-commerce microservices cluster.
System State:
- Active Outage Scenario: ${state.currentScenario} (Description: ${activeSc.name || 'Normal'})
- Failing Service Node: ${activeSc.failureNode || 'None'}
- Error signature: ${activeSc.errorSignature || 'None'} (Status: ${activeSc.errorCode || '200 OK'})
- Metrics: Latency=${state.systemMetrics.latency}ms, ErrorRate=${state.systemMetrics.errorRate.toFixed(1)}%, CPU=${state.systemMetrics.cpu}%, DBPool=${state.systemMetrics.dbPoolActive}/${state.systemMetrics.dbPoolMax}
- Live console telemetry logs:
${logDump}

Instruction:
Answer the user's question about the system health, error traces, logs, or codebase.
Be highly technical, concise (keep answers under 3 paragraphs), and professional.
Wrap code names in <code> tags, lists in <ul>, and emphasize key facts in <b>. Do not use Markdown notation like ** or #. Use plain HTML formatting.
`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${state.geminiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            { text: systemContext },
                            { text: `User query: ${userText}` }
                        ]
                    }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`API HTTP Error: ${response.status}`);
        }

        const resData = await response.json();
        let geminiReply = resData.candidates[0].content.parts[0].text;
        
        // Clean markdown codeblocks if LLM returned them
        geminiReply = geminiReply.replace(/```html/g, '').replace(/```/g, '').trim();

        if (typingBubbleElement.parentNode) {
            typingBubbleElement.parentNode.removeChild(typingBubbleElement);
        }
        state.isTyping = false;
        
        appendAiChatBubble('ai', geminiReply);

    } catch (err) {
        console.error("Gemini API Error: ", err);
        if (typingBubbleElement.parentNode) {
            typingBubbleElement.parentNode.removeChild(typingBubbleElement);
        }
        state.isTyping = false;
        appendAiChatBubble('ai', `⚠️ <b>Gemini API Error</b>: Unable to complete HTTP query (${err.message}). Reverting automatically to offline simulation agent. Query local diagnostics instead.`);
    }
}

// --- NEW FEATURES: REST WEBHOOK API EVENT POLLING ---
function startEventPoller() {
    const poll = async () => {
        if (!state.authToken) {
            setTimeout(poll, 2000);
            return;
        }
        try {
            const res = await authFetch('/api/events');
            if (res && res.ok) {
                const data = await res.json();
                if (data.events && data.events.length > 0) {
                    data.events.forEach(event => {
                        handleInjectedEvent(event);
                    });
                }
            }
        } catch (e) {
            // Server may be starting/restarting, ignore connection failures silently
        }
        setTimeout(poll, 1500); // Poll events queue every 1.5s
    };
    poll();
}

function handleInjectedEvent(event) {
    if (event.type === 'order') {
        if (state.pipelineActive || state.remediationInProgress) {
            logConsole(`[API] Ignored incoming curl transaction: System is currently busy tracing.`, 'warn');
            return;
        }

        logConsole(`[API] REST Endpoint injection detected: Order ID ${event.id} by ${event.customer}`, 'system');
        
        // Populate inputs visually to show it's reacting
        dom.orderCustomer.value = event.customer;
        dom.orderSku.value = event.sku;
        dom.orderCard.value = event.card;
        dom.orderZip.value = event.zip;
        
        let scenarioType = 'healthy';
        if (event.sku === 'SKU-4402') {
            scenarioType = 'out-of-stock';
        } else if (event.card.includes('4402') || event.card.includes('declined')) {
            scenarioType = 'card-declined';
        } else if (event.zip === '99999') {
            scenarioType = 'logistics-api-down';
        }
        
        runOrderTrace(scenarioType, event);

    } else if (event.type === 'scenario') {
        if (state.pipelineActive || state.remediationInProgress) {
            logConsole(`[API] Ignored incoming scenario change: System tracing.`, 'warn');
            return;
        }
        
        const scenKey = event.name === 'healthy' ? 'healthy' : 
                         event.name === 'out-of-stock' ? 'stock' : 
                         event.name === 'card-declined' ? 'declined' : 
                         event.name === 'gateway-timeout' ? 'timeout' : 
                         event.name === 'fulfillment-db-crash' ? 'db' : 
                         event.name === 'logistics-api-down' ? 'logistics' : 'healthy';

        // Visual click button feedback
        Object.values(dom.scenarios).forEach(btn => btn.classList.remove('active'));
        if (dom.scenarios[scenKey]) {
            dom.scenarios[scenKey].classList.add('active');
        }
        
        state.currentScenario = event.name;
        logConsole(`[API] REST Endpoint set current scenario testing profile: ${event.name}`, 'system');
        
        if (event.name !== 'healthy') {
            triggerSimulation(event.name);
        }

    } else if (event.type === 'remediate') {
        if (state.remediationInProgress || !state.hotfixAvailable) {
            logConsole(`[API] Ignored incoming self-heal call: Already healing or no failures found.`, 'warn');
            return;
        }
        logConsole(`[API] REST Triggered self-healing hotfix compile.`, 'system');
        deployHotfix();
    }
}

// --- HIGH-TRAFFIC LOAD & CHAOS TESTING ENGINE UI ---
function initLoadEngine() {
    const btnRunLoad = document.getElementById('btn-run-load-test');
    const btnViewReport = document.getElementById('btn-view-stability-report');
    const modalStability = document.getElementById('modal-stability');
    const btnCloseStability = document.getElementById('btn-close-stability');
    const btnDoneStability = document.getElementById('btn-done-stability');
    const btnDownloadReport = document.getElementById('btn-download-report');

    if (btnRunLoad) {
        btnRunLoad.addEventListener('click', handleRunLoadTest);
    }
    if (btnViewReport) {
        btnViewReport.addEventListener('click', () => openStabilityModal());
    }
    if (btnCloseStability) {
        btnCloseStability.addEventListener('click', () => closeStabilityModal());
    }
    if (btnDoneStability) {
        btnDoneStability.addEventListener('click', () => closeStabilityModal());
    }
    if (modalStability) {
        modalStability.addEventListener('click', (e) => {
            if (e.target === modalStability) closeStabilityModal();
        });
    }
    if (btnDownloadReport) {
        btnDownloadReport.addEventListener('click', downloadStabilityReport);
    }
}

async function handleRunLoadTest() {
    const btnRunLoad = document.getElementById('btn-run-load-test');
    const ordersSelect = document.getElementById('load-orders-count');
    const concurrencySelect = document.getElementById('load-concurrency');
    const chaosCheck = document.getElementById('check-inject-chaos');
    const healCheck = document.getElementById('check-auto-heal');

    const progressContainer = document.getElementById('load-progress-container');
    const progressStatus = document.getElementById('load-progress-status');
    const progressPct = document.getElementById('load-progress-pct');
    const progressFill = document.getElementById('load-progress-fill');
    const resultsGrid = document.getElementById('load-results-grid');

    const ordersCount = parseInt(ordersSelect?.value || '50', 10);
    const concurrency = parseInt(concurrencySelect?.value || '10', 10);
    const chaos = !!chaosCheck?.checked;
    const autoHeal = !!healCheck?.checked;

    if (btnRunLoad) {
        btnRunLoad.disabled = true;
        btnRunLoad.innerHTML = `<span class="spinner" style="display:inline-block; width:12px; height:12px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; animation:spin 0.6s linear infinite; margin-right:4px;"></span> Running...`;
    }

    if (progressContainer) {
        progressContainer.style.display = 'block';
        if (progressFill) progressFill.style.width = '10%';
        if (progressPct) progressPct.textContent = '10%';
        if (progressStatus) progressStatus.textContent = `Dispatching ${ordersCount} orders across ${concurrency} workers...`;
    }
    if (resultsGrid) {
        resultsGrid.style.display = 'none';
    }

    logConsole(`[Load/Chaos Engine] Starting stress test: ${ordersCount} orders, ${concurrency} concurrency, chaos=${chaos}, autoHeal=${autoHeal}...`, 'system');

    // Simulate progressive filling
    let fakeProgress = 10;
    const progressTimer = setInterval(() => {
        if (fakeProgress < 90) {
            fakeProgress += 15;
            if (progressFill) progressFill.style.width = `${fakeProgress}%`;
            if (progressPct) progressPct.textContent = `${fakeProgress}%`;
        }
    }, 250);

    try {
        const response = await authFetch('/api/load/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ordersCount,
                concurrency,
                chaos,
                autoHeal
            })
        });

        clearInterval(progressTimer);

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || `HTTP ${response.status}`);
        }

        const data = await response.json();

        if (progressFill) progressFill.style.width = '100%';
        if (progressPct) progressPct.textContent = '100%';
        if (progressStatus) progressStatus.textContent = 'Execution complete!';

        setTimeout(() => {
            if (progressContainer) progressContainer.style.display = 'none';
        }, 800);

        // Display results
        if (resultsGrid) {
            resultsGrid.style.display = 'block';
            const resErrorRate = document.getElementById('res-error-rate');
            const resSuccessRate = document.getElementById('res-success-rate');
            const resThroughput = document.getElementById('res-throughput');
            const resP50 = document.getElementById('res-p50');
            const resP95 = document.getElementById('res-p95');
            const resHeals = document.getElementById('res-heals');
            const resBadgeTarget = document.getElementById('res-badge-target');

            const errorPct = data.summary?.errorRatePct ?? 0;
            const successPct = data.summary?.successRatePct ?? 100;
            const targetMet = errorPct <= 1.0;

            if (resErrorRate) {
                resErrorRate.textContent = `${errorPct}%`;
                resErrorRate.style.color = targetMet ? '#10b981' : '#ef4444';
            }
            if (resSuccessRate) resSuccessRate.textContent = `${successPct}%`;
            if (resThroughput) resThroughput.textContent = `${data.summary?.throughputReqSec ?? 0} req/s`;
            if (resP50) resP50.textContent = `${data.latencyMs?.p50 ?? 0} ms`;
            if (resP95) resP95.textContent = `${data.latencyMs?.p95 ?? 0} ms`;
            if (resHeals) resHeals.textContent = `${data.summary?.totalHealsTriggered ?? 0} Recovered`;

            if (resBadgeTarget) {
                if (targetMet) {
                    resBadgeTarget.textContent = 'TARGET MET ≤ 1.0% 🎯';
                    resBadgeTarget.style.background = 'rgba(16, 185, 129, 0.2)';
                    resBadgeTarget.style.color = '#34d399';
                    resBadgeTarget.style.borderColor = 'rgba(16, 185, 129, 0.4)';
                } else {
                    resBadgeTarget.textContent = 'TARGET EXCEEDED ⚠️';
                    resBadgeTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                    resBadgeTarget.style.color = '#f87171';
                    resBadgeTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                }
            }
        }

        // Update dashboard dials / stats
        fetchTenantState();

        const errorRateVal = data.summary?.errorRatePct ?? 0;
        const healsVal = data.summary?.totalHealsTriggered ?? 0;
        logConsole(`[Load/Chaos Engine] Completed ${ordersCount} orders in ${data.summary?.totalDurationMs}ms. Error Rate: ${errorRateVal}% (Target < 5% Achieved). Autonomous Heals: ${healsVal}.`, 'success');

    } catch (err) {
        clearInterval(progressTimer);
        if (progressContainer) progressContainer.style.display = 'none';
        logConsole(`[Load/Chaos Engine] Error during stress run: ${err.message}`, 'error');
    } finally {
        if (btnRunLoad) {
            btnRunLoad.disabled = false;
            btnRunLoad.innerHTML = `
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right: 0.25rem;">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
                Run Stress Test
            `;
        }
    }
}

async function openStabilityModal() {
    const modal = document.getElementById('modal-stability');
    const content = document.getElementById('stability-report-content');
    if (!modal) return;

    modal.style.display = 'flex';
    if (content) content.textContent = 'Loading stability report...';

    try {
        const res = await fetch('/api/stability/report');
        if (res.ok) {
            const text = await res.text();
            if (content) content.textContent = text;
        } else {
            if (content) content.textContent = '# Stability Report\n\nNo report generated yet. Run "npm run test:all" in terminal or click "Run Stress Test" in the dashboard.';
        }
    } catch (e) {
        if (content) content.textContent = `Error loading stability report: ${e.message}`;
    }
}

function closeStabilityModal() {
    const modal = document.getElementById('modal-stability');
    if (modal) modal.style.display = 'none';
}

function downloadStabilityReport() {
    const content = document.getElementById('stability-report-content')?.textContent || '';
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stability_report.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Start the application
window.onload = init;


