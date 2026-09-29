import { PageScaffold } from '@/shared/ui';

/** Demo-only surface — not wired to production AI. */
export function RussiaChatbotPage() {
  return (
    <PageScaffold
      title="Russia Chatbot"
      description="This tool is not available in production."
    >
      <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-5">
        <p className="text-sm font-semibold text-[var(--text)]">Unavailable</p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          The previous ops-demo chatbot sessions have been gated. Guest support
          continues through Chat, WhatsApp, and the real AI assistant endpoint
          when Anthropic credentials are configured.
        </p>
      </div>
    </PageScaffold>
  );
}
