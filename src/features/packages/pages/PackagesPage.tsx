import { useState } from 'react';
import { ops, useOpsSnapshot } from '@/ops-demo/useOpsStore';
import type { OpsPackage } from '@/ops-demo/store';
import {
  Button,
  DialogShell,
  Input,
  Label,
  PageScaffold,
  StatusBadge,
  Textarea,
  useToast,
} from '@/shared/ui';

export function PackagesPage() {
  const snap = useOpsSnapshot();
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<OpsPackage>({
    id: '',
    name: '',
    priceUsd: 0,
    priceSar: 0,
    inclusions: [],
    driverHours: 4,
    vipConcierge: false,
    validityDays: 7,
  });
  const [inclusionsText, setInclusionsText] = useState('');

  function openCreate() {
    setForm({
      id: `pkg_${Date.now()}`,
      name: '',
      priceUsd: 0,
      priceSar: 0,
      inclusions: [],
      driverHours: 4,
      vipConcierge: false,
      validityDays: 7,
    });
    setInclusionsText('');
    setOpen(true);
  }

  function openEdit(pkg: OpsPackage) {
    setForm({ ...pkg });
    setInclusionsText(pkg.inclusions.join(', '));
    setOpen(true);
  }

  return (
    <PageScaffold
      title="Packages"
      description="Catalog manager for VIP transfers, executive tours, and airport pickups."
      primaryAction={<Button type="button" onClick={openCreate}>Package builder</Button>}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {snap.packages.map((pkg) => (
          <article
            key={pkg.id}
            className="flex flex-col rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow)]"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold">{pkg.name}</h3>
              {pkg.vipConcierge ? <StatusBadge tone="accent">VIP</StatusBadge> : null}
            </div>
            <p className="mt-2 text-2xl font-semibold text-[var(--accent)]">
              ${pkg.priceUsd.toLocaleString()}
              <span className="ms-2 text-sm font-normal text-[var(--ink-muted)]">
                / {pkg.priceSar.toLocaleString()} SAR
              </span>
            </p>
            <ul className="mt-3 flex-1 space-y-1 text-sm text-[var(--ink-muted)]">
              {pkg.inclusions.map((i) => (
                <li key={i}>• {i}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-[var(--ink-muted)]">
              {pkg.driverHours}h driver · {pkg.validityDays}d validity
            </p>
            <Button type="button" variant="secondary" className="mt-4" onClick={() => openEdit(pkg)}>
              Edit
            </Button>
          </article>
        ))}
      </div>

      <DialogShell open={open} title="Package builder" onClose={() => setOpen(false)} wide>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Price USD</Label>
            <Input type="number" value={form.priceUsd} onChange={(e) => setForm({ ...form, priceUsd: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Price SAR</Label>
            <Input type="number" value={form.priceSar} onChange={(e) => setForm({ ...form, priceSar: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Driver hours</Label>
            <Input type="number" value={form.driverHours} onChange={(e) => setForm({ ...form, driverHours: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Validity days</Label>
            <Input type="number" value={form.validityDays} onChange={(e) => setForm({ ...form, validityDays: Number(e.target.value) })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Inclusions (comma-separated)</Label>
            <Textarea rows={3} value={inclusionsText} onChange={(e) => setInclusionsText(e.target.value)} />
          </div>
          <label className="inline-flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={form.vipConcierge}
              onChange={(e) => setForm({ ...form, vipConcierge: e.target.checked })}
            />
            VIP concierge access
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            type="button"
            onClick={async () => {
              await ops.upsertPackage({
                ...form,
                inclusions: inclusionsText.split(',').map((s) => s.trim()).filter(Boolean),
              });
              push({ tone: 'success', title: 'Package saved' });
              setOpen(false);
            }}
          >
            Save package
          </Button>
        </div>
      </DialogShell>
    </PageScaffold>
  );
}
