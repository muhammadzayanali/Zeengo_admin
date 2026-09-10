import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Select, useToast } from '@/shared/ui';
import type { Booking } from '@/shared/api/types';
import { driversApi } from '@/modules/fleet/drivers/services/drivers.api';
import { ApiClientError } from '@/shared/api/client';

type Props = {
  booking: Booking;
  onClose: () => void;
};

export function AssignDriverPanel({ booking, onClose }: Props) {
  const { push } = useToast();
  const qc = useQueryClient();
  const driversQuery = useQuery({
    queryKey: ['drivers', 'assign'],
    queryFn: ({ signal }) => driversApi.list({ limit: 100 }, signal),
  });

  const [driverId, setDriverId] = useState(
    booking.activeDriverAssignment?.driverId ?? '',
  );
  const [loading, setLoading] = useState(false);

  async function handleAssign() {
    if (!driverId) {
      // Unassign if there is an active assignment
      if (booking.activeDriverAssignment?.id) {
        setLoading(true);
        try {
          await driversApi.unassign(booking.activeDriverAssignment.id);
          push({ tone: 'success', title: 'Driver removed' });
          await qc.invalidateQueries({ queryKey: ['bookings', booking.id] });
          await qc.invalidateQueries({ queryKey: ['bookings'] });
          await qc.invalidateQueries({ queryKey: ['operations', 'booking', booking.id] });
          onClose();
        } catch (err) {
          push({
            tone: 'error',
            title: err instanceof ApiClientError ? err.message : 'Could not remove driver',
          });
        } finally {
          setLoading(false);
        }
      } else {
        onClose();
      }
      return;
    }

    setLoading(true);
    try {
      const startDate =
        booking.arrivalDate || new Date().toISOString().slice(0, 10);
      await driversApi.assign({
        bookingId: booking.id,
        driverId,
        startDate,
        endDate: booking.departureDate || undefined,
      });
      push({ tone: 'success', title: 'Driver assigned' });
      await qc.invalidateQueries({ queryKey: ['bookings', booking.id] });
      await qc.invalidateQueries({ queryKey: ['bookings'] });
      await qc.invalidateQueries({ queryKey: ['operations', 'booking', booking.id] });
      onClose();
    } catch (err) {
      push({
        tone: 'error',
        title: err instanceof ApiClientError ? err.message : 'Could not assign driver',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--accent)]/30 bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)] sm:p-5">
      <h3 className="mb-3 text-sm font-semibold text-[var(--ink)]">
        Assign Driver — {booking.client?.fullName ?? booking.znCode}
      </h3>
      <Select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
        <option value="">— Remove driver —</option>
        {(driversQuery.data?.data ?? []).map((d) => (
          <option key={d.id} value={d.id}>
            {d.user.fullName ?? 'Driver'}
            {d.vehicleMake || d.vehicleModel
              ? ` · ${[d.vehicleMake, d.vehicleModel].filter(Boolean).join(' ')}`
              : ''}
            {d.status ? ` · ${d.status}` : ''}
          </option>
        ))}
      </Select>
      <div className="mt-3 flex gap-2">
        <Button loading={loading} onClick={handleAssign}>
          Assign
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
