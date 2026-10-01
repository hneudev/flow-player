# 13 — Release candidate @hneudev/flow-player 0.1.0

## Scope and status

**Release candidate prepared; not published.** Baseline: `abcbb1f`, clean and in sync with `origin/main`.

Nothing was published, no tag was created or pushed, the repository's visibility was not changed, and nothing was deployed. Publication is a separate, explicit owner instruction, following [docs/releasing.md](../releasing.md). After publication, the registry artifact must be verified before the portfolio adopts it.

## Owner decisions (2026-10-01)

| Decision | Answer |
| --- | --- |
| Package identity | `@hneudev/flow-player`, version **0.1.0**, matching the accepted v0.1 contract |
| npm ownership | The owner will create or confirm the npm user or organization `hneudev`. The registry currently reports "Scope not found" for `@hneudev`, and this machine is not logged in to npm (`ENEEDAUTH`). This is a **release prerequisite** |
| License | MIT, `Copyright (c) 2026 Hector Neudert` (confirmed) |
| Visibility | `hneudev/flow-player` becomes **public at release**. It is private today, and GitHub detects the MIT license. The owner changes it |

## The release candidate

| | |
| --- | --- |
| Artifact commit | `3ec8f66` "Prepare @hneudev/flow-player 0.1.0 release candidate". The tarball depends only on `packages/flow-player` at this commit |
| File | `hneudev-flow-player-0.1.0.tgz` |
| npm shasum (SHA-1) | `3b36071ab69785543f4178ffacbb08d204626d26` |
| npm integrity (SHA-512) | `sha512-hdpSmAyGD5Jq/bj8vJSImp5WX/6PqeHMrOKIgWcUe/hVR0A0DisVgianI2nK8wSXyfRWvGrT+xRnlGQJIAr9tA==` |
| SHA-256 | `edae3d900b984289fd123abff04bcf5c323b52995af4eb337ebc7ba303fe7958` |
| Size | 42 files, 23,027 bytes packed, 127,079 bytes unpacked |
| Reproducibility | A fresh `git clone` at `3ec8f66`, then `npm ci`, `build` and `pack`, produced a byte-identical file to a pack from the working checkout (`cmp` equal). An approved `npm publish --dry-run` from the package folder reported the same shasum |

**Review commits since the last release-relevant baseline:**
- `78138ff`: last component source change (connector wording, keyboard test).
- `abcbb1f`: docs site and playground; no package change.
- `3ec8f66`: release metadata, docs and checks; no component source change. `git diff 78138ff 3ec8f66 -- packages/flow-player/src` is empty.

### Packed contents

The tarball contains:
- `dist/esm` and `dist/cjs`: JS and `.d.ts` for the component, the entry, and the internal engine modules the component imports;
- `dist/cjs/package.json`, marking the CommonJS build;
- `dist/styles.css`;
- `README.md`, `CHANGELOG.md`, `LICENSE` and `package.json`.

It contains no source, tests, examples, docs app, reference images, source maps, machine paths, local URLs or portfolio material. A scan for `/home/`, `localhost`, `127.0.0.1`, `hneu.dev`, `portfolio`, `TODO` and `FIXME` found nothing. There are no runtime dependencies. React and React DOM are peers, and `@types/react` is an optional peer.

### What changed for the release

| Area | Change |
| --- | --- |
| `package.json` | Version `0.1.0`, keywords, `repository` (with `directory`), `homepage`, `bugs`, `publishConfig.access: public` (scoped packages default to restricted). `prepublishOnly` now runs `scripts/publish-guard.mjs`, which rejects folder publishes unless `FLOW_PLAYER_PUBLISH_APPROVED` equals the version. The earlier always-failing guard would have had to be edited at publish time, changing the reviewed `package.json` |
| `CHANGELOG.md` | A `0.1.0` section: what is added, plus known limitations (Safari/WebKit unverified; no manual screen-reader testing) |
| Package README | Rewritten for npm readers: install, usage, data rules, props, events and handle, styling, accessibility, compatibility, limitations, license. The usage block is `apps/docs/src/snippets/minimal.tsx` verbatim, so it is covered by the snippet checks. Internal task references were removed. Links use absolute GitHub URLs, which resolve once the repository is public |
| Compatibility statement | In the README, the supported range and the versions tested for this release are listed separately (table below) |
| Docs site | States "0.1.0 release candidate · not yet on npm"; shows `npm install @hneudev/flow-player` for after publication and the tarball route before it |
| Checks | `scripts/check-release.mjs` (`npm run check:release`, now part of `npm run check`) checks: identity, MIT, public access, repository URL, `files` allowlist, no runtime dependencies, identical LICENSE files with the confirmed holder, top changelog entry = version, no "Unreleased" section, docs site states the version, README usage = verified snippet, README compatibility heading, no source maps or machine paths in `dist/`, and the packed filename. Deliberately altering the README usage made it fail |
| Post-publish verification | `scripts/check-consumers.mjs --tarball <file>` runs the fresh-consumer checks on a given artifact. `npm run verify:published -- <version> <integrity>` downloads from the registry, requires both registry metadata and the downloaded file to match the reviewed integrity, then runs those checks against the registry copy |
| Instructions | [docs/releasing.md](../releasing.md): owner prerequisites, reproducing and comparing hashes, publishing the exact tarball, verifying, tagging, portfolio adoption, and deprecating rather than unpublishing |

### Compatibility statement (as shipped)

| Area | Supported | Tested for 0.1.0 |
| --- | --- | --- |
| React / React DOM | `^18.2.0 \|\| ^19.0.0` | 18.2.0 and 19.3.0, installed from the tarball |
| TypeScript | ≥ 4.9; `node`, `node16` or `bundler` resolution | 4.9.5 (`@types/react` 18.0.28) under `node` and `node16`; 5.9.3 under `bundler` |
| Modules | ESM and CommonJS with declarations | Both server-rendered in Node 24.17.0 |
| Browsers | Current Chrome/Edge, Firefox, Safari; iOS Safari ≥ 16.4 | Chromium and Firefox. **WebKit not verified** |

## Portfolio integration evidence

Portfolio commit `6d44e8e` (task 12) uses a vendored `hneudev-flow-player-0.0.0.tgz`, packed at `abcbb1f`. Compared with this candidate, the extracted `dist/` is **identical**; only `README.md`, `CHANGELOG.md` and `package.json` differ. The portfolio's results therefore apply to the same runtime code:
- **Fresh run before that commit:** a clean `npm ci` and full `npm run check`, with all 8 Chromium journeys including the Lab.
- **GitHub CI on `6d44e8e`:** passed.

Its consumer is the React 18.2, TS 4.9.5, Next 15.1.6 setup with a 62.5% root, which the packed fixture above also mirrors.

The portfolio is unchanged by this task. It adopts 0.1.0 only after publication and registry verification (step 6 of the release instructions).

## Verification (actual, 2026-10-01, Node 24.17.0 / npm 11.13.0)

| Check | Result |
| --- | --- |
| `npm ci` after removing `node_modules`, the package `dist/` and `apps/docs/dist` | Passed, 55 packages |
| `npm run typecheck`, `npm test` | 0 errors; 90 tests passed |
| `npm run build`, `check:docs-boundary`, docs typecheck and build | Passed (29 imports, public entry points only) |
| `npm run check:consumers` | Passed. React 18.2 / TS 4.9.5 (`node`, `node16`) and React 19.3 / TS 5.9.3 (`bundler`): install from tarball, declarations, ESM and CJS SSR, invalid fallback, stylesheet scope, no nested React, and all four doc snippets |
| `npm run check:release` | Passed: `@hneudev/flow-player@0.1.0`, 42 files, 23,027 bytes |
| `npx playwright test --project=chromium --project=firefox` | 20 passed (41.4s): component and docs journeys in each engine |
| `npx playwright test --project=webkit` | 10 failed at launch: "Host system is missing dependencies to run browsers". This is an environment limit, not a pass |
| Fresh clone at `3ec8f66`: `npm ci`, build, pack | Byte-identical artifact; hashes above |
| `check-consumers.mjs --tarball` on that exact file | Passed (same coverage as above) |
| Publish guard (`npm publish --dry-run -w`, nothing uploaded) | No approval: rejected. Approval for `0.2.0`: rejected. Approval `0.1.0`: proceeds, with shasum `3b36071…`, public access, tag `latest` |
| Git history scan (all commits) | No credentials, keys, tokens or `.env`/`.npmrc` files. The only author is `Hector Neudert <hneudev@gmail.com>` |

Because WebKit cannot launch here, the single command `npm run check` is not green on this host. Everything it runs except WebKit passed.

## Remaining owner decisions and actions before publication

1. **npm scope.** Create or confirm `hneudev` on npm, enable 2FA, and `npm login` on the publishing machine.
2. **Repository visibility.** Make `hneudev/flow-player` public. When the repository goes public, these become public too:
   - the commit author email `hneudev@gmail.com`;
   - the three conceptual reference images in `docs/references/` (3.6 MB). They are copies of design explorations from the private portfolio; they are labelled conceptual and are not in the package.

   Decide whether those images should be public, or removed before the switch.
3. **WebKit.** Optionally run the three-engine `npm run check` on a host with Playwright's system dependencies. Otherwise 0.1.0 ships with Safari unverified, as the changelog states.
4. **Publish authorization.** Authorize publishing this exact artifact, and separately tagging `v0.1.0`.
5. **Docs hosting.** Still undecided. Not required for the npm release, and the package README does not link to a docs site.
6. **Provenance (optional).** npm provenance needs publishing from CI with OIDC. No CI workflow exists in this repository yet.

## Handoff

Committed locally on `main`: `3ec8f66`, the artifact commit, plus the commit that adds this record. Nothing is pushed yet.

After an explicit publishing instruction, follow [docs/releasing.md](../releasing.md) steps 2–4 and record the `verify:published` result here before asking the portfolio to adopt 0.1.0.
