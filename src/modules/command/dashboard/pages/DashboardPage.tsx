import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { dashboardApi } from '../services/dashboard.api';
import { driversApi } from '@/modules/fleet/drivers/services/drivers.api';
import {
  AnalyticsCard,
  Button,
  DetailDrawer,
  DialogShell,
  DriverCard,
  ErrorState,
  PageScaffold,
  Skeleton,
  StatsCard,
  StatusBadge,
  Textarea,
  useToast,
  type StatusTone,
} from '@/shared/ui';
import { formatMoney, cn } from '@/shared/lib/cn';
import { ApiClientError } from '@/shared/api/client';
import type { DashboardDriverCard, DashboardUnassignedClient } from '@/shared/api/types';

function dTone(s: string): StatusTone {
  const u = s.toUpperCase();
  if (u === 'AVAILABLE') return 'success';
  if (u === 'EN_ROUTE') return 'accent';
  if (u === 'RESTING') return 'warning';
  return 'default';
}

function elapsedLabel(iso: string) {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (m < 60) return `${m} min ago`;
  return `${Math.floor(m / 60)}h ${m % 60}m ago`;
}

function vehicleLabel(d: DashboardDriverCard) {
  const v = [d.vehicleMake, d.vehicleModel].filter(Boolean).join(' ');
  return [v || 'Vehicle', d.plateNumber].filter(Boolean).join(' · ');
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { push } = useToast();
  const qc = useQueryClient();

  const overviewQuery = useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: ({ signal }) => dashboardApi.overview(signal),
    staleTime: 15_000,
    refetchInterval: 45_000,
    refetchOnWindowFocus: true,
  });

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignBooking, setAssignBooking] = useState<DashboardUnassignedClient | null>(
    null,
  );
  const [eodOpen, setEodOpen] = useState(false);
  const [eodText, setEodText] = useState('');
  const [eodLoading, setEodLoading] = useState(false);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  const data = overviewQuery.data;
  const k = data?.summary;
  const alerts = data?.alerts ?? [];
  const unassigned = data?.unassigned ?? [];
  const drivers = data?.drivers ?? [];

  const sosAlerts = useMemo(
    () => alerts.filter((a) => a.type === 'sos'),
    [alerts],
  );
  const editAlerts = useMemo(
    () => alerts.filter((a) => a.type === 'edit_request'),
    [alerts],
  );
  const selectedDriver = drivers.find((d) => d.id === driverId) ?? null;

  const availableDrivers = useMemo(
    () =>
      drivers.filter((d) => {
        const s = d.status.toLowerCase();
        return s === 'available' || s === 'resting';
      }),
    [drivers],
  );

  async function openEod() {
    setEodLoading(true);
    try {
      const report = await dashboardApi.createEod();
      setEodText(report.content);
      setEodOpen(true);
    } catch (err) {
      // If report already exists for today, fall back to a local summary text
      if (err instanceof ApiClientError && err.code === 'EOD_REPORT_EXISTS' && k) {
        setEodText(
          [
            `# End of Day Report`,
            ``,
            `- Active clients: ${k.activeClients}`,
            `- Revenue today: ${formatMoney(k.revenueToday)}`,
            `- Drivers in field: ${k.driversInField}`,
            `- Itinerary items: ${k.todaysItinerary} (${k.itineraryProgress ?? 0}%)`,
            `- Urgent tasks: ${k.urgentTasks}`,
            `- Unassigned: ${k.unassignedClients}`,
            `- Active SOS: ${k.activeSos ?? sosAlerts.length}`,
            `- Ops queue: ${k.opsQueue}`,
          ].join('\n'),
        );
        setEodOpen(true);
      } else {
        push({
          tone: 'error',
          title: err instanceof ApiClientError ? err.message : 'Could not generate EOD',
        });
      }
    } finally {
      setEodLoading(false);
    }
  }

  async function doAssign(driverProfileId: string) {
    if (!assignBooking) return;
    setAssigning(true);
    try {
      const startDate =
        assignBooking.arrivalDate || new Date().toISOString().slice(0, 10);
      await driversApi.assign({
        bookingId: assignBooking.bookingId,
        driverId: driverProfileId,
        startDate,
      });
      push({ tone: 'success', title: 'Driver assigned' });
      setAssignOpen(false);
      setAssignBooking(null);
      await qc.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err) {
      push({
        tone: 'error',
        title: err instanceof ApiClientError ? err.message : 'Assign failed',
      });
    } finally {
      setAssigning(false);
    }
  }

  if (overviewQuery.isLoading) {
    return (
      <PageScaffold title="Operations Dashboard" description="Loading live ops pulse…">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-5">
          <Skeleton className="h-72 xl:col-span-3" />
          <Skeleton className="h-72 xl:col-span-2" />
        </div>
      </PageScaffold>
    );
  }

  if (overviewQuery.isError || !k) {
    return (
      <PageScaffold title="Operations Dashboard">
        <ErrorState
          description={overviewQuery.error?.message ?? 'Could not load dashboard'}
          onRetry={() => overviewQuery.refetch()}
        />
      </PageScaffold>
    );
  }

  const itineraryProgress = k.itineraryProgress ?? 0;
  const activeSos = k.activeSos ?? sosAlerts.length;

  return (
    <PageScaffold
      title="Operations Dashboard"
      description="Central pulse — live clients, field drivers, SOS, and today’s fulfillment."
      primaryAction={
        <>
          <Button type="button" variant="secondary" onClick={() => navigate('/sos')}>
            <Siren className="h-4 w-4" />
            SOS
            {activeSos > 0 ? <StatusBadge tone="danger">{activeSos}</StatusBadge> : null}
          </Button>
          <Button type="button" loading={eodLoading} onClick={() => void openEod()}>
            <FileText className="h-4 w-4" />
            Generate EOD
          </Button>
        </>
      }
    >
      {k.opsQueue > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-[var(--danger)]/30 bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--danger)]">
            <AlertTriangle className="h-4 w-4" />
            Ops queue: {k.opsQueue} item{k.opsQueue === 1 ? '' : 's'} need attention
          </div>
          <Button type="button" variant="secondary" onClick={() => navigate('/daily-ops')}>
            Open daily ops
          </Button>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatsCard
          label="Active clients"
          value={k.activeClients}
          icon={<Users className="h-4 w-4" />}
          onClick={() => navigate('/clients')}
        />
        <StatsCard
          label="Urgent tasks"
          value={k.urgentTasks}
          tone={k.urgentTasks ? 'warning' : 'default'}
          icon={<ListTodo className="h-4 w-4" />}
          onClick={() => navigate('/tasks')}
        />
        <StatsCard
          label="Drivers in field"
          value={k.driversInField}
          tone="accent"
          icon={<Car className="h-4 w-4" />}
          onClick={() => navigate('/drivers')}
        />
        <StatsCard
          label="Revenue today"
          value={formatMoney(k.revenueToday)}
          tone="success"
          icon={<Wallet className="h-4 w-4" />}
          onClick={() => navigate('/finance')}
        />
        <StatsCard
          label="Itinerary progress"
          value={`${itineraryProgress}%`}
          icon={<Percent className="h-4 w-4" />}
          onClick={() => navigate('/daily-ops')}
        />
        <StatsCard
          label="Unassigned clients"
          value={k.unassignedClients}
          tone={k.unassignedClients ? 'danger' : 'default'}
          hint={k.unassignedClients ? 'Assign now →' : 'All matched'}
          onClick={() => {
            if (unassigned[0]) {
              setAssignBooking(unassigned[0]);
              setAssignOpen(true);
            } else {
              navigate('/clients');
            }
          }}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <AnalyticsCard
          className="xl:col-span-3"
          title="Urgent alerts"
          description="SOS signals and edit requests first"
          action={
            <Link to="/sos" className="text-xs font-medium text-[var(--accent)]">
              SOS desk
            </Link>
          }
        >
          <div className="space-y-3">
            {sosAlerts.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--ink-muted)]">No active SOS</p>
            ) : (
              sosAlerts.map((s) => (
                <div
                  key={s.entityId ?? s.createdAt}
                  className="rounded-[16px] border border-[var(--danger)]/40 bg-[color-mix(in_srgb,var(--danger)_6%,transparent)] p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-[var(--danger)]">EMERGENCY ALERT</p>
                      <p className="mt-1 text-sm font-medium">
                        {s.clientName ?? s.title}
                        {s.znCode ? ` · ${s.znCode}` : ''}
                      </p>
                      <p className="text-xs text-[var(--ink-muted)]">
                        {elapsedLabel(s.createdAt)}
                      </p>
                    </div>
                    <StatusBadge tone="danger">ACTIVE</StatusBadge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={() => navigate('/sos')}>
                      Open protocol
                    </Button>
                  </div>
                </div>
              ))
            )}

            <div className="border-t border-[var(--line)] pt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                Edit requests
              </p>
              {editAlerts.length === 0 ? (
                <p className="text-sm text-[var(--ink-muted)]">No pending edits</p>
              ) : (
                editAlerts.map((er) => (
                  <button
                    key={er.entityId ?? er.createdAt}
                    type="button"
                    className="mb-2 flex w-full items-center justify-between rounded-xl border border-[var(--line)] px-3 py-2 text-start hover:bg-[var(--bg-muted)]"
                    onClick={() => navigate('/edit-requests')}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">
                        {er.clientName ?? er.title}
                        {er.znCode ? ` (${er.znCode})` : ''}
                      </span>
                      <span className="block text-xs text-[var(--ink-muted)]">{er.message}</span>
                    </span>
                    <StatusBadge tone="warning">pending</StatusBadge>
                  </button>
                ))
              )}
            </div>
          </div>
        </AnalyticsCard>

        <AnalyticsCard
          className="xl:col-span-2"
          title="Driver board"
          description="Live operational status"
          action={
            <Link to="/drivers" className="text-xs font-medium text-[var(--accent)]">
              Roster
            </Link>
          }
        >
          <div className="space-y-2">
            {!drivers.length ? (
              <p className="py-6 text-center text-sm text-[var(--ink-muted)]">
                No drivers in roster yet
              </p>
            ) : (
              drivers.map((d) => (
                <div key={d.id} className="space-y-1">
                  <DriverCard
                    name={d.fullName}
                    vehicle={vehicleLabel(d)}
                    status={d.status.replace(/_/g, ' ')}
                    statusTone={dTone(d.status)}
                    onClick={() => setDriverId(d.id)}
                  />
                  <div className="flex items-center justify-between px-1 text-[11px] text-[var(--ink-muted)]">
                    {d.phone ? (
                      <a
                        href={`tel:${d.phone}`}
                        className="inline-flex items-center gap-1 hover:text-[var(--accent)]"
                      >
                        <Phone className="h-3 w-3" />
                        {d.phone}
                      </a>
                    ) : (
                      <span>—</span>
                    )}
                    <span>{d.activeAssignmentZn ?? 'No assignment'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </AnalyticsCard>
      </div>

      <AnalyticsCard
        title="Unassigned clients"
        description={`${k.unassignedClients} active without a primary driver`}
        action={
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (unassigned[0]) {
                setAssignBooking(unassigned[0]);
                setAssignOpen(true);
              }
            }}
          >
            <UserPlus className="h-4 w-4" />
            Assign now →
          </Button>
        }
      >
        {!unassigned.length ? (
          <p className="py-6 text-center text-sm text-[var(--ink-muted)]">
            All active bookings have a driver
          </p>
        ) : (
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
                  <tr key={c.bookingId} className="border-t border-[var(--line)]">
                    <td className="px-2 py-2 font-medium">{c.znCode}</td>
                    <td className="px-2 py-2">{c.clientName}</td>
                    <td className="px-2 py-2 text-[var(--ink-muted)]">
                      {c.packageName ?? '—'}
                    </td>
                    <td className="px-2 py-2 text-end">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setAssignBooking(c);
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
        )}
      </AnalyticsCard>

      <DialogShell open={assignOpen} title="Assign driver" onClose={() => setAssignOpen(false)}>
        <p className="mb-3 text-sm text-[var(--ink-muted)]">
          Client: {assignBooking ? `${assignBooking.clientName} · ${assignBooking.znCode}` : '—'}
        </p>
        <div className={cn('space-y-2', assigning && 'pointer-events-none opacity-60')}>
          {!availableDrivers.length ? (
            <p className="text-sm text-[var(--ink-muted)]">
              No available drivers. Check the Drivers roster.
            </p>
          ) : (
            availableDrivers.map((d) => (
              <button
                key={d.id}
                type="button"
                className="flex w-full items-center justify-between rounded-xl border border-[var(--line)] px-3 py-2 text-start hover:bg-[var(--bg-muted)]"
                onClick={() => void doAssign(d.id)}
              >
                <span>
                  <span className="block text-sm font-medium">{d.fullName}</span>
                  <span className="text-xs text-[var(--ink-muted)]">{vehicleLabel(d)}</span>
                </span>
                <StatusBadge tone={dTone(d.status)}>{d.status}</StatusBadge>
              </button>
            ))
          )}
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
        title={selectedDriver?.fullName ?? 'Driver'}
        onClose={() => setDriverId(null)}
        footer={
          selectedDriver?.phone ? (
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
            <div className="flex justify-between">
              <dt className="text-[var(--ink-muted)]">Status</dt>
              <dd>
                <StatusBadge tone={dTone(selectedDriver.status)}>
                  {selectedDriver.status}
                </StatusBadge>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--ink-muted)]">Vehicle</dt>
              <dd>{vehicleLabel(selectedDriver)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--ink-muted)]">Assignment</dt>
              <dd>{selectedDriver.activeAssignmentZn ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--ink-muted)]">Rating</dt>
              <dd>{selectedDriver.rating}</dd>
            </div>
          </dl>
        ) : null}
      </DetailDrawer>
    </PageScaffold>
  );
}
