import { useEffect, useState } from 'react';
import { Phone, Send, Route } from 'lucide-react';
import { ops, useOpsSnapshot } from '@/ops-demo/useOpsStore';
import {
  AnalyticsCard,
  Button,
  DetailDrawer,
  PageScaffold,
  StatusBadge,
  useToast,
  type StatusTone,
} from '@/shared/ui';

function pinColor(status: string) {
  if (status === 'AVAILABLE') return '#22c55e';
  if (status === 'EN_ROUTE') return '#2563eb';
  if (status === 'RESTING') return '#f59e0b';
  return '#6b7280';
}

function dTone(s: string): StatusTone {
  if (s === 'AVAILABLE') return 'success';
  if (s === 'EN_ROUTE') return 'accent';
  if (s === 'RESTING') return 'warning';
  return 'default';
}

/** CSS map placeholder — swap for Google Maps WebGL when VITE_GOOGLE_MAPS_KEY is set */
export function OperationsRoomPage() {
  const snap = useOpsSnapshot();
  const { push } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId ? ops.getDriver(selectedId) : null;

  useEffect(() => {
    const id = window.setInterval(() => ops.nudgeDrivers(), 3000);
    return () => window.clearInterval(id);
  }, []);

  // Normalize lat/lng into % positions around Moscow-ish cluster
  const lats = snap.drivers.map((d) => d.lat);
  const lngs = snap.drivers.map((d) => d.lng);
  const minLat = Math.min(...lats) - 0.01;
  const maxLat = Math.max(...lats) + 0.01;
  const minLng = Math.min(...lngs) - 0.01;
  const maxLng = Math.max(...lngs) + 0.01;

  function pct(lat: number, lng: number) {
    const top = 100 - ((lat - minLat) / (maxLat - minLat || 1)) * 100;
    const left = ((lng - minLng) / (maxLng - minLng || 1)) * 100;
    return { top: `${Math.min(90, Math.max(8, top))}%`, left: `${Math.min(92, Math.max(8, left))}%` };
  }

  return (
    <PageScaffold
      title="Operations Room"
      description="Live tracking command map — GPS pins, routes, and dispatcher overrides (demo map until Google key is configured)."
    >
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
            Map canvas · mock telematics (Google Maps when VITE_GOOGLE_MAPS_KEY set)
          </p>

          {/* mock polylines */}
          <svg className="absolute inset-0 h-full w-full" aria-hidden>
            {snap.drivers
              .filter((d) => d.status === 'EN_ROUTE')
              .map((d) => {
                const p = pct(d.lat, d.lng);
                return (
                  <line
                    key={d.id}
                    x1={p.left}
                    y1={p.top}
                    x2="70%"
                    y2="30%"
                    stroke="#2563eb"
                    strokeWidth="2"
                    strokeDasharray="6 4"
                    opacity="0.7"
                  />
                );
              })}
          </svg>

          {snap.drivers.map((d) => {
            const p = pct(d.lat, d.lng);
            return (
              <button
                key={d.id}
                type="button"
                title={d.name}
                onClick={() => setSelectedId(d.id)}
                className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center transition hover:scale-110"
                style={{ top: p.top, left: p.left }}
              >
                <span
                  className="h-4 w-4 rounded-full border-2 border-white shadow-lg"
                  style={{ background: pinColor(d.status) }}
                />
                <span className="mt-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  {d.name.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>

        <AnalyticsCard title="Fleet list" description="Click a driver for telemetry">
          <div className="space-y-2">
            {snap.drivers.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelectedId(d.id)}
                className="flex w-full items-center justify-between rounded-xl border border-[var(--line)] px-3 py-2 text-start hover:bg-[var(--bg-muted)]"
              >
                <span>
                  <span className="block text-sm font-medium">{d.name}</span>
                  <span className="text-xs text-[var(--ink-muted)]">
                    {d.speedKmh} km/h · ETA {d.etaMin ?? '—'}m
                  </span>
                </span>
                <StatusBadge tone={dTone(d.status)}>{d.status}</StatusBadge>
              </button>
            ))}
          </div>
        </AnalyticsCard>
      </div>

      <DetailDrawer
        open={Boolean(selected)}
        title={selected?.name ?? 'Telemetry'}
        onClose={() => setSelectedId(null)}
        footer={
          selected ? (
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  push({ tone: 'success', title: 'Reroute sent (demo)' });
                }}
              >
                <Route className="h-4 w-4" />
                Reroute around traffic
              </Button>
              <Button
                type="button"
                onClick={() => push({ tone: 'success', title: 'Push alert sent to driver terminal (demo)' })}
              >
                <Send className="h-4 w-4" />
                Push alert to terminal
              </Button>
              <a href={`tel:${selected.phone}`}>
                <Button type="button" variant="secondary" className="w-full">
                  <Phone className="h-4 w-4" /> Call
                </Button>
              </a>
            </div>
          ) : null
        }
      >
        {selected ? (
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-[var(--ink-muted)]">Status</dt><dd><StatusBadge tone={dTone(selected.status)}>{selected.status}</StatusBadge></dd></div>
            <div className="flex justify-between gap-3"><dt className="text-[var(--ink-muted)]">Speed</dt><dd>{selected.speedKmh} km/h</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-[var(--ink-muted)]">ETA</dt><dd>{selected.etaMin ?? '—'} min</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-[var(--ink-muted)]">Traffic delay</dt><dd>{selected.trafficDelay} min</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-[var(--ink-muted)]">Passenger</dt><dd>{selected.passengerName ?? '—'}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-[var(--ink-muted)]">GPS</dt><dd className="font-mono text-xs">{selected.lat.toFixed(4)}, {selected.lng.toFixed(4)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-[var(--ink-muted)]">Assignment</dt><dd>{selected.assignmentId ?? '—'}</dd></div>
          </dl>
        ) : null}
      </DetailDrawer>
    </PageScaffold>
  );
}
