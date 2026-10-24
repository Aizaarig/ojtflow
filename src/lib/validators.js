export function isValidTimeRange(timeIn, timeOut) {
  if (!timeIn || !timeOut) return false
  const inD = new Date(timeIn)
  const outD = new Date(timeOut)
  if (Number.isNaN(inD.getTime()) || Number.isNaN(outD.getTime())) return false
  return outD > inD
}

export function isValidBreak(breakMinutes) {
  const b = Number(breakMinutes) || 0
  if (b < 0) return false
  return b <= 720
}

export function parseRequiredHours(value) {
  if (value === '' || value === null || value === undefined) return null
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

export function isValidDateInput(value) {
  if (!value) return false
  const d = new Date(value)
  return !Number.isNaN(d.getTime())
}

// Pragmatic email check. Only applied when a value is actually provided, so
// optional supervisor emails never block saving.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(value) {
  return EMAIL_PATTERN.test(String(value ?? '').trim())
}

export function validatePlacementForm(form) {
  const errors = {}
  const companyName = String(form.companyName ?? '').trim()
  if (!companyName) errors.companyName = 'Company name is required.'

  if (!form.startDate) {
    errors.startDate = 'OJT start date is required.'
  } else if (!isValidDateInput(form.startDate)) {
    errors.startDate = 'Enter a valid start date.'
  }

  if (!form.endDate) {
    errors.endDate = 'Expected end date is required.'
  } else if (!isValidDateInput(form.endDate)) {
    errors.endDate = 'Enter a valid end date.'
  }

  if (
    isValidDateInput(form.startDate) &&
    isValidDateInput(form.endDate) &&
    new Date(form.endDate) < new Date(form.startDate)
  ) {
    errors.endDate = 'Expected end date must be on or after the start date.'
  }

  if (parseRequiredHours(form.requiredHours) === null) {
    errors.requiredHours =
      'Enter a valid required OJT hours value greater than 0.'
  }

  // Optional field: only validate format when the student provides a value.
  const supervisorEmail = String(form.supervisorEmail ?? '').trim()
  if (supervisorEmail && !isValidEmail(supervisorEmail)) {
    errors.supervisorEmail = 'Enter a valid email address or leave it blank.'
  }

  return errors
}
