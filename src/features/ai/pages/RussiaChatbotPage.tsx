import { ops, useOpsSnapshot } from '@/ops-demo/useOpsStore';
import {
  Button,
  PageScaffold,
  StatusBadge,
  useToast,
} from '@/shared/ui';

export function RussiaChatbotPage() {
  const snap = useOpsSnapshot();
  const { push } = useToast();

  return (
    <PageScaffold
      title="Russia Chatbot"
      description="Automated RU support desk — intent, sentiment, confidence. Human handoff under 85% confidence."
    >
      <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-[var(--bg-muted)] text-xs font-medium uppercase text-[var(--ink-muted)]">
              <tr>
                <th className="px-4 py-3 text-start">Client</th>
                <th className="px-4 py-3 text-start">Last message</th>
                <th className="px-4 py-3 text-start">Intent</th>
                <th className="px-4 py-3 text-start">Sentiment</th>
                <th className="px-4 py-3 text-start">Confidence</th>
                <th className="px-4 py-3 text-start">Auto-reply</th>
                <th className="px-4 py-3 text-start">Status</th>
                <th className="px-4 py-3 text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {snap.russiaSessions.map((s) => {
                const low = s.confidence < 0.85;
                return (
                  <tr key={s.id} className="border-t border-[var(--line)] hover:bg-[var(--bg-muted)]/70">
                    <td className="px-4 py-3 font-medium">{s.clientName}</td>
                    <td className="max-w-[220px] truncate px-4 py-3 text-[var(--ink-muted)]">{s.lastMessage}</td>
                    <td className="px-4 py-3"><StatusBadge>{s.intent}</StatusBadge></td>
                    <td className="px-4 py-3">{(s.sentiment * 100).toFixed(0)}%</td>
                    <td className="px-4 py-3">
                      <span className={low ? 'font-semibold text-[var(--danger)]' : ''}>
                        {(s.confidence * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="text-[var(--accent)]"
                        onClick={() => void ops.toggleRussiaAuto(s.id)}
                      >
                        {s.autoReply ? 'On' : 'Off'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        tone={
                          s.status === 'escalated' ? 'danger' : s.status === 'bot' ? 'accent' : 'default'
                        }
                      >
                        {s.status}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-end">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={async () => {
                          await ops.escalateRussia(s.id);
                          push({ tone: 'success', title: 'Escalated to human support' });
                        }}
                      >
                        Escalate
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </PageScaffold>
  );
}
