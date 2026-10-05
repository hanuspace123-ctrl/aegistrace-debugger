const express = require('express');
const cors = require('cors');

const app = express();
let activePort = process.env.CHECKOUT_PORT || 5001;

app.use(cors());
app.use(express.json());

const CATALOG = {
    'SKU-8829': { name: 'MacBook Pro M3', price: 2499.00 },
    'SKU-4402': { name: 'iPhone 17 Pro Max', price: 1199.00 },
    'SKU-9901': { name: 'AirPods Max 2', price: 549.00 }
};

// Health Check
app.get('/health', (req, res) => {
    res.json({
        service: 'checkout-service',
        status: 'HEALTHY',
        port: activePort,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Checkout Validation Endpoint
app.post(['/checkout', '/'], (req, res) => {
    const { id, customer, sku, card, zip, scenario } = req.body || {};

    if (!customer || !sku) {
        return res.status(400).json({
            status: 'FAILED',
            error: 'INVALID_PAYLOAD',
            errorCode: 'HTTP 400 Bad Request',
            message: 'Validation failed: customer and sku are required fields.'
        });
    }

    const item = CATALOG[sku] || { name: 'Custom Hardware Item', price: 199.00 };
    const subtotal = item.price;
    const tax = +(subtotal * 0.0825).toFixed(2);
    const total = +(subtotal + tax).toFixed(2);
    const cardLast4 = card ? card.replace(/\D/g, '').slice(-4) || '1111' : '1111';
    const orderId = id || 'ord_' + Math.random().toString(36).substring(2, 9);
    const sessionToken = 'tok_chk_' + Math.random().toString(36).substring(2, 10);

    console.log(`[Checkout API] Validated checkout payload for ${customer} (Order: ${orderId}, SKU: ${sku}, Total: $${total})`);

    res.status(200).json({
        status: 'VALIDATED',
        orderId,
        sessionToken,
        customer,
        sku,
        itemName: item.name,
        subtotal,
        tax,
        total,
        currency: 'USD',
        cardLast4,
        zip: zip || '90210',
        timestamp: new Date().toISOString()
    });
});

app.post('/reset', (req, res) => {
    res.json({ status: 'RESET', service: 'checkout-service' });
});

function start(port = activePort) {
    activePort = port;
    return new Promise((resolve) => {
        const server = app.listen(port, () => {
            console.log(`[Checkout API] Running on port ${port}`);
            resolve(server);
        });
    });
}

if (require.main === module) {
    start();
}

module.exports = { app, start };
