# ShopSmart hosted test record

Date: November 20, 2026 (Asia/Manila). Site:
https://shopsmart.13.251.6.115.sslip.io

This record distinguishes screenshots from results reported by the tester.
Authentication checks were performed on the `5ac0a07` release. The subsequent
deployment of `main` at `6174e37` has a separate status screenshot and order-list
check; not every earlier test was repeated after that deployment.

Selected screenshots are included in the [evidence index](evidence/README.md).
Fresh checks of the final hosted site are saved in
[hosted-checks.json](evidence/hosted-checks.json) and
[browser-checks.json](evidence/browser-checks.json).

| Check and expected result | Observation | Evidence / result |
| --- | --- | --- |
| Homepage and direct product route load | Catalog and keyboard detail displayed | Earlier hosted screenshots; passed |
| Readiness responds successfully | `/api/ready` returned `{"status":"ok"}` | Earlier hosted screenshot; passed |
| Valid customer can sign in and check out | Customer 1 created order #6: one study lamp, PHP900 | Order-detail screenshot; passed |
| Second customer can create a separate order | Order #7: one webcam, PHP1,450 | Confirmation and detail screenshots; passed |
| Customer 2 cannot view customer 1 order page | `/orders/6` displayed account-specific not-found message | Screenshot; passed |
| Customer 2 cannot read customer 1 order through API | `/api/orders/6` returned `ORDER_NOT_FOUND` without order data | JSON screenshot; passed; HTTP status not captured |
| Signed-out visitor cannot read order API | `/api/orders` returned `AUTH_REQUIRED` without orders | JSON screenshot; passed; HTTP status not captured |
| Signed-out visit to order history requires login | Tester reported redirect to login | Tester confirmation; passed |
| Wrong password is rejected | Tester reported expected rejection | Tester confirmation; passed |
| Session survives API restart | Tester remained signed in after restart and refresh | Tester confirmation; passed |
| Cart and delivery draft survive sign-in navigation | Tester reported preserved values | Tester confirmation; passed |
| Original guest orders survive authentication migration | SQL showed orders #2 and #3 at PHP1,850 each with null userId | SQL screenshot; passed |
| New orders have separate owners | SQL showed #6 userId 1 and #7 userId 2 | SQL screenshot; passed |
| Quantity changes calculate correct subtotal | Eight study lamps at PHP900 displayed PHP7,200 | Screenshot; passed |
| Quantity above available stock is refused | Typing 9 showed only 8 available and retained quantity 8 | Screenshot; passed for frontend validation |
| Removing last item clears cart | Count 0, removal message, empty-cart view | Screenshot; passed |
| Supported assistant query cites matching product | Keyboard below PHP2,000 returned PHP1,850 keyboard and working link | Earlier hosted screenshot and tester confirmation; passed in catalog mode |
| Unsupported assistant query gives clear no-match result | Rubik cube request returned no in-stock match | Earlier hosted screenshot; passed |
| Initial deployment recovers after EC2 reboot | Earlier container status and saved-order query showed recovery | Pre-authentication screenshots; passed for earlier release only |
| Final main release runs the intended images | API/web tagged `6174e37`, API/database healthy, web up, migration exit 0 | Final Compose screenshot; passed |
| Existing customer data remains after main deployment | Customer 1 order list still showed #6 at PHP900 | Final order-list screenshot; passed |

## Pending or limited verification

### Additional checks completed on the final hosted site

- Health and readiness: HTTP 200, status ok; product catalog API: HTTP 200.
- Guest `/api/orders` and `/api/orders/6`: HTTP 401, AUTH_REQUIRED.
- Logout without CSRF: HTTP 403, INVALID_CSRF; no customer was signed in.
- Empty assistant question: HTTP 422, INVALID_QUESTION.
- Keyboard below PHP2,000: HTTP 200, catalog mode, PHP1,850 keyboard, source ID 2.
  Rubik cube: HTTP 200, no_match, no recommended products.
- Direct `/products/2` load and browser refresh: HTTP 200 both times; product
  rendered. Fresh guest `/orders` navigation redirected to `/login`.
- Nine local assistant tests passed, including mocked provider failures and
  invalid-draft fallback. This is not a live provider-failure test on AWS.
- The online [dependency review](AWS_DEPENDENCY_REVIEW.md) is complete; ten
  package findings remain unresolved.

### Remaining limitations

- Guest authentication status is now verified as HTTP 401. The earlier signed-in
  cross-account screenshot establishes ORDER_NOT_FOUND but does not capture its
  HTTP status; repeating this check requires a private customer session.
- Verify invalid/excess quantities through the hosted API. The cart screenshots
  establish frontend validation, not direct server enforcement.
- Test assistant failure/timeout behavior on the hosted release. Successful
  catalog responses do not establish a live AI-provider call or failure handling.
- Review relevant hosted logs for useful errors and absence of secrets; do not
  share raw environment files or expanded Compose configuration.
- Session expiry, missing-CSRF rejection, and login rate limits were covered in
  local validation but do not have fresh hosted evidence in this record.
- A reboot of the final authenticated release and a restore test of the actual
  server backup have not been evidenced. API restart persistence did pass.
- Confirm the instructor can reach HTTPS under the current IP restriction.

## Billing evidence

Supplied screenshots establish Free plan status, US$35.01 billing-home cost,
US$35.02 budget usage against a US$10 target, and US$84.08 estimated credits
remaining. These account totals cover ShopSmart and SAM10 together. See the
[deployment report](AWS_DEPLOYMENT_REPORT.md) for details and evidence handling.
