# Routines

A daily routine checklist with timed reminders. Mobile is the priority (loud scheduled notifications); the web app manages and tracks the same data.

## Goals

- Add routines with a time of day ("Wake up 06:00", "Gym 18:00", "Learn Japanese 21:00").
- Each routine repeats on chosen weekdays, or is a one-off on a specific date.
- A daily checklist records when each item was ticked. Progress = done / scheduled, with the scheduled-vs-actual delta shown ("+12m"). Weekly totals and streaks.
- The phone fires a loud (max-importance, sound + vibration) notification at the exact time, with **Done** and **Snooze 10m** actions.

## Non-goals

Full-screen alarms, repeating nags, Do Not Disturb bypass, iOS, on-time pass/fail rules, server push (FCM).

## Data (Prisma)

- `Routine`: `id`, `userId`, `title`, `time` ("HH:mm"), `days Int[]` (ISO weekdays 1-7; empty = one-off), `date String?` ("YYYY-MM-DD", one-offs only), `active Boolean @default(true)`, `createdAt`, `updatedAt`. Cascade on user delete; index on `userId`.
- `RoutineCompletion`: `id`, `routineId`, `userId`, `date String` ("YYYY-MM-DD"), `completedAt DateTime`. `@@unique([routineId, date])` so ticking twice is idempotent; un-tick deletes the row. Cascade on routine delete.
- Dates and times are in the household timezone (`src/lib/day.ts`).

## Shared logic (`apps/web/src/lib/routines/`)

Pure, Vitest-tested:
- `isScheduledOn(routine, date)`: weekday match, or `date` equals the one-off date; inactive routines never match.
- `dayView(routines, completions, date)`: scheduled items with done state and minute delta.
- `stats(routines, completions, from, to)`: per-day done/scheduled counts, current and best streak (a day counts toward a streak only if every scheduled item was done; days with nothing scheduled are skipped).

## API (`/api/v1/routines`, bearer auth, `{data}` / `{error}` wrapper)

- `GET /routines`, `POST /routines`, `PATCH /routines/[id]`, `DELETE /routines/[id]`
- `GET /routines/day?date=`: that day's scheduled items with completion state
- `PUT /routines/[id]/completion` body `{date, completedAt}` (upsert); `DELETE` same path un-ticks
- `GET /routines/stats?from=&to=`

Validation: `time` matches `HH:mm`; `days` values 1-7; exactly one of `days` (non-empty) or `date`. All queries scoped by `userId`. Route `params` are awaited.

## Web (`/routines`)

Today checklist with tick control and delta, routine editor (title, time, weekday chips or date), weekly progress strip with streaks, sidebar link. Data via `src/actions/routines.ts` using the shared module.

## Mobile (`lib/features/routines/`, existing slice layout)

- Pages: Today checklist with progress header ("5/7"), routine editor, weekly stats. Entry from the More page.
- Notifications: `flutter_local_notifications`, `timezone`, `flutter_timezone`. One high-importance channel. `zonedSchedule` with exact timing, weekly repeat per selected weekday, a single schedule for one-offs. Actions: **Done**, **Snooze 10m**.
- Android: `POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`, `RECEIVE_BOOT_COMPLETED`, plus the plugin's boot and action receivers. Permissions are requested on first routine use; if exact alarms are denied, fall back to inexact scheduling and tell the user.
- Rescheduling: on app start, on resume, and after any edit, cancel all routine alarms and reschedule from the latest list. The list is cached in `shared_preferences` so rescheduling works offline.
- Offline ticks: a tick is stored locally with its real timestamp in a queue and flushed when online. The notification Done action writes to the same queue (handled in a background entrypoint).

## Testing

- Vitest: shared module and route handlers.
- Flutter: routine-to-schedule mapping, tick queue.
- `fvm flutter analyze`, `fvm flutter test`, web lint and tests.
- Manual on-device check (cannot be verified in CI): permission prompts, exact firing, action buttons, reschedule after reboot.

## Workflow constraints

Work on `dev`; use `fvm` for Flutter. Do not add tracked files that mention the assistant/vendor name or the user's personal email (leak guard).
