# ShopSmart API examples

Start the application with `npm run dev`, then send these requests through Bruno or another authorized API client.

## Health check

```http
GET http://localhost:3000/api/health
```

## Product list

```http
GET http://localhost:3000/api/products
```

## One product

```http
GET http://localhost:3000/api/products/1
```

## Create a simulated order

First call `GET http://localhost:3000/api/auth/me` and retain its session cookie and
`csrfToken`. Sign in with `POST /api/auth/login`, JSON email/password, the cookie,
`Origin: http://localhost:5173`, and `X-CSRF-Token` set to that token. Use credentials
from the private demo-account provisioning command, not a committed password.
Login rotates the session cookie and CSRF token; retain the new values. Send them
with the origin header on the order request below. Guests receive 401.

```http
POST http://localhost:3000/api/orders
Content-Type: application/json
Origin: http://localhost:5173
X-CSRF-Token: <token returned after login>
Cookie: <current session cookie from your API client's cookie jar>

{
  "customerName": "Ana Reyes",
  "email": "ana@example.com",
  "address": "Angeles City, Pampanga",
  "items": [
    { "productId": 1, "quantity": 1 },
    { "productId": 2, "quantity": 1 }
  ]
}
```

The server ignores prices from the browser and reads authoritative prices from PostgreSQL.
The owner is always the signed-in account. Delivery email or submitted user IDs
cannot grant ownership. `GET /api/orders` lists only your orders;
`GET /api/orders/:id` returns 404 for another customer's order. Both require the
session cookie. Log out with `POST /api/auth/logout`, the cookie, origin, and token.

## Ask the starter assistant

```http
POST http://localhost:3000/api/assistant/questions
Content-Type: application/json

{
  "question": "Which keyboard is below ₱2,000?"
}
```
