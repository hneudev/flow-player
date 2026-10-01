// Runs as prepublishOnly. Publishing needs an explicit, version-specific approval so that a stray
// `npm publish` from the package folder fails, while the reviewed package.json stays unchanged.
// Approved release: FLOW_PLAYER_PUBLISH_APPROVED=<version> (see docs/releasing.md).
import { readFileSync } from 'node:fs';

const { name, version } = JSON.parse(readFileSync(new URL('../packages/flow-player/package.json', import.meta.url), 'utf8'));
if (process.env.FLOW_PLAYER_PUBLISH_APPROVED !== version) {
  console.error(`Publishing ${name}@${version} requires explicit owner authorization.`);
  console.error(`Follow docs/releasing.md; it sets FLOW_PLAYER_PUBLISH_APPROVED=${version} for the approved release only.`);
  process.exit(1);
}
console.log(`Publish of ${name}@${version} approved by FLOW_PLAYER_PUBLISH_APPROVED.`);
