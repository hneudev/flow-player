// Illustrative example: publishing is acknowledged early, then finished by an asynchronous job
// that fails once and is retried. All names are fictional; nothing is published for real.
import type { FlowDefinition } from '@hneudev/flow-player';

export const publishingFlow: FlowDefinition = {
  id: 'publishing',
  title: 'Publishing a page through a build queue',
  caption: 'Illustrative architecture simulation',
  nodes: [
    { id: 'editor', kind: 'Editor', label: 'Request publication', meta: 'Web editor' },
    { id: 'api', kind: 'API', label: 'Accept the change', meta: 'Content API' },
    { id: 'queue', kind: 'Queue', label: 'Hold build jobs', meta: 'Job queue' },
    { id: 'renderer', kind: 'Worker', label: 'Render the pages', meta: 'Renderer' },
    { id: 'cdn', kind: 'Delivery', label: 'Serve the pages', meta: 'CDN' },
  ],
  edges: [
    { id: 'publish', from: 'editor', to: 'api', label: 'Publish' },
    { id: 'accepted', from: 'api', to: 'editor', label: '202 Accepted' },
    { id: 'enqueue', from: 'api', to: 'queue', label: 'Enqueue build' },
    { id: 'job', from: 'queue', to: 'renderer', label: 'Build job' },
    { id: 'retry', from: 'renderer', to: 'queue', label: 'Retry scheduled' },
    { id: 'upload', from: 'renderer', to: 'cdn', label: 'Upload pages' },
  ],
  steps: [
    {
      id: 'requested',
      title: 'Publish requested',
      description: 'The editor asks the content API to publish the saved draft.',
      activeNodes: ['editor'],
      activeEdges: ['publish'],
      nodeDetails: { editor: { badge: 'Draft saved', note: 'Publishing…' } },
    },
    {
      id: 'queued',
      title: 'Accepted and queued',
      description: 'The API answers immediately and, at the same time, queues a build. The editor does not wait for the build.',
      activeNodes: ['api'],
      activeEdges: ['accepted', 'enqueue'],
      nodeDetails: {
        editor: { badge: 'Publishing', note: 'You can keep working' },
        queue: { badge: '1 job waiting' },
      },
    },
    {
      id: 'picked-up',
      title: 'Job picked up',
      description: 'A renderer takes the build job from the queue.',
      activeNodes: ['queue', 'renderer'],
      activeEdges: ['job'],
      nodeDetails: {
        queue: { badge: '0 jobs waiting' },
        renderer: { items: [{ label: 'Render pages', state: 'active' }] },
      },
    },
    {
      id: 'failed',
      title: 'Render failed',
      description: 'Rendering times out. The renderer reports the failure and the queue schedules a retry.',
      tone: 'critical',
      activeNodes: ['renderer'],
      activeEdges: ['retry'],
      edgeLabels: { retry: 'Retry in 30 s' },
      nodeDetails: {
        renderer: { badge: 'Attempt 1 failed', items: [{ label: 'Render pages', state: 'pending' }] },
        queue: { badge: '1 job waiting', note: 'Retry scheduled' },
      },
    },
    {
      id: 'retried',
      title: 'Retry picked up',
      description: 'The renderer takes the same job again and the second attempt succeeds.',
      activeNodes: ['queue', 'renderer'],
      activeEdges: ['job'],
      edgeLabels: { job: 'Build job (attempt 2)' },
      nodeDetails: {
        queue: { badge: '0 jobs waiting' },
        renderer: { badge: 'Attempt 2', items: [{ label: 'Render pages', state: 'done' }] },
      },
    },
    {
      id: 'uploaded',
      title: 'Pages uploaded',
      description: 'The renderer uploads the new pages to the CDN and replaces the cached copies.',
      activeNodes: ['renderer'],
      activeEdges: ['upload'],
      nodeDetails: { renderer: null, cdn: { items: [{ label: 'Replace cached pages', state: 'active' }] } },
    },
    {
      id: 'live',
      title: 'Live',
      description: 'Visitors now receive the new pages from the CDN. The editor shows the page as published.',
      activeNodes: ['cdn', 'editor'],
      nodeDetails: {
        cdn: { badge: 'Live', items: [{ label: 'Replace cached pages', state: 'done' }] },
        editor: { badge: 'Published' },
      },
    },
  ],
};
