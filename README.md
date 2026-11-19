# Restaurant Menu Template

Reusable, mobile-first restaurant website starter. Each restaurant should receive its own deployment, database, storage bucket, and staff credentials.

## Current implementation
- Customer landing page with contact, location, review, social and InstaPay links configured in `src/lib/config.ts`.
- Arabic/English menu with RTL support.
- Product categories, fixed prices, and size-based prices.
- Cart with quantity changes, remove items, total, and WhatsApp checkout.
- Cart persistence in browser local storage.
- Customer menu reads from the Cloudflare API, with local sample fallback.
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
- Frontend Pages project: `restaurant-menu-template`

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000.

## Customize a restaurant
Edit `src/lib/config.ts` for the restaurant name, logo, colors, WhatsApp number, phone, address, maps, reviews, socials and InstaPay link. Replace the sample menu records in D1 for a real restaurant. Each customer deployment must use its own database and its own restaurant identifier/configuration.

## Pending before production use
- Activate R2 on the Cloudflare account, then create and bind the image bucket. Image upload is not active yet.
- Complete the first frontend build/deployment and verify the live Pages URL.
- Verify login, password change, session cookies, CRUD and browser CORS against the deployed frontend.
- Add persistent login rate limiting and CSRF/origin enforcement before exposing staff login publicly.
- Add size-option editing and category visibility/reordering controls in the dashboard.
- Generate a restaurant QR code after the final customer URL is confirmed.

Do not treat the site as production-ready until the pending checks above are complete. Never commit real passwords, API tokens, or customer secrets.
