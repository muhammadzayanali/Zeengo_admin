import { FormEvent, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { clientPortalApi } from '@/modules/fleet/catalog/services/clientPortal.api';
import { Button, EmptyState, ErrorState, Input, Label, Skeleton, StatusBadge } from '@/shared/ui';
import { formatMoney } from '@/shared/lib/cn';
import { ApiClientError, clearTokens, setTokens, getAccessToken } from '@/shared/api/client';

const CLIENT_SESSION_KEY = 'zeengo_client_session';

function saveClientSession(payload: { znCode: string; fullName: string }) {
  sessionStorage.setItem(CLIENT_SESSION_KEY, JSON.stringify(payload));
}

function readClientSession(): { znCode: string; fullName: string } | null {
  try {
    const raw = sessionStorage.getItem(CLIENT_SESSION_KEY);
    return raw ? (JSON.parse(raw) as { znCode: string; fullName: string }) : null;
  } catch {
    return null;
  }
}

function clearClientSession() {
  sessionStorage.removeItem(CLIENT_SESSION_KEY);
  clearTokens();
}

function ClientShell({ children }: { children: React.ReactNode }) {
  const session = readClientSession();
  const navigate = useNavigate();
  if (!getAccessToken() || !session) return <Navigate to="/client/login" replace />;

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-[var(--bg)] px-4 pb-20 pt-4 text-[var(--ink)]">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--ink-muted)]">Zeengo</p>
          <h1 className="text-lg font-semibold">{session.fullName}</h1>
          <p className="font-mono text-xs text-[var(--ink-muted)]">{session.znCode}</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            clearClientSession();
            navigate('/client/login');
          }}
        >
          Exit
        </Button>
      </header>
      <nav className="mb-4 flex gap-2 text-sm">
        <Link className="rounded-lg border border-[var(--line)] px-3 py-1.5" to="/client">
          Home
        </Link>
        <Link className="rounded-lg border border-[var(--line)] px-3 py-1.5" to="/client/program">
          Program
        </Link>
      </nav>
      {children}
    </div>
  );
}

function ClientLoginPage() {
  const navigate = useNavigate();
  const [znCode, setZnCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await clientPortalApi.znLogin(znCode.trim());
      setTokens(res.accessToken, res.refreshToken);
      saveClientSession({ znCode: res.znCode, fullName: res.user.fullName });
      navigate('/client');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <h1 className="mb-1 text-2xl font-semibold">Zeengo Client</h1>
      <p className="mb-6 text-sm text-[var(--ink-muted)]">Enter your booking code (ZN####)</p>
      <form className="space-y-3" onSubmit={onSubmit}>
        <div>
          <Label>Booking code</Label>
          <Input
            value={znCode}
            onChange={(e) => setZnCode(e.target.value)}
            placeholder="ZN0001"
            autoCapitalize="characters"
          />
        </div>
        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
        <Button type="submit" disabled={!znCode.trim() || loading} className="w-full">
          Open trip
        </Button>
      </form>
    </div>
  );
}

function ClientHomePage() {
  const homeQuery = useQuery({
    queryKey: ['client', 'home'],
    queryFn: ({ signal }) => clientPortalApi.home(signal),
  });

  if (homeQuery.isLoading) return <Skeleton className="h-48 w-full" />;
  if (homeQuery.isError) {
    return <ErrorState title="Could not load trip" onRetry={() => void homeQuery.refetch()} />;
  }
  const home = homeQuery.data!;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
        <p className="text-xs text-[var(--ink-muted)]">{home.packageName || 'Trip'}</p>
        <p className="mt-1 text-sm">
          {home.arrivalDate || '—'} → {home.departureDate || '—'}
        </p>
        <p className="mt-3 text-lg font-semibold">Due {formatMoney(home.balance.due)}</p>
        <p className="text-xs text-[var(--ink-muted)]">
          Paid {formatMoney(home.balance.paid)} of {formatMoney(home.balance.total)}
        </p>
      </section>

      {home.driver ? (
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
          <h2 className="text-sm font-semibold">Your driver</h2>
          <p className="mt-1">{home.driver.name}</p>
          <p className="text-sm text-[var(--ink-muted)]">
            {[home.driver.vehicle, home.driver.phone].filter(Boolean).join(' · ')}
          </p>
        </section>
      ) : null}

      <section className="rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
        <h2 className="mb-2 text-sm font-semibold">Today</h2>
        {!home.todayProgram.length ? (
          <EmptyState title="No activities today" />
        ) : (
          <div className="space-y-2">
            {home.todayProgram.map((a) => (
              <div key={a.id} className="rounded-xl bg-[var(--bg-muted)] px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">
                    {a.startTime ? `${a.startTime.slice(0, 5)} · ` : ''}
                    {a.title}
                  </p>
                  <StatusBadge tone={a.status === 'done' ? 'success' : 'warning'}>
                    {a.status}
                  </StatusBadge>
                </div>
                <p className="text-xs text-[var(--ink-muted)]">{a.locationName || a.meetingPoint}</p>
                {a.pdfUrl ? (
                  <a className="text-xs text-[var(--accent)] underline" href={a.pdfUrl} target="_blank" rel="noreferrer">
                    Ticket PDF
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ClientProgramPage() {
  const query = useQuery({
    queryKey: ['client', 'itinerary'],
    queryFn: ({ signal }) => clientPortalApi.itinerary(signal),
  });

  if (query.isLoading) return <Skeleton className="h-48 w-full" />;
  if (query.isError) {
    return <ErrorState title="Could not load program" onRetry={() => void query.refetch()} />;
  }
  const data = query.data!;

  return (
    <div className="space-y-4">
      {data.days.map((day) => (
        <section key={day.dayNumber} className="rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">
              Day {day.dayNumber}
              {day.planDate ? ` · ${day.planDate}` : ''}
            </h2>
          </div>
          {day.carPlan ? (
            <p className="mb-2 text-xs text-[var(--ink-muted)]">Car: {day.carPlan}</p>
          ) : null}
          <div className="space-y-2">
            {day.activities.map((a) => (
              <div key={a.id} className="rounded-xl bg-[var(--bg-muted)] px-3 py-2">
                <p className="font-medium">
                  {a.startTime ? `${a.startTime.slice(0, 5)} · ` : ''}
                  {a.title}
                </p>
                <p className="text-xs text-[var(--ink-muted)]">
                  {[a.locationName, a.vendorName, a.meetingPoint].filter(Boolean).join(' · ')}
                </p>
                {a.pdfUrl ? (
                  <a className="text-xs text-[var(--accent)] underline" href={a.pdfUrl} target="_blank" rel="noreferrer">
                    Ticket PDF
                  </a>
                ) : null}
                <details className="mt-1 text-xs text-[var(--ink-muted)]">
                  <summary>QR payload</summary>
                  <code className="break-all">{a.qrPayload}</code>
                </details>
              </div>
            ))}
          </div>
        </section>
      ))}
      {!data.days.length ? <EmptyState title="No program yet" /> : null}
    </div>
  );
}

export function ClientAppRoutes() {
  return (
    <Routes>
      <Route path="login" element={<ClientLoginPage />} />
      <Route
        path="/"
        element={
          <ClientShell>
            <ClientHomePage />
          </ClientShell>
        }
      />
      <Route
        path="program"
        element={
          <ClientShell>
            <ClientProgramPage />
          </ClientShell>
        }
      />
      <Route path="*" element={<Navigate to="/client" replace />} />
    </Routes>
  );
}
