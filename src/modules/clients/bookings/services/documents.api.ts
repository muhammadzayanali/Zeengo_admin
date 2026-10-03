import { apiRequest, getAccessToken, http } from '@/shared/api/client';

export type BookingDocument = {
  id: string;
  bookingId: string;
  clientId: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  category: string;
  description: string | null;
  customerVisible: boolean;
  createdAt: string;
  uploadedBy: string | null;
  uploadedByName: string | null;
};

export const DOCUMENT_CATEGORIES = [
  'itinerary',
  'voucher',
  'receipt',
  'booking_document',
  'client_document',
  'hotel_confirmation',
  'transfer_document',
  'payment_receipt',
  'other',
] as const;

export const documentsApi = {
  list(bookingId: string, signal?: AbortSignal) {
    return apiRequest<BookingDocument[]>(
      { url: `/bookings/${bookingId}/documents` },
      signal,
    );
  },
  async upload(
    bookingId: string,
    file: File,
    fields: { category: string; description?: string; customerVisible: boolean },
  ) {
    const form = new FormData();
    form.append('file', file);
    form.append('category', fields.category);
    if (fields.description) form.append('description', fields.description);
    form.append('customerVisible', fields.customerVisible ? 'true' : 'false');
    return apiRequest<BookingDocument>({
      method: 'POST',
      url: `/bookings/${bookingId}/documents`,
      data: form,
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  remove(id: string) {
    return apiRequest<{ deleted: boolean }>({ method: 'DELETE', url: `/documents/${id}` });
  },
  async download(id: string, filename: string) {
    const token = getAccessToken();
    const res = await http.get<Blob>(`/documents/${id}/download`, {
      responseType: 'blob',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
};
