// supabase/functions/generate-pdf/index.ts
// Deno Edge Function — receives wrap HTML, returns PDF via headless Chrome
//
// Deploy:  supabase functions deploy generate-pdf
// Invoke:  POST /functions/v1/generate-pdf  { html: string }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const { html, filename = 'wrap.pdf' } = await req.json()
    if (!html) {
      return new Response(JSON.stringify({ error: 'html is required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // Use Browserless API (cloud headless Chrome — no binary needed in Edge Function)
    // Free tier: 1000 units/month — more than enough for wrap generation
    // Alternative: Puppeteer cluster, Playwright, or self-hosted Chrome
    const BROWSERLESS_TOKEN = Deno.env.get('BROWSERLESS_TOKEN')

    if (!BROWSERLESS_TOKEN) {
      // Fallback: return the HTML directly so client can print if no token configured
      return new Response(JSON.stringify({
        fallback: true,
        message: 'BROWSERLESS_TOKEN not configured. See README for setup.',
      }), {
        status: 200,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // Call Browserless PDF API
    const response = await fetch(
      `https://chrome.browserless.io/pdf?token=${BROWSERLESS_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html,
          options: {
            format:           'A4',
            printBackground:  true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' },
            preferCSSPageSize: true,
          },
          gotoOptions: {
            waitUntil: 'networkidle2',
            timeout:   20000,
          },
        }),
      }
    )

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Browserless error ${response.status}: ${text}`)
    }

    const pdfBuffer = await response.arrayBuffer()

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        ...CORS,
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length':      String(pdfBuffer.byteLength),
      },
    })

  } catch (err) {
    console.error('generate-pdf error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
