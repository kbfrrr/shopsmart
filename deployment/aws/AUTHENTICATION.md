# Customer sign-in and private orders

The customer-auth branch adds `/login`, `/orders`, and `/orders/:id` using the
existing ShopSmart styling. Browsing, the assistant, and building a cart remain
public. Checkout and all order API routes require a signed-in customer.

## Account and session behavior

- Two fictional customer accounts are provisioned privately through an administrator
  command. There is no public registration or password-reset feature.
- Passwords use individually salted scrypt hashes (`N=65536`, `r=8`, `p=2`). Login
  work is bounded to two simultaneous derivations; excess attempts receive 429.
- Sessions are stored in PostgreSQL, with an eight-hour cookie lifetime. Cookies are
  HttpOnly and SameSite=Lax, and Secure in production. Login replaces the session ID;
  logout destroys it. Keep `SESSION_SECRET` stable so sessions survive API restarts.
- Authenticated writes require both the configured frontend Origin and the session's
  `X-CSRF-Token`. Login is limited to ten attempts per IP per fifteen minutes.
- Delivery email does not establish ownership. The server assigns the signed-in
  user ID when creating an order and filters every private read by that ID.
- Existing guest orders, including the deployed orders #2 and #3, remain saved with
  no user ID. They are deliberately absent from every customer's order history.
  The migration does not delete products, orders, or order items, or assign old
  orders to a customer based on email.
- Checkout draft details remain in React memory during the sign-in flow. Logout
  clears the cart/draft. Refresh still clears the cart, as in the starter. Tokens
  and passwords are never written to browser local storage.

## Upgrade the existing EC2 deployment

Review and push this branch first. On ShopSmart's server, back up PostgreSQL using
the deployment README. Keep the old release images and record the current commit.
Update the checkout to the reviewed customer-auth commit; leave SAM10 unchanged.

The existing deployment `.env` needs one new secret. From the repository root,
run this once; it preserves any nonempty existing secret and never prints it:

```bash
umask 077
python3 - <<'PY'
from pathlib import Path
import secrets
path = Path('deployment/aws/.env')
lines = path.read_text().splitlines()
existing = next((line.split('=', 1)[1].strip() for line in lines if line.startswith('SESSION_SECRET=')), '')
if not existing:
    lines = [line for line in lines if not line.startswith('SESSION_SECRET=')]
    lines.append('SESSION_SECRET=' + secrets.token_hex(32))
    path.write_text('\n'.join(lines) + '\n')
    path.chmod(0o600)
print('Session secret is configured; its value was not displayed.')
PY
```

Update `SHOPSMART_IMAGE_TAG` in the private `.env` to the new short commit, leaving
the database password and hostname unchanged. Validate with `config --quiet` and
build `api` and `web` sequentially as documented in the deployment README.

During the maintenance window, stop only this project's web/API and apply the
committed migration. PostgreSQL keeps running and retains its named volume:

```bash
sudo docker compose --env-file deployment/aws/.env -f deployment/aws/compose.yaml stop web api
sudo docker compose --env-file deployment/aws/.env -f deployment/aws/compose.yaml run --rm migrate
```

After migration succeeds, provision the customers in a private interactive terminal:

```bash
sudo docker compose --env-file deployment/aws/.env -f deployment/aws/compose.yaml run --rm --no-deps api npm run demo:accounts --workspace backend
```

The command creates `customer.test1@example.com` and `customer.test2@example.com`, asking
for each password twice with input hidden. Use separate passwords of 12–128
characters. It skips existing accounts without changing their passwords. Running
it again is safe if an earlier run created only the first account. Do not use `-T`,
paste passwords into chat, or put them in command arguments or Git.

Then start the new release:

```bash
sudo docker compose --env-file deployment/aws/.env -f deployment/aws/compose.yaml up -d --no-build
sudo docker compose --env-file deployment/aws/.env -f deployment/aws/compose.yaml ps -a
```

Migration failure or absent `SESSION_SECRET` must be resolved before publishing.
Never run the destructive seed or delete volumes to fix authentication. Backward
code rollback requires care: the old starter permits guest checkout. Keep the site
restricted during rollback rather than assuming the old release enforces ownership.

## API checks

`GET /api/auth/me` returns `{user: null, csrfToken}` for a guest, or the customer's
public ID/name/email and a CSRF token when signed in. Retain the cookie jar and send
the returned token in `X-CSRF-Token`, plus `Origin` equal to `FRONTEND_URL`, for login,
logout, and order creation. A successful login returns a new token; use that one.
No response includes a password hash.

| Endpoint | Expected behavior |
| --- | --- |
| `POST /api/auth/login` | 200 on valid credentials; 401 generic invalid credentials; 422 invalid fields; 429 excessive attempts |
| `POST /api/auth/logout` | 204; previous session becomes unusable |
| `GET /api/orders` | Customer's most recent 50 orders only; guest 401 |
| `GET /api/orders/:id` | Owner 200; other customer or missing order 404; guest 401; invalid ID 400 |
| `POST /api/orders` | Authenticated customer 201; guest 401; bad CSRF/origin 403; invalid quantities 422 or insufficient stock 409 |

Record a fresh hosted retest for both customers, direct API access to another
customer's order, wrong passwords, logout, expiry, missing CSRF, login rate limits,
checkout returning from sign-in, and session persistence across an API restart.
Confirm orders #2/#3 still exist through the administrator's read-only database
check, while neither customer's history exposes them. The earlier catalog, cart,
and deployment tests remain relevant. Public release also needs the separate
dependency-audit review already recorded in the deployment README.

## Local verification

`npm run check` runs lint, unit tests, and the frontend build. The real PostgreSQL
integration test requires `TEST_DATABASE_URL` pointing to an isolated disposable
database whose name ends in `_auth_test`, with committed migrations already applied.
It creates fictional fixtures and expires sessions in that dedicated database;
never point it at a developer's normal database or AWS. Without that explicit URL
the integration test is skipped, not counted as a pass.

In an authorized local test shell, set `DATABASE_URL` and `TEST_DATABASE_URL` to
that disposable target, run `prisma migrate deploy`, then run the backend tests.
The integration test covers cookie flags, login rotation, CSRF/origin rejection,
ownership and spoofed user IDs, old guest orders, stock checks, logout, expiry,
session restoration in a fresh app instance, and login rate limits.

Validation on November 20, 2026: both lint checks, 43 unit tests, and the Vite build
passed. The PostgreSQL integration suite also passed separately (44 tests total
across the frontend and backend with the integration database supplied). Browser
checks verified the guest-to-checkout flow, session expiry retaining the delivery
draft, order creation/details/history, refresh, logout, and cross-customer denial;
desktop and mobile layouts were inspected. Both deployment images built.

A disposable production-image test upgraded the original release schema while
preserving an unowned guest order. It verified sign-in through Caddy over TLS with
certificate validation, Secure/HttpOnly cookies, and session persistence across an
API restart. Test databases, containers, and browser/server processes were removed.
These are local results; AWS authentication deployment and hosted retests remain
pending until the branch is reviewed and released.
