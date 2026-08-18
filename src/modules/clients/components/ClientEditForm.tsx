import { FormEvent, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Label, Select, useToast } from '@/shared/ui';
import type { Booking } from '@/shared/api/types';
import { packagesApi } from '@/modules/finance/packages/services/packages.api';
import { driversApi } from '@/modules/fleet/drivers/services/drivers.api';
import { bookingsApi } from '@/modules/clients/bookings/services/bookings.api';
import { clientsApi } from '@/modules/clients/services/clients.api';
import { ApiClientError } from '@/shared/api/client';

type Props = {
  booking: Booking;
  onCancel: () => void;
  onSaved: () => void;
};

export function ClientEditForm({ booking, onCancel, onSaved }: Props) {
  const { push } = useToast();
  const qc = useQueryClient();
  const packagesQuery = useQuery({
    queryKey: ['packages'],
    queryFn: ({ signal }) => packagesApi.list(signal),
  });
  const driversQuery = useQuery({
    queryKey: ['drivers', 'edit'],
    queryFn: ({ signal }) => driversApi.list({ limit: 100 }, signal),
  });

  const [loading, setLoading] = useState(false);
  const [packageId, setPackageId] = useState(booking.packageId || '');
  const [totalAmount, setTotalAmount] = useState(String(booking.totalAmount));
  const [driverId, setDriverId] = useState(
    booking.activeDriverAssignment?.driverId ?? '',
  );

  function handlePackageChange(id: string) {
    setPackageId(id);
    const pkg = packagesQuery.data?.find((p) => p.id === id);
    if (pkg) setTotalAmount(String(pkg.pricePerPerson));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    try {
      await clientsApi.update(booking.clientId, {
        fullName: String(form.get('fullName') || ''),
        phone: String(form.get('phone') || ''),
        email: String(form.get('email') || '') || null,
        nationality: String(form.get('nationality') || '') || null,
      });

      await bookingsApi.update(booking.id, {
        partySize: Number(form.get('partySize') || 1),
        arrivalDate: String(form.get('tripStart') || '') || undefined,
        departureDate: String(form.get('tripEnd') || '') || undefined,
        packageId: packageId || undefined,
        totalAmount: Number(totalAmount || 0),
        status: String(form.get('status') || 'active'),
      });

      if (driverId && driverId !== booking.activeDriverAssignment?.driverId) {
        await driversApi.assign({
          bookingId: booking.id,
          driverId,
          startDate:
            String(form.get('tripStart') || booking.arrivalDate) ||
            new Date().toISOString().slice(0, 10),
          endDate:
            String(form.get('tripEnd') || booking.departureDate) || undefined,
        });
      } else if (!driverId && booking.activeDriverAssignment?.id) {
        await driversApi.unassign(booking.activeDriverAssignment.id);
      }

      push({ tone: 'success', title: 'Profile saved' });
      await qc.invalidateQueries({ queryKey: ['bookings', booking.id] });
      await qc.invalidateQueries({ queryKey: ['bookings'] });
      onSaved();
    } catch (err) {
      push({
        tone: 'error',
        title: err instanceof ApiClientError ? err.message : 'Could not save profile',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)] sm:p-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
          Contact
        </h3>
        <div className="space-y-3">
          <div>
            <Label htmlFor="edit-fullName">Full Name</Label>
            <Input
              id="edit-fullName"
              name="fullName"
              defaultValue={booking.client?.fullName ?? ''}
              required
            />
          </div>
          <div>
            <Label htmlFor="edit-phone">Phone</Label>
            <Input
              id="edit-phone"
              name="phone"
              defaultValue={booking.client?.phone ?? ''}
              required
            />
          </div>
          <div>
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              name="email"
              type="email"
              defaultValue={booking.client?.email ?? ''}
            />
          </div>
          <div>
            <Label htmlFor="edit-nationality">Nationality</Label>
            <Input
              id="edit-nationality"
              name="nationality"
              defaultValue={booking.client?.nationality ?? ''}
            />
          </div>
          <div>
            <Label htmlFor="edit-partySize">Party Size</Label>
            <Input
              id="edit-partySize"
              name="partySize"
              type="number"
              min={1}
              defaultValue={booking.partySize}
              className="max-w-[120px]"
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)] sm:p-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
          Trip Details
        </h3>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="edit-tripStart">Arrival</Label>
              <Input
                id="edit-tripStart"
                name="tripStart"
                type="date"
                defaultValue={booking.arrivalDate ?? ''}
              />
            </div>
            <div>
              <Label htmlFor="edit-tripEnd">Departure</Label>
              <Input
                id="edit-tripEnd"
                name="tripEnd"
                type="date"
                defaultValue={booking.departureDate ?? ''}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="edit-packageId">Package</Label>
            <Select
              id="edit-packageId"
              value={packageId}
              onChange={(e) => handlePackageChange(e.target.value)}
            >
              <option value="">— None —</option>
              {(packagesQuery.data ?? []).map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name} · ${Number(pkg.pricePerPerson).toLocaleString()}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="edit-status">Status</Label>
            <Select id="edit-status" name="status" defaultValue={booking.status}>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="edit-driverId">Driver</Label>
            <Select
              id="edit-driverId"
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
            >
              <option value="">— No driver —</option>
              {(driversQuery.data?.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.user.fullName ?? d.id}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="edit-totalAmount">Total ($)</Label>
            <Input
              id="edit-totalAmount"
              type="number"
              min={0}
              step="0.01"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
            />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2 lg:col-span-2">
        <Button type="submit" loading={loading}>
          Save
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
