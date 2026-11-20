# ShopSmart classroom release note

Release date: November 20, 2026. Hosted branch: `main`. Commit: `6174e37`.

Site: https://shopsmart.13.251.6.115.sslip.io

ShopSmart is deployed on a separate AWS EC2 instance with a React frontend,
Express API, PostgreSQL database, and Caddy HTTPS entry point. Checkout is simulated
and collects no actual payment. The assistant uses catalog-based responses;
a live external-provider call has not been verified.

## Improvement 1: customer sign-in and private orders

The earlier deployed starter allowed guest checkout without customer-owned order
history. The release adds sign-in, sign-out, protected checkout, and order history
filtered by the signed-in account. Passwords use salted scrypt hashes. Sessions
are stored in PostgreSQL, and authenticated writes require CSRF validation.

Retest: customer 1 created order #6 and customer 2 created order #7. Customer 2
could not read order #6 through either the page or direct API. Signed-out API
access was refused. The tester confirmed wrong-password rejection, sign-out
redirects, cart/draft preservation during sign-in, and session persistence after
an API restart. SQL confirmed old guest orders remained unowned and saved.

The deployed customer emails are `customer.test1@example.com` and
`customer.test2@example.com`. Passwords were set privately and are excluded from
this release note. There is no public registration or password reset page.

## Improvement 2: correct Docker source ownership

The authentication migration initially failed with `EACCES` when the non-root
container user tried to read `/app/backend/package.json`. Restrictive checkout
permissions were preserved by Docker COPY while the copied files belonged to root.
The Dockerfile now uses `COPY --chown=node:node` for application manifests,
backend source, and Prisma files.

Retest: the rebuilt API image successfully ran the authentication migration on
AWS. A local regression also built with restrictive file permissions and verified
migrations and API startup as the non-root user. The final main-release screenshot
shows migration exit code 0, healthy API/database, and a running web container.

These are two documented improvement candidates for the exam requirement.
Confirm their fit against any separate instructor rubric not included in the
deployment learning guide.

## Release and data preservation

Both application images use tag `6174e37`. The EC2 checkout tracks `origin/main`.
An existing nonempty PostgreSQL backup was created before the authentication
upgrade. Committed migrations were applied without a destructive seed or volume
deletion. Orders #2 and #3 remained saved, and orders #6 and #7 have different
account owners. Order #6 remained listed after deployment from main.

## Limits and follow-up

This is a classroom deployment with fictional data. HTTPS access was restricted
to the testing IP; instructor access needs confirmation. Local automated results
and hosted observations are recorded separately in the
[test record](AWS_TEST_RECORD.md). Some hosted failure-path checks, private log
review and backup recovery evidence remain limited as documented there. The
[dependency review](AWS_DEPENDENCY_REVIEW.md) is complete and records ten unresolved
package findings; dependency remediation has not been deployed.

The AWS account also hosts SAM10. Recorded spending and available credits cover
both websites and should not be presented as ShopSmart-only costs. Keep the
websites available through November 30, 2026, and confirm grading before removing
resources. See the [deployment report](AWS_DEPLOYMENT_REPORT.md).
