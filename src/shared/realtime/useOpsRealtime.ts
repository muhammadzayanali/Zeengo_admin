import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { getAccessToken } from '@/shared/api/client';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useToast } from '@/shared/ui';

export function useOpsRealtime() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { push } = useToast();

  useEffect(() => {
    if (!isAuthenticated) return;
    const token = getAccessToken();
    if (!token) return;

    const ns = io('http://localhost:3000/ws', {
      transports: ['websocket', 'polling'],
      auth: { token },
    });

    const invalidate = (queryKey: string[]) => {
      queryClient.invalidateQueries({ queryKey });
    };

    ns.on('payment.created', () => {
      invalidate(['payments']);
      invalidate(['finance']);
      invalidate(['bookings']);
      invalidate(['dashboard']);
    });
    ns.on('payment.updated', () => {
      invalidate(['payments']);
      invalidate(['finance']);
      invalidate(['bookings']);
      invalidate(['dashboard']);
    });
    ns.on('sos.created', () => {
      invalidate(['sos']);
      invalidate(['dashboard']);
      push({ tone: 'error', title: 'New SOS alert' });
    });
    ns.on('message.new', () => invalidate(['chat']));
    ns.on('task.updated', () => {
      invalidate(['tasks']);
      invalidate(['dashboard']);
    });
    ns.on('notification.created', () => invalidate(['notifications']));
    ns.on('notification.new', () => invalidate(['notifications']));

    return () => {
      ns.disconnect();
    };
  }, [isAuthenticated, queryClient, push]);
}
