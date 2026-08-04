import { useMemo, useState } from 'react';
import { useOpsSnapshot } from '@/ops-demo/useOpsStore';
import {
  Button,
  Input,
  Label,
  PageScaffold,
  StatsCard,
  useToast,
} from '@/shared/ui';

export function SplizerPage() {
  const snap = useOpsSnapshot();
  const { push } = useToast();
  const [tripTotal, setTripTotal] = useState(2400);
  const [party, setParty] = useState(4);
  const [platformFee, setPlatformFee] = useState(8);
  const [driverShare, setDriverShare] = useState(35);
  const [vendorShare, setVendorShare] = useState(25);

  const calc = useMemo(() => {
    const fee = (tripTotal * platformFee) / 100;
    const net = tripTotal - fee;
    const driver = (net * driverShare) / 100;
    const vendor = (net * vendorShare) / 100;
    const residual = net - driver - vendor;
    const perPax = tripTotal / Math.max(party, 1);
    return { fee, net, driver, vendor, residual, perPax };
  }, [tripTotal, party, platformFee, driverShare, vendorShare]);

  return (
    <PageScaffold
      title="Splizer"
      description="Group fare & revenue allocation — splits, platform fee, driver commission, vendor payouts."
      primaryAction={
        <Button
          type="button"
          onClick={() =>
            push({
              tone: 'success',
              title: 'Split-pay links generated (demo WhatsApp / Email)',
            })
          }
        >
          Send checkout links
        </Button>
      }
      stats={
        <>
          <StatsCard label="Per passenger" value={`$${calc.perPax.toFixed(2)}`} />
          <StatsCard label="Platform fee" value={`$${calc.fee.toFixed(2)}`} tone="warning" />
          <StatsCard label="Driver share" value={`$${calc.driver.toFixed(2)}`} tone="accent" />
          <StatsCard label="Vendor net" value={`$${calc.vendor.toFixed(2)}`} tone="success" />
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)]">
          <div>
            <Label>Trip total (USD)</Label>
            <Input type="number" value={tripTotal} onChange={(e) => setTripTotal(Number(e.target.value))} />
          </div>
          <div>
            <Label>Party size</Label>
            <Input type="number" value={party} onChange={(e) => setParty(Number(e.target.value))} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label>Platform %</Label>
              <Input type="number" value={platformFee} onChange={(e) => setPlatformFee(Number(e.target.value))} />
            </div>
            <div>
              <Label>Driver %</Label>
              <Input type="number" value={driverShare} onChange={(e) => setDriverShare(Number(e.target.value))} />
            </div>
            <div>
              <Label>Vendor %</Label>
              <Input type="number" value={vendorShare} onChange={(e) => setVendorShare(Number(e.target.value))} />
            </div>
          </div>
        </div>
        <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)]">
          <h3 className="text-sm font-semibold">Allocation matrix</h3>
          <table className="mt-3 w-full text-sm">
            <tbody>
              <tr className="border-t border-[var(--line)]"><td className="py-2">Gross trip</td><td className="py-2 text-end font-medium">${tripTotal.toFixed(2)}</td></tr>
              <tr className="border-t border-[var(--line)]"><td className="py-2">Platform fee</td><td className="py-2 text-end">-${calc.fee.toFixed(2)}</td></tr>
              <tr className="border-t border-[var(--line)]"><td className="py-2">Net pool</td><td className="py-2 text-end">${calc.net.toFixed(2)}</td></tr>
              <tr className="border-t border-[var(--line)]"><td className="py-2">Driver commission</td><td className="py-2 text-end">${calc.driver.toFixed(2)}</td></tr>
              <tr className="border-t border-[var(--line)]"><td className="py-2">Vendor payout</td><td className="py-2 text-end">${calc.vendor.toFixed(2)}</td></tr>
              <tr className="border-t border-[var(--line)]"><td className="py-2">Ops residual</td><td className="py-2 text-end">${calc.residual.toFixed(2)}</td></tr>
            </tbody>
          </table>
          <p className="mt-3 text-xs text-[var(--ink-muted)]">
            Demo calculator — {snap.clients.filter((c) => c.isVip).length} VIP trips available for linking later.
          </p>
        </div>
      </div>
    </PageScaffold>
  );
}
