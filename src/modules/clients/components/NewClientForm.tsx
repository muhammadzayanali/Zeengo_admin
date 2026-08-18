import { FormEvent, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Input, Label, Select, Textarea, Skeleton } from '@/shared/ui';
import { packagesApi } from '@/modules/finance/packages/services/packages.api';
import { bookingsApi } from '@/modules/clients/bookings/services/bookings.api';
import { ApiClientError } from '@/shared/api/client';

type Props = {
  onCancel: () => void;
  onCreated: (bookingId: string) => void;
};

export function NewClientForm({ onCancel, onCreated }: Props) {
  const packagesQuery = useQuery({
    queryKey: ['packages'],
    queryFn: ({ signal }) => packagesApi.list(signal),
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [packageId, setPackageId] = useState('');
  const [totalAmount, setTotalAmount] = useState('');

  function handlePackageChange(id: string) {
    setPackageId(id);
    const pkg = packagesQuery.data?.find((p) => p.id === id);
    if (pkg) {
      setTotalAmount(String(pkg.pricePerPerson));
    } else {
      setTotalAmount('');
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const fullName = String(form.get('fullName') || '').trim();
    const phone = String(form.get('phone') || '').trim();
    if (!fullName || !phone) {
      setError('Full name and phone are required.');
      return;
    }
    if (!packageId) {
      setError('Please select a package.');
      return;
    }
    const arrivalDate = String(form.get('tripStart') || '');
    const departureDate = String(form.get('tripEnd') || '');
    if (!arrivalDate || !departureDate) {
      setError('Arrival and departure dates are required.');
      return;
    }

    setSubmitting(true);
    try {
      const booking = await bookingsApi.create({
        client: {
          fullName,
          phone,
          email: String(form.get('email') || '').trim() || undefined,
          nationality: String(form.get('nationality') || '').trim() || undefined,
        },
        packageId,
        partySize: Number(form.get('partySize') || 1),
        arrivalDate,
        departureDate,
        totalAmount: Number(totalAmount || 0),
        internalNotes: String(form.get('notes') || '').trim() || undefined,
      });
      onCreated(booking.id);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'Could not create client booking. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-2xl rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow)] sm:p-8"
    >
      <div className="mb-6 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
            <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[var(--ink)]">New Client Booking</h2>
          <p className="text-sm text-[var(--ink-muted)]">
            Saves client + booking to the database. ZN#### is auto-generated.
          </p>
        </div>
      </div>

      <section className="space-y-4 border-b border-[var(--line)] pb-6">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
          Client Information
        </h3>
        <div>
          <Label htmlFor="fullName">Full Name *</Label>
          <Input
            id="fullName"
            name="fullName"
            required
            placeholder="e.g. Mohammed Al-Rashidi"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="phone">Phone *</Label>
            <Input id="phone" name="phone" required placeholder="+966 5..." />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="client@email.com" />
          </div>
          <div>
            <Label htmlFor="nationality">Nationality</Label>
            <Input id="nationality" name="nationality" placeholder="Saudi Arabia" />
          </div>
          <div>
            <Label htmlFor="partySize">Party Size</Label>
            <Input id="partySize" name="partySize" type="number" min={1} defaultValue={1} />
          </div>
        </div>
      </section>

      <section className="mt-6 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
          Trip Details
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="tripStart">Arrival Date *</Label>
            <Input id="tripStart" name="tripStart" type="date" required />
          </div>
          <div>
            <Label htmlFor="tripEnd">Departure Date *</Label>
            <Input id="tripEnd" name="tripEnd" type="date" required />
          </div>
        </div>
        <div>
          <Label htmlFor="packageId">Package *</Label>
          {packagesQuery.isLoading ? (
            <Skeleton className="h-11 w-full" />
          ) : packagesQuery.isError ? (
            <p className="text-sm text-[var(--danger)]">
              Could not load packages. Check API / seed data.
            </p>
          ) : (
            <Select
              id="packageId"
              name="packageId"
              value={packageId}
              onChange={(e) => handlePackageChange(e.target.value)}
              required
            >
              <option value="" disabled>
                Select package...
              </option>
              {(packagesQuery.data ?? []).map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name} · ${Number(pkg.pricePerPerson).toLocaleString()}
                </option>
              ))}
            </Select>
          )}
        </div>
        <div>
          <Label htmlFor="totalAmount">Total Amount (USD)</Label>
          <Input
            id="totalAmount"
            name="totalAmount"
            type="number"
            min={0}
            step="0.01"
            placeholder="0.00"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="notes">Internal Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder="Any special requests or notes..."
          />
        </div>
      </section>

      {error ? <p className="mt-4 text-sm text-[var(--danger)]">{error}</p> : null}

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-5">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting} className="min-w-[200px] flex-1 sm:flex-none">
          + Create Client Booking
        </Button>
      </div>
    </form>
  );
}
