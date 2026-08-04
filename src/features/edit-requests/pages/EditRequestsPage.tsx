import { useMemo, useState } from 'react';
import { ops, useOpsSnapshot } from '@/ops-demo/useOpsStore';
import {
  Button,
  DetailDrawer,
  DialogShell,
  Label,
  PageScaffold,
  SearchBar,
  StatusBadge,
  Textarea,
  useToast,
} from '@/shared/ui';

export function EditRequestsPage() {
  const snap = useOpsSnapshot();
  const { push } = useToast();
  const [q, setQ] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');

  const rows = useMemo(() => {
    return snap.editRequests.filter((e) => {
      const c = ops.getClient(e.clientId);
      const hay = `${c?.fullName} ${c?.znCode} ${e.type} ${e.requested}`.toLowerCase();
      return !q || hay.includes(q.toLowerCase());
    });
  }, [snap.editRequests, q]);

  const detail = detailId ? snap.editRequests.find((e) => e.id === detailId) : null;
  const detailClient = detail ? ops.getClient(detail.clientId) : null;

  return (
    <PageScaffold
      title="Edit Requests"
      description="Inbound modification pipeline — flight delays, extensions, hotel changes. Conflict-checked against fleet & vendors."
      filters={<SearchBar value={q} onChange={setQ} placeholder="Client or request type…" className="max-w-sm" />}
    >
      <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-[var(--bg-muted)] text-xs font-medium uppercase text-[var(--ink-muted)]">
              <tr>
                <th className="px-4 py-3 text-start">Client</th>
                <th className="px-4 py-3 text-start">Type</th>
                <th className="px-4 py-3 text-start">Original → Requested</th>
                <th className="px-4 py-3 text-start">Submitted</th>
                <th className="px-4 py-3 text-start">Availability</th>
                <th className="px-4 py-3 text-start">Status</th>
                <th className="px-4 py-3 text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((er) => {
                const c = ops.getClient(er.clientId);
                return (
                  <tr key={er.id} className="border-t border-[var(--line)] hover:bg-[var(--bg-muted)]/70">
                    <td className="px-4 py-3">
                      <button type="button" className="text-start font-medium text-[var(--accent)] hover:underline" onClick={() => setDetailId(er.id)}>
                        {c?.fullName}
                      </button>
                      <div className="text-xs text-[var(--ink-muted)]">{c?.znCode}</div>
                    </td>
                    <td className="px-4 py-3">{er.type}</td>
                    <td className="px-4 py-3">
                      <div className="text-[var(--ink-muted)] line-through text-xs">{er.original}</div>
                      <div>{er.requested}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--ink-muted)]">{ops.elapsedLabel(er.createdAt)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        tone={
                          er.availability === 'available'
                            ? 'success'
                            : er.availability === 'conflict'
                              ? 'danger'
                              : 'warning'
                        }
                      >
                        {er.availability}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={er.status === 'pending' ? 'warning' : er.status === 'approved' ? 'success' : 'default'}>
                        {er.status}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-end">
                      {er.status === 'pending' ? (
                        <div className="inline-flex gap-2">
                          <Button
                            type="button"
                            onClick={async () => {
                              await ops.approveEdit(er.id);
                              push({ tone: 'success', title: 'Approved — itinerary, driver & client notified (demo)' });
                            }}
                          >
                            Approve & Update
                          </Button>
                          <Button type="button" variant="secondary" onClick={() => setRejectId(er.id)}>
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <Button type="button" variant="ghost" onClick={() => setDetailId(er.id)}>
                          View
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <DetailDrawer open={Boolean(detail)} title="Request detail" onClose={() => setDetailId(null)}>
        {detail && detailClient ? (
          <div className="space-y-3 text-sm">
            <p className="font-medium">{detailClient.fullName} ({detailClient.znCode})</p>
            <p>{detail.type}</p>
            <div className="rounded-xl bg-[var(--bg-muted)] p-3">
              <p className="text-xs text-[var(--ink-muted)]">Original</p>
              <p>{detail.original}</p>
              <p className="mt-2 text-xs text-[var(--ink-muted)]">Requested</p>
              <p className="font-medium">{detail.requested}</p>
            </div>
            <p>
              Availability check:{' '}
              <StatusBadge
                tone={
                  detail.availability === 'available'
                    ? 'success'
                    : detail.availability === 'conflict'
                      ? 'danger'
                      : 'warning'
                }
              >
                {detail.availability}
              </StatusBadge>
            </p>
            <p className="text-xs text-[var(--ink-muted)]">
              Cross-references fleet calendars & vendor inventory (demo rules).
            </p>
          </div>
        ) : null}
      </DetailDrawer>

      <DialogShell open={Boolean(rejectId)} title="Reject & notify client" onClose={() => setRejectId(null)}>
        <Label>Feedback to client (email / chat)</Label>
        <Textarea rows={4} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Explain why this change isn’t available…" />
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setRejectId(null)}>Cancel</Button>
          <Button
            type="button"
            variant="danger"
            onClick={async () => {
              if (!rejectId) return;
              await ops.rejectEdit(rejectId);
              push({ tone: 'success', title: 'Rejected — notification queued (demo)' });
              setRejectId(null);
              setFeedback('');
            }}
          >
            Reject & Notify
          </Button>
        </div>
      </DialogShell>
    </PageScaffold>
  );
}
