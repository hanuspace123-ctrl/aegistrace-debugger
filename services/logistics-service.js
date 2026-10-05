const express = require('express');
const cors = require('cors');

const app = express();
let activePort = process.env.LOGISTICS_PORT || 5005;

app.use(cors());
app.use(express.json());

let logisticsState = {
    mode: 'direct' // 'direct' or 'rabbitmq_deferred'
};

// Health Check
app.get('/health', (req, res) => {
    res.json({
        service: 'logistics-service',
        status: 'HEALTHY',
        mode: logisticsState.mode,
        port: activePort,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Logistics Shipping Dispatch Endpoint
app.post(['/logistics/ship', '/ship', '/'], (req, res) => {
    const { orderId, customer, zip, sku, scenario } = req.body || {};
    const destZip = String(zip || '90210');

    console.log(`[Logistics API] Registering tracking number for Order ${orderId || 'N/A'} (Zip: ${destZip})...`);

    // Fault Condition: DNS Resolution Failure (zip 99999 or scenario logistics-api-down)
    if (destZip === '99999' || scenario === 'logistics-api-down') {
        if (logisticsState.mode === 'direct') {
            console.error('[Logistics API] EgressProxyDNSResolutionError: Lookup logistics.dhl-provider.net failed.');
            return res.status(503).json({
                status: 'FAILED',
                error: 'LOGISTICS_DNS_RESOLUTION_FAIL',
                errorCode: 'HTTP 503 Service Unavailable',
                message: 'EgressProxyDNSResolutionError: Lookup logistics.dhl-provider.net failed.',
                carrier: 'DHL Express Global API',
                destinationZip: destZip,
                timestamp: new Date().toISOString()
            });
        } else {
            // Remediation active: Local RabbitMQ deferred queue fallback
            console.log('[Logistics API] Re-routed shipping payload to local persistent RabbitMQ queue (dhl-deferred-shipments).');
            return res.status(200).json({
                status: 'QUEUED_DEFERRED',
                trackingNumber: 'TRK-RABBITMQ-DEFERRED-9182',
                carrier: 'DHL Deferred Egress Worker Pool',
                queue: 'dhl-deferred-shipments',
                destinationZip: destZip,
                timestamp: new Date().toISOString()
            });
        }
    }

    // Success Condition: Shipments Dispatched
    const trackingNumber = 'TRK-DHL-91823';
    console.log(`[Logistics API] Shipments payload dispatched. Routing registered: ${trackingNumber}`);

    res.status(200).json({
        status: 'DISPATCHED',
        carrier: 'DHL Express',
        trackingNumber,
        destinationZip: destZip,
        estimatedDelivery: '2 Business Days',
        shippingClass: 'EXPRESS_AIR_PRIORITY',
        timestamp: new Date().toISOString()
    });
});

// Auto-Remediation / Self-Healing: Route to deferred local queue
app.post(['/logistics/remediate', '/remediate'], (req, res) => {
    logisticsState.mode = 'rabbitmq_deferred';
    console.log('[Logistics API] Ingress proxy re-routed. Outage queues mapped to deferred worker pool.');
    res.status(200).json({
        status: 'REMEDIATED',
        mode: 'rabbitmq_deferred',
        message: 'Ingress proxy re-routed. Outage queues mapped to deferred worker pool.',
        timestamp: new Date().toISOString()
    });
});

// Reset Endpoint
app.post('/reset', (req, res) => {
    logisticsState.mode = 'direct';
    console.log('[Logistics API] Reset to direct routing.');
    res.json({ status: 'RESET', logisticsState });
});

function start(port = activePort) {
    activePort = port;
    return new Promise((resolve) => {
        const server = app.listen(port, () => {
            console.log(`[Logistics API Service] Running on port ${port}`);
            resolve(server);
        });
    });
}

if (require.main === module) {
    start();
}

module.exports = { app, start };
