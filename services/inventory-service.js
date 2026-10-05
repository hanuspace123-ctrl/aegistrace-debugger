const express = require('express');
const cors = require('cors');

const app = express();
let activePort = process.env.INVENTORY_PORT || 5002;

app.use(cors());
app.use(express.json());

const INITIAL_INVENTORY = {
    'SKU-8829': { name: 'MacBook Pro M3', stock: 5000, reserved: 3 },
    'SKU-4402': { name: 'iPhone 17 Pro Max', stock: 0, reserved: 0 }, // Out of stock by default
    'SKU-9901': { name: 'AirPods Max 2', stock: 5000, reserved: 5 }
};

let inventoryStore = JSON.parse(JSON.stringify(INITIAL_INVENTORY));

// Health Check
app.get('/health', (req, res) => {
    res.json({
        service: 'inventory-service',
        status: 'HEALTHY',
        port: activePort,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// View Catalog Stock
app.get(['/inventory/catalog', '/catalog'], (req, res) => {
    res.json({ catalog: inventoryStore });
});

// Reserve / Lock Inventory Endpoint
app.post(['/inventory/reserve', '/inventory/lock', '/reserve', '/'], (req, res) => {
    const { orderId, sku, scenario } = req.body || {};
    const itemSku = sku || 'SKU-8829';
    const item = inventoryStore[itemSku];

    console.log(`[Inventory DB] Querying stock levels for SKU: ${itemSku}...`);

    // Fault condition: Depleted stock (SKU-4402 or explicit out-of-stock scenario)
    if (!item || item.stock <= 0 || scenario === 'out-of-stock') {
        console.warn(`[Inventory DB] DB_LOCK_REFUSED (Item ${itemSku} count is ${item ? item.stock : 0})`);
        return res.status(422).json({
            status: 'FAILED',
            error: 'ERR_INVENTORY_DEPLETED',
            errorCode: 'HTTP 422 Unprocessable Entity',
            message: `DB_LOCK_REFUSED (Item ${itemSku} has count = 0). Catalog Redis keys are stale.`,
            sku: itemSku,
            stock: item ? item.stock : 0,
            timestamp: new Date().toISOString()
        });
    }

    // Success condition: Decrement stock & create reservation
    item.stock -= 1;
    item.reserved += 1;
    const reservationId = 'res_inv_' + Math.random().toString(36).substring(2, 9);

    console.log(`[Inventory DB] Stock locked successfully for ${itemSku} (Remaining: ${item.stock}, Res: ${reservationId})`);

    res.status(200).json({
        status: 'LOCKED',
        sku: itemSku,
        itemName: item.name,
        reservationId,
        stockRemaining: item.stock,
        warehouse: 'US-WEST-1 (Warehouse Bay 4)',
        timestamp: new Date().toISOString()
    });
});

// Auto-Remediation / Self-Healing: Restock safety buffer & flush cache
app.post(['/inventory/remediate', '/remediate', '/inventory/restock'], (req, res) => {
    const skuToRestock = req.body?.sku || 'SKU-4402';
    if (inventoryStore[skuToRestock]) {
        inventoryStore[skuToRestock].stock = Math.max(100, inventoryStore[skuToRestock].stock + 100);
    }
    if (inventoryStore['SKU-4402']) {
        inventoryStore['SKU-4402'].stock = Math.max(100, inventoryStore['SKU-4402'].stock);
    }
    if (inventoryStore['SKU-8829'] && inventoryStore['SKU-8829'].stock < 100) {
        inventoryStore['SKU-8829'].stock += 1000;
    }
    console.log('[Inventory DB] Safety buffer refilled (+100 items). Catalog redis keys flushed.');
    res.status(200).json({
        status: 'REMEDIATED',
        sku: 'SKU-4402',
        stock: 100,
        message: 'Safety buffer refilled (+100 items). Catalog redis keys flushed.',
        timestamp: new Date().toISOString()
    });
});

// Reset Endpoint
app.post('/reset', (req, res) => {
    inventoryStore = JSON.parse(JSON.stringify(INITIAL_INVENTORY));
    console.log('[Inventory DB] Inventory store reset to initial state.');
    res.json({ status: 'RESET', inventory: inventoryStore });
});

function start(port = activePort) {
    activePort = port;
    return new Promise((resolve) => {
        const server = app.listen(port, () => {
            console.log(`[Inventory DB Service] Running on port ${port}`);
            resolve(server);
        });
    });
}

if (require.main === module) {
    start();
}

module.exports = { app, start };
