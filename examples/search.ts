// Illustrative example: a request travels Interface → Server → Data and the response returns
// along explicit edges. The index and stack labels are fictional; nothing is searched for real.
import type { FlowDefinition, FlowNodeDetailItem } from '@hneudev/flow-player';

/** Fixed, fictional records the simulated index matches by title or keyword. */
export const SEARCH_INDEX: readonly { title: string; keywords: readonly string[] }[] = [
  { title: 'Navigation patterns', keywords: ['navigation', 'menus'] },
  { title: 'Clear wayfinding', keywords: ['navigation', 'orientation'] },
  { title: 'Search and orientation', keywords: ['navigation', 'search'] },
  { title: 'Form validation basics', keywords: ['forms', 'errors'] },
  { title: 'Color contrast checks', keywords: ['color', 'accessibility'] },
  { title: 'Keyboard operation', keywords: ['keyboard', 'accessibility', 'focus'] },
  { title: 'Loading states', keywords: ['feedback', 'performance'] },
];

const MAX_RESULTS = 3;

function matchesFor(query: string): string[] {
  const needle = query.toLowerCase();
  const words = needle.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  return SEARCH_INDEX.filter(({ title, keywords }) =>
    words.some(word => title.toLowerCase().includes(word) || keywords.includes(word)),
  )
    .slice(0, MAX_RESULTS)
    .map(record => record.title);
}

function shorten(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/** Builds a deterministic search flow. A different query yields a different `id` (replacement). */
export function createSearchFlow(rawQuery: string): FlowDefinition {
  const query = rawQuery.trim();
  const shown = shorten(query || '(empty query)', 32);
  const matches = matchesFor(query);
  const count = matches.length;
  const found = count === 1 ? '1 match found' : `${count} matches found`;
  const records = count === 1 ? '1 matching record' : `${count} matching records`;
  const resultItems: FlowNodeDetailItem[] = count
    ? matches.map(label => ({ label, state: 'done' }))
    : [{ label: 'No matching records', state: 'done' }];

  return {
    id: `search:${query.toLowerCase()}`,
    title: `Search request for “${shown}”`,
    caption: 'Illustrative architecture simulation',
    nodes: [
      { id: 'interface', kind: 'Interface', label: 'Search the library', meta: 'React' },
      { id: 'server', kind: 'Server', label: 'Handle the request', meta: 'Node.js API' },
      { id: 'data', kind: 'Data', label: 'Find matching records', meta: 'Search index' },
    ],
    edges: [
      { id: 'query', from: 'interface', to: 'server', label: 'Search query' },
      { id: 'lookup', from: 'server', to: 'data', label: 'Lookup' },
      { id: 'records', from: 'data', to: 'server', label: 'Records' },
      { id: 'results', from: 'server', to: 'interface', label: 'Results' },
    ],
    steps: [
      {
        id: 'submitted',
        title: 'Query submitted',
        description: `The interface sends “${shown}” to the server and waits for results.`,
        activeNodes: ['interface'],
        activeEdges: ['query'],
        nodeDetails: {
          interface: { badge: shown, note: 'Waiting for results' },
          server: {
            items: [
              { label: 'Validate query', state: 'pending' },
              { label: 'Request matches', state: 'pending' },
              { label: 'Return results', state: 'pending' },
            ],
          },
        },
      },
      {
        id: 'checked',
        title: 'Request checked',
        description: 'The server validates the query and asks the index for matching records.',
        activeNodes: ['server'],
        activeEdges: ['lookup'],
        nodeDetails: {
          server: {
            items: [
              { label: 'Validate query', state: 'done' },
              { label: 'Request matches', state: 'active' },
              { label: 'Return results', state: 'pending' },
            ],
          },
        },
      },
      {
        id: 'matched',
        title: count ? 'Matches found' : 'No matches',
        description: count
          ? `The index found ${records}. The server will turn them into a response for the interface.`
          : 'The index found no records. The server will still send an empty response.',
        activeNodes: ['data'],
        activeEdges: ['records'],
        edgeLabels: { records },
        nodeDetails: {
          data: { badge: found, items: resultItems },
          server: {
            items: [
              { label: 'Validate query', state: 'done' },
              { label: 'Request matches', state: 'done' },
              { label: 'Return results', state: 'active' },
            ],
          },
        },
      },
      {
        id: 'displayed',
        title: 'Results displayed',
        description: count ? `The interface lists ${records} for “${shown}”.` : `The interface explains that nothing matched “${shown}”.`,
        activeNodes: ['interface'],
        activeEdges: ['results'],
        edgeLabels: { results: found },
        nodeDetails: {
          interface: { badge: shown, items: resultItems },
          server: {
            items: [
              { label: 'Validate query', state: 'done' },
              { label: 'Request matches', state: 'done' },
              { label: 'Return results', state: 'done' },
            ],
          },
        },
      },
    ],
  };
}
