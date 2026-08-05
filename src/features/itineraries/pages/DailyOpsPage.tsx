import { useMemo, useState } from 'react';
import { ops, useOpsSnapshot } from '@/ops-demo/useOpsStore';
import {
  PageScaffold,
  SearchBar,
  Select,
  StatsCard,
  StatusBadge,
  useToast,
  type StatusTone,
} from '@/shared/ui';

const statusTone: Record<string, StatusTone> = {
  pending: 'default',
  in_progress: 'accent',
  completed: 'success',
  delayed: 'danger',
};

export function DailyOpsPage() {
  const snap = useOpsSnapshot();
  const { push } = useToast();
  const [status, setStatus] = useState('');
  const [service, setService] = useState('');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    return snap.tasks.filter((t) => {
      if (status && t.status !== status) return false;
      if (service && t.serviceType !== service) return false;
      const c = ops.getClient(t.clientId);
      const hay = `${t.title} ${c?.znCode} ${c?.fullName} ${t.location}`.toLowerCase();
      if (q && !hay.includes(q.toLowerCase())) return false;
      return true;
    });
  }, [snap.tasks, status, service, q]);

  const blocks = ['morning', 'afternoon', 'evening'] as const;
  const k = snap.kpis;

  async function toggle(id: string) {
    await ops.toggleTaskDone(id);
    push({ tone: 'success', title: 'Task updated — progress recalculated' });
  }

  return (
    <PageScaffold
      title="Daily Operations"
      description="Master task coordination for today’s fulfillment. Completing a task updates itinerary progress."
      stats={
        <>
          <StatsCard label="Itinerary progress" value={`${k.itineraryProgress}%`} />
          <StatsCard label="Pending" value={snap.tasks.filter((t) => t.status === 'pending').length} />
          <StatsCard label="In progress" value={snap.tasks.filter((t) => t.status === 'in_progress').length} tone="accent" />
          <StatsCard label="Delayed" value={snap.tasks.filter((t) => t.status === 'delayed').length} tone="danger" />
        </>
      }
      filters={
        <>
          <SearchBar value={q} onChange={setQ} placeholder="Search task, client, venue…" className="max-w-sm" />
          <Select className="max-w-[180px]" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In-Progress</option>
            <option value="completed">Completed</option>
            <option value="delayed">Delayed</option>
          </Select>
          <Select className="max-w-[200px]" value={service} onChange={(e) => setService(e.target.value)}>
            <option value="">All service types</option>
            <option value="airport_pickup">Airport Pickup</option>
            <option value="hotel_checkin">Hotel Check-In</option>
            <option value="guided_tour">Guided Tour</option>
            <option value="transfer">Transfer</option>
          </Select>
        </>
      }
    >
      {blocks.map((block) => {
        const rows = filtered.filter((t) => t.timeBlock === block);
        if (!rows.length) return null;
        return (
          <section key={block} className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
              {block}
            </h3>
            <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]">
              <table className="w-full min-w-[800px] text-sm">
                <thead className="bg-[var(--bg-muted)] text-xs font-medium uppercase text-[var(--ink-muted)]">
                  <tr>
                    <th className="px-3 py-2 text-start">Done</th>
                    <th className="px-3 py-2 text-start">Task</th>
                    <th className="px-3 py-2 text-start">Client</th>
                    <th className="px-3 py-2 text-start">Driver</th>
                    <th className="px-3 py-2 text-start">Location</th>
                    <th className="px-3 py-2 text-start">Vendor</th>
                    <th className="px-3 py-2 text-start">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((t) => {
                    const c = ops.getClient(t.clientId);
                    const d = t.driverId ? ops.getDriver(t.driverId) : null;
                    return (
                      <tr key={t.id} className="border-t border-[var(--line)] hover:bg-[var(--bg-muted)]/70">
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={t.done}
                            onChange={() => void toggle(t.id)}
                            aria-label={`Complete ${t.title}`}
                          />
                        </td>
                        <td className="px-3 py-2 font-medium">{t.title}</td>
                        <td className="px-3 py-2">{c?.znCode}</td>
                        <td className="px-3 py-2">{d?.name ?? '—'}</td>
                        <td className="px-3 py-2 text-[var(--ink-muted)]">{t.location}</td>
                        <td className="px-3 py-2">
                          <StatusBadge>{t.vendorStatus}</StatusBadge>
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge tone={statusTone[t.status] ?? 'default'}>{t.status}</StatusBadge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
      {!filtered.length ? (
        <p className="py-12 text-center text-sm text-[var(--ink-muted)]">No tasks match filters</p>
      ) : null}
    </PageScaffold>
  );
}
