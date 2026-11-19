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
