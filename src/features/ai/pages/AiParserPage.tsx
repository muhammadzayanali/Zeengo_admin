import { useState } from 'react';
import { ops } from '@/ops-demo/useOpsStore';
import {
  Button,
  PageScaffold,
  Textarea,
  useToast,
} from '@/shared/ui';

export function AiParserPage() {
  const { push } = useToast();
  const [raw, setRaw] = useState(
    'Client: Amine Lahouideg flight SV124 arriving 2026-08-04T18:30 hotel: Ritz-Carlton Riyadh pickup RUH Terminal 5',
  );
  const [parsed, setParsed] = useState<ReturnType<typeof ops.mockParseText> | null>(null);

  return (
    <PageScaffold
      title="AI Parser"
      description="Paste flight emails / WhatsApp / vouchers — extract structured booking fields (mock Claude Sonnet; replace function later)."
      primaryAction={
        <Button
          type="button"
          onClick={() => {
            setParsed(ops.mockParseText(raw));
            push({ tone: 'success', title: 'Parsed with mock LLM' });
          }}
        >
          Parse
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)]">
          <p className="mb-2 text-sm font-semibold">Raw input</p>
          <Textarea rows={14} value={raw} onChange={(e) => setRaw(e.target.value)} />
        </div>
        <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)]">
          <p className="mb-2 text-sm font-semibold">Parsed JSON</p>
          {parsed ? (
            <>
              <pre className="overflow-x-auto rounded-xl bg-[var(--bg-muted)] p-3 text-xs leading-relaxed">
                {JSON.stringify(parsed, null, 2)}
              </pre>
              <Button
                type="button"
                className="mt-4 w-full"
                onClick={() =>
                  push({
                    tone: 'success',
                    title: 'Committed to booking queue (demo — wire create booking later)',
                  })
                }
              >
                Commit to database
              </Button>
            </>
          ) : (
            <p className="py-16 text-center text-sm text-[var(--ink-muted)]">Run Parse to inspect output</p>
          )}
        </div>
      </div>
    </PageScaffold>
  );
}
