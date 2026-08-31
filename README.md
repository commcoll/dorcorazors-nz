# DORCO Razors NZ — Static Site

Static rebuild of dorcorazors.co.nz for Cloudflare Pages.

## Pages

| File | URL |
|---|---|
| `index.html` | `/` — Home |
| `products.html` | `/products` |
| `men.html` | `/men` |
| `women.html` | `/women` |
| `about.html` | `/about-us` |
| `technology.html` | `/our-technology` |
| `contact.html` | `/contact-us` |
| `faq.html` | `/faq` |
| `terms.html` | `/terms-conditions` |
| `privacy.html` | `/privacy-policy` |
| `return-policy.html` | `/return-policy` |

## Deploy to Cloudflare Pages

1. In the Cloudflare dashboard → Pages → Create a project
2. Connect to this GitHub repo
3. Build settings:
   - **Framework preset**: None
   - **Build command**: *(leave blank)*
   - **Build output directory**: `/` (root)
4. Deploy

The `_redirects` file handles URL redirects for common paths.

## Tech

- Pure HTML/CSS static site — no build step required
- Font: Montserrat via Google Fonts
- Images: downloaded from dorcorazors.co.nz and bundled in `/images/`
- Brand colours: `#c0ce42` (green), `#95a1b0` (steel), `#4e5768` (text)
