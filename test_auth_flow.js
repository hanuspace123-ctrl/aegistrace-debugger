// ===============================================================
// AEGISTRACE AUTHENTICATION, SIGN UP & LOG IN TEST SUITE
// ===============================================================
const fs = require('fs');
const path = require('path');
const http = require('http');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function pass(desc) {
    totalTests++;
    passedTests++;
    console.log(`  [PASS] ${desc}`);
}

function fail(desc, err) {
    totalTests++;
    failedTests++;
    console.error(`  [FAIL] ${desc}`);
    if (err) console.error(`         Reason: ${err.message || err}`);
}

function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                let parsed = null;
                try {
                    parsed = JSON.parse(body);
                } catch(e) {
                    parsed = body;
                }
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    data: parsed
                });
            });
        });

        req.on('error', (err) => reject(err));
        req.setTimeout(5000, () => {
            req.destroy();
            reject(new Error('Request timed out'));
        });

        if (postData) {
            req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
        }
        req.end();
    });
}

async function runAuthTestSuite() {
    console.log('\n===============================================================');
    console.log('   AEGISTRACE SIGN UP, LOG IN & LOG OUT QUALITY TEST SUITE      ');
    console.log('===============================================================\n');

    const htmlPath = path.join(__dirname, 'public', 'index.html');
    const rootHtmlPath = path.join(__dirname, 'index.html');
    const cssPath = path.join(__dirname, 'public', 'style.css');
    const rootCssPath = path.join(__dirname, 'style.css');
    const appJsPath = path.join(__dirname, 'public', 'app.js');
    const rootAppJsPath = path.join(__dirname, 'app.js');

    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    const rootHtmlContent = fs.readFileSync(rootHtmlPath, 'utf8');
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    const rootCssContent = fs.readFileSync(rootCssPath, 'utf8');
    const appJsContent = fs.readFileSync(appJsPath, 'utf8');
    const rootAppJsContent = fs.readFileSync(rootAppJsPath, 'utf8');

    // -----------------------------------------------------------------
    // Section 1: Sign Up Screen & DOM Elements
    // -----------------------------------------------------------------
    console.log('--- 1. Sign Up Screen & DOM Elements ---');
    const requiredSignUpElements = [
        { id: 'tab-signup', desc: 'Sign Up tab toggle button' },
        { id: 'section-signup', desc: 'Sign Up form section container' },
        { id: 'signup-form', desc: 'Sign Up form element' },
        { id: 'signup-name', desc: 'Sign Up name input (optional)' },
        { id: 'signup-email', desc: 'Sign Up email address input (required)' },
        { id: 'signup-password', desc: 'Sign Up password input (required, min 4 chars)' },
        { id: 'signup-confirm-password', desc: 'Sign Up confirm password input' },
        { id: 'signup-pass-match-hint', desc: 'Real-time password match hint element' },
        { id: 'btn-signup-submit', desc: 'Create Account submit button' },
        { id: 'btn-toggle-signup-pass', desc: 'Show/hide password toggle button' },
        { id: 'btn-toggle-signup-confirm-pass', desc: 'Show/hide confirm password toggle button' },
        { id: 'btn-guest-mode-signup', desc: 'Try Demo Mode button from Sign Up screen' },
        { id: 'link-go-to-login', desc: 'Switch to Log In link' }
    ];

    for (const elem of requiredSignUpElements) {
        if (htmlContent.includes(`id="${elem.id}"`)) {
            pass(`Sign Up element #${elem.id} (${elem.desc}) is present in HTML`);
        } else {
            fail(`Missing required Sign Up element #${elem.id} (${elem.desc})`);
        }
    }

    // -----------------------------------------------------------------
    // Section 2: Log In Screen & DOM Elements
    // -----------------------------------------------------------------
    console.log('\n--- 2. Log In Screen & DOM Elements ---');
    const requiredLogInElements = [
        { id: 'tab-login', desc: 'Log In tab toggle button' },
        { id: 'section-login', desc: 'Log In form section container' },
        { id: 'login-form', desc: 'Log In form element' },
        { id: 'login-email', desc: 'Log In email input' },
        { id: 'login-password', desc: 'Log In password input' },
        { id: 'btn-login-submit', desc: 'Log In submit button' },
        { id: 'btn-toggle-main-pass', desc: 'Show/hide password toggle button on Log In' },
        { id: 'btn-forgot-pass', desc: 'Forgot/Reset password helper button' },
        { id: 'btn-guest-mode-login', desc: 'Try Demo Mode button from Log In screen' },
        { id: 'btn-quick-demo-login', desc: 'Prefill Demo Credentials button' },
        { id: 'link-go-to-signup', desc: 'Switch to Sign Up link' }
    ];

    for (const elem of requiredLogInElements) {
        if (htmlContent.includes(`id="${elem.id}"`)) {
            pass(`Log In element #${elem.id} (${elem.desc}) is present in HTML`);
        } else {
            fail(`Missing required Log In element #${elem.id} (${elem.desc})`);
        }
    }

    // -----------------------------------------------------------------
    // Section 3: Log Out Functionality & Header Integration
    // -----------------------------------------------------------------
    console.log('\n--- 3. Log Out Functionality & Session Teardown ---');
    const requiredLogOutElements = [
        { id: 'btn-header-logout', desc: 'Header user pill Log Out button' },
        { id: 'btn-logout', desc: 'Main Log Out button' },
        { id: 'btn-sidebar-signout', desc: 'Sidebar drawer Log Out button' }
    ];

    for (const elem of requiredLogOutElements) {
        if (htmlContent.includes(`id="${elem.id}"`)) {
            pass(`Log Out element #${elem.id} (${elem.desc}) is present in HTML`);
        } else {
            fail(`Missing required Log Out element #${elem.id} (${elem.desc})`);
        }
    }

    // Check logout logic in app.js
    if (appJsContent.includes('function logout()') &&
        appJsContent.includes("localStorage.removeItem('aegis_auth_token')") &&
        appJsContent.includes("localStorage.removeItem('aegis_guest_mode')") &&
        appJsContent.includes('showLoginModal(')) {
        pass('logout() properly clears token, guest mode, and displays login modal with feedback');
    } else {
        fail('logout() does not fully clear credentials and show login screen');
    }

    // -----------------------------------------------------------------
    // Section 4: Client-Side Router Auth Integration
    // -----------------------------------------------------------------
    console.log('\n--- 4. Client-Side SPA Router Auth Routes ---');
    if (appJsContent.includes("'#/login':") &&
        appJsContent.includes("'#/signup':") &&
        appJsContent.includes("'#/logout':")) {
        pass('SPA Router supports explicit #/login, #/signup, and #/logout routes');
    } else {
        fail('SPA Router is missing dedicated auth routes');
    }

    // -----------------------------------------------------------------
    // Section 5: Demo / Guest Mode Flow
    // -----------------------------------------------------------------
    console.log('\n--- 5. Guest / Demo Mode Handling ---');
    if (appJsContent.includes('function enterGuestDemoMode()') &&
        appJsContent.includes('isGuest: true') &&
        appJsContent.includes("localStorage.setItem('aegis_guest_mode', 'true')") &&
        appJsContent.includes('hideLoginModal()')) {
        pass('enterGuestDemoMode() allows instant sandbox exploration with isGuest flag');
    } else {
        fail('enterGuestDemoMode() is incomplete or missing in app.js');
    }

    // -----------------------------------------------------------------
    // Section 6: Mobile Accessibility & Responsive Polish
    // -----------------------------------------------------------------
    console.log('\n--- 6. Mobile Usability & Styling Parity ---');
    if (cssContent.includes('.auth-tabs') &&
        cssContent.includes('.btn-guest-access') &&
        cssContent.includes('.btn-header-logout')) {
        pass('CSS defines dedicated .auth-tabs, .btn-guest-access, and .btn-header-logout classes');
    } else {
        fail('Missing required auth CSS classes in style.css');
    }

    // Check iOS auto-zoom prevention (font-size >= 16px on inputs)
    const inputsWith16px = (htmlContent.match(/font-size:\s*16px/g) || []).length;
    if (inputsWith16px >= 4) {
        pass(`Inputs use 16px font-size to prevent unwanted mobile iOS zoom (${inputsWith16px} verified)`);
    } else {
        fail(`Found fewer than expected 16px input styles (${inputsWith16px})`);
    }

    // Check touch target heights (>= 42px)
    if (htmlContent.includes('min-height: 48px') && htmlContent.includes('min-height: 44px')) {
        pass('Touch targets satisfy >= 42px requirement for mobile tap ergonomics');
    } else {
        fail('Touch targets do not satisfy minimum touch ergonomics requirements');
    }

    // -----------------------------------------------------------------
    // Section 7: Live Backend Authentication API Verification
    // -----------------------------------------------------------------
    console.log('\n--- 7. Live Backend Auth API Verification ---');
    const gatewayPort = parseInt(process.env.PORT || '8000', 10);
    const testEmail = `testuser_${Date.now()}@example.com`;
    const testPassword = 'Password123!';

    // 7.1 Signup with invalid email
    try {
        const res = await makeRequest({
            hostname: '127.0.0.1',
            port: gatewayPort,
            path: '/api/auth/signup',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            email: 'invalid-email',
            password: 'secretpassword',
            confirmPassword: 'secretpassword'
        });
        if (res.status === 400 && res.data.error === 'INVALID_EMAIL') {
            pass('Backend rejects invalid email format with HTTP 400 INVALID_EMAIL');
        } else {
            fail(`Backend failed invalid email validation: Status ${res.status}`);
        }
    } catch(e) {
        fail('Failed to test invalid email endpoint', e);
    }

    // 7.2 Signup with short password (< 4 chars)
    try {
        const res = await makeRequest({
            hostname: '127.0.0.1',
            port: gatewayPort,
            path: '/api/auth/signup',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            email: 'shortpass@example.com',
            password: '12',
            confirmPassword: '12'
        });
        if (res.status === 400 && res.data.error === 'WEAK_PASSWORD') {
            pass('Backend rejects password shorter than 4 chars with HTTP 400 WEAK_PASSWORD');
        } else {
            fail(`Backend failed short password check: Status ${res.status}`);
        }
    } catch(e) {
        fail('Failed to test short password endpoint', e);
    }

    // 7.3 Signup with mismatching passwords
    try {
        const res = await makeRequest({
            hostname: '127.0.0.1',
            port: gatewayPort,
            path: '/api/auth/signup',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            email: 'mismatch@example.com',
            password: 'Password123',
            confirmPassword: 'DifferentPassword456'
        });
        if (res.status === 400 && res.data.error === 'PASSWORDS_DONT_MATCH') {
            pass('Backend rejects mismatching passwords with HTTP 400 PASSWORDS_DONT_MATCH');
        } else {
            fail(`Backend failed password match validation: Status ${res.status}`);
        }
    } catch(e) {
        fail('Failed to test password mismatch check', e);
    }

    // 7.4 Successful Signup with valid credentials and matching passwords
    let registeredToken = '';
    try {
        const res = await makeRequest({
            hostname: '127.0.0.1',
            port: gatewayPort,
            path: '/api/auth/signup',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            name: 'Sarah Connor',
            email: testEmail,
            password: testPassword,
            confirmPassword: testPassword,
            organizationName: 'Cyberdyne Retail'
        });
        if (res.status === 201 && res.data.status === 'SUCCESS' && res.data.token) {
            registeredToken = res.data.token;
            pass(`Backend registers new user successfully (HTTP 201) and issues JWT token`);
            pass(`Dedicated tenant workspace provisioned: ${res.data.tenant.name} (${res.data.tenant.id})`);
        } else {
            fail(`Backend failed valid signup: Status ${res.status}`);
        }
    } catch(e) {
        fail('Failed to test successful signup', e);
    }

    // 7.5 Duplicate Signup rejection
    try {
        const res = await makeRequest({
            hostname: '127.0.0.1',
            port: gatewayPort,
            path: '/api/auth/signup',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            name: 'Sarah Connor',
            email: testEmail,
            password: testPassword,
            confirmPassword: testPassword
        });
        if (res.status === 409 && res.data.error === 'EMAIL_EXISTS') {
            pass('Backend prevents duplicate registration with HTTP 409 EMAIL_EXISTS');
        } else {
            fail(`Backend did not reject duplicate email correctly: Status ${res.status}`);
        }
    } catch(e) {
        fail('Failed to test duplicate email check', e);
    }

    // 7.6 Log In with newly registered credentials
    try {
        const res = await makeRequest({
            hostname: '127.0.0.1',
            port: gatewayPort,
            path: '/api/auth/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            email: testEmail,
            password: testPassword
        });
        if (res.status === 200 && res.data.status === 'SUCCESS' && res.data.token) {
            pass('Log In succeeds with newly registered credentials (HTTP 200 OK)');
            pass(`User identity authenticated as ${res.data.user.email} (${res.data.user.name})`);
        } else {
            fail(`Log In failed with registered credentials: Status ${res.status}`);
        }
    } catch(e) {
        fail('Failed to test login with registered credentials', e);
    }

    // 7.7 Log In with wrong password returns 401
    try {
        const res = await makeRequest({
            hostname: '127.0.0.1',
            port: gatewayPort,
            path: '/api/auth/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            email: testEmail,
            password: 'WrongPassword999'
        });
        if (res.status === 401) {
            pass('Log In rejects incorrect password with HTTP 401 Unauthorized');
        } else {
            fail(`Log In did not reject incorrect password: Status ${res.status}`);
        }
    } catch(e) {
        fail('Failed to test wrong password rejection', e);
    }

    // 7.8 Token verification via /api/auth/me
    try {
        const res = await makeRequest({
            hostname: '127.0.0.1',
            port: gatewayPort,
            path: '/api/auth/me',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${registeredToken}`
            }
        });
        if (res.status === 200 && res.data.status === 'SUCCESS' && res.data.user.email === testEmail) {
            pass('GET /api/auth/me validates session token and restores user context accurately');
        } else {
            fail(`Token verification failed: Status ${res.status}`);
        }
    } catch(e) {
        fail('Failed to test session verification endpoint', e);
    }

    // -----------------------------------------------------------------
    // Section 8: Dual-File Parity Verification
    // -----------------------------------------------------------------
    console.log('\n--- 8. Strict Dual-File Synchronization Parity ---');
    if (htmlContent === rootHtmlContent) {
        pass('public/index.html is identical to root index.html');
    } else {
        fail('public/index.html differs from root index.html');
    }

    if (cssContent === rootCssContent) {
        pass('public/style.css is identical to root style.css');
    } else {
        fail('public/style.css differs from root style.css');
    }

    if (appJsContent === rootAppJsContent) {
        pass('public/app.js is identical to root app.js');
    } else {
        fail('public/app.js differs from root app.js');
    }

    // -----------------------------------------------------------------
    // Summary
    // -----------------------------------------------------------------
    console.log('\n===============================================================');
    console.log(`   AUTH TEST RESULTS: ${passedTests} Passed, ${failedTests} Failed`);
    console.log('===============================================================\n');

    if (failedTests > 0) {
        process.exit(1);
    }
}

runAuthTestSuite().catch(err => {
    console.error('Test suite uncaught error:', err);
    process.exit(1);
});
