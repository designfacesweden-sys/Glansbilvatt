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
| `NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY` | *(from [web3forms.com](https://web3forms.com))* |

6. Click **Deploy**

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
- Booking emails need `NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY` (or FormSubmit activation once)
