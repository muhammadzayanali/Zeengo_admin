import { useMemo, useState } from 'react';
import { ops, useOpsSnapshot } from '@/ops-demo/useOpsStore';
import {
  Button,
  DetailDrawer,
  PageScaffold,
  StatusBadge,
  useToast,
} from '@/shared/ui';

export function VipPage() {
  const snap = useOpsSnapshot();
  const { push } = useToast();
  const [id, setId] = useState<string | null>(null);

  const vips = useMemo(
    () => snap.clients.filter((c) => c.isVip && c.status === 'active'),
    [snap.clients],
  );
  const profile = id ? ops.getClient(id) : null;

  return (
    <PageScaffold
      title="Zeen Rafeq VIP"
      description="Priority concierge desk — VIP clients bypass standard queues and escalate to senior ops."
    >
      <div className="space-y-3">
        {vips.map((c) => {
          const unassigned = !c.driverId;
          return (
            <div
              key={c.id}
              className={
                unassigned
                  ? 'rounded-[var(--radius)] border-2 border-[var(--danger)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)]'
                  : 'rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)]'
              }
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{c.fullName}</p>
                    <StatusBadge tone="accent">VIP</StatusBadge>
                    {unassigned ? <StatusBadge tone="danger">Unassigned</StatusBadge> : null}
                  </div>
                  <p className="text-sm text-[var(--ink-muted)]">
                    {c.znCode} · {c.packageName} · {c.hotel}
                  </p>
                  <p className="mt-1 text-xs text-[var(--ink-muted)]">
                    Special: {c.dietary || c.medicalNotes || 'Concierge preferences on file'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={() => setId(c.id)}>
                    Concierge file
                  </Button>
                  <Button
                    type="button"
                    onClick={() =>
                      push({
                        tone: 'success',
                        title: 'Priority escalation sent to senior Ops Manager (demo)',
                      })
                    }
                  >
                    Escalate
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <DetailDrawer open={Boolean(profile)} title="VIP concierge tracking" onClose={() => setId(null)}>
        {profile ? (
          <div className="space-y-3 text-sm">
            <p className="font-medium">{profile.fullName} ({profile.znCode})</p>
            <p>Security escort / luxury vehicle preferences tracked here.</p>
            <p>Driver: {profile.driverId ? ops.getDriver(profile.driverId)?.name : 'Needs assign'}</p>
            <p>Language: {profile.language}</p>
            <p>Medical: {profile.medicalNotes || '—'}</p>
            <p>Emergency: {profile.emergencyContact || '—'}</p>
            <Button
              type="button"
              className="w-full"
              onClick={() => push({ tone: 'success', title: 'Special request logged (demo)' })}
            >
              Log special request
            </Button>
          </div>
        ) : null}
      </DetailDrawer>
    </PageScaffold>
  );
}
