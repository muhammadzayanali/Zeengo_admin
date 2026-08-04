import { useSyncExternalStore } from 'react';
import * as ops from './store';

/** Reactive access to frontend-only ops demo store (swap for API later). */
export function useOpsVersion() {
  return useSyncExternalStore(ops.subscribeOps, ops.getOpsVersion, ops.getOpsVersion);
}

export function useOpsSnapshot() {
  useOpsVersion();
  return {
    drivers: ops.drivers,
    clients: ops.clients,
    sosAlerts: ops.sosAlerts,
    tasks: ops.tasks,
    editRequests: ops.editRequests,
    vendors: ops.vendors,
    packages: ops.packages,
    staff: ops.staff,
    vendorOrders: ops.vendorOrders,
    channels: ops.channels,
    messages: ops.messages,
    russiaSessions: ops.russiaSessions,
    emailLogs: ops.emailLogs,
    emailTemplates: ops.emailTemplates,
    rbac: ops.rbac,
    aiModels: ops.aiModels,
    apiKeys: ops.apiKeys,
    kpis: ops.computeKpis(),
  };
}

export { ops };
