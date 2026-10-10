/**
 * Automated End-to-End Test Suite for AegisTrace Microservices
 */

const { startAll, SERVICES } = require('./server');

const GATEWAY_URL = process.env.GATEWAY_URL || `http://127.0.0.1:${process.env.PORT || 8000}`;

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  [PASS] ${message}`);
        passedCount++;
    } else {
        console.error(`  [FAIL] ${message}`);
        failedCount++;
    }
}

async function runTests() {
    console.log('\n===================================================');
    console.log('   Running AegisTrace Microservices Test Suite     ');
    console.log('===================================================\n');

    // 1. Health Checks
    console.log('--- 1. Microservice Health Checks ---');
    for (const [key, svc] of Object.entries(SERVICES)) {
        try {
            const res = await fetch(`${svc.url}/health`);
            const data = await res.json();
            assert(res.status === 200 && data.status === 'HEALTHY', `${svc.name} (: ${svc.port}) returned 200 HEALTHY`);
        } catch (e) {
            assert(false, `${svc.name} (: ${svc.port}) unreachable: ${e.message}`);
        }
    }

    // 2. Checkout API Tests
    console.log('\n--- 2. Checkout API Tests ---');
    try {
        // Valid checkout
        const res1 = await fetch('http://127.0.0.1:5001/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customer: 'Test User',
                sku: 'SKU-8829',
                card: '4111 0000 0000 1111',
                zip: '90210'
            })
        });
        const data1 = await res1.json();
        assert(res1.status === 200 && data1.status === 'VALIDATED', 'Valid checkout payload returns 200 VALIDATED');
        assert(data1.orderId && data1.total > 0, `Order ID issued (${data1.orderId}) with total: $${data1.total}`);

        // Missing customer (Bad Request)
        const res2 = await fetch('http://127.0.0.1:5001/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sku: 'SKU-8829' })
        });
        assert(res2.status === 400, 'Missing customer payload returns 400 Bad Request');
    } catch (e) {
        assert(false, `Checkout API test error: ${e.message}`);
    }

    // 3. Inventory DB Tests
    console.log('\n--- 3. Inventory DB Tests ---');
    try {
        // In-stock reservation
        const res1 = await fetch('http://127.0.0.1:5002/inventory/reserve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sku: 'SKU-8829' })
        });
        const data1 = await res1.json();
        assert(res1.status === 200 && data1.status === 'LOCKED', 'In-stock item SKU-8829 returns 200 LOCKED');

        // Reset inventory state prior to testing fault
        await fetch('http://127.0.0.1:5002/reset', { method: 'POST' });

        // Out-of-stock reservation
        const res2 = await fetch('http://127.0.0.1:5002/inventory/reserve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sku: 'SKU-4402' })
        });
        const data2 = await res2.json();
        assert(res2.status === 422 && data2.error === 'ERR_INVENTORY_DEPLETED', 'Depleted SKU-4402 returns 422 ERR_INVENTORY_DEPLETED');

        // Remediation: Restock
        const resRem = await fetch('http://127.0.0.1:5002/inventory/remediate', { method: 'POST' });
        const dataRem = await resRem.json();
        assert(resRem.status === 200 && dataRem.stock === 100, 'Remediation restocks safety buffer (+100 items)');

        // Retry out-of-stock item after remediation
        const res3 = await fetch('http://127.0.0.1:5002/inventory/reserve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sku: 'SKU-4402' })
        });
        assert(res3.status === 200, 'SKU-4402 reserve passes (200 LOCKED) after self-healing');
    } catch (e) {
        assert(false, `Inventory service test error: ${e.message}`);
    }

    // 4. Payment Gateway Tests
    console.log('\n--- 4. Payment Gateway Tests ---');
    try {
        // Normal charge
        const res1 = await fetch('http://127.0.0.1:5003/payment/charge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: 199.00, card: '4111 0000 0000 1111' })
        });
        const data1 = await res1.json();
        assert(res1.status === 200 && data1.status === 'CAPTURED', 'Normal charge returns 200 CAPTURED');

        // Card declined
        const res2 = await fetch('http://127.0.0.1:5003/payment/charge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ card: '5500 •••• •••• 4402' })
        });
        const data2 = await res2.json();
        assert(res2.status === 402 && data2.error === 'STRIPE_CARD_DECLINED', 'Declined card returns 402 STRIPE_CARD_DECLINED');

        // Reset payment gateway state prior to testing failover
        await fetch('http://127.0.0.1:5003/reset', { method: 'POST' });

        // Remediation: Failover to Adyen
        const resRem = await fetch('http://127.0.0.1:5003/payment/remediate', { method: 'POST' });
        const dataRem = await resRem.json();
        assert(resRem.status === 200 && dataRem.activeGateway === 'adyen', 'Remediation fails over to Adyen gateway');

        // Gateway timeout scenario with Adyen failover active
        const res3 = await fetch('http://127.0.0.1:5003/payment/charge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scenario: 'gateway-timeout' })
        });
        const data3 = await res3.json();
        assert(res3.status === 200 && data3.gateway.includes('Adyen'), 'Gateway timeout scenario resolved via Adyen (200 CAPTURED)');
    } catch (e) {
        assert(false, `Payment Gateway test error: ${e.message}`);
    }

    // 5. Fulfillment API Tests
    console.log('\n--- 5. Fulfillment API Tests ---');
    try {
        // Normal pack
        const res1 = await fetch('http://127.0.0.1:5004/fulfillment/pack', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sku: 'SKU-8829' })
        });
        const data1 = await res1.json();
        assert(res1.status === 200 && data1.status === 'QUEUED', 'Normal packing returns 200 QUEUED');

        // Reset fulfillment state prior to testing fault
        await fetch('http://127.0.0.1:5004/reset', { method: 'POST' });

        // DB pool crash
        const res2 = await fetch('http://127.0.0.1:5004/fulfillment/pack', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scenario: 'fulfillment-db-crash' })
        });
        const data2 = await res2.json();
        assert(res2.status === 500 && data2.error === 'POSTGRES_POOL_EXHAUSTED', 'DB crash scenario returns 500 POSTGRES_POOL_EXHAUSTED');

        // Remediation: Recycle pool
        const resRem = await fetch('http://127.0.0.1:5004/fulfillment/remediate', { method: 'POST' });
        const dataRem = await resRem.json();
        assert(resRem.status === 200 && dataRem.dbPool.max === 50, 'Remediation recycles pool and increases max limit to 50');

        // Pack after remediation
        const res3 = await fetch('http://127.0.0.1:5004/fulfillment/pack', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scenario: 'fulfillment-db-crash' })
        });
        assert(res3.status === 200, 'Pack succeeds (200 QUEUED) after pool recycle remediation');
    } catch (e) {
        assert(false, `Fulfillment API test error: ${e.message}`);
    }

    // 6. Logistics API Tests
    console.log('\n--- 6. Logistics API Tests ---');
    try {
        // Normal ship
        const res1 = await fetch('http://127.0.0.1:5005/logistics/ship', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ zip: '90210' })
        });
        const data1 = await res1.json();
        assert(res1.status === 200 && data1.status === 'DISPATCHED', 'Normal ship returns 200 DISPATCHED');

        // Reset logistics state prior to testing fault
        await fetch('http://127.0.0.1:5005/reset', { method: 'POST' });

        // DNS resolution outage (zip 99999)
        const res2 = await fetch('http://127.0.0.1:5005/logistics/ship', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ zip: '99999' })
        });
        const data2 = await res2.json();
        assert(res2.status === 503 && data2.error === 'LOGISTICS_DNS_RESOLUTION_FAIL', 'DNS outage (zip 99999) returns 503 LOGISTICS_DNS_RESOLUTION_FAIL');

        // Remediation: Reroute to RabbitMQ
        const resRem = await fetch('http://127.0.0.1:5005/logistics/remediate', { method: 'POST' });
        const dataRem = await resRem.json();
        assert(resRem.status === 200 && dataRem.mode === 'rabbitmq_deferred', 'Remediation reroutes to persistent RabbitMQ deferred queue');

        // Ship after remediation
        const res3 = await fetch('http://127.0.0.1:5005/logistics/ship', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ zip: '99999' })
        });
        const data3 = await res3.json();
        assert(res3.status === 200 && data3.status === 'QUEUED_DEFERRED', 'Shipment successfully queued into deferred queue (200 QUEUED_DEFERRED)');
    } catch (e) {
        assert(false, `Logistics API test error: ${e.message}`);
    }

    // 7. Gateway Proxy & Health Check
    console.log('\n--- 7. Gateway Proxy & Health Check (Port 8000) ---');
    try {
        const resHealth = await fetch(`${GATEWAY_URL}/health`);
        const dataHealth = await resHealth.json();
        assert(resHealth.status === 200 && dataHealth.status === 'OK', 'Cloud /health endpoint returns 200 OK');

        const resStatus = await fetch(`${GATEWAY_URL}/api/system/status`);
        const dataStatus = await resStatus.json();
        assert(resStatus.status === 200 && dataStatus.gateway === 'AegisTrace Gateway', 'Gateway /api/system/status reports HEALTHY');
    } catch (e) {
        assert(false, `Gateway status test error: ${e.message}`);
    }

    // 8. Public Demo Mode, Authentication & Multi-Tenant Isolation Tests
    console.log('\n--- 8. Public Demo Mode, Authentication & Multi-Tenancy Tests ---');
    try {
        // 8.1 Public Demo Mode: Unauthenticated requests grant seamless public evaluation access (200 OK)
        const resPublicEvents = await fetch(`${GATEWAY_URL}/api/events`);
        assert(resPublicEvents.status === 200, 'Public Guest request to /api/events succeeds with 200 OK (Public Live Demo mode)');

        const resPublicProxy = await fetch(`${GATEWAY_URL}/api/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customer: 'Public Guest', sku: 'SKU-8829' })
        });
        assert(resPublicProxy.status === 200, 'Public Guest request to /api/checkout succeeds with 200 OK');

        // 8.2 Forged / Invalid Token rejection (401 Unauthorized)
        const resInvalidToken = await fetch(`${GATEWAY_URL}/api/events`, {
            headers: { 'Authorization': 'Bearer invalid_forged_token.signature' }
        });
        assert(resInvalidToken.status === 401, 'Corrupted or forged token returns 401 Unauthorized');

        // 8.2 Invalid credentials test
        const resBadLogin = await fetch(`${GATEWAY_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@aegistrace.com', password: 'wrongpassword' })
        });
        assert(resBadLogin.status === 401, 'Invalid login credentials return 401 Unauthorized');

        // 8.3 Login Tenant 1 (Aegis Enterprise)
        const resLoginAegis = await fetch(`${GATEWAY_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@aegistrace.com', password: 'password123' })
        });
        const dataLoginAegis = await resLoginAegis.json();
        assert(resLoginAegis.status === 200 && dataLoginAegis.token, 'Tenant 1 login (admin@aegistrace.com) succeeds with JWT token');
        assert(dataLoginAegis.tenant.id === 'tenant-aegis', 'Tenant 1 context correctly identifies as tenant-aegis');

        // 8.4 Login Tenant 2 (Acme Corp)
        const resLoginAcme = await fetch(`${GATEWAY_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'dev@acmecorp.com', password: 'password123' })
        });
        const dataLoginAcme = await resLoginAcme.json();
        assert(resLoginAcme.status === 200 && dataLoginAcme.token, 'Tenant 2 login (dev@acmecorp.com) succeeds with JWT token');
        assert(dataLoginAcme.tenant.id === 'tenant-acme', 'Tenant 2 context correctly identifies as tenant-acme');

        // 8.5 Authenticated Gateway Proxy call using Tenant 1 token
        const resAuthProxy = await fetch(`${GATEWAY_URL}/api/checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${dataLoginAegis.token}`
            },
            body: JSON.stringify({ customer: 'Aegis Client', sku: 'SKU-8829' })
        });
        const dataAuthProxy = await resAuthProxy.json();
        assert(resAuthProxy.status === 200 && dataAuthProxy.status === 'VALIDATED', 'Authenticated request to /api/checkout succeeds (200 VALIDATED)');

        // 8.6 MULTI-TENANT ISOLATION TEST:
        // Inject an order specifically into Tenant 1 (Aegis Enterprise)
        const resInject = await fetch(`${GATEWAY_URL}/api/order`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${dataLoginAegis.token}`
            },
            body: JSON.stringify({ customer: 'Tenant 1 VIP Buyer', sku: 'SKU-8829' })
        });
        assert(resInject.status === 201, 'Order injected successfully into Tenant 1');

        // Poll events as Tenant 2 (Acme Corp) - must be 0 events!
        const resPollAcme = await fetch(`${GATEWAY_URL}/api/events`, {
            headers: { 'Authorization': `Bearer ${dataLoginAcme.token}` }
        });
        const dataPollAcme = await resPollAcme.json();
        assert(resPollAcme.status === 200 && dataPollAcme.events.length === 0, 'Tenant 2 poll returns 0 events (Strict Tenant Isolation verified)');

        // Poll events as Tenant 1 (Aegis Enterprise) - must receive the injected order!
        const resPollAegis = await fetch(`${GATEWAY_URL}/api/events`, {
            headers: { 'Authorization': `Bearer ${dataLoginAegis.token}` }
        });
        const dataPollAegis = await resPollAegis.json();
        assert(resPollAegis.status === 200 && dataPollAegis.events.length === 1, 'Tenant 1 poll returns the injected order event');
        assert(dataPollAegis.events[0].customer === 'Tenant 1 VIP Buyer', 'Tenant 1 received matching order data');

        // --- 9. Google OAuth 2.0 Integration Tests ---
        console.log('\n--- 9. Google OAuth 2.0 Tests ---');
        // 9.1 Missing credential validation
        const resGMissing = await fetch(`${GATEWAY_URL}/api/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        assert(resGMissing.status === 400, 'Missing Google credential returns 400 Bad Request');

        // 9.2 Successful Google SSO authentication
        const resGAuth = await fetch(`${GATEWAY_URL}/api/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                credential: 'mock_google_test_token',
                email: 'alex.rivera.cloud@gmail.com',
                name: 'Alex Rivera (Google Cloud)'
            })
        });
        const dataGAuth = await resGAuth.json();
        assert(resGAuth.status === 200 && dataGAuth.status === 'SUCCESS', 'Google SSO login succeeds (200 OK)');
        assert(dataGAuth.token && dataGAuth.token.split('.').length === 2, 'Google SSO issued signed HMAC JWT');
        assert(dataGAuth.user.email === 'alex.rivera.cloud@gmail.com', 'Google SSO mapped user email correctly');
        assert(dataGAuth.tenant.id === 'tenant-google', 'Google SSO auto-provisioned Google Cloud Workspace tenant');

        // 9.3 Access protected endpoint using Google SSO JWT
        const resGProtected = await fetch(`${GATEWAY_URL}/api/events`, {
            headers: { 'Authorization': `Bearer ${dataGAuth.token}` }
        });
        assert(resGProtected.status === 200, 'Authenticated request with Google SSO token succeeds (200 OK)');

        // --- 10. User Sign Up & Any Valid Email Authentication Tests ---
        console.log('\n--- 10. User Sign Up & Any Valid Email Tests ---');
        
        // 10.1 Invalid email format rejection
        const resBadEmail = await fetch(`${GATEWAY_URL}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'not-an-email', password: 'password123', name: 'Test' })
        });
        assert(resBadEmail.status === 400, 'Invalid email format is rejected (400 Bad Request)');

        // 10.2 Weak password rejection
        const resShortPass = await fetch(`${GATEWAY_URL}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'valid.user@gmail.com', password: '12', name: 'Test' })
        });
        assert(resShortPass.status === 400, 'Password shorter than 4 chars is rejected (400 Bad Request)');

        // 10.3 Successful registration of any person with valid email (e.g. hanuspace123@gmail.com)
        const testEmail = `hanuspace123_${Date.now()}@gmail.com`;
        const resSignup = await fetch(`${GATEWAY_URL}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Hanu Space',
                email: testEmail,
                password: 'secretPassword2026',
                organizationName: 'Hanu Enterprise Lab'
            })
        });
        const dataSignup = await resSignup.json();
        assert(resSignup.status === 201 && dataSignup.status === 'SUCCESS', 'New user signs up successfully with any valid email (201 Created)');
        assert(dataSignup.token && dataSignup.user.email === testEmail, 'Sign up returns active JWT token and user profile');
        assert(dataSignup.tenant.name === 'Hanu Enterprise Lab', 'Sign up automatically provisions dedicated isolated tenant workspace');

        // 10.4 Prevent duplicate registration of existing email
        const resDup = await fetch(`${GATEWAY_URL}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Duplicate Hanu',
                email: testEmail,
                password: 'differentPassword'
            })
        });
        assert(resDup.status === 409, 'Duplicate email registration returns 409 Conflict');

        // 10.5 Sign in using the newly registered credentials
        const resNewLogin = await fetch(`${GATEWAY_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: testEmail,
                password: 'secretPassword2026'
            })
        });
        const dataNewLogin = await resNewLogin.json();
        assert(resNewLogin.status === 200 && dataNewLogin.status === 'SUCCESS', 'Newly registered user logs in successfully (200 OK)');
        assert(dataNewLogin.tenant.name === 'Hanu Enterprise Lab', 'Login restores user tenant context accurately');

        // 10.6 Run authenticated trace as the new user
        const resNewOrder = await fetch(`${GATEWAY_URL}/api/checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${dataNewLogin.token}`
            },
            body: JSON.stringify({ customer: 'Hanu Space', sku: 'SKU-8829' })
        });
        assert(resNewOrder.status === 200, 'Newly registered user executes checkout trace successfully (200 OK)');

    } catch (e) {
        assert(false, `Authentication and Multi-tenancy test error: ${e.message}`);
    }

    console.log('\n===================================================');
    console.log(`   Test Results: ${passedCount} Passed, ${failedCount} Failed`);
    console.log('===================================================\n');

    if (failedCount > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

// Check if servers already running or start them
async function main() {
    try {
        const check = await fetch(`${GATEWAY_URL}/api/system/status`).catch(() => null);
        if (!check || !check.ok) {
            console.log('Starting microservices and gateway for testing...');
            await startAll();
            await new Promise(r => setTimeout(r, 1000));
        }
    } catch (e) {
        await startAll();
        await new Promise(r => setTimeout(r, 1000));
    }

    await runTests();
}

main().catch(err => {
    console.error('Fatal error running tests:', err);
    process.exit(1);
});
