# Restaurant Menu Template — Appwrite + GitHub

A reusable, mobile-first Next.js restaurant menu frontend with an Appwrite backend.

## Stack
- GitHub: source code and version history.
- Appwrite Cloud: TablesDB, Storage, and the Menu API Function.
- No Vercel, Supabase, or Cloudflare backend is used.

## Included
- Arabic/English customer menu with RTL support.
- Cart with quantity controls and WhatsApp checkout.
- Appwrite TablesDB schema for categories, products, orders, order items, staff profiles, restaurant settings, and image library.
- Appwrite Storage bucket for menu assets.
- Appwrite Function API for menu reads, manager login, staff management, product/category CRUD, and order creation.
- Staff roles: manager and staff; staff profiles store salted scrypt password hashes (never plaintext).
- 30 reusable image-library assets: 10 each for Popular, Main dishes, and Drinks. These current starter assets are SVG illustrations; replace them with real food photography when ready.
- Product form image picker filters the library by selected category.

## Appwrite resources
- Organization: `scan-it`
- Project: `pizza-royal-menu`
- Database: `menu-db`
- Storage bucket: `menu-images`
- Function: `menu-api`

## One-time Appwrite setup
The Appwrite Function uses a restricted API key for TablesDB access. Create an API key in the Appwrite Console:
1. Open Project Settings → API Keys.
2. Create a key named `Menu API Tables Access`.
3. Grant only `rows.read` and `rows.write`.
4. Copy the key into Function → `menu-api` → Variables as the secret value for `MENU_API_KEY` (replace the placeholder).

The function also has two secret variables, `MENU_SESSION_SECRET` and `MENU_BOOTSTRAP_SECRET`. Do not expose them in frontend code or commit them to GitHub.

After the API key is saved, run the one-time manager bootstrap through the function with action `bootstrap`, the `X-Bootstrap-Secret` header, and a manager username/password. The bootstrap secret is only for the first manager and the endpoint locks after the first account exists.

## Local frontend
```bash
npm install
npm run dev
```

The Appwrite Web platform currently allows `localhost`. Add your eventual Appwrite Site hostname to the project Web Platforms list before publishing the frontend.

## Notes
- The Appwrite Function source is in `appwrite/functions/menu-api`.
- The frontend calls the Appwrite Function directly; no separate API server is required.
- Do not put the Appwrite API key or function secrets in `NEXT_PUBLIC_*` variables or browser code.
