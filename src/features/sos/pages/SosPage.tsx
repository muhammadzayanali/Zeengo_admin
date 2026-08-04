import { useMemo, useState } from 'react';
import { FolderOpen, MessageSquare, CheckCircle2, Phone } from 'lucide-react';
import { ops, useOpsSnapshot } from '@/ops-demo/useOpsStore';
import {
  Button,
  DetailDrawer,
  DialogShell,
  Label,
  PageScaffold,
  SearchBar,
  Select,
  StatusBadge,
  TabBar,
  Textarea,
  useToast,
} from '@/shared/ui';

export function SosPage() {
  const snap = useOpsSnapshot();
  const { push } = useToast();
  const [tab, setTab] = useState('active');
  const [q, setQ] = useState('');
  const [fileId, setFileId] = useState<string | null>(null);
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [phoneAttempt, setPhoneAttempt] = useState('yes');
  const [driverId, setDriverId] = useState('');
  const [emergency, setEmergency] = useState('');
  const [notes, setNotes] = useState('');

  const list = useMemo(() => {
    const base = snap.sosAlerts.filter((s) =>
      tab === 'active' ? s.status === 'active' : s.status === 'resolved',
    );
    if (!q.trim()) return base;
    return base.filter((s) => {
      const c = ops.getClient(s.clientId);
      return `${c?.fullName} ${c?.znCode}`.toLowerCase().includes(q.toLowerCase());
    });
  }, [snap.sosAlerts, tab, q]);

  const fileClient = fileId
    ? ops.getClient(snap.sosAlerts.find((s) => s.id === fileId)?.clientId ?? '')
    : null;
  const fileDriver = fileClient?.driverId ? ops.getDriver(fileClient.driverId) : null;

  async function submitResolve() {
    if (!resolveId) return;
    await ops.resolveSos(resolveId, {
      phoneAttempt: phoneAttempt === 'yes',
      driverDispatchedId: driverId || null,
      emergencyService: emergency || null,
      notes,
    });
    push({ tone: 'success', title: 'SOS resolved — protocol logged' });
    setResolveId(null);
    setNotes('');
    setDriverId('');
    setEmergency('');
  }

  const activeCount = snap.sosAlerts.filter((s) => s.status === 'active').length;

  return (
    <PageScaffold
      title="SOS Alerts"
      description="Critical emergency monitoring. Active alerts outrank all other ops work."
      filters={
        <>
          <TabBar
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'active', label: 'Active', count: activeCount },
              { id: 'history', label: 'History' },
            ]}
          />
          <SearchBar value={q} onChange={setQ} placeholder="Search client / ZN…" className="max-w-xs" />
        </>
      }
    >
      <div className="space-y-3">
        {list.length === 0 ? (
          <p className="py-16 text-center text-sm text-[var(--ink-muted)]">
            {tab === 'active' ? 'All clear — no active emergencies' : 'No historical SOS events'}
          </p>
        ) : (
          list.map((s) => {
            const c = ops.getClient(s.clientId);
            return (
              <div
                key={s.id}
                className={
                  s.status === 'active'
                    ? 'rounded-[var(--radius)] border border-[var(--danger)]/40 bg-[color-mix(in_srgb,var(--danger)_6%,transparent)] p-4 shadow-[var(--shadow)]'
                    : 'rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)]'
                }
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--danger)]">
                      {s.status === 'active' ? 'Emergency alert' : 'Resolved event'}
                    </p>
                    <p className="mt-1 text-base font-semibold">
                      {c?.fullName} · {c?.znCode}
                    </p>
                    <p className="mt-1 text-sm text-[var(--ink-muted)]">
                      Triggered {ops.elapsedLabel(s.triggeredAt)}
                      {s.responseMinutes != null ? ` · Response ${s.responseMinutes}m` : ''}
                    </p>
                    <p className="mt-1 font-mono text-xs text-[var(--ink-muted)]">
                      {s.lat.toFixed(4)}, {s.lng.toFixed(4)}
                    </p>
                    {c?.phone ? (
                      <a href={`tel:${c.phone}`} className="mt-2 inline-flex items-center gap-1 text-sm text-[var(--accent)]">
                        <Phone className="h-3.5 w-3.5" /> {c.phone}
                      </a>
                    ) : null}
                  </div>
                  <StatusBadge tone={s.status === 'active' ? 'danger' : 'success'}>
                    {s.status.toUpperCase()}
                  </StatusBadge>
                </div>
                {s.notes ? (
                  <p className="mt-2 text-sm text-[var(--ink-muted)]">{s.notes}</p>
                ) : null}
                {s.status === 'active' ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={() => setFileId(s.id)}>
                      <FolderOpen className="h-4 w-4" /> View File
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => push({ tone: 'success', title: 'Priority DM thread opened (demo)' })}
                    >
                      <MessageSquare className="h-4 w-4" /> In-App Chat
                    </Button>
                    <Button type="button" onClick={() => setResolveId(s.id)}>
                      <CheckCircle2 className="h-4 w-4" /> Resolve Alert
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      <DetailDrawer
        open={Boolean(fileClient)}
        title={`Client file · ${fileClient?.znCode ?? ''}`}
        onClose={() => setFileId(null)}
        wide
      >
        {fileClient ? (
          <div className="space-y-4 text-sm">
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">Profile</h3>
              <p className="mt-1 font-medium">{fileClient.fullName}</p>
              <p className="text-[var(--ink-muted)]">{fileClient.phone} · {fileClient.email}</p>
              <p className="mt-1">Language: {fileClient.language.toUpperCase()}</p>
            </section>
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">Medical</h3>
              <p className="mt-1">{fileClient.medicalNotes || 'None'}</p>
              <p className="mt-1">Dietary: {fileClient.dietary || '—'}</p>
            </section>
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">Emergency contact</h3>
              <p className="mt-1">{fileClient.emergencyContact || '—'}</p>
            </section>
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">Passport / ID</h3>
              <p className="mt-1 font-mono">{fileClient.passportMasked}</p>
            </section>
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">Hotel</h3>
              <p className="mt-1">{fileClient.hotel}</p>
            </section>
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">Assigned driver</h3>
              <p className="mt-1">{fileDriver ? `${fileDriver.name} · ${fileDriver.phone}` : 'Unassigned'}</p>
            </section>
          </div>
        ) : null}
      </DetailDrawer>

      <DialogShell
        open={Boolean(resolveId)}
        title="Emergency protocol checklist"
        onClose={() => setResolveId(null)}
        wide
      >
        <div className="space-y-4">
          <div>
            <Label>Direct phone attempt recorded</Label>
            <Select value={phoneAttempt} onChange={(e) => setPhoneAttempt(e.target.value)}>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </Select>
          </div>
          <div>
            <Label>Nearby driver dispatched</Label>
            <Select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
              <option value="">— Select driver —</option>
              {snap.drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.status})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Emergency service notified</Label>
            <Select value={emergency} onChange={(e) => setEmergency(e.target.value)}>
              <option value="">None / N/A</option>
              <option value="Ambulance 103">Ambulance 103</option>
              <option value="Emergency 112">Emergency 112</option>
            </Select>
          </div>
          <div>
            <Label>Resolution notes</Label>
            <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} required />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setResolveId(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitResolve()} disabled={!notes.trim()}>
              Close alert
            </Button>
          </div>
        </div>
      </DialogShell>
    </PageScaffold>
  );
}
