import { useState } from 'react';
import { ops, useOpsSnapshot } from '@/ops-demo/useOpsStore';
import type { OpsStaff } from '@/ops-demo/store';
import {
  Button,
  DialogShell,
  Input,
  Label,
  PageScaffold,
  Select,
  StatusBadge,
  useToast,
} from '@/shared/ui';

export function UsersPage() {
  const snap = useOpsSnapshot();
  const { push } = useToast();
  const [edit, setEdit] = useState<OpsStaff | null>(null);
  const blank: OpsStaff = {
    id: '',
    name: '',
    email: '',
    phone: '',
    role: 'Support',
    status: 'active',
    lastLogin: '—',
  };

  return (
    <PageScaffold
      title="User Management"
      description="Staff directory — roles, status, last login, onboarding."
      primaryAction={
        <Button type="button" onClick={() => setEdit({ ...blank, id: `st_${Date.now()}` })}>
          + Add Staff
        </Button>
      }
    >
      <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-[var(--bg-muted)] text-xs font-medium uppercase text-[var(--ink-muted)]">
              <tr>
                <th className="px-4 py-3 text-start">Name</th>
                <th className="px-4 py-3 text-start">Email</th>
                <th className="px-4 py-3 text-start">Role</th>
                <th className="px-4 py-3 text-start">Status</th>
                <th className="px-4 py-3 text-start">Last login</th>
                <th className="px-4 py-3 text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {snap.staff.map((s) => (
                <tr key={s.id} className="border-t border-[var(--line)] hover:bg-[var(--bg-muted)]/70">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3">{s.email}</td>
                  <td className="px-4 py-3"><StatusBadge>{s.role}</StatusBadge></td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={s.status === 'active' ? 'success' : 'default'}>{s.status}</StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-[var(--ink-muted)]">{s.lastLogin}</td>
                  <td className="px-4 py-3 text-end">
                    <Button type="button" variant="ghost" onClick={() => setEdit({ ...s })}>
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <DialogShell open={Boolean(edit)} title={edit?.name ? 'Edit staff' : 'Add staff'} onClose={() => setEdit(null)}>
        {edit ? (
          <div className="space-y-3">
            <div>
              <Label>Full name</Label>
              <Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value })}>
                <option>Admin</option>
                <option>Ops Mgr</option>
                <option>Support</option>
                <option>Driver</option>
                <option>Splizer</option>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={edit.status}
                onChange={(e) => setEdit({ ...edit, status: e.target.value as 'active' | 'inactive' })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>
            <Button
              type="button"
              className="w-full"
              onClick={async () => {
                await ops.saveStaff(edit);
                push({ tone: 'success', title: 'Staff saved — credentials email (demo)' });
                setEdit(null);
              }}
            >
              Save
            </Button>
          </div>
        ) : null}
      </DialogShell>
    </PageScaffold>
  );
}
