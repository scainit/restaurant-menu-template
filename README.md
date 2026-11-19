# Restaurant Menu Template

Reusable, mobile-first restaurant website starter. Each restaurant will have its own deployment and data.

## Included in the first frontend phase
- Restaurant landing page with contact, location, review, social and InstaPay links (configured in `src/lib/config.ts`).
- Menu categories and product cards.
- Fixed-price products and products with size options.
- Cart, quantity changes, remove items and total.
- WhatsApp checkout message with item, size, quantity and total.
- English/Arabic toggle with RTL layout.
- Unavailable products are hidden using the `available` field.

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000.

## Customize
Edit `src/lib/config.ts` for restaurant identity and links. Edit `src/lib/menu.ts` for sample menu data.

## Next implementation phases
1. Persist cart between refreshes.
2. Employee login and protected admin dashboard (products, categories, menu settings).
3. Cloudflare D1 persistence and Cloudflare R2 image uploads.
4. Secure API authorization, rate limiting and deployment configuration.

**Important:** This commit is the frontend starter only. Authentication, admin CRUD, database persistence, secure API routes and R2 uploads are not implemented yet. Do not use it for real restaurant operations until those phases are complete.
