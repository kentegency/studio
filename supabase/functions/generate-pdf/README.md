# generate-pdf — Edge Function

Converts the Wrap document HTML into a real PDF binary using headless Chrome.

## Setup (5 minutes)

### 1. Get a Browserless token

Sign up at https://www.browserless.io — free tier gives 1,000 units/month.
One PDF generation costs approximately 1 unit. That is 1,000 wrap documents per month for free.

Copy your API token from the Browserless dashboard.

### 2. Add the secret to Supabase

In your terminal (with Supabase CLI installed):

```bash
supabase secrets set BROWSERLESS_TOKEN=your_token_here
```

Or via Supabase Dashboard → Project Settings → Edge Functions → Secrets.

### 3. Deploy the function

```bash
supabase functions deploy generate-pdf
```

### 4. Verify

The WrapPanel will automatically detect whether the function is available and
switch from the browser print fallback to a direct PDF download.

## How it works

1. WrapPanel assembles the full HTML document (same template as before)
2. Calls POST /functions/v1/generate-pdf with { html, filename }
3. Edge Function sends HTML to Browserless cloud Chrome
4. Chrome renders the page (including Google Fonts, waiting for networkidle2)
5. Returns PDF binary
6. WrapPanel creates a Blob URL and triggers browser download

## Without Browserless token

If BROWSERLESS_TOKEN is not set, the function returns { fallback: true } and
WrapPanel falls back to the original browser print behaviour with a notice.

## Alternative PDF services

If you prefer not to use Browserless, the Edge Function can be adapted for:
- Puppeteer cluster (self-hosted)
- Playwright (self-hosted)
- WeasyPrint (Python, for pure CSS rendering)
- DocRaptor (paid, excellent quality)
- PDFShift (paid)

The HTML template is standard and works with any headless Chrome service.
