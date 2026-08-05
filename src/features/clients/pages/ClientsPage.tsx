import { useMemo, useState } from 'react';
import { ops, useOpsSnapshot } from '@/ops-demo/useOpsStore';
import {
  ActionDropdown,
  Button,
  DetailDrawer,
  PageScaffold,
  SearchBar,
  Select,
  StatsCard,
  StatusBadge,
  useToast,
} from '@/shared/ui';

export function ClientsPage() {
  const snap = useOpsSnapshot();
  const { push } = useToast();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [vipOnly, setVipOnly] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [revealPassport, setRevealPassport] = useState(false);

  const filtered = useMemo(() => {
    return snap.clients.filter((c) => {
      if (status && c.status !== status) return false;
      if (vipOnly && !c.isVip) return false;
      const hay = `${c.znCode} ${c.fullName} ${c.phone} ${c.email}`.toLowerCase();
      if (q && !hay.includes(q.toLowerCase())) return false;
      return true;
    });
  }, [snap.clients, q, status, vipOnly]);

  const profile = profileId ? ops.getClient(profileId) : null;
  const profileDriver = profile?.driverId ? ops.getDriver(profile.driverId) : null;

  return (
    <PageScaffold
      title="Clients"
      description="Complete customer registry — ZN codes, packages, drivers, and account status."
      stats={
        <>
          <StatsCard label="Total" value={snap.clients.length} />
          <StatsCard label="Active" value={snap.clients.filter((c) => c.status === 'active').length} tone="success" />
          <StatsCard label="VIP" value={snap.clients.filter((c) => c.isVip).length} tone="accent" />
          <StatsCard label="Unassigned" value={snap.clients.filter((c) => c.status === 'active' && !c.driverId).length} tone="warning" />
        </>
      }
      filters={
        <>
          <SearchBar value={q} onChange={setQ} placeholder="Name, phone, or ZN…" className="max-w-sm" />
          <Select className="max-w-[160px]" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="completed">Completed</option>
          </Select>
          <label className="inline-flex items-center gap-2 text-sm text-[var(--ink-muted)]">
            <input type="checkbox" checked={vipOnly} onChange={(e) => setVipOnly(e.target.checked)} />
            VIP only
          </label>
        </>
      }
    >
      <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-[var(--bg-muted)] text-xs font-medium uppercase text-[var(--ink-muted)] sticky top-0">
              <tr>
                <th className="px-4 py-3 text-start">Client ID</th>
                <th className="px-4 py-3 text-start">Name</th>
                <th className="px-4 py-3 text-start">Contact</th>
                <th className="px-4 py-3 text-start">Package</th>
                <th className="px-4 py-3 text-start">Driver</th>
                <th className="px-4 py-3 text-start">Trip</th>
                <th className="px-4 py-3 text-start">Status</th>
                <th className="px-4 py-3 text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const d = c.driverId ? ops.getDriver(c.driverId) : null;
                return (
                  <tr key={c.id} className="border-t border-[var(--line)] hover:bg-[var(--bg-muted)]/70">
                    <td className="px-4 py-3 font-medium">{c.znCode}</td>
                    <td className="px-4 py-3">
                      <button type="button" className="font-medium text-[var(--accent)] hover:underline" onClick={() => { setProfileId(c.id); setRevealPassport(false); }}>
                        {c.fullName}
                      </button>
                      {c.isVip ? <StatusBadge tone="accent" className="ms-2">VIP</StatusBadge> : null}
                    </td>
                    <td className="px-4 py-3 text-[var(--ink-muted)]">
                      <div>{c.phone}</div>
                      <div className="text-xs">{c.email}</div>
                    </td>
                    <td className="px-4 py-3">{c.packageName}</td>
                    <td className="px-4 py-3">{d?.name ?? <span className="text-[var(--danger)]">Unassigned</span>}</td>
                    <td className="px-4 py-3 text-xs text-[var(--ink-muted)]">{c.tripStart} → {c.tripEnd}</td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={c.status === 'active' ? 'success' : c.status === 'suspended' ? 'warning' : 'default'}>
                        {c.status}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-end">
                      <ActionDropdown
                        items={[
                          { id: 'view', label: 'Open profile', onClick: () => { setProfileId(c.id); setRevealPassport(false); } },
                          { id: 'notify', label: 'Send push (demo)', onClick: () => push({ tone: 'success', title: 'Push queued' }) },
                          { id: 'driver', label: 'Assign driver…', onClick: () => push({ tone: 'success', title: 'Use Drivers match engine' }) },
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <DetailDrawer
        open={Boolean(profile)}
        title={profile ? `${profile.znCode} · ${profile.fullName}` : 'Client'}
        onClose={() => setProfileId(null)}
        wide
      >
        {profile ? (
          <div className="space-y-5 text-sm">
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">Overview</h3>
              <dl className="mt-2 space-y-2">
                <div className="flex justify-between gap-2"><dt className="text-[var(--ink-muted)]">Language</dt><dd>{profile.language.toUpperCase()}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-[var(--ink-muted)]">Phone</dt><dd>{profile.phone}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-[var(--ink-muted)]">Email</dt><dd>{profile.email}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-[var(--ink-muted)]">Hotel</dt><dd>{profile.hotel}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-[var(--ink-muted)]">Medical</dt><dd>{profile.medicalNotes || '—'}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-[var(--ink-muted)]">Dietary</dt><dd>{profile.dietary || '—'}</dd></div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--ink-muted)]">Passport</dt>
                  <dd>
                    <button type="button" className="text-[var(--accent)]" onClick={() => setRevealPassport((v) => !v)}>
                      {revealPassport ? profile.passportMasked.replace('•', '') + ' (demo masked)' : profile.passportMasked + ' · reveal'}
                    </button>
                  </dd>
                </div>
              </dl>
            </section>
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">Trip itinerary</h3>
              <ol className="mt-2 space-y-2 border-s border-[var(--line)] ps-3">
                <li><span className="text-xs text-[var(--ink-muted)]">{profile.tripStart}</span><br />Arrival / hotel check-in · {profile.hotel}</li>
                <li><span className="text-xs text-[var(--ink-muted)]">Day 2–n</span><br />Transfers + packages · {profile.packageName}</li>
                <li><span className="text-xs text-[var(--ink-muted)]">{profile.tripEnd}</span><br />Departure transfer</li>
              </ol>
            </section>
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">Financial</h3>
              <div className="mt-2 flex justify-between"><span className="text-[var(--ink-muted)]">Total spent</span><span>${profile.totalSpent.toLocaleString()}</span></div>
              <div className="mt-1 flex justify-between"><span className="text-[var(--ink-muted)]">Outstanding</span><span className={profile.outstanding ? 'text-[var(--danger)]' : ''}>${profile.outstanding.toLocaleString()}</span></div>
            </section>
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">Driver</h3>
              <p className="mt-1">{profileDriver ? `${profileDriver.name} · ${profileDriver.phone}` : 'Unassigned'}</p>
            </section>
          </div>
        ) : null}
      </DetailDrawer>
    </PageScaffold>
  );
}
