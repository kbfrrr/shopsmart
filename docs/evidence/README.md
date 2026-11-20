# Submission evidence

Evidence date: November 20, 2026. Manual observations came from the tester’s
screenshots and confirmations. Fresh hosted checks use no customer credentials
and create no orders.

| File | Evidence |
| --- | --- |
| [01-main-containers.png](01-main-containers.png) | Main images 6174e37, healthy API/database, migration exit 0, web running |
| [02-main-order-history.png](02-main-order-history.png) | Order #6 remains after deployment |
| [03-cross-account-api-denial.png](03-cross-account-api-denial.png) | Customer 2 receives ORDER_NOT_FOUND for customer 1 order #6 |
| [04-guest-api-denial.png](04-guest-api-denial.png) | Guest receives AUTH_REQUIRED without orders |
| [05-preserved-orders.png](05-preserved-orders.png) | Guest orders #2/#3 and separate owners for #6/#7; password-reset messages contain no passwords |
| [06-stock-validation.png](06-stock-validation.png) | Excess quantity refused; quantity 8 and PHP7,200 retained |
| [07-empty-cart.png](07-empty-cart.png) | Removal leaves count 0 and empty-cart state |
| [08-free-plan-costs.png](08-free-plan-costs.png) | Free plan, US$35.01 cost, forecast unavailable; account header cropped out |
| [09-credit-summary.png](09-credit-summary.png) | US$120 issued, US$84.08 estimated remaining, US$35.92 estimated used; IDs excluded |
| [10-credit-expiry.png](10-credit-expiry.png) | Both expiration dates; credit-ID column excluded |
| [11-hosted-route-refresh.png](11-hosted-route-refresh.png) | Hosted product page after direct navigation and refresh |
| [hosted-checks.json](hosted-checks.json) | Nine HTTP checks including guest/CSRF denial and assistant input validation |
| [browser-checks.json](browser-checks.json) | Product HTTP 200 on load/refresh; guest orders redirect to login |
| [backend-audit.json](backend-audit.json) | Online dependency audit |

Billing and credit evidence covers **both ShopSmart and SAM10**. Credit expiration
does not prove the Free plan end date. Values are observations from the supplied
screenshots, not a live balance guarantee.

To repeat the non-destructive API checks from the repository root with Node 20.19+
and internet access: `node docs/evidence/verify-hosted.mjs`. It replaces
hosted-checks.json with fresh results. No passwords, cookies or CSRF tokens are
saved, and no checkout or stock mutation is sent.
