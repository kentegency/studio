# notify-approval — Edge Function

Sends an email to the Creative Director when a client approves a scene
via the Window link.

## How it triggers

A Supabase Database Webhook fires on every INSERT into the `notes` table.
The function checks whether the note body contains "approved via Window link"
(the exact text written by the Window approval flow) and only sends email
if that condition is met.

## Setup (15 minutes)

### 1. Get a Resend API key

Sign up at https://resend.com — free tier sends 3,000 emails/month.
Verify your sending domain (or use their sandbox domain for testing).

### 2. Set secrets

```bash
supabase secrets set RESEND_API_KEY=re_your_key_here
```

### 3. Deploy the function

```bash
supabase functions deploy notify-approval
```

### 4. Create the Database Webhook

In Supabase Dashboard → Database → Webhooks → Create new:

- **Name:** notify-approval
- **Table:** notes
- **Events:** Insert
- **Type:** HTTP Request
- **URL:** `https://YOUR_PROJECT_REF.supabase.co/functions/v1/notify-approval`
- **HTTP Headers:**
  - `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`
  - `Content-Type: application/json`

### 5. Update the from address

Edit `index.ts` line with `from:` to use your verified Resend domain:
```
from: 'The Kentegency Studio <notifications@yourdomain.com>',
```

## What the email looks like

- Subject: `✓ Client approved "Scene Name" — Project Name`
- Body: Kentegency branded dark email with the approval note text,
  timestamp, and a prompt to log in to the Studio.

## Testing

Trigger a test by having a client approve a scene via the Window link,
or manually insert a note with body containing "approved via Window link".

## Without Resend

If `RESEND_API_KEY` is not set, the function returns 200 with a message
but sends no email. The approval is still recorded in the database.
