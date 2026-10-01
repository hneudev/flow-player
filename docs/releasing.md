# Releasing @hneudev/flow-player

These steps publish a reviewed release candidate. **None of them is authorized by default.** Publishing, changing repository visibility, pushing tags and deploying each need explicit owner approval. The current candidate, its exact artifact hashes and its review commits are recorded in [task 13](tasks/13-release-candidate.md).

## 1. Owner prerequisites

- **npm ownership.** Create, or confirm, the npm user or organization `hneudev`, which owns the `@hneudev` scope. On 2026-10-01 the registry reported "Scope not found" for `@hneudev`.
  - Enable two-factor authentication for writes.
  - On the publishing machine, run `npm login`, then `npm whoami`, and confirm the result is the owning account.
- **Repository visibility.** Make `hneudev/flow-player` public before or together with publication, so that the package's `repository`, `homepage` and `bugs` links resolve. This was decided in task 13; only the owner changes visibility.
- **Docs hosting.** Optional for the npm release. The package README does not link to a docs site. See [apps/docs/README.md](../apps/docs/README.md) for deployment.

## 2. Reproduce and check the candidate

Use a clean clone at the candidate's artifact commit, listed in task 13:

```sh
git clone git@github.com:hneudev/flow-player.git && cd flow-player
git checkout <artifact-commit>
nvm use && npm ci
npx playwright install --with-deps chromium firefox webkit
npm run check
npm pack -w @hneudev/flow-player
shasum -a 1 hneudev-flow-player-0.1.0.tgz
node -e "console.log('sha512-' + require('crypto').createHash('sha512').update(require('fs').readFileSync('hneudev-flow-player-0.1.0.tgz')).digest('base64'))"
```

Both hashes must equal the values in task 13. `npm pack` output is reproducible, so a different hash means the package contents differ: stop and review.

WebKit needs Playwright's system libraries. Run the full three-engine `npm run check` on a host that has them. If WebKit cannot run, record that the release ships with Safari unverified, as the changelog states.

## 3. Publish the exact artifact (only after explicit authorization)

```sh
npm publish ./hneudev-flow-player-0.1.0.tgz --access public
```

Publishing the reviewed tarball guarantees that the registry receives exactly what was checked. npm does not run package lifecycle scripts when publishing a tarball.

The `prepublishOnly` guard protects publishes from the package folder. If a folder publish is ever used instead, it must be approved explicitly for that version:

```sh
FLOW_PLAYER_PUBLISH_APPROVED=0.1.0 npm publish -w @hneudev/flow-player
```

## 4. Verify the published package

```sh
npm run verify:published -- 0.1.0 <sha512 integrity from task 13>
```

This downloads `@hneudev/flow-player@0.1.0` from the registry and checks that both the registry integrity and the downloaded tarball equal the reviewed candidate. It then runs the fresh-consumer checks against that registry copy: React 18.2 with TS 4.9.5, React 19 with TS 5.9, the SSR checks, and the documentation snippets. Record the result in the task record.

## 5. Tag and announce (only after explicit authorization)

```sh
git tag -a v0.1.0 <artifact-commit> -m "@hneudev/flow-player 0.1.0"
git push origin v0.1.0
```

Create a GitHub release from the `0.1.0` changelog section.

## 6. Portfolio adoption (separate task, after step 4 passes)

In portfolio-4.0:
1. Replace `"@hneudev/flow-player": "file:vendor/hneudev-flow-player-0.0.0.tgz"` with the exact version `"0.1.0"`.
2. Remove `vendor/hneudev-flow-player-0.0.0.tgz` and update `vendor/README.md`.
3. Run `npm install`.
4. Confirm that the lockfile entry resolves from the registry with the task 13 integrity.
5. Run that repository's `npm run check`.

The portfolio currently uses 0.0.0 from commit `abcbb1f`. 0.1.0 adds documentation and package metadata only: there is no component change since `78138ff`, as task 13 records.

## If something goes wrong

Prefer `npm deprecate @hneudev/flow-player@0.1.0 "<reason>"` and a fixed patch release. npm restricts `unpublish`, and a version number can never be reused.
