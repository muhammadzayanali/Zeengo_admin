import { useMemo, useState } from 'react';
import { ops, useOpsSnapshot } from '@/ops-demo/useOpsStore';
import type { OpsTaskStatus } from '@/ops-demo/store';
import {
  Button,
  PageScaffold,
  Select,
  StatsCard,
  StatusBadge,
  useToast,
  type StatusTone,
} from '@/shared/ui';

function taskTone(s: OpsTaskStatus): StatusTone {
  if (s === 'completed') return 'success';
  if (s === 'in_progress') return 'accent';
  if (s === 'delayed') return 'danger';
  return 'default';
}

const BLOCKS = ['morning', 'afternoon', 'evening'] as const;

export function DriverMePage() {
  const snap = useOpsSnapshot();
  const { push } = useToast();
  const [day, setDay] = useState<'today' | 'tomorrow'>('today');

  const myTasks = useMemo(() => {
    return snap.tasks
      .filter((t) => t.driverId === ops.DEMO_DRIVER_ID || (!t.driverId && day === 'tomorrow'))
      .filter((t) => (day === 'today' ? true : t.timeBlock !== 'morning'))
      .sort((a, b) => BLOCKS.indexOf(a.timeBlock) - BLOCKS.indexOf(b.timeBlock));
  }, [snap.tasks, day]);

  const done = myTasks.filter((t) => t.done).length;

  async function setStatus(id: string, status: OpsTaskStatus) {
    await ops.setTaskStatus(id, status);
    push({
      tone: 'success',
      title: status === 'completed' ? 'Step completed — dashboard updated' : `Step · ${status.replace('_', ' ')}`,
    });
  }

  return (
    <PageScaffold
      title="My Schedule"
      description="Chronological itinerary for your shift. Mark steps in progress or completed — Admin Command Center updates live (demo)."
      stats={
        <>
          <StatsCard label="Steps today" value={myTasks.length} />
          <StatsCard label="Completed" value={done} tone="success" />
          <StatsCard label="Remaining" value={myTasks.length - done} tone="warning" />
          <StatsCard
            label="Progress"
            value={`${myTasks.length ? Math.round((done / myTasks.length) * 100) : 0}%`}
            tone="accent"
          />
        </>
      }
      filters={
        <Select
          className="max-w-[160px]"
          value={day}
          onChange={(e) => setDay(e.target.value as 'today' | 'tomorrow')}
        >
          <option value="today">Today</option>
          <option value="tomorrow">Tomorrow</option>
        </Select>
      }
    >
      <div className="space-y-3">
        {myTasks.length === 0 ? (
          <p className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-6 text-sm text-[var(--ink-muted)]">
            No itinerary steps for this day.
          </p>
        ) : (
          myTasks.map((t) => {
            const client = snap.clients.find((c) => c.id === t.clientId);
            return (
              <div
                key={t.id}
                className="flex flex-col gap-3 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-[var(--accent)]"
                    checked={t.done}
                    onChange={() => void setStatus(t.id, t.done ? 'pending' : 'completed')}
                    aria-label={`Mark ${t.title} complete`}
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`font-semibold ${t.done ? 'line-through opacity-60' : ''}`}>
                        {t.title}
                      </p>
                      <StatusBadge tone={taskTone(t.status)}>
                        {t.status.replace('_', ' ')}
                      </StatusBadge>
                    </div>
                    <p className="mt-1 text-sm text-[var(--ink-muted)]">
                      <span className="capitalize">{t.timeBlock}</span>
                      {' · '}
                      {t.location}
                      {client ? ` · ${client.fullName} (${client.znCode})` : ''}
                      {' · '}
                      {t.serviceType.replace('_', ' ')}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    className="!px-3 !py-1.5 text-xs"
                    disabled={t.status === 'in_progress'}
                    onClick={() => void setStatus(t.id, 'in_progress')}
                  >
                    In progress
                  </Button>
                  <Button
                    type="button"
                    className="!px-3 !py-1.5 text-xs"
                    disabled={t.done}
                    onClick={() => void setStatus(t.id, 'completed')}
                  >
                    Complete
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </PageScaffold>
  );
}
