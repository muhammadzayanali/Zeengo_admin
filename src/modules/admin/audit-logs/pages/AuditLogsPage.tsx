import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditLogsApi } from '../services/audit-logs.api';
import {
  EmptyState,
  ErrorState,
  Input,
  Label,
  PageScaffold,
  Pagination,
  Skeleton,
} from '@/shared/ui';
import { formatDate } from '@/shared/lib/cn';

export function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [actorId, setActorId] = useState('');

  const query = useQuery({
    queryKey: ['audit-logs', { page, action, entity, actorId }],
    queryFn: ({ signal }) =>
      auditLogsApi.list(
        {
          page,
          limit: 25,
          action: action || undefined,
          entity: entity || undefined,
          actorId: actorId || undefined,
        },
        signal,
      ),
  });

  const rows = query.data?.data ?? [];
  const meta = query.data?.meta;

  return (
    <PageScaffold
      title="Audit logs"
      description="Staff-only record of who changed what. Customers cannot see this list."
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="al-action">Action</Label>
          <Input
            id="al-action"
            value={action}
            onChange={(e) => {
              setPage(1);
              setAction(e.target.value);
            }}
            placeholder="booking.update"
          />
        </div>
        <div>
          <Label htmlFor="al-entity">Entity</Label>
          <Input
            id="al-entity"
            value={entity}
            onChange={(e) => {
              setPage(1);
              setEntity(e.target.value);
            }}
            placeholder="booking"
          />
        </div>
        <div>
          <Label htmlFor="al-actor">Actor ID</Label>
          <Input
            id="al-actor"
            value={actorId}
            onChange={(e) => {
              setPage(1);
              setActorId(e.target.value);
            }}
            placeholder="UUID"
          />
        </div>
      </div>

      {query.isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : query.isError ? (
        <ErrorState title="Could not load audit logs" onRetry={() => void query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title="No audit rows match these filters" />
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius)] border border-[var(--line)]">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-[var(--bg-muted)] text-xs uppercase text-[var(--ink-muted)]">
              <tr>
                <th className="px-3 py-2 text-start">When</th>
                <th className="px-3 py-2 text-start">Who</th>
                <th className="px-3 py-2 text-start">Action</th>
                <th className="px-3 py-2 text-start">Entity</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-[var(--line)]">
                  <td className="px-3 py-2 whitespace-nowrap">{formatDate(row.createdAt)}</td>
                  <td className="px-3 py-2">
                    <p>{row.actorType}</p>
                    <p className="text-xs text-[var(--ink-muted)]">{row.actorId ?? '—'}</p>
                  </td>
                  <td className="px-3 py-2 font-medium">{row.action}</td>
                  <td className="px-3 py-2">
                    <p>{row.entity ?? '—'}</p>
                    <p className="text-xs text-[var(--ink-muted)]">{row.entityId ?? ''}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta ? (
        <div className="mt-4">
          <Pagination
            page={meta.page}
            limit={meta.limit}
            total={meta.total}
            onPageChange={setPage}
          />
        </div>
      ) : null}
    </PageScaffold>
  );
}
