# Deploy to Vercel

This is a Next.js app. Host it on **Vercel**, not GitHub Pages.

## 1. Deploy from GitHub (easiest)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Sign in with GitHub
3. Import **`designfacesweden-sys/Glansbilvatt`**
4. Framework preset: **Next.js** (auto-detected)
5. Add environment variables:

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SITE_URL` | `https://glansigbiltvatteskilstunaab.se` |
| `NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY` | Your key from step below |

### Booking emails (free, ~2 minutes, once)

1. Open [web3forms.com](https://web3forms.com)
2. Enter **`glansbiltvatt@gmail.com`** and create a form
3. Copy the **Access Key** into `.env.local` and Vercel (same variable name as above)
4. Redeploy if the site is already live

Each booking from **Tjänster → Boka tid** sends the full order to your Gmail and a confirmation to the customer. No SMTP passwords, no extra server setup.

6. Click **Deploy** on Vercel

## 2. Connect your domain

1. In the Vercel project → **Settings → Domains**
2. Add `glansigbiltvatteskilstunaab.se` and `www.glansigbiltvatteskilstunaab.se`
3. At your domain registrar, set DNS as Vercel shows (usually):

   - **A** `@` → `76.76.21.21`
   - **CNAME** `www` → `cname.vercel-dns.com`

4. Remove GitHub Pages DNS / unpublish GitHub Pages so they don’t conflict
5. Wait for DNS (can take minutes–hours), then enable HTTPS in Vercel (automatic)

## 3. After deploy

- Site URL: `https://glansigbiltvatteskilstunaab.se`
- Bookings need `NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY` (see above)
