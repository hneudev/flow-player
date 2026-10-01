# Changelog

All notable changes to `@hneudev/flow-player` are recorded here. The package follows semantic versioning; during 0.x, breaking changes are released as a new minor version.

## Unreleased

- Interactive FlowPlayer with native controls, typed ref/events/labels, scoped themes, container orientation, reduced motion and accessible state text.
- SSR/hydration, keyboard, axe and browser integration checks plus expanded packed-consumer declarations.
- Connector text for assistive technology names direction in words (new `labels.to`, default "to") instead of an arrow glyph that screen readers may skip.

- Package scaffold: ESM and CommonJS builds, declarations, stylesheet, and a static scaffold-stage `FlowPlayer`.
- Deterministic playback engine (internal), and the public `validateFlow` function.
