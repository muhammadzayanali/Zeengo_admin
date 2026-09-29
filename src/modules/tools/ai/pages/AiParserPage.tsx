import { PageScaffold } from '@/shared/ui';

/** Demo-only surface — not wired to production AI. */
export function AiParserPage() {
  return (
    <PageScaffold
      title="AI Parser"
      description="This tool is not available in production."
    >
      <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-5">
        <p className="text-sm font-semibold text-[var(--text)]">Unavailable</p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          The previous mock parser has been gated. Use the real AI tools under
          <span className="font-semibold"> AI </span>
          (Nest <code>/ai/*</code>) when Anthropic credentials are configured,
          or paste itineraries into Operations / Booking workspace manually.
        </p>
      </div>
    </PageScaffold>
  );
}
