# eSeller Store Bay

## Hostinger deployment

This project is configured to run on standard Node.js hosting, including Hostinger.

Use these settings in Hostinger:

- Install command: `npm install`
- Build command: `npm run build`
- Start command: `npm run start`
- Node.js version: current LTS supported by Next.js 16

Required environment variables:

```env
NEXT_PUBLIC_SITE_URL=https://esellersstorebay.com
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
RESEND_API_KEY=...
```

Supabase auth settings:

- Site URL: `https://esellersstorebay.com`
- Redirect URL: `https://esellersstorebay.com/auth/callback`
- Optional redirect URL: `https://www.esellersstorebay.com/auth/callback`

Local development:

```bash
npm install
npm run dev
```
