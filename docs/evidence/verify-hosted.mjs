// Non-destructive hosted checks. No credentials, cookies or CSRF tokens are saved.
import { writeFile } from 'node:fs/promises';
const base = 'https://shopsmart.13.251.6.115.sslip.io';
const checks = [];
async function check(path, expected, body) {
  const response = await fetch(base + path, {
    signal: AbortSignal.timeout(15000),
    ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify(body) } : {})
  });
  const result = await response.json();
  checks.push({ path, method: body ? 'POST' : 'GET', expectedStatus: expected,
    status: response.status, passed: response.status === expected,
    result: path === '/api/products' ? { productCount: Array.isArray(result) ? result.length : result.products?.length } : result });
}
await check('/api/health', 200);
await check('/api/ready', 200);
await check('/api/products', 200);
await check('/api/orders', 401);
await check('/api/orders/6', 401);
await check('/api/auth/logout', 403, {});
await check('/api/assistant/questions', 422, { question: '' });
await check('/api/assistant/questions', 200, { question: 'Which keyboard is below PHP 2000?' });
await check('/api/assistant/questions', 200, { question: 'Do you sell a Rubik cube?' });
const report = { checkedAt: new Date().toISOString(), base, credentialsUsed: false, checks };
await writeFile(new URL('hosted-checks.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(checks.map(({path,status,passed}) => `${passed ? 'PASS' : 'FAIL'} ${status} ${path}`).join('\n'));
if (checks.some(c => !c.passed)) process.exitCode = 1;
