import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  Car,
  Wallet,
  ListTodo,
  Siren,
  Percent,
  Phone,
  FileText,
  UserPlus,
  AlertTriangle,
} from 'lucide-react';
import { ops, useOpsSnapshot } from '@/ops-demo/useOpsStore';
import {
  AnalyticsCard,
  Button,
  DetailDrawer,
  DialogShell,
  DriverCard,
  PageScaffold,
  StatsCard,
  StatusBadge,
  Textarea,
  useToast,
  type StatusTone,
} from '@/shared/ui';

function dTone(s: string): StatusTone {
  if (s === 'AVAILABLE') return 'success';
  if (s === 'EN_ROUTE') return 'accent';
  if (s === 'RESTING') return 'warning';
  return 'default';
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { push } = useToast();
  const snap = useOpsSnapshot();
  const k = snap.kpis;
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignClientId, setAssignClientId] = useState<string | null>(null);
  const [eodOpen, setEodOpen] = useState(false);
  const [eodText, setEodText] = useState('');
  const [driverId, setDriverId] = useState<string | null>(null);

  const unassigned = useMemo(
    () => snap.clients.filter((c) => c.status === 'active' && !c.driverId),
    [snap.clients],
  );
  const activeSos = snap.sosAlerts.filter((s) => s.status === 'active');
  const pendingEdits = snap.editRequests.filter((e) => e.status === 'pending');
  const selectedDriver = driverId ? ops.getDriver(driverId) : null;

  async function doAssign(driverId: string) {
    if (!assignClientId) return;
    try {
      await ops.assignDriverToClient(assignClientId, driverId);
      push({ tone: 'success', title: 'Driver assigned' });
      setAssignOpen(false);
      setAssignClientId(null);
    } catch {
      push({ tone: 'error', title: 'Assign failed' });
    }
  }

  function openEod() {
    setEodText(ops.generateEodText());
    setEodOpen(true);
  }

  return (
    <PageScaffold
      title="Operations Dashboard"
      description="Central pulse — live clients, field drivers, SOS, and today’s fulfillment."
      primaryAction={
        <>
          <Button type="button" variant="secondary" onClick={() => navigate('/sos')}>
            <Siren className="h-4 w-4" />
            SOS
            {k.activeSos > 0 ? <StatusBadge tone="danger">{k.activeSos}</StatusBadge> : null}
          </Button>
          <Button type="button" onClick={openEod}>
            <FileText className="h-4 w-4" />
            Generate EOD
          </Button>
        </>
      }
    >
      {k.overdue > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-[var(--danger)]/30 bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--danger)]">
            <AlertTriangle className="h-4 w-4" />
            Ops queue: {k.overdue} overdue task{k.overdue === 1 ? '' : 's'} need attention
          </div>
          <Button type="button" variant="secondary" onClick={() => navigate('/daily-ops')}>
            Open daily ops
          </Button>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatsCard label="Active clients" value={k.activeClients} icon={<Users className="h-4 w-4" />} onClick={() => navigate('/clients')} />
        <StatsCard label="Urgent tasks" value={k.urgentTasks} tone={k.urgentTasks ? 'warning' : 'default'} icon={<ListTodo className="h-4 w-4" />} onClick={() => navigate('/daily-ops')} />
        <StatsCard label="Drivers in field" value={k.driversInField} tone="accent" icon={<Car className="h-4 w-4" />} onClick={() => navigate('/drivers')} />
        <StatsCard label="Revenue today" value={`$${k.revenueToday}`} tone="success" icon={<Wallet className="h-4 w-4" />} onClick={() => navigate('/finance')} />
        <StatsCard label="Itinerary progress" value={`${k.itineraryProgress}%`} icon={<Percent className="h-4 w-4" />} onClick={() => navigate('/daily-ops')} />
        <StatsCard
          label="Unassigned clients"
          value={k.unassigned}
          tone={k.unassigned ? 'danger' : 'default'}
          hint={k.unassigned ? 'Assign now →' : 'All matched'}
          onClick={() => {
            if (unassigned[0]) {
              setAssignClientId(unassigned[0].id);
              setAssignOpen(true);
            }
          }}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <AnalyticsCard
          className="xl:col-span-3"
          title="Urgent alerts"
          description="SOS signals and edit requests first"
          action={<Link to="/sos" className="text-xs font-medium text-[var(--accent)]">SOS desk</Link>}
        >
          <div className="space-y-3">
            {activeSos.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--ink-muted)]">No active SOS</p>
            ) : (
              activeSos.map((s) => {
                const c = ops.getClient(s.clientId);
                return (
                  <div
                    key={s.id}
                    className="rounded-[16px] border border-[var(--danger)]/40 bg-[color-mix(in_srgb,var(--danger)_6%,transparent)] p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-[var(--danger)]">EMERGENCY ALERT</p>
                        <p className="mt-1 text-sm font-medium">{c?.fullName} · {c?.znCode}</p>
                        <p className="text-xs text-[var(--ink-muted)]">{ops.elapsedLabel(s.triggeredAt)}</p>
                      </div>
                      <StatusBadge tone="danger">ACTIVE</StatusBadge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button type="button" variant="secondary" onClick={() => navigate('/sos')}>
                        Open protocol
                      </Button>
                    </div>
                  </div>
                );
              })
            )}

            <div className="border-t border-[var(--line)] pt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                Edit requests
              </p>
              {pendingEdits.length === 0 ? (
                <p className="text-sm text-[var(--ink-muted)]">No pending edits</p>
              ) : (
                pendingEdits.map((er) => {
                  const c = ops.getClient(er.clientId);
                  return (
                    <button
                      key={er.id}
                      type="button"
                      className="mb-2 flex w-full items-center justify-between rounded-xl border border-[var(--line)] px-3 py-2 text-start hover:bg-[var(--bg-muted)]"
                      onClick={() => navigate('/edit-requests')}
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">
                          {c?.fullName} ({c?.znCode})
                        </span>
                        <span className="block text-xs text-[var(--ink-muted)]">
                          {er.type}: {er.requested}
                        </span>
                      </span>
                      <StatusBadge tone="warning">{er.status}</StatusBadge>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </AnalyticsCard>

        <AnalyticsCard
          className="xl:col-span-2"
          title="Driver board"
          description="Live operational status"
          action={<Link to="/drivers" className="text-xs font-medium text-[var(--accent)]">Roster</Link>}
        >
          <div className="space-y-2">
            {snap.drivers.map((d) => (
              <div key={d.id} className="space-y-1">
                <DriverCard
                  name={d.name}
                  vehicle={`${d.vehicle} · ${d.plate}`}
                  status={d.status.replace('_', ' ')}
                  statusTone={dTone(d.status)}
                  onClick={() => setDriverId(d.id)}
                />
                <div className="flex items-center justify-between px-1 text-[11px] text-[var(--ink-muted)]">
                  <a href={`tel:${d.phone}`} className="inline-flex items-center gap-1 hover:text-[var(--accent)]">
                    <Phone className="h-3 w-3" />
                    {d.phone}
                  </a>
                  <span>{d.assignmentId ?? 'No assignment'}</span>
                </div>
              </div>
            ))}
          </div>
        </AnalyticsCard>
      </div>

      <AnalyticsCard
        title="Unassigned clients"
        description={`${k.unassigned} active without a primary driver`}
        action={
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (unassigned[0]) {
                setAssignClientId(unassigned[0].id);
                setAssignOpen(true);
              }
            }}
          >
            <UserPlus className="h-4 w-4" />
            Assign now →
          </Button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="text-xs font-medium uppercase text-[var(--ink-muted)]">
              <tr>
                <th className="px-2 py-2 text-start">Code</th>
                <th className="px-2 py-2 text-start">Client</th>
                <th className="px-2 py-2 text-start">Package</th>
                <th className="px-2 py-2 text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              {unassigned.map((c) => (
                <tr key={c.id} className="border-t border-[var(--line)]">
                  <td className="px-2 py-2 font-medium">{c.znCode}</td>
                  <td className="px-2 py-2">{c.fullName}</td>
                  <td className="px-2 py-2 text-[var(--ink-muted)]">{c.packageName}</td>
                  <td className="px-2 py-2 text-end">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setAssignClientId(c.id);
                        setAssignOpen(true);
                      }}
                    >
                      Assign
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AnalyticsCard>

      <DialogShell open={assignOpen} title="Assign driver" onClose={() => setAssignOpen(false)}>
        <p className="mb-3 text-sm text-[var(--ink-muted)]">
          Client: {assignClientId ? ops.getClient(assignClientId)?.fullName : '—'}
        </p>
        <div className="space-y-2">
          {snap.drivers
            .filter((d) => d.status === 'AVAILABLE' || d.status === 'RESTING')
            .map((d) => (
              <button
                key={d.id}
                type="button"
                className="flex w-full items-center justify-between rounded-xl border border-[var(--line)] px-3 py-2 text-start hover:bg-[var(--bg-muted)]"
                onClick={() => void doAssign(d.id)}
              >
                <span>
                  <span className="block text-sm font-medium">{d.name}</span>
                  <span className="text-xs text-[var(--ink-muted)]">{d.vehicle}</span>
                </span>
                <StatusBadge tone={dTone(d.status)}>{d.status}</StatusBadge>
              </button>
            ))}
        </div>
      </DialogShell>

      <DialogShell open={eodOpen} title="End of Day report" onClose={() => setEodOpen(false)} wide>
        <Textarea rows={14} value={eodText} onChange={(e) => setEodText(e.target.value)} />
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              void navigator.clipboard.writeText(eodText);
              push({ tone: 'success', title: 'Copied for WhatsApp / Email' });
            }}
          >
            Export copy
          </Button>
          <Button type="button" onClick={() => setEodOpen(false)}>
            Done
          </Button>
        </div>
      </DialogShell>

      <DetailDrawer
        open={Boolean(selectedDriver)}
        title={selectedDriver?.name ?? 'Driver'}
        onClose={() => setDriverId(null)}
        footer={
          selectedDriver ? (
            <a href={`tel:${selectedDriver.phone}`}>
              <Button type="button" className="w-full">
                <Phone className="h-4 w-4" /> Call {selectedDriver.phone}
              </Button>
            </a>
          ) : null
        }
      >
        {selectedDriver ? (
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-[var(--ink-muted)]">Status</dt><dd><StatusBadge tone={dTone(selectedDriver.status)}>{selectedDriver.status}</StatusBadge></dd></div>
            <div className="flex justify-between"><dt className="text-[var(--ink-muted)]">Vehicle</dt><dd>{selectedDriver.vehicle} · {selectedDriver.plate}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--ink-muted)]">Assignment</dt><dd>{selectedDriver.assignmentId ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--ink-muted)]">Passenger</dt><dd>{selectedDriver.passengerName ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--ink-muted)]">Rating</dt><dd>{selectedDriver.rating}</dd></div>
          </dl>
        ) : null}
      </DetailDrawer>
    </PageScaffold>
  );
}
