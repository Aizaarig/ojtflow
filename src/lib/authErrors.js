const RULES = [
  {
    test: /invalid login credentials/i,
    message: 'Incorrect email or password. Please try again.',
  },
  {
    test: /email not confirmed/i,
    message:
      'Please verify your email address first. Check your inbox for the 6-digit code, then sign in.',
  },
  {
    test: /user already registered|already been registered/i,
    message:
      'An account with this email already exists. Try signing in instead.',
  },
  {
    test: /unable to validate email|invalid format/i,
    message: 'Please enter a valid email address.',
  },
  {
    test: /password should be at least (\d+)/i,
    message: 'Your password is too short. Use at least 8 characters.',
  },
  {
    test: /for security purposes|rate limit|too many requests/i,
    message:
      'Too many attempts. Please wait a moment and try again.',
  },
  {
    test: /new password should be different/i,
    message: 'Your new password must be different from the old one.',
  },
  {
    test: /auth session missing|session.*expired|invalid.*token|expired/i,
    message: 'This link is invalid or has expired. Please request a new one.',
  },
  {
    test: /oauth|provider/i,
    message:
      'Google sign-in could not start. Please try again, or sign in with your email and password.',
  },
  {
    test: /network|fetch|timed? ?out|connection/i,
    message: 'We could not reach the server. Check your connection and try again.',
  },
]

export function mapAuthError(error) {
  if (!error) return 'Something went wrong. Please try again.'
  const raw = error.message || String(error)
  const rule = RULES.find((r) => r.test.test(raw))
  return rule ? rule.message : raw
}
