/**
 * AegisTrace - High-Traffic Load Testing Suite
 * Simulates concurrent orders through the full 5-stage microservices pipeline,
 * measures response times, percentiles, throughput, and verifies error rate < 5%.
 */

const BASE_URL = process.env.GATEWAY_URL || 'http://127.0.0.1:8000';

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const config = {
        orders: 50,
        concurrency: 10,
        chaos: false,
        autoHeal: true,
        url: BASE_URL
    };

    for (const arg of args) {
        if (arg.startsWith('--orders=')) {
            config.orders = parseInt(arg.split('=')[1], 10) || 50;
        } else if (arg.startsWith('--concurrency=')) {
            config.concurrency = parseInt(arg.split('=')[1], 10) || 10;
        } else if (arg.startsWith('--url=')) {
            config.url = arg.split('=')[1];
        } else if (arg === '--chaos') {
            config.chaos = true;
        } else if (arg === '--no-heal') {
            config.autoHeal = false;
        }
    }
    return config;
}

// Progress bar helper
function renderProgressBar(current, total, startTime, avgMs) {
    const width = 28;
    const progress = Math.min(1, current / total);
    const filled = Math.round(width * progress);
    const empty = width - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    const pct = (progress * 100).toFixed(0).padStart(3);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    process.stdout.write(`\r  [${bar}] ${pct}% | ${current}/${total} orders | ${elapsed}s | avg: ${avgMs || 0}ms `);
}

async function authenticate(targetUrl) {
    try {
        const res = await fetch(`${targetUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@aegistrace.com', password: 'password123' })
        });
        if (res.ok) {
            const data = await res.json();
            return data.token;
        }
    } catch (e) {
        // Fall back to internal header if direct login fails
    }
    return null;
}

async function runLoadTest() {
    const config = parseArgs();

    console.log('\n=================================================================');
    console.log('       ⚡ AegisTrace High-Traffic Concurrency Load Test ⚡       ');
    console.log('=================================================================');
    console.log(` Target Gateway    : ${config.url}`);
    console.log(` Total Orders      : ${config.orders}`);
    console.log(` Concurrency Pool  : ${config.concurrency} parallel workers`);
    console.log(` Chaos Injected    : ${config.chaos ? 'ENABLED' : 'DISABLED'}`);
    console.log(` Auto-Remediation  : ${config.autoHeal ? 'ENABLED (Target <= 1.0% Error)' : 'DISABLED'}`);
    console.log('-----------------------------------------------------------------');

    // Authenticate
    process.stdout.write(' Authenticating test runner with AegisTrace Gateway... ');
    const token = await authenticate(config.url);
    if (token) {
        console.log('OK (JWT acquired)');
    } else {
        console.log('Using internal bypass header (x-aegis-internal)');
    }

    const headers = {
        'Content-Type': 'application/json',
        'x-aegis-internal': 'true'
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Health check gateway
    try {
        const healthRes = await fetch(`${config.url}/api/system/status`);
        if (!healthRes.ok) {
            console.error(`\n[ERROR] Gateway at ${config.url} is not responding (HTTP ${healthRes.status}).`);
            process.exit(1);
        }
    } catch (e) {
        console.error(`\n[ERROR] Cannot connect to Gateway at ${config.url}: ${e.message}`);
        console.error('Make sure "node server.js" is running.');
        process.exit(1);
    }

    console.log('\n Starting concurrent load execution...\n');

    const latencies = [];
    let completedCount = 0;
    let successCount = 0;
    let failedCount = 0;
    let totalHeals = 0;

    let queueIndex = 0;
    const testStartTime = Date.now();

    async function worker(workerId) {
        while (queueIndex < config.orders) {
            const orderIndex = queueIndex++;
            const startOrder = Date.now();

            const orderPayload = {
                customer: `LoadClient-${orderIndex + 1}`,
                sku: 'SKU-8829',
                card: '4111 •••• •••• 1111',
                zip: '90210',
                scenario: 'healthy',
                autoHeal: config.autoHeal,
                chaos: config.chaos
            };

            try {
                const response = await fetch(`${config.url}/api/pipeline/execute`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(orderPayload)
                });

                const latency = Date.now() - startOrder;
                latencies.push(latency);
                completedCount++;

                if (response.ok) {
                    const data = await response.json();
                    successCount++;
                    if (data.selfHealed) {
                        totalHeals += (data.healedServices?.length || 1);
                    }
                } else {
                    failedCount++;
                }
            } catch (err) {
                const latency = Date.now() - startOrder;
                latencies.push(latency);
                completedCount++;
                failedCount++;
            }

            const currentAvg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
            renderProgressBar(completedCount, config.orders, testStartTime, currentAvg);
        }
    }

    const workers = [];
    for (let w = 0; w < config.concurrency; w++) {
        workers.push(worker(w));
    }
    await Promise.all(workers);

    const totalDuration = Date.now() - testStartTime;
    process.stdout.write('\n\n');

    // Compute metrics
    latencies.sort((a, b) => a - b);
    const sum = latencies.reduce((acc, v) => acc + v, 0);
    const avgLatency = latencies.length ? +(sum / latencies.length).toFixed(1) : 0;
    const minLatency = latencies.length ? latencies[0] : 0;
    const maxLatency = latencies.length ? latencies[latencies.length - 1] : 0;
    const p50 = latencies.length ? latencies[Math.floor(latencies.length * 0.50)] : 0;
    const p90 = latencies.length ? latencies[Math.floor(latencies.length * 0.90)] : 0;
    const p95 = latencies.length ? latencies[Math.floor(latencies.length * 0.95)] : 0;
    const p99 = latencies.length ? latencies[Math.floor(latencies.length * 0.99)] : 0;

    const errorRate = +((failedCount / config.orders) * 100).toFixed(2);
    const successRate = +((successCount / config.orders) * 100).toFixed(2);
    const throughput = +((config.orders / (totalDuration / 1000))).toFixed(1);

    // Format output table
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                   LOAD TESTING RESULTS SUMMARY                ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`║  Total Orders Simulated   : ${String(config.orders).padEnd(33)} ║`);
    console.log(`║  Successful Transactions  : ${String(successCount).padEnd(33)} ║`);
    console.log(`║  Failed Transactions      : ${String(failedCount).padEnd(33)} ║`);
    console.log(`║  Success Rate             : ${String(successRate + '%').padEnd(33)} ║`);
    console.log(`║  Service Error Rate       : ${String(errorRate + '%').padEnd(33)} ║`);
    console.log(`║  Throughput               : ${String(throughput + ' req/sec').padEnd(33)} ║`);
    console.log(`║  Total Test Duration      : ${String(totalDuration + ' ms (' + (totalDuration/1000).toFixed(2) + 's)').padEnd(33)} ║`);
    console.log(`║  Autonomous Heals Fired   : ${String(totalHeals).padEnd(33)} ║`);
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log('║                   LATENCY PERCENTILES (Round-Trip)            ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`║  Minimum Latency (Min)    : ${String(minLatency + ' ms').padEnd(33)} ║`);
    console.log(`║  Average Latency (Mean)   : ${String(avgLatency + ' ms').padEnd(33)} ║`);
    console.log(`║  Median Latency (p50)     : ${String(p50 + ' ms').padEnd(33)} ║`);
    console.log(`║  90th Percentile (p90)    : ${String(p90 + ' ms').padEnd(33)} ║`);
    console.log(`║  95th Percentile (p95)    : ${String(p95 + ' ms').padEnd(33)} ║`);
    console.log(`║  99th Percentile (p99)    : ${String(p99 + ' ms').padEnd(33)} ║`);
    console.log(`║  Maximum Latency (Max)    : ${String(maxLatency + ' ms').padEnd(33)} ║`);
    console.log('╚═══════════════════════════════════════════════════════════════╝');

    // Target Verification: error rate <= 1.0% (1 or less than 1)
    const targetMet = errorRate <= 1.0;
    console.log('\n--- Stability & SLA Target Verification ---');
    if (targetMet) {
        console.log(`  [PASS] Service Error Rate (${errorRate}%) is STRICTLY <= 1.0% (Target: 1 or less than 1).`);
        console.log(`  [PASS] AegisTrace successfully preserved transaction integrity under ${config.concurrency} concurrent workers.`);
        console.log('\n=================================================================\n');
        return { success: true, report: { config, errorRate, successRate, throughput, latencies: { min: minLatency, avg: avgLatency, p50, p90, p95, p99, max: maxLatency }, totalDuration, totalHeals } };
    } else {
        console.log(`  [FAIL] Service Error Rate (${errorRate}%) exceeded maximum threshold (<= 1.0%).`);
        console.log('\n=================================================================\n');
        if (require.main === module) process.exit(1);
        return { success: false, errorRate };
    }
}

if (require.main === module) {
    runLoadTest().then((result) => {
        if (!result || !result.success) process.exit(1);
    });
}

module.exports = { runLoadTest };
