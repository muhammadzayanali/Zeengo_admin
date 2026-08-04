import { useMemo, useState } from 'react';
import { useOpsSnapshot } from '@/ops-demo/useOpsStore';
import { ops } from '@/ops-demo/useOpsStore';
import {
  Button,
  DialogShell,
  Input,
  Label,
  PageScaffold,
  SearchBar,
  Select,
  StatusBadge,
  useToast,
} from '@/shared/ui';

export function VendorsPage() {
  const snap = useOpsSnapshot();
  const { push } = useToast();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [orderOpen, setOrderOpen] = useState(false);
  const [vendorId, setVendorId] = useState('');
  const [title, setTitle] = useState('');

  const filtered = useMemo(() => {
    return snap.vendors.filter((v) => {
      if (cat && v.category !== cat) return false;
      return `${v.name} ${v.contact} ${v.email}`.toLowerCase().includes(q.toLowerCase());
    });
  }, [snap.vendors, q, cat]);

  return (
    <PageScaffold
      title="Vendors"
      description="Partner hotels, transport, excursions, and emergency providers — with service order dispatch."
      primaryAction={
        <Button type="button" onClick={() => setOrderOpen(true)}>
          New service order
        </Button>
      }
      filters={
        <>
          <SearchBar value={q} onChange={setQ} placeholder="Vendor…" className="max-w-sm" />
          <Select className="max-w-[180px]" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">All categories</option>
            <option value="hotel">Hotel</option>
            <option value="transport">Transport</option>
            <option value="excursion">Excursion</option>
            <option value="emergency">Emergency</option>
          </Select>
        </>
      }
    >
      <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-[var(--bg-muted)] text-xs font-medium uppercase text-[var(--ink-muted)]">
              <tr>
                <th className="px-4 py-3 text-start">Business</th>
                <th className="px-4 py-3 text-start">Category</th>
                <th className="px-4 py-3 text-start">Contact</th>
                <th className="px-4 py-3 text-start">Tier</th>
                <th className="px-4 py-3 text-start">Active orders</th>
                <th className="px-4 py-3 text-start">Rating</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id} className="border-t border-[var(--line)] hover:bg-[var(--bg-muted)]/70">
                  <td className="px-4 py-3 font-medium">{v.name}</td>
                  <td className="px-4 py-3"><StatusBadge>{v.category}</StatusBadge></td>
                  <td className="px-4 py-3 text-[var(--ink-muted)]">
                    <div>{v.contact}</div>
                    <div className="text-xs">{v.phone} · {v.email}</div>
                  </td>
                  <td className="px-4 py-3">{v.tier}</td>
                  <td className="px-4 py-3">{v.activeOrders}</td>
                  <td className="px-4 py-3">{v.rating.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <section className="mt-2">
        <h3 className="mb-2 text-sm font-semibold">Service orders</h3>
        <div className="space-y-2">
          {snap.vendorOrders.map((o) => {
            const v = snap.vendors.find((x) => x.id === o.vendorId);
            return (
              <div key={o.id} className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-3 text-sm">
                <span>
                  <span className="font-medium">{o.title}</span>
                  <span className="ms-2 text-[var(--ink-muted)]">{v?.name}</span>
                </span>
                <StatusBadge tone={o.status === 'fulfilled' ? 'success' : o.status === 'accepted' ? 'accent' : 'warning'}>
                  {o.status}
                </StatusBadge>
              </div>
            );
          })}
        </div>
      </section>

      <DialogShell open={orderOpen} title="Create service voucher" onClose={() => setOrderOpen(false)}>
        <div className="space-y-3">
          <div>
            <Label>Vendor</Label>
            <Select value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
              <option value="">Select…</option>
              {snap.vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Order title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Suite hold ZN0002" />
          </div>
          <Button
            type="button"
            className="w-full"
            disabled={!vendorId || !title.trim()}
            onClick={async () => {
              await ops.createVendorOrder(vendorId, title);
              await ops.sendEmailLog('partner@example.com', `Service voucher: ${title}`);
              push({ tone: 'success', title: 'Voucher emailed to partner (demo)' });
              setOrderOpen(false);
              setTitle('');
              setVendorId('');
            }}
          >
            Email voucher
          </Button>
        </div>
      </DialogShell>
    </PageScaffold>
  );
}
