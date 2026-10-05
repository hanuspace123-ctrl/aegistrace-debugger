const express = require('express');
const cors = require('cors');

const app = express();
let activePort = process.env.FULFILLMENT_PORT || 5004;

app.use(cors());
app.use(express.json());

let fulfillmentState = {
    dbPool: { active: 8, max: 20 },
    cpu: 24,
    remediated: false
};

// Health Check
app.get('/health', (req, res) => {
    res.json({
        service: 'fulfillment-service',
        status: 'HEALTHY',
        dbPool: fulfillmentState.dbPool,
        cpu: fulfillmentState.cpu,
        port: activePort,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Fulfillment Packing Endpoint
app.post(['/fulfillment/pack', '/pack', '/'], (req, res) => {
    const { orderId, sku, customer, scenario } = req.body || {};

    console.log(`[Fulfillment API] Sending packing request payload for Order ${orderId || 'N/A'} to Warehouse...`);

    // Fault Condition: DB Pool Exhaustion (scenario === 'fulfillment-db-crash')
    if (scenario === 'fulfillment-db-crash' && !fulfillmentState.remediated) {
        fulfillmentState.dbPool.active = 20;
        fulfillmentState.cpu = 96;
        console.error('[Fulfillment API] PostgresqlConnectionPoolError: Max connection limit of 20 exceeded. Query timed out in queue.');
        return res.status(500).json({
            status: 'FAILED',
            error: 'POSTGRES_POOL_EXHAUSTED',
            errorCode: 'HTTP 500 Internal Server Error',
            message: 'PostgresqlConnectionPoolError: Max connection limit of 20 exceeded. Query timed out in queue.',
            dbPool: { active: 20, max: fulfillmentState.dbPool.max },
            cpu: 96,
            timestamp: new Date().toISOString()
        });
    }

    // Success Condition: Packing Slip Created
    const packingQueueId = 'PQ-88192-US';
    fulfillmentState.dbPool.active = 9;
    fulfillmentState.cpu = 26;

    console.log(`[Fulfillment API] Packing queue ID generated: ${packingQueueId}.`);

    res.status(200).json({
        status: 'QUEUED',
        orderId,
        packingQueueId,
        warehouseBay: 'Bay-B-07',
        priority: 'STANDARD',
        estimatedPackMinutes: 12,
        dbPool: { active: fulfillmentState.dbPool.active, max: fulfillmentState.dbPool.max },
        cpu: fulfillmentState.cpu,
        timestamp: new Date().toISOString()
    });
});

// Auto-Remediation / Self-Healing: Recycle DB Pool & bump max limits
app.post(['/fulfillment/remediate', '/remediate', '/fulfillment/recycle-pool'], (req, res) => {
    fulfillmentState.remediated = true;
    fulfillmentState.dbPool = { active: 8, max: 50 };
    fulfillmentState.cpu = 19;
    console.log('[Fulfillment API] Terminated 14 idle database sockets. Connection limits increased.');
    res.status(200).json({
        status: 'REMEDIATED',
        message: 'Terminated 14 idle database sockets. Connection limits increased.',
        dbPool: fulfillmentState.dbPool,
        cpu: fulfillmentState.cpu,
        timestamp: new Date().toISOString()
    });
});

// Reset Endpoint
app.post('/reset', (req, res) => {
    fulfillmentState = {
        dbPool: { active: 8, max: 20 },
        cpu: 24,
        remediated: false
    };
    console.log('[Fulfillment API] State reset.');
    res.json({ status: 'RESET', fulfillmentState });
});

function start(port = activePort) {
    activePort = port;
    return new Promise((resolve) => {
        const server = app.listen(port, () => {
            console.log(`[Fulfillment API Service] Running on port ${port}`);
            resolve(server);
        });
    });
}

if (require.main === module) {
    start();
}

module.exports = { app, start };
