const https = require('https');

function post(path, body, headers = {}) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(body);
        const req = https.request('https://ecommerce-visual-debugger.vercel.app' + path, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
                ...headers
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch(e) {
                    resolve({ status: res.statusCode, text: data });
                }
            });
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

function get(path, headers = {}) {
    return new Promise((resolve, reject) => {
        const req = https.request('https://ecommerce-visual-debugger.vercel.app' + path, {
            method: 'GET',
            headers
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch(e) {
                    resolve({ status: res.statusCode, text: data });
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function verifyLive() {
    console.log('--- Verifying Live Vercel Production Deployment ---');

    // 1. Homepage HTML & DOM components
    const home = await get('/');
    console.log('1. Homepage status:', home.status);
    console.log('   Contains data-mode-bar:', home.text.includes('id="data-mode-bar"'));
    console.log('   Contains real-store-operations-deck:', home.text.includes('id="real-store-operations-deck"'));
    console.log('   Contains real-store-impact-card:', home.text.includes('id="real-store-impact-card"'));
    console.log('   Contains founder-four-questions-deck:', home.text.includes('id="founder-four-questions-deck"'));
    console.log('   Contains q-card-what (1. What broke?):', home.text.includes('id="q-card-what"'));
    console.log('   Contains q-card-severity (2. How bad is it?):', home.text.includes('id="q-card-severity"'));
    console.log('   Contains q-card-money (3. How much money?):', home.text.includes('id="q-card-money"'));
    console.log('   Contains q-card-fixed (4. Is it fixed?):', home.text.includes('id="q-card-fixed"'));

    // 1b. Auth DOM components verification
    console.log('1b. Auth Components:');
    console.log('   Contains tab-signup:', home.text.includes('id="tab-signup"'));
    console.log('   Contains tab-login:', home.text.includes('id="tab-login"'));
    console.log('   Contains section-signup:', home.text.includes('id="section-signup"'));
    console.log('   Contains section-login:', home.text.includes('id="section-login"'));
    console.log('   Contains signup-form:', home.text.includes('id="signup-form"'));
    console.log('   Contains signup-confirm-password:', home.text.includes('id="signup-confirm-password"'));
    console.log('   Contains signup-pass-match-hint:', home.text.includes('id="signup-pass-match-hint"'));
    console.log('   Contains btn-header-logout:', home.text.includes('id="btn-header-logout"'));
    console.log('   Contains btn-guest-mode-login:', home.text.includes('id="btn-guest-mode-login"'));
    console.log('   Contains btn-guest-mode-signup:', home.text.includes('id="btn-guest-mode-signup"'));

    // 2. Login
    const login = await post('/api/auth/login', { email: 'admin@aegistrace.com', password: 'password123' });
    console.log('2. Live Auth status:', login.status, 'User:', login.data.user ? login.data.user.email : 'fail');
    const token = login.data.token;
    const authHeaders = { 'Authorization': 'Bearer ' + token };

    // 3. Connect store
    const connect = await post('/api/store/connect', {
        shopDomain: 'mystic-live.myshopify.com',
        storeName: 'Mystic Live DTC',
        environment: 'development',
        currency: 'USD'
    }, authHeaders);
    console.log('3. Live Store Connect:', connect.status, connect.data.message);

    // 4. Ingest real webhook (Payment declined)
    const webhook = await post('/api/webhook/shopify', {
        topic: 'orders/create',
        shop: 'mystic-live.myshopify.com',
        order_number: 9912,
        total_price: '189.50',
        currency: 'USD',
        financial_status: 'voided',
        cancel_reason: 'payment_declined',
        customer: { first_name: 'Jessica', last_name: 'Taylor', email: 'jessica.t@example.com' },
        line_items: [{ title: 'Merino Wool Sweater', price: '189.50', quantity: 1 }]
    });
    console.log('4. Live Shopify Webhook:', webhook.status, 'Problem:', webhook.data.isProblem, 'Type:', webhook.data.problemType, 'Protected: $' + webhook.data.revenueProtected);

    // 5. Check real store events and metrics
    const events = await get('/api/store/events', authHeaders);
    console.log('5. Live Store Metrics:', events.data.metrics);
    console.log('   Live Incidents caught:', events.data.incidents.length);
}

verifyLive().catch(console.error);
