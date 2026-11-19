# Restaurant Menu Template — Frontend Only

A reusable, mobile-first Next.js restaurant menu frontend.

## Included
- Customer landing page and Arabic/English menu with RTL support.
- Product categories, prices, size options, and sample menu data.
- Cart with quantity controls, browser local-storage persistence, and WhatsApp checkout.
- Responsive admin and staff dashboard user interfaces.
- Built-in SVG image library: 10 illustrations each for Popular, Main dishes, and Drinks.
- Restaurant branding and contact settings in `src/lib/config.ts`.

## Not included
- No API server or backend.
- No database or migrations.
- No authentication service or live staff-account management.
- No Cloudflare Workers or Cloudflare deployment configuration.
- The admin screens are frontend UI only until a new backend is connected.

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000.

## Customize
Edit `src/lib/config.ts` for restaurant name, logo, colors, phone, WhatsApp, address, maps, reviews, social links, and InstaPay.
Edit `src/lib/menu.ts` for the local sample menu.

This repository is intentionally frontend-only. The next backend integration will be built separately using Supabase.
