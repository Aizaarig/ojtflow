/*
  Thin wrappers around the Supabase Auth REST calls.

  Every function takes the Supabase client as its first argument so the auth
  provider can pass the shared client while tests can inject a fake one.

  Keep the verification types strictly separated:

  - account (email) verification after registration uses type 'signup'
  - password recovery uses type 'recovery'

  Neither flow may borrow the other's type.
*/

export async function signUpUser(client, payload) {
  const {
    email,
    password,
    fullName,
    schoolName,
    course,
    yearLevel,
  } = payload || {}
  const { data, error } = await client.auth.signUp({
    email: String(email ?? '').trim(),
    password,
    options: {
      data: {
        full_name: fullName?.trim() || '',
        school_name: schoolName?.trim() || '',
        course: course?.trim() || '',
        year_level: yearLevel?.trim() || '',
      },
    },
  })
  if (error) throw error
  return data
}

export async function verifySignUpOtp(client, { email, token }) {
  const { data, error } = await client.auth.verifyOtp({
    email: String(email ?? '').trim(),
    token: String(token ?? '').trim(),
    type: 'signup',
  })
  if (error) throw error
  return data
}

export async function resendSignUpOtp(client, { email }) {
  const { data, error } = await client.auth.resend({
    type: 'signup',
    email: String(email ?? '').trim(),
  })
  if (error) throw error
  return data
}

export async function signInUser(client, { email, password }) {
  const { data, error } = await client.auth.signInWithPassword({
    email: String(email ?? '').trim(),
    password,
  })
  if (error) throw error
  return data
}

export async function signInWithGoogle(client, { redirectTo } = {}) {
  const target =
    redirectTo ||
    (typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback`
      : undefined)
  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: target ? { redirectTo: target } : undefined,
  })
  if (error) throw error
  return data
}

export async function signOutUser(client) {
  const { error } = await client.auth.signOut()
  if (error) throw error
  return undefined
}

export async function sendPasswordReset(client, { email, redirectTo }) {
  const { data, error } = await client.auth.resetPasswordForEmail(
    String(email ?? '').trim(),
    { redirectTo }
  )
  if (error) throw error
  return data
}

export async function verifyRecoveryOtp(client, { email, token }) {
  const { data, error } = await client.auth.verifyOtp({
    email: String(email ?? '').trim(),
    token: String(token ?? '').trim(),
    type: 'recovery',
  })
  if (error) throw error
  // The new-password step must only appear with a real recovery session.
  if (!data?.session) {
    throw new Error(
      'Could not start a recovery session. Please request a new code.'
    )
  }
  return data
}

export async function updateUserPassword(client, password) {
  const { data, error } = await client.auth.updateUser({ password })
  if (error) throw error
  return data
}
