-- Account Management — "Reset OJT Progress".
--
-- Deletes ONLY the calling student's OJT tracking rows and returns per-table
-- counts so the UI can report what was cleared:
--   * attendance
--   * daily_logs
--   * tasks
--   * requirements
--
-- It intentionally preserves everything else the student owns:
--   * profiles (name, school, course, year level, avatar_path)
--   * ojt_placements (company/supervisor details, schedule, dates,
--     required_hours, is_active)
--   * storage objects in the private "avatars" bucket
--   * the Supabase Auth account, password, and session
--
-- Safety properties:
--   * The target id comes from auth.uid() (the verified JWT), never from the
--     client, so a student can only ever clear their own rows.
--   * SECURITY DEFINER with a pinned search_path so the body cannot be hijacked
--     by a caller-controlled schema.
--   * The four DELETEs run in a single function call (implicit transaction):
--     all rows are removed or none are.
--   * Idempotent: running it again simply deletes 0 rows.
--   * EXECUTE is granted to authenticated only.

create or replace function public.reset_ojt_progress()
returns jsonb
language plpgsql
security definer
-- Empty search_path: every object below is fully schema-qualified, so the body
-- cannot be redirected by a caller-controlled schema or pg_temp.
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_attendance int := 0;
  v_daily_logs int := 0;
  v_tasks int := 0;
  v_requirements int := 0;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.attendance where user_id = v_uid;
  get diagnostics v_attendance = row_count;

  delete from public.daily_logs where user_id = v_uid;
  get diagnostics v_daily_logs = row_count;

  delete from public.tasks where user_id = v_uid;
  get diagnostics v_tasks = row_count;

  delete from public.requirements where user_id = v_uid;
  get diagnostics v_requirements = row_count;

  return pg_catalog.jsonb_build_object(
    'attendance', v_attendance,
    'daily_logs', v_daily_logs,
    'tasks', v_tasks,
    'requirements', v_requirements
  );
end;
$$;

comment on function public.reset_ojt_progress() is
  'Reset OJT Progress: deletes the calling student''s attendance, daily_logs, tasks, and requirements rows. Preserves the profile, placement (required_hours and company/supervisor details), avatar files, and the Auth account.';

-- Supabase's default privileges grant EXECUTE on new public functions to
-- PUBLIC, anon, authenticated, and service_role. Revoke the first two so this
-- destructive function is callable by signed-in students only, then grant it
-- back to authenticated explicitly.
revoke all on function public.reset_ojt_progress() from public, anon;
grant execute on function public.reset_ojt_progress() to authenticated;
