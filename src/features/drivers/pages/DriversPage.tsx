import { useMemo, useState } from 'react';
import { Phone } from 'lucide-react';
import { ops, useOpsSnapshot } from '@/ops-demo/useOpsStore';
import type { OpsDriverStatus } from '@/ops-demo/store';
import {
  Button,
  DialogShell,
  PageScaffold,
  SearchBar,
  Select,
  StatsCard,
  StatusBadge,
  useToast,
  type StatusTone,
} from '@/shared/ui';

function tone(s: OpsDriverStatus): StatusTone {
  if (s === 'AVAILABLE') return 'success';
  if (s === 'EN_ROUTE') return 'accent';
  if (s === 'RESTING') return 'warning';
  return 'default';
}

export function DriversPage() {
  const snap = useOpsSnapshot();
  const { push } = useToast();
  const [q, setQ] = useState('');
  const [matchOpen, setMatchOpen] = useState(false);
  const [clientId, setClientId] = useState('');
  const [driverId, setDriverId] = useState('');

  const filtered = useMemo(() => {
    return snap.drivers.filter((d) =>
      `${d.name} ${d.phone} ${d.plate}`.toLowerCase().includes(q.toLowerCase()),
    );
  }, [snap.drivers, q]);

  const unassigned = snap.clients.filter((c) => c.status === 'active' && !c.driverId);
  const available = snap.drivers.filter((d) => d.status === 'AVAILABLE');

  return (
    <PageScaffold
      title="Drivers"
      description="Roster, live status, and manual match engine for unassigned clients."
      primaryAction={
        <Button type="button" onClick={() => setMatchOpen(true)}>
          Match unassigned ({unassigned.length})
        </Button>
      }
      stats={
        <>
          <StatsCard label="Available" value={snap.drivers.filter((d) => d.status === 'AVAILABLE').length} tone="success" />
          <StatsCard label="En route" value={snap.drivers.filter((d) => d.status === 'EN_ROUTE').length} tone="accent" />
          <StatsCard label="Resting" value={snap.drivers.filter((d) => d.status === 'RESTING').length} tone="warning" />
          <StatsCard label="Off duty" value={snap.drivers.filter((d) => d.status === 'OFF_DUTY').length} />
        </>
      }
      filters={<SearchBar value={q} onChange={setQ} placeholder="Driver, plate…" className="max-w-sm" />}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((d) => (
          <div
            key={d.id}
            className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)]"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{d.name}</p>
                <p className="text-sm text-[var(--ink-muted)]">{d.vehicle} · {d.plate}</p>
              </div>
              <StatusBadge tone={tone(d.status)}>{d.status.replace('_', ' ')}</StatusBadge>
            </div>
            <a href={`tel:${d.phone}`} className="mt-2 inline-flex items-center gap-1 text-sm text-[var(--accent)]">
              <Phone className="h-3.5 w-3.5" /> {d.phone}
            </a>
            <p className="mt-2 text-xs text-[var(--ink-muted)]">
              Rating {d.rating} · {d.assignmentId ?? 'No assignment'} · {d.passengerName ?? '—'}
            </p>
            <div className="mt-3">
              <Select
                value={d.status}
                onChange={(e) => {
                  void ops.updateDriverStatus(d.id, e.target.value as OpsDriverStatus).then(() =>
                    push({ tone: 'success', title: 'Status updated' }),
                  );
                }}
              >
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="EN_ROUTE">EN ROUTE</option>
                <option value="RESTING">RESTING</option>
                <option value="OFF_DUTY">OFF DUTY</option>
              </Select>
            </div>
          </div>
        ))}
      </div>

      <DialogShell open={matchOpen} title="Match engine — assign AVAILABLE drivers" onClose={() => setMatchOpen(false)} wide>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-[var(--ink-muted)]">Unassigned clients ({unassigned.length})</p>
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">Select client</option>
              {unassigned.map((c) => (
                <option key={c.id} value={c.id}>{c.znCode} · {c.fullName}</option>
              ))}
            </Select>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-[var(--ink-muted)]">Available drivers ({available.length})</p>
            <Select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
              <option value="">Select driver</option>
              {available.map((d) => (
                <option key={d.id} value={d.id}>{d.name} · nearest GPS demo</option>
              ))}
            </Select>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setMatchOpen(false)}>Cancel</Button>
          <Button
            type="button"
            disabled={!clientId || !driverId}
            onClick={async () => {
              await ops.assignDriverToClient(clientId, driverId);
              push({ tone: 'success', title: 'Client assigned' });
              setMatchOpen(false);
              setClientId('');
              setDriverId('');
            }}
          >
            Confirm assign
          </Button>
        </div>
      </DialogShell>
    </PageScaffold>
  );
}
