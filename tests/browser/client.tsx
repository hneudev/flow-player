import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { Fixture } from './App';
import '@hneudev/flow-player/styles.css';
(window as any).events = [];
hydrateRoot(document.getElementById('app')!, <Fixture options={Object.fromEntries(new URLSearchParams(location.search))} />);
