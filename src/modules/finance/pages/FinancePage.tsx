import { useMemo, useState } from 'react';
import { useOpsSnapshot } from '@/ops-demo/useOpsStore';
import {
  Button,
  DetailDrawer,
  PageScaffold,
  SearchBar,
  StatsCard,
  StatusBadge,
  useToast,
} from '@/shared/ui';

type Tx = { id: string; client: string; amount: number; status: 'paid' | 'pending' | 'failed'; method: string; at: string };

const TX: Tx[] = [
  { id: 'tx1', client: 'ZN0001 Abdullah', amount: 12500, status: 'paid', method: 'Stripe', at: '2026-08-04' },
  { id: 'tx2', client: 'ZN0002 فهد', amount: 1750, status: 'pending', method: 'Stripe link', at: '2026-08-04' },
  { id: 'tx3', client: 'ZN0003 Noura', amount: 4200, status: 'paid', method: 'Cash', at: '2026-08-03' },
  { id: 'tx4', client: 'ZN0005 Maria', amount: 200, status: 'failed', method: 'Stripe', at: '2026-08-03' },
  { id: 'tx5', client: 'ZN0010 Turki', amount: 8000, status: 'paid', method: 'Stripe', at: '2026-08-02' },
];

export function FinancePage() {
  const snap = useOpsSnapshot();
  const { push } = useToast();
  const [q, setQ] = useState('');
  const [txId, setTxId] = useState<string | null>(null);

  const outstanding = snap.clients.reduce((s, c) => s + c.outstanding, 0);
  const gross = snap.clients.reduce((s, c) => s + c.totalSpent, 0);
  const vendorPending = 3200;
  const net = gross * 0.62;

  const filtered = useMemo(
    () => TX.filter((t) => `${t.client} ${t.method}`.toLowerCase().includes(q.toLowerCase())),
    [q],
  );
  const detail = TX.find((t) => t.id === txId);

  return (
    <PageScaffold
      title="Finance"
      description="Global ledger — gross revenue, pending collections, vendor payouts, Stripe tools (UI demo)."
      stats={
        <>
          <StatsCard label="Gross revenue" value={`$${gross.toLocaleString()}`} tone="success" />
          <StatsCard label="Net profit (est.)" value={`$${Math.round(net).toLocaleString()}`} />
          <StatsCard label="Vendor payouts pending" value={`$${vendorPending.toLocaleString()}`} tone="warning" />
          <StatsCard label="Outstanding receivables" value={`-$${outstanding.toLocaleString()}`} tone="danger" />
        </>
      }
      filters={<SearchBar value={q} onChange={setQ} placeholder="Transaction / client…" className="max-w-sm" />}
      primaryAction={
        <Button type="button" variant="secondary" onClick={() => push({ tone: 'success', title: 'Stripe dashboard (demo link)' })}>
          Open Stripe
        </Button>
      }
    >
      <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-[var(--bg-muted)] text-xs font-medium uppercase text-[var(--ink-muted)]">
              <tr>
                <th className="px-4 py-3 text-start">Client</th>
                <th className="px-4 py-3 text-start">Method</th>
                <th className="px-4 py-3 text-start">Amount</th>
                <th className="px-4 py-3 text-start">Status</th>
                <th className="px-4 py-3 text-start">Date</th>
                <th className="px-4 py-3 text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-t border-[var(--line)] hover:bg-[var(--bg-muted)]/70">
                  <td className="px-4 py-3 font-medium">{t.client}</td>
                  <td className="px-4 py-3">{t.method}</td>
                  <td className="px-4 py-3">${t.amount.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={t.status === 'paid' ? 'success' : t.status === 'pending' ? 'warning' : 'danger'}>
                      {t.status}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-[var(--ink-muted)]">{t.at}</td>
                  <td className="px-4 py-3 text-end">
                    <Button type="button" variant="ghost" onClick={() => setTxId(t.id)}>
                      Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <DetailDrawer open={Boolean(detail)} title="Transaction" onClose={() => setTxId(null)}
        footer={
          detail ? (
            <div className="flex flex-col gap-2">
              <Button type="button" variant="secondary" onClick={() => push({ tone: 'success', title: 'Receipt generated (demo)' })}>
                Generate receipt
              </Button>
              {detail.status === 'paid' ? (
                <Button type="button" variant="danger" onClick={() => push({ tone: 'success', title: 'Refund queued (demo)' })}>
                  Process refund
                </Button>
              ) : null}
            </div>
          ) : null
        }
      >
        {detail ? (
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-[var(--ink-muted)]">Client</dt><dd>{detail.client}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--ink-muted)]">Amount</dt><dd>${detail.amount.toLocaleString()}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--ink-muted)]">Method</dt><dd>{detail.method}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--ink-muted)]">Status</dt><dd>{detail.status}</dd></div>
          </dl>
        ) : null}
      </DetailDrawer>
    </PageScaffold>
  );
}
