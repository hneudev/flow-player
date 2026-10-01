# Changelog

All notable changes to `@hneudev/flow-player` are recorded here. The package follows semantic versioning; during 0.x, breaking changes are released as a new minor version.

## 0.1.0

First release.

### Added

- `FlowPlayer`: plays scripted steps across a lane of 2–6 nodes with directional edges between neighbours. It has built-in play, pause, previous, next and reset controls, a step list, node details, per-step edge labels and a critical step tone.
- Playback owned by the component, with `defaultStepIndex`, `autoPlay`, `stepDurationMs` and per-step `durationMs`. Flow replacement by `id` and in-place updates for the same `id`.
- Events `onStepChange`, `onStatusChange` and `onComplete` with change causes, and a `FlowPlayerHandle` ref (`play`, `pause`, `next`, `previous`, `goTo`, `reset`, `getState`).
- `validateFlow` and a non-throwing invalid-flow fallback (`invalidFlowFallback`, `onInvalidFlow`).
- Container-based `orientation`, `colorScheme`, `reducedMotion` and localizable `labels`, including `to` for connector text read by screen readers.
- Scoped stylesheet `@hneudev/flow-player/styles.css` with `--fp-*` custom properties and `em`-based sizing.
- ESM and CommonJS builds with declarations for TypeScript ≥ 4.9. React and React DOM `^18.2.0 || ^19.0.0` are peer dependencies; there are no runtime dependencies.

### Known limitations

- Safari/WebKit is supported by design but not yet verified by automated tests for this release.
- Manual screen-reader testing has not been performed.
