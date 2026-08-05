import { useState } from 'react';
import { ops, useOpsSnapshot } from '@/ops-demo/useOpsStore';
import {
  Button,
  Input,
  Label,
  PageScaffold,
  Select,
  StatusBadge,
  useToast,
} from '@/shared/ui';

export function EmailPage() {
  const snap = useOpsSnapshot();
  const { push } = useToast();
  const [to, setTo] = useState('fahd@example.com');
  const [template, setTemplate] = useState(snap.emailTemplates[0]?.name ?? '');

  return (
    <PageScaffold
      title="Email System"
      description="Templates for confirmations, itinerary changes, SOS follow-ups, and invoices."
    >
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="space-y-3 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)]">
          <h3 className="text-sm font-semibold">Composer</h3>
          <div>
            <Label>To</Label>
            <Input value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <Label>Template</Label>
            <Select value={template} onChange={(e) => setTemplate(e.target.value)}>
              {snap.emailTemplates.map((t) => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </Select>
          </div>
          <Button
            type="button"
            className="w-full"
            onClick={async () => {
              await ops.sendEmailLog(to, template);
              push({ tone: 'success', title: 'Email sent (demo log)' });
            }}
          >
            Send
          </Button>
          <div className="border-t border-[var(--line)] pt-3">
            <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Library</p>
            <ul className="mt-2 space-y-1 text-sm">
              {snap.emailTemplates.map((t) => (
                <li key={t.id}>• {t.name}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]">
          <div className="border-b border-[var(--line)] px-4 py-3 text-sm font-semibold">Delivery log</div>
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-muted)] text-xs font-medium uppercase text-[var(--ink-muted)]">
              <tr>
                <th className="px-4 py-2 text-start">To</th>
                <th className="px-4 py-2 text-start">Template</th>
                <th className="px-4 py-2 text-start">Status</th>
                <th className="px-4 py-2 text-start">When</th>
              </tr>
            </thead>
            <tbody>
              {snap.emailLogs.map((e) => (
                <tr key={e.id} className="border-t border-[var(--line)]">
                  <td className="px-4 py-2">{e.to}</td>
                  <td className="px-4 py-2">{e.template}</td>
                  <td className="px-4 py-2">
                    <StatusBadge
                      tone={
                        e.status === 'opened'
                          ? 'success'
                          : e.status === 'bounced'
                            ? 'danger'
                            : e.status === 'delivered'
                              ? 'accent'
                              : 'default'
                      }
                    >
                      {e.status}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-2 text-[var(--ink-muted)]">{ops.elapsedLabel(e.at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageScaffold>
  );
}
