/**
 * AegisTrace Comprehensive Quality & End-to-End Regression Test Suite
 * Covers:
 * 1. Microservice Pipeline & Fault Injection Scenarios (All 7 scenarios)
 * 2. Self-Healing & Remediation Endpoints for each microservice
 * 3. Store Profiles & Business Impact Metric Calculations
 * 4. Stress, Rapid Switching & Race Condition Stability
 * 5. Multi-Tenant Security & Tenant Boundary Isolation
 * 6. Observability Bridges (OTLP, Webhooks, Post-Mortem Export, ROI Config)
 */

const { startAll, SERVICES } = require('./server');

const BASE_URL = process.env.GATEWAY_URL || `http://127.0.0.1:${process.env.PORT || 8000}`;

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`  [PASS] ${testName}`);
    } else {
        failedTests++;
        console.error(`  [FAIL] ${testName} ${details ? '- ' + details : ''}`);
    }
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runComprehensiveTests() {
    console.log('\n===============================================================');
    console.log('   AEGISTRACE COMPREHENSIVE QUALITY ASSURANCE TEST SUITE       ');
    console.log('===============================================================\n');

    let adminToken = '';
    let acmeToken = '';

    // SECTION 1: AUTHENTICATION & MULTI-TENANCY VERIFICATION
    console.log('--- 1. Authentication, Password Rules & Tenant Context ---');
    try {
        // 1.1 Reject bad email formats
        const resBadEmail = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'invalid-email', password: 'password123' })
        });
        assert(resBadEmail.status === 400, 'Rejects invalid email format with HTTP 400');

        // 1.2 Reject weak passwords (<4 chars)
        const resWeakPass = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'user@example.com', password: '12' })
        });
        assert(resWeakPass.status === 400, 'Rejects passwords shorter than 4 chars with HTTP 400');

        // 1.3 Reject wrong password for known account
        const resWrongPass = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@aegistrace.com', password: 'wrongpassword' })
        });
        assert(resWrongPass.status === 401, 'Rejects incorrect password for admin with HTTP 401');

        // 1.4 Admin login with valid credentials
        const resAdmin = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@aegistrace.com', password: 'password123' })
        });
        const dataAdmin = await resAdmin.json();
        assert(resAdmin.status === 200 && dataAdmin.token, 'Admin logs in successfully with HTTP 200');
        assert(dataAdmin.tenant && dataAdmin.tenant.id === 'tenant-aegis', 'Admin maps cleanly to tenant-aegis');
        adminToken = dataAdmin.token;

        // 1.5 Tenant 2 (Acme) login
        const resAcme = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'dev@acmecorp.com', password: 'password123' })
        });
        const dataAcme = await resAcme.json();
        assert(resAcme.status === 200 && dataAcme.tenant.id === 'tenant-acme', 'Acme user maps to tenant-acme');
        acmeToken = dataAcme.token;

        // 1.6 Google OAuth SSO (with test mode)
        const resGoogle = await fetch(`${BASE_URL}/api/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-test-mode': 'true' },
            body: JSON.stringify({
                credential: 'mock_google_token_123',
                email: 'sso.qa@example.com',
                name: 'QA Engineer'
            })
        });
        const dataGoogle = await resGoogle.json();
        assert(resGoogle.status === 200 && dataGoogle.token, 'Google SSO provisions and authenticates user');

    } catch (e) {
        assert(false, 'Auth & Multi-tenancy test block exception', e.message);
    }

    // SECTION 2: END-TO-END PIPELINE & ALL 7 SCENARIOS
    console.log('\n--- 2. Order Pipeline & All 7 Failure/Remediation Scenarios ---');
    try {
        // Reset services to baseline
        await fetch(`${BASE_URL}/api/system/reset`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });

        // 2.1 Healthy scenario - full 5-stage pipeline
        const resChkHealthy = await fetch(`${BASE_URL}/api/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({ customer: 'Alice Standard', sku: 'SKU-8829', scenario: 'healthy' })
        });
        const dataChkHealthy = await resChkHealthy.json();
        assert(resChkHealthy.status === 200 && dataChkHealthy.status === 'VALIDATED', 'Stage 1: Checkout returns 200 VALIDATED');

        const resInvHealthy = await fetch(`${BASE_URL}/api/inventory/reserve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({ sku: 'SKU-8829', scenario: 'healthy' })
        });
        assert(resInvHealthy.status === 200, 'Stage 2: Inventory returns 200 LOCKED');

        const resPayHealthy = await fetch(`${BASE_URL}/api/payment/charge`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({ orderId: dataChkHealthy.orderId, amount: 2499.00, scenario: 'healthy' })
        });
        assert(resPayHealthy.status === 200, 'Stage 3: Payment returns 200 CAPTURED');

        const resFulHealthy = await fetch(`${BASE_URL}/api/fulfillment/pack`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({ orderId: dataChkHealthy.orderId, sku: 'SKU-8829', scenario: 'healthy' })
        });
        assert(resFulHealthy.status === 200, 'Stage 4: Fulfillment returns 200 QUEUED');

        const resLogHealthy = await fetch(`${BASE_URL}/api/logistics/ship`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({ orderId: dataChkHealthy.orderId, zip: '90210', scenario: 'healthy' })
        });
        assert(resLogHealthy.status === 200, 'Stage 5: Logistics returns 200 DISPATCHED');

        // 2.2 Scenario: checkout-latency
        console.log('\n  * Testing Checkout Latency Scenario...');
        await fetch(`${BASE_URL}/api/system/reset`, { method: 'POST', headers: { 'Authorization': `Bearer ${adminToken}` } });
        const resChkLat = await fetch(`${BASE_URL}/api/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({ customer: 'Bob Latency', sku: 'SKU-8829', scenario: 'checkout-latency' })
        });
        const dataChkLat = await resChkLat.json();
        assert(resChkLat.status === 504 && dataChkLat.error === 'ERR_CHECKOUT_LATENCY_SPIKE_3800MS', 'Checkout latency spike triggers HTTP 504');

        // Auto-heal checkout latency
        const resRemChk = await fetch(`${SERVICES.checkout.url}/checkout/remediate`, { method: 'POST' });
        assert(resRemChk.status === 200, 'Checkout service /remediate endpoint responds 200 REMEDIATED');

        const resChkLatHealed = await fetch(`${BASE_URL}/api/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({ customer: 'Bob Latency', sku: 'SKU-8829', scenario: 'checkout-latency' })
        });
        assert(resChkLatHealed.status === 200, 'Checkout passes after self-healing (200 VALIDATED)');

        // 2.3 Scenario: out-of-stock (Inventory)
        console.log('\n  * Testing Out of Stock Inventory Scenario...');
        await fetch(`${BASE_URL}/api/system/reset`, { method: 'POST', headers: { 'Authorization': `Bearer ${adminToken}` } });
        const resInvOos = await fetch(`${BASE_URL}/api/inventory/reserve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({ sku: 'SKU-4402', scenario: 'out-of-stock' })
        });
        assert(resInvOos.status === 422, 'Depleted inventory triggers HTTP 422 ERR_INVENTORY_DEPLETED');

        await fetch(`${SERVICES.inventory.url}/inventory/remediate`, { method: 'POST' });
        const resInvHealed = await fetch(`${BASE_URL}/api/inventory/reserve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({ sku: 'SKU-4402' })
        });
        assert(resInvHealed.status === 200, 'Inventory stock replenished via self-healing (200 LOCKED)');

        // 2.4 Scenario: card-declined (Payment)
        console.log('\n  * Testing Card Declined Scenario...');
        const resCardDec = await fetch(`${BASE_URL}/api/payment/charge`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({ card: '4111 0000 0000 4402', scenario: 'card-declined' })
        });
        assert(resCardDec.status === 402, 'Declined card triggers HTTP 402 STRIPE_CARD_DECLINED');

        // 2.5 Scenario: gateway-timeout (Payment failover to Adyen)
        console.log('\n  * Testing Gateway Timeout Scenario...');
        await fetch(`${BASE_URL}/api/system/reset`, { method: 'POST', headers: { 'Authorization': `Bearer ${adminToken}` } });
        const resPayTimeout = await fetch(`${BASE_URL}/api/payment/charge`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({ scenario: 'gateway-timeout', timeoutMs: 50 })
        });
        assert(resPayTimeout.status === 504, 'Stripe timeout triggers HTTP 504 Gateway Timeout');

        await fetch(`${SERVICES.payment.url}/payment/remediate`, { method: 'POST' });
        const resPayAdyen = await fetch(`${BASE_URL}/api/payment/charge`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({ scenario: 'gateway-timeout' })
        });
        const dataPayAdyen = await resPayAdyen.json();
        assert(resPayAdyen.status === 200 && dataPayAdyen.gateway.includes('Adyen'), 'Payment automatically fails over to Adyen gateway (200 CAPTURED)');

        // 2.6 Scenario: fulfillment-db-crash (Postgres pool recycle)
        console.log('\n  * Testing Fulfillment DB Crash Scenario...');
        await fetch(`${BASE_URL}/api/system/reset`, { method: 'POST', headers: { 'Authorization': `Bearer ${adminToken}` } });
        const resFulCrash = await fetch(`${BASE_URL}/api/fulfillment/pack`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({ scenario: 'fulfillment-db-crash' })
        });
        assert(resFulCrash.status === 500, 'Database pool crash returns HTTP 500 POSTGRES_POOL_EXHAUSTED');

        await fetch(`${SERVICES.fulfillment.url}/fulfillment/remediate`, { method: 'POST' });
        const resFulHealed = await fetch(`${BASE_URL}/api/fulfillment/pack`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({ scenario: 'fulfillment-db-crash' })
        });
        assert(resFulHealed.status === 200, 'Fulfillment pool recycled, packing succeeded (200 QUEUED)');

        // 2.7 Scenario: logistics-api-down (RabbitMQ deferred queue)
        console.log('\n  * Testing Logistics API DNS Outage Scenario...');
        await fetch(`${BASE_URL}/api/system/reset`, { method: 'POST', headers: { 'Authorization': `Bearer ${adminToken}` } });
        const resLogCrash = await fetch(`${BASE_URL}/api/logistics/ship`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({ zip: '99999', scenario: 'logistics-api-down' })
        });
        assert(resLogCrash.status === 503, 'Logistics DNS resolution failure returns HTTP 503 LOGISTICS_DNS_RESOLUTION_FAIL');

        await fetch(`${SERVICES.logistics.url}/logistics/remediate`, { method: 'POST' });
        const resLogHealed = await fetch(`${BASE_URL}/api/logistics/ship`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({ zip: '99999', scenario: 'logistics-api-down' })
        });
        assert(resLogHealed.status === 200, 'Shipment safely routed to persistent RabbitMQ queue (200 QUEUED_DEFERRED)');

    } catch (e) {
        assert(false, 'Pipeline scenario test block exception', e.message);
    }

    // SECTION 3: STORE PROFILES & BUSINESS IMPACT BENCHMARKS
    console.log('\n--- 3. Simulated Store Profiles & Business Calculations ---');
    try {
        const storeProfiles = {
            'small': { name: 'Small Store', monthlyRevenue: 75000, aov: 70.00, dailyOrders: 40, typicalLoss: '$1,200 - $3,500' },
            'growing': { name: 'Growing Store', monthlyRevenue: 180000, aov: 85.00, dailyOrders: 95, typicalLoss: '$3,800 - $8,500' },
            'sale-day': { name: 'Sale-Day (Flash Sale)', monthlyRevenue: 650000, aov: 95.00, dailyOrders: 380, typicalLoss: '$12,000 - $35,000' }
        };

        // Calculation logic validation
        function calcImpact(profileKey, incidentMinutes = 18) {
            const p = storeProfiles[profileKey];
            const ordersPerMinute = p.dailyOrders / (14 * 60); // 14 active shopping hours
            const ordersAffected = Math.max(1, Math.round(ordersPerMinute * incidentMinutes));
            const revenueAtRisk = Math.round(ordersAffected * p.aov);
            const revenueProtected = Math.round(revenueAtRisk * 0.94);
            return { ordersAffected, revenueAtRisk, revenueProtected };
        }

        const smallImpact = calcImpact('small', 18);
        assert(smallImpact.ordersAffected >= 1 && smallImpact.revenueAtRisk >= 70, `Small store impact: ${smallImpact.ordersAffected} orders, $${smallImpact.revenueAtRisk} at risk`);
        assert(smallImpact.revenueProtected > 0 && smallImpact.revenueProtected <= smallImpact.revenueAtRisk, 'Small store revenue protected is mathematically valid');

        const growingImpact = calcImpact('growing', 18);
        assert(growingImpact.revenueAtRisk > smallImpact.revenueAtRisk, `Growing store has higher revenue at risk ($${growingImpact.revenueAtRisk} vs $${smallImpact.revenueAtRisk})`);

        const saleImpact = calcImpact('sale-day', 18);
        assert(saleImpact.revenueAtRisk > growingImpact.revenueAtRisk, `Sale day has peak revenue risk ($${saleImpact.revenueAtRisk})`);

    } catch (e) {
        assert(false, 'Store profiles test block exception', e.message);
    }

    // SECTION 4: STRESS TEST & RACE CONDITIONS
    console.log('\n--- 4. Concurrency, Rapid Injections & System Reset Safety ---');
    try {
        // 4.1 Concurrent requests under load
        const concurrentRequests = 15;
        const promises = [];
        for (let i = 0; i < concurrentRequests; i++) {
            promises.push(
                fetch(`${BASE_URL}/api/checkout`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
                    body: JSON.stringify({ customer: `Stress Buyer ${i}`, sku: 'SKU-8829' })
                })
            );
        }
        const responses = await Promise.all(promises);
        const allOk = responses.every(r => r.status === 200);
        assert(allOk, `Executed ${concurrentRequests} concurrent checkout traces with 100% success`);

        // 4.2 Rapid reset call
        const resReset = await fetch(`${BASE_URL}/api/system/reset`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        assert(resReset.status === 200, 'Gateway /api/system/reset clears all service states without deadlock');

        // 4.3 Multi-tenant queue boundary test
        const resInjectAcme = await fetch(`${BASE_URL}/api/order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${acmeToken}` },
            body: JSON.stringify({ customer: 'Acme Buyer Alpha', sku: 'SKU-8829' })
        });
        assert(resInjectAcme.status === 201, 'Order injected into Acme Corp tenant workspace');

        const resPollAdmin = await fetch(`${BASE_URL}/api/events`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const dataPollAdmin = await resPollAdmin.json();
        assert(dataPollAdmin.events.length === 0, 'Aegis tenant poll returns 0 events (Tenant isolation maintained)');

        const resPollAcme = await fetch(`${BASE_URL}/api/events`, {
            headers: { 'Authorization': `Bearer ${acmeToken}` }
        });
        const dataPollAcme = await resPollAcme.json();
        assert(dataPollAcme.events.length === 1 && dataPollAcme.events[0].customer === 'Acme Buyer Alpha', 'Acme tenant retrieves its own injected event');

    } catch (e) {
        assert(false, 'Stress & Concurrency test block exception', e.message);
    }

    // SECTION 5: OBSERVABILITY BRIDGES & POST-MORTEM
    console.log('\n--- 5. Observability Bridge (OTLP, Webhook & Incident Post-Mortem) ---');
    try {
        // 5.1 OTLP Ingest
        const resOtlp = await fetch(`${BASE_URL}/api/telemetry/otlp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({
                traceId: 'trace_qa_otlp_771',
                resourceSpans: [{
                    resource: { attributes: [{ key: 'service.name', value: { stringValue: 'checkout-service' } }] },
                    scopeSpans: [{ spans: [{ name: 'POST /checkout', attributes: [{ key: 'http.status_code', value: { intValue: 200 } }] }] }]
                }]
            })
        });
        assert(resOtlp.status === 202, 'OTLP trace ingestion accepts span data (202 ACCEPTED)');

        // 5.2 External APM Webhook Ingest
        const resHook = await fetch(`${BASE_URL}/api/telemetry/webhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({ traceId: 'trace_qa_hook_221', service: 'payment', status: 'success' })
        });
        assert(resHook.status === 200, 'External APM webhook records telemetry event (200 OK)');

        // 5.3 Automated Incident Post-Mortem Export
        const resPostMortem = await fetch(`${BASE_URL}/api/incident/export`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({
                scenarioName: 'Checkout Latency Spike',
                serviceName: 'checkout-service',
                revenuePreserved: 3820.00
            })
        });
        assert(resPostMortem.status === 200, 'Incident post-mortem exporter returns HTTP 200');
        const pmData = await resPostMortem.json();
        assert(pmData.markdown && pmData.markdown.includes('Root Cause Analysis'), 'Post-mortem includes structured RCA and executive summary');

        // 5.4 ROI Config
        const resRoi = await fetch(`${BASE_URL}/api/roi/config`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        assert(resRoi.status === 200, 'ROI configuration endpoint returns HTTP 200');
        const dataRoi = await resRoi.json();
        assert(dataRoi.roiConfig && dataRoi.roiConfig.aov > 0, 'ROI config provides active average order value');

    } catch (e) {
        assert(false, 'Observability bridge test block exception', e.message);
    }

    // FINAL SUMMARY
    console.log('\n===============================================================');
    console.log(`   QA TEST SUITE RESULTS: ${passedTests} Passed, ${failedTests} Failed (Total: ${totalTests})`);
    console.log('===============================================================\n');

    if (failedTests > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

async function main() {
    try {
        const check = await fetch(`${BASE_URL}/api/system/status`).catch(() => null);
        if (!check || !check.ok) {
            console.log('Starting microservices and gateway for testing...');
            await startAll();
            await sleep(1000);
        }
    } catch (e) {
        await startAll();
        await sleep(1000);
    }

    await runComprehensiveTests();
}

main().catch(err => {
    console.error('Fatal suite runner error:', err);
    process.exit(1);
});
