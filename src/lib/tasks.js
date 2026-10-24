/*
  Task status mapping — single source of truth.

  These strings are the exact values written to `tasks.status` and must satisfy
  the database's `tasks_status_check` constraint.

  NOTE: These values are based on the provided initial schema
  (CHECK (status IN ('pending', 'in_progress', 'completed'))) and have NOT been
  verified against the live database. If the live constraint uses different
  values, update this one object to match — no other code changes are needed.
*/
export const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
}

// Human-readable UI labels for each stored status value.
export const TASK_STATUS_LABELS = {
  [TASK_STATUS.PENDING]: 'Open',
  [TASK_STATUS.IN_PROGRESS]: 'In Progress',
  [TASK_STATUS.COMPLETED]: 'Done',
}

// Status applied to a newly created task.
export const DEFAULT_TASK_STATUS = TASK_STATUS.PENDING

// A task counts as "done" only when its stored status is `completed`.
// "Open" therefore covers both `pending` and `in_progress`.
const DONE_STATUSES = new Set([TASK_STATUS.COMPLETED])

export function isTaskDone(task) {
  return DONE_STATUSES.has(String(task?.status || '').trim().toLowerCase())
}

export function getTaskStatusLabel(status) {
  const key = String(status || '').trim().toLowerCase()
  return TASK_STATUS_LABELS[key] || TASK_STATUS_LABELS[DEFAULT_TASK_STATUS]
}

// Normalise a date or timestamp into a comparable `YYYY-MM-DD` key.
// Stored date columns are already `YYYY-MM-DD`; timestamps are sliced so that
// comparisons are day-level and timezone-independent.
export function dayKey(value) {
  return String(value || '').slice(0, 10)
}

/*
  Classify tasks for dashboard/summary views using a local `today` (YYYY-MM-DD):

  - `done`     : stored status is `completed`
  - `open`     : everything else (`pending` / `in_progress`)
  - `overdue`  : open tasks whose due date is strictly before today
  - `upcoming` : open tasks with a due date today or later, nearest first
  - `noDue`    : open tasks without a due date

  Tasks without a due date are never overdue and are excluded from `upcoming`,
  but are returned separately so callers can account for them.
*/
export function classifyTasks(tasks = [], today) {
  const open = []
  const done = []
  for (const task of tasks) {
    ;(isTaskDone(task) ? done : open).push(task)
  }
  const overdue = open.filter((t) => t.due_date && dayKey(t.due_date) < today)
  const upcoming = open
    .filter((t) => t.due_date && dayKey(t.due_date) >= today)
    .sort((a, b) => dayKey(a.due_date).localeCompare(dayKey(b.due_date)))
  const noDue = open.filter((t) => !t.due_date)
  return { open, done, overdue, upcoming, noDue }
}
