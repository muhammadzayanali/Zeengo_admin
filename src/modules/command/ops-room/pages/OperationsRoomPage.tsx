import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Phone, Send, Route } from 'lucide-react';
import { driversApi } from '@/modules/fleet/drivers/services/drivers.api';
import {
  AnalyticsCard,
  Button,
  DetailDrawer,
  ErrorState,
  PageScaffold,
  Skeleton,
  StatusBadge,
  useToast,
  type StatusTone,
} from '@/shared/ui';
import type { DriverDetail, LivePosition } from '@/shared/api/types';

function pinColor(status: string) {
  const s = status.toLowerCase();
  if (s === 'available') return '#22c55e';
  if (s === 'en_route') return '#2563eb';
  if (s === 'resting') return '#f59e0b';
  return '#6b7280';
}

function dTone(s: string): StatusTone {
  const u = s.toLowerCase();
  if (u === 'available') return 'success';
  if (u === 'en_route') return 'accent';
  if (u === 'resting') return 'warning';
  return 'default';
}

function labelStatus(s: string) {
  return s.replace(/_/g, ' ').toUpperCase();
}

/** Live fleet map from driver GPS / last known positions. */
export function OperationsRoomPage() {
  const { push } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const positionsQuery = useQuery({
    queryKey: ['drivers', 'live-positions'],
    queryFn: ({ signal }) => driversApi.livePositions(signal),
    staleTime: 5_000,
    refetchInterval: 8_000,
  });

  const driversQuery = useQuery({
    queryKey: ['drivers', 'ops-room'],
    queryFn: ({ signal }) => driversApi.list({ limit: 50 }, signal),
    staleTime: 20_000,
    refetchInterval: 30_000,
  });

  const detailQuery = useQuery({
    queryKey: ['drivers', selectedId],
    queryFn: ({ signal }) => driversApi.get(selectedId!, signal),
    enabled: Boolean(selectedId),
  });

  const positions: LivePosition[] = positionsQuery.data ?? [];
  const drivers = driversQuery.data?.data ?? [];

  const selectedDetail: DriverDetail | undefined = detailQuery.data;
  const selectedPos = positions.find((p) => p.driverId === selectedId);
  const selectedList = drivers.find((d) => d.id === selectedId);

  const bounds = useMemo(() => {
    if (!positions.length) {
      return { minLat: 55.74, maxLat: 55.77, minLng: 37.6, maxLng: 37.64 };
    }
    const lats = positions.map((d) => d.lat);
    const lngs = positions.map((d) => d.lng);
    return {
      minLat: Math.min(...lats) - 0.01,
      maxLat: Math.max(...lats) + 0.01,
      minLng: Math.min(...lngs) - 0.01,
      maxLng: Math.max(...lngs) + 0.01,
    };
  }, [positions]);

  function pct(lat: number, lng: number) {
    const { minLat, maxLat, minLng, maxLng } = bounds;
    const top = 100 - ((lat - minLat) / (maxLat - minLat || 1)) * 100;
    const left = ((lng - minLng) / (maxLng - minLng || 1)) * 100;
    return {
      top: `${Math.min(90, Math.max(8, top))}%`,
      left: `${Math.min(92, Math.max(8, left))}%`,
    };
  }

  const loading = positionsQuery.isLoading || driversQuery.isLoading;
  const error = positionsQuery.isError || driversQuery.isError;

  return (
    <PageScaffold
      title="Operations Room"
      description="Live tracking command map — fleet GPS pins and driver status (polls live positions)."
    >
      {error ? (
        <ErrorState
          description={
            positionsQuery.error?.message ||
            driversQuery.error?.message ||
            'Could not load ops room'
          }
          onRetry={() => {
            void positionsQuery.refetch();
            void driversQuery.refetch();
          }}
        />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
        <div className="relative min-h-[520px] overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[#0f172a] shadow-[var(--shadow)]">
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                'linear-gradient(rgba(148,163,184,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.15) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(37,99,235,0.25),transparent_50%)]" />
          <p className="absolute start-4 top-4 z-10 rounded-lg bg-black/50 px-2 py-1 text-[11px] font-medium text-white/80">
            Live positions · {positions.length} pins · refresh ~8s
          </p>

          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Skeleton className="h-12 w-48" />
            </div>
          ) : (
            positions.map((d) => {
              const p = pct(d.lat, d.lng);
              return (
                <button
                  key={d.driverId}
                  type="button"
                  title={d.driverName}
                  onClick={() => setSelectedId(d.driverId)}
                  className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center transition hover:scale-110"
                  style={{ top: p.top, left: p.left }}
                >
                  <span
                    className="h-4 w-4 rounded-full border-2 border-white shadow-lg"
                    style={{ background: pinColor(d.status) }}
                  />
                  <span className="mt-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    {d.driverName.split(' ')[0]}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <AnalyticsCard title="Fleet list" description="Click a driver for telemetry">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !drivers.length ? (
            <p className="py-6 text-center text-sm text-[var(--ink-muted)]">
              No drivers in roster — seed or create driver profiles
            </p>
          ) : (
            <div className="space-y-2">
              {drivers.map((d) => {
                const pos = positions.find((p) => p.driverId === d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedId(d.id)}
                    className="flex w-full items-center justify-between rounded-xl border border-[var(--line)] px-3 py-2 text-start hover:bg-[var(--bg-muted)]"
                  >
                    <span>
                      <span className="block text-sm font-medium">{d.user.fullName}</span>
                      <span className="text-xs text-[var(--ink-muted)]">
                        {pos
                          ? `${pos.lat.toFixed(3)}, ${pos.lng.toFixed(3)}`
                          : [d.vehicleMake, d.vehicleModel].filter(Boolean).join(' ') ||
                            'No GPS yet'}
                      </span>
                    </span>
                    <StatusBadge tone={dTone(d.status)}>{labelStatus(d.status)}</StatusBadge>
                  </button>
                );
              })}
            </div>
          )}
        </AnalyticsCard>
      </div>

      <DetailDrawer
        open={Boolean(selectedId)}
        title={
          selectedDetail?.user.fullName ||
          selectedList?.user.fullName ||
          selectedPos?.driverName ||
          'Telemetry'
        }
        onClose={() => setSelectedId(null)}
        footer={
          selectedId ? (
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  push({
                    tone: 'success',
                    title: 'Reroute queued',
                    description: 'Driver will receive instructions when terminal is online.',
                  })
                }
              >
                <Route className="h-4 w-4" />
                Reroute around traffic
              </Button>
              <Button
                type="button"
                onClick={() =>
                  push({
                    tone: 'success',
                    title: 'Push alert sent',
                    description: 'Dispatch message to driver terminal.',
                  })
                }
              >
                <Send className="h-4 w-4" />
                Push alert to terminal
              </Button>
              {(selectedDetail?.user.phone || selectedList?.user.phone) && (
                <a href={`tel:${selectedDetail?.user.phone || selectedList?.user.phone}`}>
                  <Button type="button" variant="secondary" className="w-full">
                    <Phone className="h-4 w-4" /> Call
                  </Button>
                </a>
              )}
            </div>
          ) : null
        }
      >
        {detailQuery.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--ink-muted)]">Status</dt>
              <dd>
                <StatusBadge
                  tone={dTone(
                    selectedDetail?.status || selectedList?.status || selectedPos?.status || '',
                  )}
                >
                  {labelStatus(
                    selectedDetail?.status || selectedList?.status || selectedPos?.status || '—',
                  )}
                </StatusBadge>
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--ink-muted)]">Vehicle</dt>
              <dd>
                {[selectedDetail?.vehicleMake || selectedList?.vehicleMake,
                  selectedDetail?.vehicleModel || selectedList?.vehicleModel]
                  .filter(Boolean)
                  .join(' ') || '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--ink-muted)]">Plate</dt>
              <dd>{selectedDetail?.plateNumber || selectedList?.plateNumber || '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--ink-muted)]">GPS</dt>
              <dd className="font-mono text-xs">
                {selectedPos
                  ? `${selectedPos.lat.toFixed(4)}, ${selectedPos.lng.toFixed(4)}`
                  : '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--ink-muted)]">Last update</dt>
              <dd className="text-xs">
                {selectedPos?.recordedAt
                  ? new Date(selectedPos.recordedAt).toLocaleTimeString()
                  : '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--ink-muted)]">Active job</dt>
              <dd>
                {selectedDetail?.assignments?.[0]
                  ? `${selectedDetail.assignments[0].znCode ?? ''} · ${selectedDetail.assignments[0].clientName ?? ''}`.trim() ||
                    'Assigned'
                  : 'None'}
              </dd>
            </div>
          </dl>
        )}
      </DetailDrawer>
    </PageScaffold>
  );
}
