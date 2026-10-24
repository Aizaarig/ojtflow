import test from 'node:test'
import assert from 'node:assert/strict'
import {
  TASK_STATUS,
  classifyTasks,
  getTaskStatusLabel,
  isTaskDone,
} from './tasks.js'

const task = (over = {}) => ({
  id: 't',
  title: 'Task',
  status: TASK_STATUS.PENDING,
  due_date: null,
  ...over,
})

test('isTaskDone only treats completed as done', () => {
  assert.equal(isTaskDone({ status: 'completed' }), true)
  assert.equal(isTaskDone({ status: 'COMPLETED' }), true)
  assert.equal(isTaskDone({ status: 'pending' }), false)
  assert.equal(isTaskDone({ status: 'in_progress' }), false)
  assert.equal(isTaskDone({}), false)
  assert.equal(isTaskDone(null), false)
})

test('getTaskStatusLabel maps known statuses and falls back', () => {
  assert.equal(getTaskStatusLabel('pending'), 'Open')
  assert.equal(getTaskStatusLabel('in_progress'), 'In Progress')
  assert.equal(getTaskStatusLabel('completed'), 'Done')
  assert.equal(getTaskStatusLabel('weird'), 'Open')
  assert.equal(getTaskStatusLabel(undefined), 'Open')
})

test('classifyTasks separates done/open and classifies by due date', () => {
  const today = '2026-10-15'
  const tasks = [
    task({ id: 'upcoming-late', due_date: '2026-10-20' }),
    task({ id: 'overdue', due_date: '2026-10-10' }),
    task({ id: 'no-due', due_date: null }),
    task({ id: 'due-today', due_date: '2026-10-15' }),
    task({ id: 'upcoming-soon', due_date: '2026-10-16' }),
    task({ id: 'done-past', status: 'completed', due_date: '2026-10-01' }),
  ]
  const { open, done, overdue, upcoming, noDue } = classifyTasks(tasks, today)
  assert.deepEqual(overdue.map((t) => t.id), ['overdue'])
  assert.deepEqual(upcoming.map((t) => t.id), ['due-today', 'upcoming-soon', 'upcoming-late'])
  assert.deepEqual(done.map((t) => t.id), ['done-past'])
  assert.deepEqual(noDue.map((t) => t.id), ['no-due'])
  assert.deepEqual(
    open.map((t) => t.id),
    ['upcoming-late', 'overdue', 'no-due', 'due-today', 'upcoming-soon']
  )
})

test('classifyTasks never marks tasks without a due date as overdue', () => {
  const { overdue, noDue } = classifyTasks([task({ id: 'x', due_date: null })], '2026-10-15')
  assert.equal(overdue.length, 0)
  assert.equal(noDue.length, 1)
})

test('classifyTasks treats a completed past-due task as done, not overdue', () => {
  const { overdue, done } = classifyTasks(
    [task({ id: 'x', status: 'completed', due_date: '2000-01-01' })],
    '2026-10-15'
  )
  assert.equal(overdue.length, 0)
  assert.equal(done.length, 1)
})

test('classifyTasks handles empty input', () => {
  assert.deepEqual(classifyTasks(undefined, '2026-10-15'), {
    open: [],
    done: [],
    overdue: [],
    upcoming: [],
    noDue: [],
  })
})
