import { useState } from 'react';
import type { Selection } from './state/selection';
import { WatchSelector } from './WatchSelector';

export default function App() {
  const [selection, setSelection] = useState<Selection | null>(null);
  return (
    <>
      <WatchSelector onChange={setSelection} />
      <pre className="json" aria-label="Saída da seleção">{JSON.stringify(selection, null, 2) ?? 'null'}</pre>
    </>
  );
}
