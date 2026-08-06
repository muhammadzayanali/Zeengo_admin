import { useMemo, useState } from 'react';
import { ops, useOpsSnapshot } from '@/ops-demo/useOpsStore';
import { Button, Input, PageScaffold, StatusBadge, useToast } from '@/shared/ui';

export function ChatPage() {
  const snap = useOpsSnapshot();
  const { push } = useToast();
  const [channelId, setChannelId] = useState(snap.channels[0]?.id ?? '');
  const [text, setText] = useState('');

  const msgs = useMemo(
    () => snap.messages.filter((m) => m.channelId === channelId),
    [snap.messages, channelId],
  );

  return (
    <PageScaffold
      title="Team Chat"
      description="Operational channels, DMs, pinning, and attachments (S3 later)."
    >
      <div className="grid min-h-[480px] gap-3 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-2 shadow-[var(--shadow)]">
          {snap.channels.map((ch) => (
            <button
              key={ch.id}
              type="button"
              onClick={() => setChannelId(ch.id)}
              className={
                channelId === ch.id
                  ? 'mb-1 w-full rounded-lg bg-[var(--accent-soft)] px-3 py-2 text-start text-sm font-medium text-[var(--accent)]'
                  : 'mb-1 w-full rounded-lg px-3 py-2 text-start text-sm text-[var(--ink-muted)] hover:bg-[var(--bg-muted)]'
              }
            >
              {ch.name}
            </button>
          ))}
        </aside>
        <div className="flex flex-col rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]">
          <div className="border-b border-[var(--line)] px-4 py-3 text-sm font-semibold">
            {snap.channels.find((c) => c.id === channelId)?.name}
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {msgs.map((m) => (
              <div key={m.id} className="rounded-xl bg-[var(--bg-muted)] px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{m.author}</span>
                  {m.pinned ? <StatusBadge tone="warning">Pinned</StatusBadge> : null}
                </div>
                <p className="mt-1">{m.body}</p>
                <p className="mt-1 text-[11px] text-[var(--ink-muted)]">{ops.elapsedLabel(m.at)}</p>
              </div>
            ))}
          </div>
          <form
            className="flex gap-2 border-t border-[var(--line)] p-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!text.trim()) return;
              await ops.addChatMessage(channelId, text.trim());
              setText('');
            }}
          >
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Message… @mention drivers / pin SOS logs"
            />
            <Button type="submit">Send</Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => push({ tone: 'success', title: 'Attachment upload (S3 demo)' })}
            >
              Attach
            </Button>
          </form>
        </div>
      </div>
    </PageScaffold>
  );
}
