# Restaurant Menu Template

Reusable, mobile-first restaurant website starter. Each restaurant should receive its own deployment, database, storage bucket, and staff credentials.

## Current implementation
- Customer landing page with contact, location, review, social and InstaPay links configured in `src/lib/config.ts`.
- Arabic/English menu with RTL support.
- Product categories, fixed prices, and size-based prices.
- Cart with quantity changes, remove items, total, and WhatsApp checkout.
- Cart persistence in browser local storage.
- Customer menu reads from the Cloudflare API.
- Built-in GitHub-hosted SVG image library: 10 selectable illustrations each for Popular, Main dishes, and Drinks (30 total); staff selects an image instead of uploading files.
- Product image selection is stored in D1 using `image_key`; the API resolves the public GitHub image URL.
- Staff sign-in at `/admin` using a username (not email).
- First-login password replacement.
- D1-backed admin CRUD for categories and products.
- PBKDF2-SHA256 password hashing and hashed, expiring session tokens.
- API Worker source in `workers/api/src/index.js`.
- D1 schema in `migrations/0001_initial.sql`.

## Current Cloudflare resources
- D1 database: `restaurant-menu-template-db`
- API Worker: `restaurant-menu-api`
- API URL: `https://restaurant-menu-api.scan-it500.workers.dev`
- Customer/admin frontend Worker: `restaurant-menu-site`
- Frontend URL: `https://restaurant-menu-site.scan-it500.workers.dev`
- Admin URL: `https://restaurant-menu-site.scan-it500.workers.dev/admin`


## Staff administration and recovery

- Staff sign-in is served at `/admin` (there is no separate public `/staff` login route).
- Managers can manage accounts at `/admin/staff`; staff-role accounts have read-only menu access.
- The API enforces manager authorization on all category/product mutations and all staff-management endpoints.
- New accounts use PBKDF2-SHA256 with 310,000 iterations, a random per-account salt, and must change their temporary password at first sign-in.
- Password resets revoke all existing sessions for that account. Disabling an account also revokes its sessions.
- The one-time owner bootstrap endpoint is `POST /api/auth/bootstrap`. It requires the Worker secret `BOOTSTRAP_SECRET`, is rate-limited, and can be consumed only once using the `bootstrap_state` D1 guard.
- Before deploying the API changes, apply `migrations/0002_staff_management_bootstrap.sql` to the production D1 database, then set `BOOTSTRAP_SECRET` as a Worker secret in Cloudflare. Generate a high-entropy value locally (for example `openssl rand -hex 32`); do not commit it or send it in chat.
- After deployment, call the bootstrap endpoint once with `X-Bootstrap-Secret` and the intended manager username, display name, and temporary password. The route creates the initial manager and forces a password change. It returns a conflict after the one-time claim is consumed.
- Remove the `BOOTSTRAP_SECRET` Worker secret in Cloudflare after successful bootstrap. The D1 consumed-state guard remains as a second layer of protection.
- Do not expose the bootstrap credential in frontend code, query strings, logs, screenshots, or source control.

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000.

## Customize a restaurant
Edit `src/lib/config.ts` for the restaurant name, logo, colors, WhatsApp number, phone, address, maps, reviews, socials and InstaPay link. Replace the sample menu records in D1 for a real restaurant. Each customer deployment must use its own database and its own restaurant identifier/configuration.

## Pending before production use
- Complete browser-based end-to-end verification of login, first password change, session cookies, category/product CRUD, image selection, cart persistence, and WhatsApp checkout.
- Confirm first-time staff credentials/reset process before handing over the dashboard.
- Review login rate limiting and add CSRF/origin enforcement before exposing staff login publicly.
- Add size-option editing and category visibility/reordering controls in the dashboard.
- Generate a restaurant QR code after the final customer URL is confirmed.

R2 is intentionally not required: menu artwork is stored in the GitHub repository and served from GitHub's raw content host.

Do not treat the site as production-ready until the pending checks above are complete. Never commit real passwords, API tokens, or customer secrets.
