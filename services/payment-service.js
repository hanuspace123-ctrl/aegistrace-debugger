const express = require('express');
const cors = require('cors');

const app = express();
let activePort = process.env.PAYMENT_PORT || 5003;

app.use(cors());
app.use(express.json());

let paymentState = {
    activeGateway: 'stripe',
    timeoutMs: 2500
};

// Health Check
app.get('/health', (req, res) => {
    res.json({
        service: 'payment-service',
        status: 'HEALTHY',
        activeGateway: paymentState.activeGateway,
        timeoutMs: paymentState.timeoutMs,
        port: activePort,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Payment Capture Endpoint
app.post(['/payment/charge', '/charge', '/'], async (req, res) => {
    const { orderId, amount, card, customer, scenario } = req.body || {};
    const cardStr = String(card || '');

    console.log(`[Payment Gateway] Processing transaction for Order ${orderId || 'N/A'} via ${paymentState.activeGateway.toUpperCase()}...`);

    // Fault Condition 1: Gateway Timeout
    if (scenario === 'gateway-timeout') {
        if (paymentState.activeGateway === 'stripe') {
            const timeoutDuration = req.body?.timeoutMs !== undefined ? Number(req.body.timeoutMs) : paymentState.timeoutMs;
            console.warn(`[Payment Gateway] Socket write completed. Awaiting remote Stripe ACK (timeout: ${timeoutDuration}ms)...`);
            // Wait for real socket delay simulation
            await new Promise(r => setTimeout(r, timeoutDuration));
            console.error('[Payment Gateway] ReadTimeoutException: Connection closed by Stripe after 2500ms.');
            return res.status(504).json({
                status: 'FAILED',
                error: 'CONN_TIMEOUT_STRIPE_API',
                errorCode: 'HTTP 504 Gateway Timeout',
                message: 'ReadTimeoutException: Connection closed by Stripe after 2500ms.',
                gateway: 'Stripe v3 Charges API',
                latency: paymentState.timeoutMs,
                timestamp: new Date().toISOString()
            });
        } else {
            // Remediation active: Adyen failover resolves successfully
            console.log('[Payment Gateway] Adyen failover routing active. Capturing charge...');
            return res.status(200).json({
                status: 'CAPTURED',
                transactionId: 'ch_adyen_' + Math.random().toString(36).substring(2, 9),
                authCode: 'AUTH-ADYEN-88123',
                gateway: 'Adyen API Wrapper (Failover)',
                amount: amount || 2499.00,
                currency: 'USD',
                timestamp: new Date().toISOString()
            });
        }
    }

    // Fault Condition 2: Card Declined
    if (cardStr.includes('4402') || cardStr.includes('declined') || scenario === 'card-declined') {
        console.warn('[Payment Gateway] STRIPE_API_ERR: Insufficient Funds. Stripe Transaction ID: ch_declined_91823');
        return res.status(402).json({
            status: 'FAILED',
            error: 'STRIPE_CARD_DECLINED',
            errorCode: 'HTTP 402 Payment Required',
            message: 'STRIPE_API_ERR: Insufficient Funds. Stripe Transaction ID: ch_declined_91823',
            issuerResponseCode: '51',
            declineReason: 'insufficient_funds',
            gateway: 'Stripe API v3',
            timestamp: new Date().toISOString()
        });
    }

    // Success Condition: Payment Captured
    const transactionId = 'ch_' + Math.random().toString(36).substring(2, 10);
    const authCode = 'AUTH-88231';
    console.log(`[Payment Gateway] Payment captured successfully. Auth Code: ${authCode}, TxID: ${transactionId}`);

    res.status(200).json({
        status: 'CAPTURED',
        transactionId,
        authCode,
        gateway: paymentState.activeGateway === 'adyen' ? 'Adyen API Wrapper' : 'Stripe API v3',
        amount: amount || 2499.00,
        currency: 'USD',
        receiptUrl: `https://pay.example.com/receipts/${transactionId}`,
        timestamp: new Date().toISOString()
    });
});

// Auto-Remediation / Self-Healing: Failover to Adyen Gateway
app.post(['/payment/remediate', '/remediate', '/payment/failover'], (req, res) => {
    paymentState.activeGateway = 'adyen';
    paymentState.timeoutMs = 5000;
    console.log('[Payment Gateway] Router configuration updated: Stripe IP tables bypassed. Adyen provider loaded.');
    res.status(200).json({
        status: 'REMEDIATED',
        activeGateway: 'adyen',
        timeoutMs: 5000,
        message: 'Router configuration updated: Stripe IP tables bypassed. Adyen provider loaded.',
        timestamp: new Date().toISOString()
    });
});

// Reset Endpoint
app.post('/reset', (req, res) => {
    paymentState.activeGateway = 'stripe';
    paymentState.timeoutMs = 2500;
    console.log('[Payment Gateway] Reset to Stripe primary gateway.');
    res.json({ status: 'RESET', paymentState });
});

function start(port = activePort) {
    activePort = port;
    return new Promise((resolve) => {
        const server = app.listen(port, () => {
            console.log(`[Payment Gateway Service] Running on port ${port}`);
            resolve(server);
        });
    });
}

if (require.main === module) {
    start();
}

module.exports = { app, start };
