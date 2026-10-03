import { apiList, toQuery } from '@/shared/api/client';

export type AuditLogRow = {
  id: string;
  actorType: string;
  actorId: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  createdAt: string;
  diff: unknown;
};

export const auditLogsApi = {
  list(
    params?: Record<string, string | number | undefined>,
    signal?: AbortSignal,
  ) {
    return apiList<AuditLogRow>(
      { url: '/audit-logs', params: toQuery(params) },
      signal,
    );
  },
};
