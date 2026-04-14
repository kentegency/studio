# Security — The Kentegency Studio

## Current security model

### Authentication

Supabase Auth with email/password. JWTs issued by Supabase, 1-hour expiry, auto-refreshed. Sessions persist in `localStorage`. No custom auth logic.

### Authorisation — what is enforced at the database level

Row Level Security (RLS) is enabled on all tables. Every authenticated request carries a JWT, and Supabase evaluates `auth.uid()` against the RLS policy before returning any data.

All core policies follow the same pattern:
```sql
using (
  exists (
    select 1 from projects
    where id = <table>.project_id
    and owner_id = auth.uid()
  )
)
```

This means: a user can only read, write, or delete data that belongs to a project they own. There is no way for User A to access User B's projects, nodes, assets, notes, shots, subjects, or contributors through the database — regardless of what the application code does.

### Authorisation — what is NOT enforced at the database level

**Window page access (client portal)**

The Window page at `/#/window/[token]` is accessible without authentication. The application code fetches the project by `window_token` and checks expiry. However, there is no RLS policy that restricts anonymous access to the `projects` table by token. A user with the Supabase anon key and a valid project UUID can read project data without a valid window token.

**Remediation:** Add an RLS policy for anonymous reads:
```sql
create policy "Anonymous can read project by window token" on projects
  for select to anon
  using (
    window_token = current_setting('request.jwt.claims', true)::json->>'window_token'
    and window_expires_at > now()
  );
```
This requires the client to send the token as a JWT claim, which requires a custom auth flow or a signed URL approach.

**Simpler remediation:** Move Window page data fetching to an Edge Function that validates the token server-side before returning data.

**Contributor access**

Same pattern as Window. Contributor token is validated in `ContributorView.jsx` at the application layer. No RLS enforcement.

**Session tokens**

`session_token` on the projects table is not validated at the database level. Anyone who knows a session token can join a WebRTC session.

### Storage security

Supabase Storage bucket policies:

| Bucket | Policy | Notes |
|---|---|---|
| assets | Public read | URLs are permanent and guessable |
| sketches | Private | Owner-authenticated access only |
| exports | Private | Owner-authenticated access only |

**Asset URL exposure:** Asset files in the `assets` bucket have permanent public URLs. If a client's pre-release content is uploaded as an asset, the URL is accessible to anyone who has it. For sensitive content, assets should use signed URLs with expiry.

### Environment variable exposure

`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are bundled into the client JavaScript and visible in the browser. This is intentional and expected — the anon key is designed to be public. Its permissions are controlled by RLS policies, not by keeping the key secret.

The Supabase service role key is never used in this application. No client-side code has elevated database privileges.

### Input handling

No explicit XSS sanitisation. React's JSX rendering escapes string values by default, which mitigates the most common XSS vectors. The Wrap document HTML is generated via template literals — if a project name contains `<script>` tags, these would be injected into the generated HTML. This should be sanitised before the HTML is passed to the PDF generator.

**Remediation:** Run project name, logline, and all user-generated text through `DOMPurify` before embedding in the Wrap HTML template.

### No rate limiting

No rate limiting on any operation — login attempts, note creation, asset uploads, PDF generation. Supabase applies some rate limits at the infrastructure level, but there is no application-level protection.

### Content Security Policy

Not configured. Adding a CSP header via `vercel.json` would mitigate XSS and data exfiltration risks.

## Security checklist — current state

| Item | Status | Notes |
|---|---|---|
| RLS on all tables | ✓ Complete | All 11 tables |
| JWT-based auth | ✓ Complete | Supabase Auth |
| Service role key unexposed | ✓ Complete | Never used client-side |
| Window token DB enforcement | ✗ Missing | App-layer only |
| Contributor token DB enforcement | ✗ Missing | App-layer only |
| Asset signed URLs | ✗ Missing | Assets are public permanent URLs |
| XSS sanitisation | ✗ Missing | Wrap HTML template |
| Rate limiting | ✗ Missing | No application-level limits |
| Content Security Policy | ✗ Missing | Not configured |
| Audit log | ✗ Missing | No server-side activity log |
| HTTPS enforced | ✓ Complete | Vercel default |
| Secrets in env vars | ✓ Complete | No secrets in source |

## Recommendations for enterprise deployment

1. **Move token validation to Edge Functions** — Window, Contributor, and Session endpoints should be Edge Function routes that validate tokens server-side and return scoped data, not full project rows.

2. **Add DOMPurify** — sanitise all user-generated content before it enters the Wrap HTML template.

3. **Switch assets to signed URLs** — Supabase Storage supports signed URLs with configurable expiry. Required for pre-release film content.

4. **Add a CSP header** via `vercel.json`:
   ```json
   {
     "headers": [
       {
         "source": "/(.*)",
         "headers": [
           { "key": "Content-Security-Policy", "value": "default-src 'self'; ..." }
         ]
       }
     ]
   }
   ```

5. **Implement audit logging** — an Edge Function that writes to an `audit_log` table on significant events (status changes, approvals, deletions).

6. **SOC 2 readiness** — requires audit logging, access control documentation, encryption at rest confirmation (Supabase encrypts at rest by default), incident response procedures, and vendor security review.
