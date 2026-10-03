import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { documentsApi, DOCUMENT_CATEGORIES } from '../services/documents.api';
import {
  Button,
  EmptyState,
  ErrorState,
  Input,
  Label,
  Select,
  Skeleton,
  useToast,
} from '@/shared/ui';
import { ApiClientError } from '@/shared/api/client';
import { formatDate } from '@/shared/lib/cn';

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function categoryLabel(value: string) {
  return value.replace(/_/g, ' ');
}

export function BookingDocumentsPanel({ bookingId }: { bookingId: string }) {
  const { push } = useToast();
  const qc = useQueryClient();
  const [category, setCategory] = useState('booking_document');
  const [description, setDescription] = useState('');
  const [customerVisible, setCustomerVisible] = useState(true);
  const [file, setFile] = useState<File | null>(null);

  const list = useQuery({
    queryKey: ['bookings', bookingId, 'documents'],
    queryFn: ({ signal }) => documentsApi.list(bookingId, signal),
    enabled: Boolean(bookingId),
  });

  const upload = useMutation({
    mutationFn: () => {
      if (!file) throw new Error('Choose a file');
      return documentsApi.upload(bookingId, file, {
        category,
        description: description || undefined,
        customerVisible,
      });
    },
    onSuccess: async () => {
      setFile(null);
      setDescription('');
      push({ tone: 'success', title: 'Document uploaded' });
      await qc.invalidateQueries({ queryKey: ['bookings', bookingId, 'documents'] });
      await qc.invalidateQueries({ queryKey: ['bookings', bookingId, 'history'] });
    },
    onError: (e) =>
      push({
        tone: 'error',
        title: e instanceof ApiClientError ? e.message : 'Could not upload document',
      }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => documentsApi.remove(id),
    onSuccess: async () => {
      push({ tone: 'success', title: 'Document removed' });
      await qc.invalidateQueries({ queryKey: ['bookings', bookingId, 'documents'] });
    },
    onError: (e) =>
      push({
        tone: 'error',
        title: e instanceof ApiClientError ? e.message : 'Could not delete document',
      }),
  });

  return (
    <div className="space-y-5">
      <form
        className="grid gap-3 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-muted)] p-4 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          upload.mutate();
        }}
      >
        <div className="md:col-span-2">
          <Label htmlFor="doc-file">File</Label>
          <Input
            id="doc-file"
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <p className="mt-1 text-xs text-[var(--ink-muted)]">
            PDF, images, Word, Excel, CSV, or text · max 15 MB
          </p>
        </div>
        <div>
          <Label htmlFor="doc-cat">Category</Label>
          <Select
            id="doc-cat"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {DOCUMENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {categoryLabel(c)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="doc-desc">Note</Label>
          <Input
            id="doc-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
          />
        </div>
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input
            type="checkbox"
            checked={customerVisible}
            onChange={(e) => setCustomerVisible(e.target.checked)}
          />
          Visible on customer My Trip
        </label>
        <div>
          <Button type="submit" disabled={!file || upload.isPending}>
            {upload.isPending ? 'Uploading…' : 'Upload'}
          </Button>
        </div>
      </form>

      {list.isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : list.isError ? (
        <ErrorState title="Could not load documents" onRetry={() => void list.refetch()} />
      ) : !list.data?.length ? (
        <EmptyState
          title="No documents yet"
          description="Upload vouchers, confirmations, or receipts for this booking."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-xs uppercase text-[var(--ink-muted)]">
              <tr>
                <th className="px-2 py-2 text-start">File</th>
                <th className="px-2 py-2 text-start">Category</th>
                <th className="px-2 py-2 text-start">Size</th>
                <th className="px-2 py-2 text-start">Uploaded</th>
                <th className="px-2 py-2 text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.data.map((doc) => (
                <tr key={doc.id} className="border-t border-[var(--line)]">
                  <td className="px-2 py-2">
                    <p className="font-medium">{doc.originalName}</p>
                    <p className="text-xs text-[var(--ink-muted)]">
                      {doc.uploadedByName ?? 'Staff'}
                      {doc.customerVisible ? ' · customer can see' : ' · internal'}
                    </p>
                  </td>
                  <td className="px-2 py-2 capitalize">{categoryLabel(doc.category)}</td>
                  <td className="px-2 py-2">{formatBytes(doc.size)}</td>
                  <td className="px-2 py-2">{formatDate(doc.createdAt)}</td>
                  <td className="px-2 py-2 text-end">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => void documentsApi.download(doc.id, doc.originalName)}
                      >
                        Download
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => remove.mutate(doc.id)}
                        disabled={remove.isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
