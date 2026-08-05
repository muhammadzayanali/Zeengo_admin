import { useMemo, useState } from 'react';
import { MapPin, Phone, Users } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
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

/** Field terminal for the logged-in driver (demo maps to Dmitri). */
function DriversTerminal() {
  const snap = useOpsSnapshot();
  const { push } = useToast();
  const me = snap.drivers.find((d) => d.id === ops.DEMO_DRIVER_ID) ?? snap.drivers[0];
  const client =
    snap.clients.find((c) => c.driverId === me?.id) ??
    snap.clients.find((c) => c.fullName === me?.passengerName) ??
    null;

  const pax = client?.packageName.toLowerCase().includes('family') ? 4 : client?.isVip ? 2 : 3;
  const pickup = client ? `${client.hotel} lobby` : 'Standby — no active pickup';
  const dropoff = client?.packageName.includes('Royal')
    ? 'Red Square VIP entrance'
    : 'City center / next stop';

  if (!me) {
    return (
      <PageScaffold title="Drivers Terminal" description="No driver profile linked.">
        <p className="text-sm text-[var(--ink-muted)]">Contact dispatch to activate your account.</p>
      </PageScaffold>
    );
  }

  return (
    <PageScaffold
      title="Drivers Terminal"
      description="Assigned client, vehicle, route points, and live duty status."
      stats={
        <>
          <StatsCard
            label="Duty status"
            value={me.status.replace('_', ' ')}
            tone={
              me.status === 'AVAILABLE'
                ? 'success'
                : me.status === 'EN_ROUTE'
                  ? 'accent'
                  : me.status === 'RESTING'
                    ? 'warning'
                    : 'default'
            }
          />
          <StatsCard label="ETA" value={me.etaMin != null ? `${me.etaMin} min` : '—'} tone="accent" />
          <StatsCard label="Speed" value={`${me.speedKmh} km/h`} />
          <StatsCard label="Assignment" value={me.assignmentId ?? 'Open'} />
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
            Assigned client
          </p>
          {client ? (
            <>
              <h2 className="mt-1 text-xl font-bold">{client.fullName}</h2>
              <p className="text-sm text-[var(--ink-muted)]">
                {client.znCode} · {client.packageName}
              </p>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-[var(--ink-muted)]" aria-hidden />
                  <span>
                    <span className="text-[var(--ink-muted)]">Pax · </span>
                    <strong>{pax}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-[var(--ink-muted)]" aria-hidden />
                  <a className="font-medium text-[var(--accent)]" href={`tel:${client.phone}`}>
                    {client.phone}
                  </a>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ink-muted)]" aria-hidden />
                  <div>
                    <p>
                      <span className="text-[var(--ink-muted)]">Pickup · </span>
                      {pickup}
                    </p>
                    <p className="mt-1">
                      <span className="text-[var(--ink-muted)]">Drop-off · </span>
                      {dropoff}
                    </p>
                  </div>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" onClick={() => window.open(`tel:${client.phone}`)}>
                  Call client
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => window.open(`https://wa.me/${client.phone.replace(/\D/g, '')}`, '_blank')}
                >
                  WhatsApp
                </Button>
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-[var(--ink-muted)]">
              No active passenger. Switch to AVAILABLE and wait for dispatch.
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow)]">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
              Vehicle
            </p>
            <p className="mt-1 text-lg font-semibold">{me.vehicle}</p>
            <p className="text-sm text-[var(--ink-muted)]">Plate {me.plate}</p>
            <p className="mt-2 text-sm">Driver · {me.name}</p>
            <a href={`tel:${me.phone}`} className="mt-1 inline-block text-sm text-[var(--accent)]">
              {me.phone}
            </a>
          </div>

          <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow)]">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
              Duty status
            </p>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              Broadcasts live to Admin / Ops dashboard.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(
                [
                  ['AVAILABLE', 'AVAILABLE'],
                  ['EN_ROUTE', 'EN ROUTE'],
                  ['RESTING', 'RESTING'],
                  ['OFF_DUTY', 'OFF DUTY'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    void ops.updateDriverStatus(me.id, value).then(() =>
                      push({ tone: 'success', title: `Status · ${label}` }),
                    );
                  }}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                    me.status === value
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                      : 'border-[var(--line)] text-[var(--ink-muted)] hover:border-[var(--accent)] hover:text-[var(--ink)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageScaffold>
  );
}

function DriversRoster() {
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
                <p className="text-sm text-[var(--ink-muted)]">
                  {d.vehicle} · {d.plate}
                </p>
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
            <p className="mb-2 text-xs font-semibold uppercase text-[var(--ink-muted)]">
              Unassigned clients ({unassigned.length})
            </p>
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">Select client</option>
              {unassigned.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.znCode} · {c.fullName}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-[var(--ink-muted)]">
              Available drivers ({available.length})
            </p>
            <Select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
              <option value="">Select driver</option>
              {available.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} · nearest GPS demo
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setMatchOpen(false)}>
            Cancel
          </Button>
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

export function DriversPage() {
  const { hasRole } = useAuth();
  if (hasRole('driver') && !hasRole('admin', 'ops_manager')) {
    return <DriversTerminal />;
  }
  return <DriversRoster />;
}
