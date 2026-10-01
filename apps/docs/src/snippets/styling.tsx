import type { CSSProperties } from 'react';
import { FlowPlayer, type FlowDefinition } from '@hneudev/flow-player';
import '@hneudev/flow-player/styles.css';

const flow: FlowDefinition = {
  id: 'styled',
  title: 'Un flujo con estilo propio',
  nodes: [
    { id: 'app', label: 'App' },
    { id: 'api', label: 'API' },
  ],
  edges: [{ id: 'call', from: 'app', to: 'api', label: 'Solicitud' }],
  steps: [{ id: 'one', title: 'Solicitud', description: 'La app llama a la API.', activeEdges: ['call'] }],
};

// Map your own design tokens to the player's public custom properties.
const theme = {
  '--fp-color-accent': '#0B6E4F',
  '--fp-color-focus': '#0B6E4F',
  '--fp-radius': '0',
  '--fp-font-size': '15px',
} as CSSProperties;

export default function StylingExample() {
  return (
    <FlowPlayer
      flow={flow}
      style={theme}
      colorScheme="light"
      orientation="vertical"
      labels={{
        play: 'Reproducir', pause: 'Pausar', resume: 'Continuar', replay: 'Repetir',
        previous: 'Anterior', next: 'Siguiente', reset: 'Reiniciar',
        ready: 'Listo', playing: 'Reproduciendo', paused: 'En pausa', completed: 'Completado',
        pending: 'Pendiente', active: 'Activo', legend: 'Estados', steps: 'Pasos',
        controls: 'Controles de reproducción', invalid: 'No se pudo mostrar este flujo.',
        step: 'Paso {n} de {total}', to: 'a',
      }}
    />
  );
}
