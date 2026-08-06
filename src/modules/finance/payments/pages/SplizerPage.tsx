import { useMemo, useState } from 'react';
import { ops, useOpsSnapshot } from '@/ops-demo/useOpsStore';
import {
  Button,
  Input,
  Label,
  PageScaffold,
  SearchBar,
  Select,
  StatsCard,
  TabBar,
  useToast,
} from '@/shared/ui';

type Tab = 'clients' | 'cash' | 'stripe' | 'history';

function money(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function SplizerPage() {
  const snap = useOpsSnapshot();
  const { push } = useToast();
  const [tab, setTab] = useState<Tab>('clients');
  const [q, setQ] = useState('');
  const [cashClient, setCashClient] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [cashNote, setCashNote] = useState('');
  const [stripeClient, setStripeClient] = useState('');
  const [stripeAmount, setStripeAmount] = useState('');
  const [lastStripeUrl, setLastStripeUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const clients = useMemo(() => {
    return snap.clients
      .filter((c) => c.status === 'active')
      .filter((c) =>
        `${c.fullName} ${c.znCode} ${c.packageName}`.toLowerCase().includes(q.toLowerCase()),
      );
  }, [snap.clients, q]);

  const dueTotal = snap.clients.reduce((s, c) => s + c.outstanding, 0);
  const paidToday = snap.payments
    .filter((p) => Date.now() - new Date(p.at).getTime() < 86400_000)
    .reduce((s, p) => s + p.amount, 0);

  async function onCollectCash() {
    if (!cashClient || !cashAmount) return;
    setBusy(true);
    try {
      await ops.collectCash(cashClient, Number(cashAmount), cashNote);
      push({ tone: 'success', title: 'Cash collection logged' });
      setCashAmount('');
      setCashNote('');
      setTab('history');
    } finally {
      setBusy(false);
    }
  }

  async function onStripeLink() {
    if (!stripeClient || !stripeAmount) return;
    setBusy(true);
    try {
      const pay = await ops.createStripeLink(stripeClient, Number(stripeAmount));
      setLastStripeUrl(pay.stripeUrl ?? null);
      push({ tone: 'success', title: 'Stripe checkout link ready' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageScaffold
      title="Splizer"
      description="Cash collections, payment tracking, and financial reconciliation for ground staff."
      stats={
        <>
          <StatsCard label="Clients with due" value={snap.clients.filter((c) => c.outstanding > 0).length} tone="warning" />
          <StatsCard label="Total outstanding" value={money(dueTotal)} tone="danger" />
          <StatsCard label="Logged (24h)" value={money(paidToday)} tone="success" />
          <StatsCard label="Ledger rows" value={snap.payments.length} tone="accent" />
        </>
      }
    >
      <TabBar
        tabs={[
          { id: 'clients', label: 'Collections', count: clients.length },
          { id: 'cash', label: 'Collect Cash' },
          { id: 'stripe', label: 'Stripe Link' },
          { id: 'history', label: 'History', count: snap.payments.length },
        ]}
        value={tab}
        onChange={(id) => setTab(id as Tab)}
      />

      {tab === 'clients' ? (
        <div className="mt-4 space-y-3">
          <SearchBar value={q} onChange={setQ} placeholder="Client, ZN, package…" className="max-w-sm" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {clients.map((c) => {
              const total = c.totalSpent + c.outstanding;
              return (
                <div
                  key={c.id}
                  className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{c.fullName}</p>
                      <p className="text-xs text-[var(--ink-muted)]">{c.znCode}</p>
                    </div>
                    {c.outstanding > 0 ? (
                      <span className="rounded-md bg-[var(--danger-soft,rgba(239,68,68,0.12))] px-2 py-0.5 text-xs font-semibold text-[var(--danger)]">
                        Due
                      </span>
                    ) : (
                      <span className="rounded-md bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--accent)]">
                        Paid
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm font-medium text-[var(--ink)]">{c.packageName}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt className="text-xs text-[var(--ink-muted)]">Total cost</dt>
                      <dd className="font-semibold">{money(total)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[var(--ink-muted)]">Paid</dt>
                      <dd className="font-semibold text-[var(--success,#16a34a)]">{money(c.totalSpent)}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs text-[var(--ink-muted)]">Remaining due</dt>
                      <dd className="font-semibold text-[var(--danger)]">{money(c.outstanding)}</dd>
                    </div>
                  </dl>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="!px-3 !py-1.5 text-xs"
                      disabled={c.outstanding <= 0}
                      onClick={() => {
                        setCashClient(c.id);
                        setCashAmount(String(c.outstanding || ''));
                        setTab('cash');
                      }}
                    >
                      Collect cash
                    </Button>
                    <Button
                      type="button"
                      className="!px-3 !py-1.5 text-xs"
                      disabled={c.outstanding <= 0}
                      onClick={() => {
                        setStripeClient(c.id);
                        setStripeAmount(String(c.outstanding || ''));
                        setTab('stripe');
                      }}
                    >
                      Stripe link
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {tab === 'cash' ? (
        <div className="mt-4 max-w-md space-y-3 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)]">
          <p className="text-sm text-[var(--ink-muted)]">
            Log on-the-ground cash received from a client. Balance and history update instantly.
          </p>
          <div>
            <Label>Client</Label>
            <Select value={cashClient} onChange={(e) => setCashClient(e.target.value)}>
              <option value="">Select client</option>
              {snap.clients
                .filter((c) => c.status === 'active')
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} · due {money(c.outstanding)}
                  </option>
                ))}
            </Select>
          </div>
          <div>
            <Label>Amount (USD)</Label>
            <Input
              type="number"
              min={1}
              value={cashAmount}
              onChange={(e) => setCashAmount(e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <Label>Note (optional)</Label>
            <Input
              value={cashNote}
              onChange={(e) => setCashNote(e.target.value)}
              placeholder="Lobby collection, Metropol…"
            />
          </div>
          <Button type="button" loading={busy} disabled={!cashClient || !cashAmount} onClick={() => void onCollectCash()}>
            Record cash payment
          </Button>
        </div>
      ) : null}

      {tab === 'stripe' ? (
        <div className="mt-4 max-w-md space-y-3 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)]">
          <p className="text-sm text-[var(--ink-muted)]">
            Generate a checkout URL to send via WhatsApp or email.
          </p>
          <div>
            <Label>Client</Label>
            <Select value={stripeClient} onChange={(e) => setStripeClient(e.target.value)}>
              <option value="">Select client</option>
              {snap.clients
                .filter((c) => c.status === 'active')
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} · {c.packageName}
                  </option>
                ))}
            </Select>
          </div>
          <div>
            <Label>Amount (USD)</Label>
            <Input
              type="number"
              min={1}
              value={stripeAmount}
              onChange={(e) => setStripeAmount(e.target.value)}
            />
          </div>
          <Button
            type="button"
            loading={busy}
            disabled={!stripeClient || !stripeAmount}
            onClick={() => void onStripeLink()}
          >
            Generate Stripe link
          </Button>
          {lastStripeUrl ? (
            <div className="rounded-lg border border-[var(--line)] bg-[var(--bg-muted)] p-3 text-sm">
              <p className="text-xs font-semibold uppercase text-[var(--ink-muted)]">Checkout URL</p>
              <p className="mt-1 break-all font-mono text-[var(--accent)]">{lastStripeUrl}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="!px-3 !py-1.5 text-xs"
                  onClick={() => {
                    void navigator.clipboard.writeText(lastStripeUrl);
                    push({ tone: 'success', title: 'Link copied' });
                  }}
                >
                  Copy
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="!px-3 !py-1.5 text-xs"
                  onClick={() =>
                    window.open(
                      `https://wa.me/?text=${encodeURIComponent(`Zeengo payment: ${lastStripeUrl}`)}`,
                      '_blank',
                    )
                  }
                >
                  WhatsApp
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="!px-3 !py-1.5 text-xs"
                  onClick={() => {
                    window.location.href = `mailto:?subject=Zeengo payment link&body=${encodeURIComponent(lastStripeUrl)}`;
                  }}
                >
                  Email
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === 'history' ? (
        <div className="mt-4 overflow-x-auto rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-[var(--line)] bg-[var(--bg-muted)] text-xs uppercase tracking-wide text-[var(--ink-muted)]">
              <tr>
                <th className="px-3 py-2.5">When</th>
                <th className="px-3 py-2.5">Client</th>
                <th className="px-3 py-2.5">Method</th>
                <th className="px-3 py-2.5">Amount</th>
                <th className="px-3 py-2.5">Note</th>
              </tr>
            </thead>
            <tbody>
              {snap.payments.map((p) => {
                const c = snap.clients.find((x) => x.id === p.clientId);
                return (
                  <tr key={p.id} className="border-t border-[var(--line)]">
                    <td className="px-3 py-2.5 text-[var(--ink-muted)]">
                      {ops.elapsedLabel(p.at)}
                    </td>
                    <td className="px-3 py-2.5 font-medium">
                      {c?.fullName ?? '—'}
                      <span className="block text-xs text-[var(--ink-muted)]">{c?.znCode}</span>
                    </td>
                    <td className="px-3 py-2.5 capitalize">{p.method}</td>
                    <td className="px-3 py-2.5 font-semibold">{money(p.amount)}</td>
                    <td className="px-3 py-2.5 text-[var(--ink-muted)]">
                      {p.note}
                      {p.stripeUrl ? (
                        <span className="mt-0.5 block truncate font-mono text-xs text-[var(--accent)]">
                          {p.stripeUrl}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </PageScaffold>
  );
}
