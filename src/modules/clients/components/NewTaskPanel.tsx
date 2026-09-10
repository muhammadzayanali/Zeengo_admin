import { FormEvent, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Select, useToast } from '@/shared/ui';
import type { Booking } from '@/shared/api/types';
import { tasksApi } from '@/modules/command/tasks/services/tasks.api';
import { usersApi } from '@/modules/admin/users/services/users.api';
import { ApiClientError } from '@/shared/api/client';

type Props = {
  booking: Booking;
  onClose: () => void;
};

export function NewTaskPanel({ booking, onClose }: Props) {
  const { push } = useToast();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const staff = useQuery({
    queryKey: ['users', 'task-assignees'],
    queryFn: ({ signal }) => usersApi.list(undefined, signal),
  });

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const title = String(form.get('title') || '').trim();
    if (!title) return;
    setLoading(true);
    try {
      const assigneeId = String(form.get('assigneeId') || '');
      await tasksApi.create({
        title,
        priority: String(form.get('priority') || 'normal'),
        bookingId: booking.id,
        dueDate: String(form.get('dueDate') || '') || undefined,
        assigneeId: assigneeId || undefined,
      });
      push({ tone: 'success', title: 'Task created' });
      await qc.invalidateQueries({ queryKey: ['tasks', booking.id] });
      await qc.invalidateQueries({ queryKey: ['tasks'] });
      await qc.invalidateQueries({ queryKey: ['bookings', booking.id] });
      await qc.invalidateQueries({ queryKey: ['operations', 'booking', booking.id] });
      onClose();
    } catch (err) {
      push({
        tone: 'error',
        title: err instanceof ApiClientError ? err.message : 'Could not create task',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-amber-300/50 bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)] sm:p-5"
    >
      <h3 className="mb-3 text-sm font-semibold text-amber-700">
        New Task — {booking.client?.fullName ?? booking.znCode}
      </h3>
      <div className="space-y-3">
        <Input name="title" placeholder="Task description..." required />
        <div className="grid gap-3 sm:grid-cols-2">
          <Select name="priority" defaultValue="normal">
            <option value="normal">Normal</option>
            <option value="urgent">Urgent</option>
          </Select>
          <Input name="dueDate" type="date" />
        </div>
        <Select name="assigneeId" defaultValue="">
          <option value="">Unassigned</option>
          {(staff.data ?? []).map((u) => (
            <option key={u.id} value={u.id}>
              {u.fullName} · {u.role}
            </option>
          ))}
        </Select>
      </div>
      <div className="mt-3 flex gap-2">
        <Button type="submit" loading={loading}>
          Create Task
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
