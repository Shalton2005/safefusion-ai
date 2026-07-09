---
name: verify
description: Verify frontend changes by running the Vite dev server and driving it with Playwright.
---

# Verifying the SafeFusion AI frontend

No Docker/backend available in this environment by default (the real
API lives in `../backend`, needs Postgres via `docker-compose.yml` —
too slow to spin up for most frontend-only changes). Verify at the
frontend surface instead: run the app, drive it with a real browser,
observe network + DOM.

## Build check (fast, not a substitute for running the app)

```bash
cd frontend && npx vite build && rm -rf dist
```

`npx tsc --noEmit` does NOT work standalone in this repo — the root
`tsconfig.json` uses `ignoreDeprecations: "6.0"` which the installed
TS 5.9.3 rejects (`TS5103`). `vite build` type-checks via esbuild/tsc
project references correctly; use that instead.

## Run + drive with a real browser

```bash
cd frontend && npm run dev -- --port 5183   # background it
```

No `playwright` package or browser binaries ship with the repo, but
both are fetchable on demand and this has worked before:

```bash
npx --yes playwright install chromium --with-deps   # downloads to
                                                       # %LOCALAPPDATA%/ms-playwright
# then, in a scratch dir:
npm init -y && npm install playwright@<version printed by `npx playwright --version`> --no-save
node your-script.mjs   # import { chromium } from 'playwright'
```

Write a small `.mjs` script per verification: `chromium.launch()`,
`page.goto('http://localhost:5183/<route>')`, assert on
`page.locator(...)`, `page.screenshot(...)`. Capture
`page.on('console', ...)` for `error` type — React error-boundary
crashes surface there even when the page "looks" fine in a
screenshot taken before the crash.

## No backend running — this is normal, not a blocker

Every monitoring section calls a real service
(`sensorsService`/`workersService`/`permitsService`/`incidentsService`/
`monitoringService`) against `VITE_API_BASE_URL` (default
`http://localhost:8000/api/v1`). With no backend up, every fetch
fails with `net::ERR_CONNECTION_REFUSED` → `ApiError` →
`toUserMessage()` "Unable to reach the server..." — this is the
correct, working error path, not a broken test. To verify the
*success* path (data renders, `LastUpdated` timestamps, etc.)
without standing up Postgres, stub responses with Playwright's
`page.route('**/api/v1/**', ...)` and `route.fulfill(...)`. Match the
service's actual unwrap shape per endpoint — some services return the
bare array (`SensorReading[]`, `Worker[]`, `Permit[]`, `Incident[]`)
directly as the HTTP body, others wrap in `{ data, message, success }`
(`monitoringService.getSummary()` does; the list endpoints don't).
Check `src/services/*.service.ts` before writing a stub or you'll get
a misleading client-side `TypeError` that looks like a real bug.

## Known gotcha already found once

`createRequestController()` (in `src/api/client.ts`) returns
`{ controller, signal }`, not a bare `AbortController`. Any hook/effect
that does `let controller = createRequestController()` and later calls
`controller.abort()` will throw `TypeError: controller.abort is not a
function` — only visible at runtime (build/typecheck won't catch it
since the wrapper object is still assignable in some contexts), and it
crashes the nearest React Router error boundary. Destructure it:
`let { controller, signal } = createRequestController()`.
