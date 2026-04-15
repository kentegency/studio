// supabase/functions/notify-approval/index.ts
// Triggered by a Supabase Database Webhook on notes INSERT
// Fires when body contains "approved via Window link"
// Sends email to project owner via Resend API
//
// Setup:
//   1. supabase secrets set RESEND_API_KEY=re_xxxxx
//   2. supabase functions deploy notify-approval
//   3. Supabase Dashboard → Database → Webhooks → Create:
//      Table: notes, Event: INSERT
//      URL: https://<project>.supabase.co/functions/v1/notify-approval
//      Auth: service_role key in Authorization header

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const payload = await req.json()

    // Supabase Webhook sends { type, table, record, schema, old_record }
    const record = payload.record ?? payload

    // Only act on approval notes
    const body = record?.body ?? ''
    if (!body.toLowerCase().includes('approved') || !body.includes('Window link')) {
      return new Response('Not an approval note', { status: 200, headers: CORS })
    }

    const RESEND_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_KEY) {
      console.warn('RESEND_API_KEY not set — email not sent')
      return new Response('RESEND_API_KEY not configured', { status: 200, headers: CORS })
    }

    // Fetch project + owner details
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: project } = await supabase
      .from('projects')
      .select('name, owner_id')
      .eq('id', record.project_id)
      .single()

    if (!project) {
      return new Response('Project not found', { status: 200, headers: CORS })
    }

    const { data: owner } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', project.owner_id)
      .single()

    // Fetch node name if available
    let sceneName = 'a scene'
    if (record.node_id) {
      const { data: node } = await supabase
        .from('nodes')
        .select('name')
        .eq('id', record.node_id)
        .single()
      if (node?.name) sceneName = `"${node.name}"`
    }

    // Fetch owner email from auth.users
    const { data: { user } } = await supabase.auth.admin.getUserById(project.owner_id)
    const ownerEmail = user?.email
    if (!ownerEmail) {
      return new Response('Owner email not found', { status: 200, headers: CORS })
    }

    const ownerName = owner?.name ?? 'Creative Director'
    const timestamp = new Date().toLocaleString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

    // Send email via Resend
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'The Kentegency Studio <notifications@kentegency.com>',
        to:   [ownerEmail],
        subject: `✓ Client approved ${sceneName} — ${project.name}`,
        html: `
          <!DOCTYPE html>
          <html>
          <body style="background:#040402;color:#F4EFD8;font-family:'IBM Plex Mono',monospace;padding:40px;max-width:560px;margin:0 auto;">
            <div style="margin-bottom:24px;">
              <div style="display:grid;grid-template-columns:repeat(3,7px);gap:2px;width:25px;margin-bottom:16px;">
                ${['#F4EFD8','#040402','#7A7A7A','#F5920C','#7A7A7A','#040402','#7A7A7A','#040402','#F4EFD8']
                  .map(c => `<div style="width:7px;height:7px;background:${c};"></div>`).join('')}
              </div>
              <div style="font-size:11px;letter-spacing:.3em;color:#6A6258;text-transform:uppercase;margin-bottom:8px;">
                The Kentegency · Creative Intelligence Studio
              </div>
            </div>

            <div style="border-left:2px solid #4ADE80;padding-left:16px;margin-bottom:28px;">
              <div style="font-size:22px;color:#4ADE80;margin-bottom:6px;">Approved ✓</div>
              <div style="font-size:14px;color:#A09890;line-height:1.6;">
                Your client has approved ${sceneName} in <strong style="color:#F4EFD8;">${project.name}</strong>.
              </div>
            </div>

            <div style="background:#0C0B08;border:.5px solid rgba(255,255,255,.08);border-radius:3px;padding:16px;margin-bottom:24px;">
              <div style="font-size:11px;color:#4A4840;letter-spacing:.16em;text-transform:uppercase;margin-bottom:8px;">Approval note</div>
              <div style="font-size:13px;color:#A09890;line-height:1.65;">${body}</div>
              <div style="font-size:10px;color:#4A4840;margin-top:8px;">${timestamp}</div>
            </div>

            <div style="font-size:12px;color:#4A4840;line-height:1.7;">
              Log in to The Kentegency Studio to view the full project and advance the scene status.
            </div>

            <div style="margin-top:32px;padding-top:16px;border-top:.5px solid rgba(255,255,255,.06);font-size:10px;color:#3A3530;letter-spacing:.1em;">
              THE KENTEGENCY · CREATIVE INTELLIGENCE STUDIO
            </div>
          </body>
          </html>
        `,
        text: `Approved ✓\n\nYour client has approved ${sceneName} in ${project.name}.\n\n${body}\n\n${timestamp}\n\nLog in to The Kentegency Studio to view the full project.`,
      }),
    })

    if (!emailRes.ok) {
      const err = await emailRes.text()
      console.error('Resend error:', err)
      return new Response(`Email error: ${err}`, { status: 500, headers: CORS })
    }

    console.log(`Approval email sent to ${ownerEmail} for project ${project.name}`)
    return new Response('Email sent', { status: 200, headers: CORS })

  } catch (err) {
    console.error('notify-approval error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
