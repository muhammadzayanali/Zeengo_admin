import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { bookingsApi } from '@/modules/clients/bookings/services/bookings.api';
import {
  ActionDropdown,
  Button,
  EmptyState,
  ErrorState,
  PageScaffold,
  Pagination,
  SearchBar,
  Select,
  Skeleton,
  StatsCard,
  StatusBadge,
  useToast,
} from '@/shared/ui';
import { formatDate, formatMoney } from '@/shared/lib/cn';
import { PAGE_SIZE } from '@/shared/lib/pagination';
import type { BookingStatus } from '@/shared/api/types';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';

export function ClientsPage() {
  const navigate = useNavigate();
  const { push } = useToast();
  const [q, setQ] = useState('');
  const debouncedQ = useDebouncedValue(q);
  const [status, setStatus] = useState<BookingStatus | ''>('');
  const [page, setPage] = useState(1);

  const bookingsQuery = useQuery({
    queryKey: ['bookings', 'clients-tab', { page, search: debouncedQ, status }],
    queryFn: ({ signal }) =>
      bookingsApi.list(
        {
          page,
          limit: PAGE_SIZE,
          search: debouncedQ || undefined,
          status: status || undefined,
        },
        signal,
      ),
  });

  const rows = bookingsQuery.data?.data ?? [];
  const meta = bookingsQuery.data?.meta;

  const stats = useMemo(() => {
    return {
      total: meta?.total ?? rows.length,
      active: rows.filter((b) => b.status === 'active').length,
      vip: rows.filter((b) => b.isVip).length,
      unassigned: rows.filter((b) => b.status === 'active' && !b.activeDriverAssignment)
        .length,
    };
  }, [meta, rows]);

  return (
    <PageScaffold
      title="Clients"
      description="Client bookings with ZN codes — includes guests imported from ZEENTRAVEL Kitchen Excel."
      primaryAction={
        <Button onClick={() => navigate('/clients/new')}>+ Add New Client</Button>
      }
      stats={
        <>
          <StatsCard label="Total" value={stats.total} />
          <StatsCard label="Active (page)" value={stats.active} tone="success" />
          <StatsCard label="VIP (page)" value={stats.vip} tone="accent" />
          <StatsCard label="Unassigned (page)" value={stats.unassigned} tone="warning" />
        </>
      }
      filters={
        <>
          <SearchBar
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
            placeholder="Name, phone, or ZN…"
            className="max-w-sm"
          />
          <Select
            className="max-w-[160px]"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as BookingStatus | '');
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </>
      }
    >
      {bookingsQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : bookingsQuery.isError ? (
        <ErrorState
          description={bookingsQuery.error?.message ?? 'Could not load clients'}
          onRetry={() => bookingsQuery.refetch()}
        />
      ) : !rows.length ? (
        <EmptyState
          title="No client bookings yet"
          description="Create a client booking to save a client record and trip package to the database."
          action={
            <Button onClick={() => navigate('/clients/new')}>+ Add New Client</Button>
          }
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="sticky top-0 bg-[var(--bg-muted)] text-xs font-medium uppercase text-[var(--ink-muted)]">
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
                  {rows.map((b) => (
                    <tr
                      key={b.id}
                      className="cursor-pointer border-t border-[var(--line)] hover:bg-[var(--bg-muted)]/70"
                      onClick={() => navigate(`/clients/${b.id}`)}
                    >
                      <td className="px-4 py-3 font-medium">{b.znCode}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-[var(--accent)]">
                          {b.client?.fullName ?? '—'}
                        </span>
                        {b.isVip ? (
                          <StatusBadge tone="accent" className="ms-2">
                            VIP
                          </StatusBadge>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-[var(--ink-muted)]">
                        <div>{b.client?.phone}</div>
                        <div className="text-xs">{b.client?.email}</div>
                      </td>
                      <td className="px-4 py-3">{b.package?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        {b.activeDriverAssignment?.driverName ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <span>{b.activeDriverAssignment.driverName}</span>
                            {b.activeDriverAssignment.status &&
                            b.activeDriverAssignment.status !== 'in_progress' ? (
                              <StatusBadge
                                tone={
                                  b.activeDriverAssignment.status === 'pending'
                                    ? 'warning'
                                    : b.activeDriverAssignment.status === 'accepted'
                                      ? 'accent'
                                      : 'default'
                                }
                              >
                                {b.activeDriverAssignment.status.replace(/_/g, ' ')}
                              </StatusBadge>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-[var(--danger)]">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--ink-muted)]">
                        {formatDate(b.arrivalDate)} → {formatDate(b.departureDate)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          tone={
                            b.status === 'active'
                              ? 'success'
                              : b.status === 'cancelled'
                                ? 'danger'
                                : 'default'
                          }
                        >
                          {b.status}
                        </StatusBadge>
                      </td>
                      <td
                        className="px-4 py-3 text-end"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ActionDropdown
                          items={[
                            {
                              id: 'view',
                              label: 'Open profile',
                              onClick: () => navigate(`/clients/${b.id}`),
                            },
                            {
                              id: 'driver',
                              label: 'Assign driver…',
                              onClick: () =>
                                navigate(`/clients/${b.id}?panel=driver`),
                            },
                            {
                              id: 'amount',
                              label: formatMoney(b.totalAmount),
                              onClick: () =>
                                push({ tone: 'success', title: 'Total amount shown' }),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-4">
            <Pagination
              page={meta?.page ?? page}
              limit={meta?.limit ?? PAGE_SIZE}
              total={meta?.total ?? 0}
              onPageChange={setPage}
            />
          </div>
        </>
      )}
    </PageScaffold>
  );
}
