# Signup Email Verification Setup (6-digit email OTP)

OJTFlow verifies new accounts with a **6-digit email OTP** instead of a
confirmation link. The student registers, receives a code, and types it into
the **Verify your email** screen of the registration flow - no link clicking.

Like password recovery, this only works if the **email template in the Supabase
dashboard** contains the OTP variable. The frontend cannot change the email
that GoTrue sends: the body is rendered server-side.

Supabase project used by this repo (frontend **and** CLI are the same project):

```
izmeyvjqgelgoamdthwb
```

- Frontend: `.env.local` → `VITE_SUPABASE_URL=https://izmeyvjqgelgoamdthwb.supabase.co`
- CLI: `supabase/.temp/project-ref` → `izmeyvjqgelgoamdthwb`

If the dashboard you are editing does not have this ref in its URL, you are
editing the **wrong project**.

---

## 1. How the app sends and verifies the code

| Step | Call | Where |
| --- | --- | --- |
| Create account (sends the code) | `supabase.auth.signUp({ email, password })` | `src/context/AuthProvider.jsx` → `signUp` |
| Verify code | `supabase.auth.verifyOtp({ email, token, type: 'signup' })` | `src/context/AuthProvider.jsx` → `verifySignUpOtp` |
| Resend code | `supabase.auth.resend({ type: 'signup', email })` | `src/context/AuthProvider.jsx` → `resendSignUpOtp` |

Key points:

- `signUp()` triggers the **"Confirm signup"** email template. Whether that
  email contains a link or a code is 100% controlled by the dashboard template.
- Verification **always** uses `type: 'signup'`. The password-recovery flow
  keeps using `type: 'recovery'` (`supabase/AUTH_RECOVERY_SETUP.md`). The two
  must never share a type.
- The app shows a client-side 60-second resend cooldown and maps Supabase rate
  limits to a friendly message; the server-side limit is still the source of
  truth.
- Email confirmation stays **enabled**. The frontend never marks a user as
  verified and never bypasses verification.

---

## 2. Dashboard changes you must perform manually

> These steps are intentionally not automated. Nothing in this repo edits
> production Supabase settings.

1. Open the Supabase Dashboard and make sure the project ref in the URL is
   **`izmeyvjqgelgoamdthwb`**.
2. Go to **Authentication → Emails → "Confirm signup"** (Confirm signup email).
3. Set the **Subject** to something like `Your OJTFlow verification code`.
4. Replace the **entire body** with this minimal, valid template (also saved at
   `supabase/templates/confirmation.html`):

```html
<h2>Confirm your OJTFlow account</h2>
<p>Use this 6-digit code to verify your email address:</p>
<p style="font-size:28px;font-weight:700;letter-spacing:6px;">{{ .Token }}</p>
<p>This code expires soon. If you did not create an account, you can ignore this email.</p>
```

5. Click **Save** and confirm the preview shows a code/placeholder instead of a
   link.
6. Keep **Authentication → Providers → Email → "Confirm email" ON**. Do not
   disable it to "make OTP work" - with it off, signup returns a session
   immediately and no code is ever sent.
7. Register a fresh account from the app and check that the email contains a
   6-digit number (not a `{{ .ConfirmationURL }}` link).

### Allowed variables for the Confirm signup template

Anything outside this list makes the Go template invalid, and GoTrue silently
falls back to the **default link email**:

| Variable | Meaning |
| --- | --- |
| `{{ .Token }}` | The 6-digit OTP (what this flow needs) |
| `{{ .ConfirmationURL }}` | The one-click confirmation link (do NOT use) |
| `{{ .TokenHash }}` | Hashed token, for building your own link |
| `{{ .SiteURL }}` | Your configured Site URL |
| `{{ .Email }}` | The user's email |
| `{{ .RedirectTo }}` | The redirect URL passed from the app |
| `{{ .Data }}` | User metadata (the registration form fields) |

Do not use `{{{ triple braces }}}`, undefined variables, or stray `{{`/`}}`
characters: an invalid template = the old link email, with no error shown.

---

## 3. Settings to review

Under **Authentication → Emails** and **Authentication → Rate Limits**:

- **Confirm email** - must stay enabled (see step 6 above).
- **Email OTP Expiry** - how long a signup code stays valid (default `3600`s).
  The app treats an expired code as "invalid or expired" and offers a resend.
- **Email rate limits** - the app's 60-second cooldown is only a courtesy;
  Supabase still enforces the hard limit and the app shows a friendly
  "Too many attempts" message when it rejects a resend.
- **Site URL / Redirect URLs** - keep the app origin (and `/reset-password`
  for the recovery flow) in the allow-list.
- **Custom SMTP (Resend)** - already configured; it only changes *who sends*
  the email, not the template content.

---

## 4. Local Supabase / self-hosted only

Dashboard edits do not reach a local stack. For local dev, configure it in
`supabase/config.toml` (this repo has no `config.toml` yet):

```toml
[auth.email.template.confirmation]
subject = "Your OJTFlow verification code"
content_path = "./supabase/templates/confirmation.html"
```

Then restart the local stack (`supabase stop && supabase start`).

---

## 5. No database changes

This feature uses only official Auth methods. Do **not** add tables, columns,
or RLS policies for signup verification. The existing `profiles` row is still
created idempotently by `ensureProfile` after verification succeeds.
