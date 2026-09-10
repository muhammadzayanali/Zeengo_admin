import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  DialogShell,
  Input,
  Label,
  Select,
  useToast,
} from '@/shared/ui';
import { ApiClientError } from '@/shared/api/client';
import { vendorsApi } from '@/modules/fleet/vendors/services/vendors.api';

type Props = {
  bookingId: string;
  vendorType: string;
  title: string;
  open: boolean;
  onClose: () => void;
};

export function BookingAttachVendorDialog({
  bookingId,
  vendorType,
  title,
  open,
  onClose,
}: Props) {
  const { push } = useToast();
  const qc = useQueryClient();
  const [vendorId, setVendorId] = useState('');
  const [serviceDate, setServiceDate] = useState('');
  const [details, setDetails] = useState('');

  const vendors = useQuery({
    queryKey: ['vendors', 'attach', vendorType],
    queryFn: ({ signal }) =>
      vendorsApi.list({ type: vendorType, isActive: true, limit: 100 }, signal),
    enabled: open,
  });

  const assign = useMutation({
    mutationFn: () =>
      vendorsApi.assign(vendorId, {
        bookingId,
        serviceDate: serviceDate || undefined,
        details: details.trim() || undefined,
        appendItinerary: true,
      }),
    onSuccess: async () => {
      push({ tone: 'success', title: `${title} attached` });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['bookings', bookingId] }),
        qc.invalidateQueries({ queryKey: ['operations', 'booking', bookingId] }),
        qc.invalidateQueries({ queryKey: ['vendors'] }),
      ]);
      setVendorId('');
      setServiceDate('');
      setDetails('');
      onClose();
    },
    onError: (e) =>
      push({
        tone: 'error',
        title: e instanceof ApiClientError ? e.message : 'Could not attach',
      }),
  });

  return (
    <DialogShell open={open} title={title} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <Label>Select from catalog</Label>
          <Select
            value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}
            className="mt-1 w-full"
          >
            <option value="">Choose…</option>
            {(vendors.data?.data ?? []).map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
                {v.city ? ` · ${v.city}` : ''}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Service date</Label>
          <Input
            type="date"
            className="mt-1"
            value={serviceDate}
            onChange={(e) => setServiceDate(e.target.value)}
          />
        </div>
        <div>
          <Label>Details</Label>
          <Input
            className="mt-1"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Optional notes / reference"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!vendorId}
            loading={assign.isPending}
            onClick={() => assign.mutate()}
          >
            Attach
          </Button>
        </div>
      </div>
    </DialogShell>
  );
}
