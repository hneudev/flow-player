import { useState } from 'react';

/** Shows source verbatim with a copy button. Clipboard access can be refused; the code stays selectable. */
export function CodeBlock({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState<'idle' | 'done' | 'failed'>('idle');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied('done');
    } catch {
      setCopied('failed');
    }
  };
  return (
    <figure className="code">
      <figcaption>
        <span>{label}</span>
        <button type="button" onClick={copy}>
          {copied === 'done' ? 'Copied' : copied === 'failed' ? 'Copy failed — select the code' : 'Copy'}
        </button>
      </figcaption>
      <pre tabIndex={0} aria-label={`${label} source`}>
        <code>{code.trimEnd()}</code>
      </pre>
      <span className="visually-hidden" role="status">
        {copied === 'done' ? `${label} copied` : ''}
      </span>
    </figure>
  );
}
