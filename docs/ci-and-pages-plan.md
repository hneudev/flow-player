# CI and GitHub Pages plan (proposal)

Status: **approved by the owner on 2026-10-12** (step 1). Step 2: `.github/workflows/ci.yml` added (validated with `@action-validator/cli`; local `npm run check` steps pass except WebKit, which only CI can run); pushing it starts CI. Steps 3–5 still need separate authorization. Originally a proposal (portfolio Q07, owner selection A, 2026-10-12: "prepare library CI and GitHub Pages docs plan for review; no deployment authorization"). Author: Claude, 2026-10-12. Baseline: `76e328a`.

Nothing here is active: the workflows below are drafts in this document, not files in `.github/workflows/`. Adding them, enabling Pages and the first deployment are separate authorizations (section 5).

## 1. Current state

- No `.github/` directory; no CI. Releases are manual through the publish guard (`docs/releasing.md`).
- `npm run check` runs typecheck, unit tests, build, the docs boundary check, docs typecheck and build, packed-tarball consumer fixtures (`react18-ts49`, `react19-ts5`), the release check, and Playwright in **Chromium, Firefox and WebKit**.
- **WebKit has never been verified** (task 10): the development host lacks WebKit's system libraries and has no sudo. GitHub's Ubuntu runners can install them with `npx playwright install --with-deps`, so CI closes that gap.
- GitHub Pages is not enabled (API returns 404 on 2026-10-12).
- **Docs sub-path checked locally (2026-10-12):**
  - `DOCS_BASE=/flow-player/ npm run docs:build` emits `/flow-player/assets/...` paths;
  - served by `vite preview` at `/flow-player/`, the docs page renders its player with no failed requests or page errors.

## 2. CI workflow (draft)

Runs on pushes to `main` and on pull requests. Free for this public repository.

```yaml
# .github/workflows/ci.yml (draft)
name: CI
on:
  push: { branches: [main] }
  pull_request:
permissions: { contents: read }
concurrency: { group: ci-${{ github.ref }}, cancel-in-progress: true }
jobs:
  check:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with: { node-version: 24, cache: npm }
      - run: npm ci
      - run: npx playwright install --with-deps chromium firefox webkit
      - run: npm run check
      - if: failure()
        uses: actions/upload-artifact@v7
        with: { name: playwright-results, path: test-results/, retention-days: 7 }
```

Notes:
- Action majors were current on 2026-10-12 (checkout v7.0.1, setup-node v7.1.0, upload-artifact v7.0.2). Pin by major and let Dependabot propose updates (optional).
- `check:consumers` installs packed tarballs from the npm registry; it needs network access, which runners have.
- **No secrets.** CI never publishes: npm publishing stays manual behind the publish guard and `FLOW_PLAYER_PUBLISH_APPROVED`, never set in CI.
- If the three-engine suite is too slow, split it into a matrix per browser. Not needed until measured.

**Optional manual workflow** for `verify:published`, run after a release instead of on every push:

```yaml
# .github/workflows/verify-published.yml (draft)
name: Verify published package
on:
  workflow_dispatch:
    inputs:
      version: { required: true }
      integrity: { required: true, description: "Expected sha512 integrity from the release record" }
permissions: { contents: read }
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with: { node-version: 24, cache: npm }
      - run: npm ci
      - run: npm run verify:published -- "${{ inputs.version }}" "${{ inputs.integrity }}"
```

`scripts/verify-published.mjs` takes `<version> <sha512-integrity>` (checked 2026-10-12).

## 3. GitHub Pages workflow (draft)

Publishes the docs and playground to `https://hneudev.github.io/flow-player/`.

```yaml
# .github/workflows/pages.yml (draft)
name: Docs to GitHub Pages
on:
  push: { branches: [main], paths: ['apps/docs/**', 'packages/flow-player/**', 'package-lock.json'] }
  workflow_dispatch:
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: false }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with: { node-version: 24, cache: npm }
      - run: npm ci
      - run: npm run build
      - run: npm run docs:build
        env: { DOCS_BASE: /flow-player/ }
      - uses: actions/configure-pages@v6
      - uses: actions/upload-pages-artifact@v5
        with: { path: apps/docs/dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: ${{ steps.deployment.outputs.page_url }} }
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
```

Notes:
- Action majors current on 2026-10-12: configure-pages v6.0.0, upload-pages-artifact v5.0.0, deploy-pages v5.0.1.
- **Docs deploy separately from npm releases.** Docs built from `main` may describe unreleased changes; the docs app should show the package version it was built from. That is a small docs change, to plan with the first deployment.
- Pages stays free for public repositories and sits outside the Vercel Hobby allowances the portfolio and StockFlow share (portfolio PP-09).

## 4. Portfolio follow-up (after docs are live)

- `/lab` (later `/lab/architecture`, PP-12) adds a "Documentation and playground" link to the Pages URL. Experience 10's remaining Phase B gap closes.
- Q07 in the portfolio register closes once CI is green on `main` (including WebKit) and the docs link works.

## 5. Authorization steps (owner)

| Step | What happens | External effect |
| --- | --- | --- |
| 1 | Approve this plan (or request changes) | None |
| 2 | Authorize adding `ci.yml` (and optionally `verify-published.yml`) and pushing to `main` | CI starts running on GitHub |
| 3 | Enable Pages with source "GitHub Actions" (Settings → Pages), or authorize Claude to do it with `gh api` | Repository setting change |
| 4 | Authorize adding `pages.yml` and the first deployment | Public docs site at `hneudev.github.io/flow-player/` |
| 5 | Authorize the portfolio link (section 4) | Portfolio change, not deployed until Q15 |

## 6. Acceptance

- CI is green on `main` with all three engines, so **WebKit is verified for the first time**. If WebKit fails, the failure is a real finding for a library fix, not a reason to drop the engine.
- The Pages URL renders the docs and playground with no failed requests, in both color schemes.
- No secrets in workflows; no publish step in CI.
