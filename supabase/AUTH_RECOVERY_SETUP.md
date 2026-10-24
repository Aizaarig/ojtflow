# Password Recovery Setup (6-digit email OTP)

OJTFlow resets passwords with a **6-digit email OTP**. This document explains
how the app-side flow works and, most importantly, **why the reset email may
still show the old "click the link" wording** even after you edit the template.

Supabase project used by this repo (frontend **and** CLI are the same project):

```
izmeyvjqgelgoamdthwb
```

- Frontend: `.env.local` → `VITE_SUPABASE_URL=https://izmeyvjqgelgoamdthwb.supabase.co`
- CLI: `supabase/.temp/project-ref` → `izmeyvjqgelgoamdthwb`

If the dashboard you are editing does not have this ref in its URL, you are
editing the **wrong project**.

---

## 1. How the app requests and verifies the code

The frontend already uses the correct Supabase Auth APIs (no changes needed):

| Step | Call | Where |
| --- | --- | --- |
| Request code | `supabase.auth.resetPasswordForEmail(email)` | `src/context/AuthProvider.jsx` → `sendPasswordReset` |
| Verify code | `supabase.auth.verifyOtp({ email, token, type: 'recovery' })` | `src/context/AuthProvider.jsx` → `verifyRecoveryOtp` |
| Change password | `supabase.auth.updateUser({ password })` | `src/context/AuthProvider.jsx` → `updatePassword` |

The app does **not** use `signInWithOtp` for recovery. The installed SDK
(`@supabase/supabase-js@2.117.3`) supports `type: 'recovery'`.

**Key point:** `resetPasswordForEmail()` triggers the **"Reset password"**
email template. The email body is rendered **server-side by Supabase (GoTrue)**,
so the frontend cannot decide whether the email contains a link or a code. That
is 100% controlled by the template in the dashboard.

---

## 2. Why you still receive the default "link" email

The email you reported contains:

> Reset your password. We received a request to reset your password. Follow the
> link below to choose a new one.

That string is the **default** Supabase recovery template
(`mailer_templates_recovery_content`). If you receive it, then the custom
template is **not being used**. Common causes, in order of likelihood:

1. **The template is invalid, so Supabase silently falls back to the default.**
   GoTrue uses Go templates. Any undefined variable or malformed `{{ ... }}`
   makes the whole template fail to parse, and GoTrue then sends the default
   email without any error. Do not use `{{{ triple braces }}}`, undefined
   variables, or any variable that is not in the allowed list below.
2. **The template was edited in a different project** than
   `izmeyvjqgelgoamdthwb` (personal vs organization project, staging vs prod).
3. **The edit was not saved** (or only the subject/preview was changed).
4. **You are running local Supabase** (`supabase start`). The dashboard template
   builder **does not apply** to local/self-hosted Supabase — local templates
   come from `supabase/config.toml` + HTML files.
5. **You are reading an old email.** Always request a brand-new reset after
   saving.

Allowed variables for the recovery template (anything else = invalid template):

| Variable | Meaning |
| --- | --- |
| `{{ .Token }}` | The 6-digit OTP (this is what we want) |
| `{{ .ConfirmationURL }}` | The one-click reset link (do NOT use for OTP) |
| `{{ .TokenHash }}` | Hashed token, for building your own link |
| `{{ .SiteURL }}` | Your configured Site URL |
| `{{ .Email }}` | The user's email |
| `{{ .RedirectTo }}` | The redirect URL passed from the app |
| `{{ .Data }}` | User metadata |

---

## 3. Fix (hosted project) — dashboard steps

1. Open the Supabase Dashboard and make sure the project ref in the URL is
   **`izmeyvjqgelgoamdthwb`**.
2. Go to **Authentication → Emails → "Reset password"**.
3. Set the **Subject** to something like `Your OJTFlow password reset code`.
4. Replace the **entire body** with this minimal, valid template (also saved at
   `supabase/templates/recovery.html`):

```html
<h2>Reset your OJTFlow password</h2>
<p>Use this 6-digit code to reset your password:</p>
<p style="font-size:28px;font-weight:700;letter-spacing:6px;">{{ .Token }}</p>
<p>This code expires soon. If you did not request a password reset, you can ignore this email.</p>
```

5. Click **Save** and confirm the preview shows a number/placeholder instead of
   a link.
6. Request a **fresh** password reset from the app and check the new email.

> Only include `{{ .Token }}`. If you also want a fallback link, you may add
> `<a href="{{ .ConfirmationURL }}">Reset password</a>` — but that is optional
> and the app already handles both the code and the link paths.

---

## 4. Fix (local Supabase / self-hosted only)

Dashboard edits do not reach a local stack. For local dev, configure it in
`supabase/config.toml` (this repo has no `config.toml` yet):

```toml
[auth.email.template.recovery]
subject = "Your OJTFlow password reset code"
content_path = "./supabase/templates/recovery.html"
```

Then restart the local stack (`supabase stop && supabase start`).

---

## 5. Other auth settings to review

Under **Authentication → Providers → Email** and **Authentication → Rate Limits**:

- **Email OTP Expiry** — how long a code stays valid (default `3600`s). The app
  shows no expiry timer, so this is the single source of truth.
- **Email rate limits** — the app applies a client-side 60-second resend
  cooldown and shows a friendly message if the server rejects a resend.
- **Site URL / Redirect URLs** — keep the app origin (and `/reset-password` for
  the optional link fallback) in the allow-list so email confirmation still
  works.
- **Custom SMTP (Resend)** — already working; it only changes *who sends* the
  email, not the template content.

---

## 6. No database changes

This feature uses only official Auth methods. Do **not** add tables, columns, or
RLS policies for password recovery.
