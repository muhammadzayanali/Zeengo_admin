import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Button, PageScaffold, StatusBadge, useToast } from '@/shared/ui';
import {
  masterDataApi,
  type ImportPreviewResult,
} from '../services/masterData.api';

function actionTone(action: string) {
  if (action === 'create') return 'success' as const;
  if (action === 'update') return 'accent' as const;
  if (action === 'invalid') return 'danger' as const;
  return 'default' as const;
}

export function MasterDataImportPage() {
  const { push } = useToast();
  const qc = useQueryClient();
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [rowFilter, setRowFilter] = useState<
    'all' | 'create' | 'update' | 'invalid' | 'unchanged'
  >('all');

  const historyQ = useQuery({
    queryKey: ['master-data', 'imports'],
    queryFn: () => masterDataApi.listImports(),
  });

  const previewM = useMutation({
    mutationFn: (file: File) => masterDataApi.preview(file),
    onSuccess: (data) => {
      setPreview(data);
      setRowFilter('all');
      push({ tone: 'success', title: 'Import preview ready' });
      void qc.invalidateQueries({ queryKey: ['master-data', 'imports'] });
    },
    onError: (err: Error) =>
      push({ tone: 'error', title: err.message || 'Preview failed' }),
  });

  const commitM = useMutation({
    mutationFn: (id: string) => masterDataApi.commit(id),
    onSuccess: (data) => {
      push({
        tone: 'success',
        title: `Import committed · +${data.report.created ?? 0} / ~${data.report.updated ?? 0}`,
      });
      setPreview(null);
      void qc.invalidateQueries({ queryKey: ['master-data', 'imports'] });
      void qc.invalidateQueries({ queryKey: ['vendors'] });
    },
    onError: (err: Error) =>
      push({ tone: 'error', title: err.message || 'Commit failed' }),
  });

  const sampleRows = useMemo(() => {
    if (!preview?.sheets) return [];
    const flat = preview.sheets.flatMap((s) =>
      (s.rows ?? []).map((r) => ({ ...r, sheet: s.sheet })),
    );
    if (rowFilter === 'all') return flat.slice(0, 80);
    return flat.filter((r) => r.action === rowFilter).slice(0, 80);
  }, [preview, rowFilter]);

  return (
    <PageScaffold
      title="Excel / Master data import"
      description="Upload kitchen JSON or Excel → validate preview → confirm upsert into Vendor catalog. Idempotent on name + type + city."
    >
      <div className="space-y-4">
        <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
          <p className="text-sm font-semibold">1. Upload workbook</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Preferred: <code>kitchen-seed.json</code> from the export script.
            Also accepts <code>.xlsx</code> / <code>.xls</code>. Max 25MB.
            Admin / Ops Manager only — commit never runs without confirmation.
          </p>
          <input
            className="mt-3 block w-full text-sm"
            type="file"
            accept=".xlsx,.xls,.json,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) previewM.mutate(file);
              e.target.value = '';
            }}
          />
          {previewM.isPending ? (
            <p className="mt-2 text-sm text-[var(--muted)]">Validating…</p>
          ) : null}
        </div>

        {preview ? (
          <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">2. Preview — {preview.filename}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  New {preview.summary.totals.create} · Updated{' '}
                  {preview.summary.totals.update} · Unchanged{' '}
                  {preview.summary.totals.unchanged} · Invalid{' '}
                  {preview.summary.totals.invalid}
                </p>
              </div>
              <Button
                type="button"
                disabled={
                  commitM.isPending || preview.summary.totals.create + preview.summary.totals.update === 0
                }
                onClick={() => {
                  if (
                    !window.confirm(
                      `Commit this import?\n\nNew: ${preview.summary.totals.create}\nUpdated: ${preview.summary.totals.update}\nUnchanged: ${preview.summary.totals.unchanged}\nInvalid skipped: ${preview.summary.totals.invalid}`,
                    )
                  ) {
                    return;
                  }
                  commitM.mutate(preview.id);
                }}
              >
                {commitM.isPending ? 'Importing…' : 'Confirm import'}
              </Button>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-[var(--bg-muted)] text-xs uppercase text-[var(--ink-muted)]">
                  <tr>
                    <th className="px-3 py-2 text-start">Sheet / type</th>
                    <th className="px-3 py-2 text-end">New</th>
                    <th className="px-3 py-2 text-end">Updated</th>
                    <th className="px-3 py-2 text-end">Unchanged</th>
                    <th className="px-3 py-2 text-end">Invalid</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.summary.sheets.map((s) => (
                    <tr key={s.sheet} className="border-t border-[var(--line)]">
                      <td className="px-3 py-2 font-medium">{s.sheet}</td>
                      <td className="px-3 py-2 text-end">{s.create}</td>
                      <td className="px-3 py-2 text-end">{s.update}</td>
                      <td className="px-3 py-2 text-end">{s.unchanged}</td>
                      <td className="px-3 py-2 text-end">{s.invalid}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">Row review (sample)</p>
                <div className="flex flex-wrap gap-1">
                  {(
                    ['all', 'create', 'update', 'invalid', 'unchanged'] as const
                  ).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setRowFilter(f)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${
                        rowFilter === f
                          ? 'bg-[var(--accent)] text-white'
                          : 'bg-[var(--bg-muted)] text-[var(--ink-muted)]'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              {sampleRows.length === 0 ? (
                <p className="mt-2 text-sm text-[var(--muted)]">
                  No rows in this filter.
                </p>
              ) : (
                <div className="mt-2 max-h-80 overflow-auto rounded-xl border border-[var(--line)]">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className="sticky top-0 bg-[var(--bg-muted)] text-xs uppercase text-[var(--ink-muted)]">
                      <tr>
                        <th className="px-3 py-2 text-start">Action</th>
                        <th className="px-3 py-2 text-start">Name</th>
                        <th className="px-3 py-2 text-start">Type</th>
                        <th className="px-3 py-2 text-start">City</th>
                        <th className="px-3 py-2 text-start">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sampleRows.map((r) => (
                        <tr
                          key={`${r.businessKey}-${r.action}-${r.name}`}
                          className="border-t border-[var(--line)]"
                        >
                          <td className="px-3 py-2">
                            <StatusBadge tone={actionTone(r.action)}>
                              {r.action}
                            </StatusBadge>
                          </td>
                          <td className="px-3 py-2 font-medium">
                            {r.name || '—'}
                          </td>
                          <td className="px-3 py-2 text-[var(--ink-muted)]">
                            {r.type}
                          </td>
                          <td className="px-3 py-2 text-[var(--ink-muted)]">
                            {r.city ?? '—'}
                          </td>
                          <td className="px-3 py-2 text-[var(--ink-muted)]">
                            {r.reason ||
                              (r.changes?.length
                                ? `fields: ${r.changes.join(', ')}`
                                : '—')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}

        <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
          <p className="text-sm font-semibold">Import history</p>
          {historyQ.isLoading ? (
            <p className="mt-2 text-sm text-[var(--muted)]">Loading…</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {(historyQ.data?.data ?? []).map((row) => (
                <li
                  key={String(row.id)}
                  className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-2"
                >
                  <span>
                    <span className="font-medium">{String(row.filename)}</span>
                    <span className="text-[var(--muted)]">
                      {' '}
                      · {String(row.status)} · {String(row.sourceKind ?? '')} ·{' '}
                      {String(row.createdAt ?? '')}
                    </span>
                  </span>
                  {row.uploadedByUser &&
                  typeof row.uploadedByUser === 'object' &&
                  'fullName' in (row.uploadedByUser as object) ? (
                    <span className="text-[var(--muted)]">
                      {(row.uploadedByUser as { fullName?: string }).fullName}
                    </span>
                  ) : null}
                </li>
              ))}
              {(historyQ.data?.data ?? []).length === 0 ? (
                <li className="text-[var(--muted)]">No imports yet.</li>
              ) : null}
            </ul>
          )}
        </div>
      </div>
    </PageScaffold>
  );
}
