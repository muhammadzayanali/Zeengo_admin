import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { FileSpreadsheet, Upload } from 'lucide-react';
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

function actionLabel(action: string) {
  if (action === 'create') return 'New';
  if (action === 'update') return 'Update';
  if (action === 'invalid') return 'Needs a fix';
  if (action === 'unchanged') return 'Already there';
  return action;
}

function statusLabel(status: string) {
  if (status === 'committed') return 'Saved to catalog';
  if (status === 'previewed') return 'Checked only';
  return status;
}

function formatWhen(raw: string) {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MasterDataImportPage() {
  const { push } = useToast();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [chosenName, setChosenName] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [rowFilter, setRowFilter] = useState<
    'all' | 'create' | 'update' | 'invalid' | 'unchanged'
  >('all');

  const historyQ = useQuery({
    queryKey: ['master-data', 'imports'],
    queryFn: () => masterDataApi.listImports(),
  });

  function takeFile(file: File | undefined) {
    if (!file) return;
    setChosenName(file.name);
    previewM.mutate(file);
  }

  const previewM = useMutation({
    mutationFn: (file: File) => masterDataApi.preview(file),
    onSuccess: (data) => {
      setPreview(data);
      setRowFilter('all');
      push({ tone: 'success', title: 'File checked. Review the list, then save.' });
      void qc.invalidateQueries({ queryKey: ['master-data', 'imports'] });
    },
    onError: (err: Error) =>
      push({
        tone: 'error',
        title: err.message || 'This file could not be read. Use an Excel or JSON file.',
      }),
  });

  const commitM = useMutation({
    mutationFn: (id: string) => masterDataApi.commit(id),
    onSuccess: (data) => {
      push({
        tone: 'success',
        title: `Saved. ${data.report.created ?? 0} new, ${data.report.updated ?? 0} updated.`,
      });
      setPreview(null);
      setChosenName(null);
      void qc.invalidateQueries({ queryKey: ['master-data', 'imports'] });
      void qc.invalidateQueries({ queryKey: ['vendors'] });
    },
    onError: (err: Error) =>
      push({ tone: 'error', title: err.message || 'Could not save this file.' }),
  });

  const sampleRows = useMemo(() => {
    if (!preview?.sheets) return [];
    const flat = preview.sheets.flatMap((s) =>
      (s.rows ?? []).map((r) => ({ ...r, sheet: s.sheet })),
    );
    if (rowFilter === 'all') return flat.slice(0, 80);
    return flat.filter((r) => r.action === rowFilter).slice(0, 80);
  }, [preview, rowFilter]);

  const canSave = Boolean(
    preview &&
      preview.summary.totals.create + preview.summary.totals.update > 0 &&
      !commitM.isPending,
  );

  return (
    <PageScaffold
      title="Add hotels & vendors from a file"
      description="Choose an Excel or JSON file. We show you what will change. Nothing is saved until you press Save."
    >
      <ol className="grid gap-2 sm:grid-cols-3">
        {[
          { n: '1', t: 'Choose a file', d: 'Excel (.xlsx) or JSON' },
          { n: '2', t: 'Check the list', d: 'New, updates, and problems' },
          { n: '3', t: 'Save', d: 'Only after you confirm' },
        ].map((step) => (
          <li
            key={step.n}
            className="flex items-start gap-3 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-3"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--shell)] text-xs font-semibold text-white">
              {step.n}
            </span>
            <span>
              <span className="block text-sm font-semibold text-[var(--ink)]">
                {step.t}
              </span>
              <span className="text-xs text-[var(--ink-muted)]">{step.d}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="space-y-4">
        <section className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-[var(--ink)]">
            Choose your file
          </h2>
          <p className="mt-1 max-w-xl text-sm text-[var(--ink-muted)]">
            Use the Excel workbook from the office, or a JSON file they sent you.
            One file at a time. Maximum 25 MB.
          </p>

          <input
            ref={inputRef}
            className="sr-only"
            type="file"
            accept=".xlsx,.xls,.json,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => {
              takeFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              takeFile(e.dataTransfer.files?.[0]);
            }}
            className={`mt-4 flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-10 text-center transition ${
              dragging
                ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                : 'border-[var(--line)] bg-[var(--bg)] hover:border-[var(--accent)] hover:bg-[var(--bg-muted)]'
            }`}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--shell)] text-white">
              {previewM.isPending ? (
                <Upload className="h-5 w-5 animate-pulse" aria-hidden />
              ) : (
                <FileSpreadsheet className="h-5 w-5" aria-hidden />
              )}
            </span>
            <span className="mt-3 text-base font-semibold text-[var(--ink)]">
              {previewM.isPending
                ? 'Checking your file…'
                : chosenName
                  ? chosenName
                  : 'Drop the file here, or click to browse'}
            </span>
            <span className="mt-1 text-sm text-[var(--ink-muted)]">
              Excel (.xlsx, .xls) or JSON
            </span>
            <span className="mt-4 inline-flex rounded-full bg-[var(--shell)] px-4 py-2 text-sm font-medium text-white">
              Choose file
            </span>
          </button>
        </section>

        {preview ? (
          <section className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-[var(--ink)]">
                  Check before saving
                </h2>
                <p className="mt-1 text-sm text-[var(--ink-muted)]">
                  File: {preview.filename}
                </p>
              </div>
              <Button
                type="button"
                disabled={!canSave}
                onClick={() => {
                  if (
                    !window.confirm(
                      `Save this file to the catalog?\n\nNew: ${preview.summary.totals.create}\nUpdates: ${preview.summary.totals.update}\nAlready there: ${preview.summary.totals.unchanged}\nSkipped (needs a fix): ${preview.summary.totals.invalid}`,
                    )
                  ) {
                    return;
                  }
                  commitM.mutate(preview.id);
                }}
              >
                {commitM.isPending ? 'Saving…' : 'Save to catalog'}
              </Button>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { k: 'New', v: preview.summary.totals.create },
                { k: 'Updates', v: preview.summary.totals.update },
                { k: 'Already there', v: preview.summary.totals.unchanged },
                { k: 'Needs a fix', v: preview.summary.totals.invalid },
              ].map((card) => (
                <div
                  key={card.k}
                  className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg)] px-3 py-3"
                >
                  <dt className="text-xs text-[var(--ink-muted)]">{card.k}</dt>
                  <dd className="mt-1 text-xl font-semibold text-[var(--ink)]">
                    {card.v}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-[var(--bg-muted)] text-xs text-[var(--ink-muted)]">
                  <tr>
                    <th className="px-3 py-2 text-start font-medium">Sheet</th>
                    <th className="px-3 py-2 text-end font-medium">New</th>
                    <th className="px-3 py-2 text-end font-medium">Updates</th>
                    <th className="px-3 py-2 text-end font-medium">Already there</th>
                    <th className="px-3 py-2 text-end font-medium">Needs a fix</th>
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
                <p className="text-sm font-semibold">What is in the file</p>
                <div className="flex flex-wrap gap-1">
                  {(
                    [
                      ['all', 'All'],
                      ['create', 'New'],
                      ['update', 'Updates'],
                      ['invalid', 'Needs a fix'],
                      ['unchanged', 'Already there'],
                    ] as const
                  ).map(([f, label]) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setRowFilter(f)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        rowFilter === f
                          ? 'bg-[var(--accent)] text-white'
                          : 'bg-[var(--bg-muted)] text-[var(--ink-muted)]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {sampleRows.length === 0 ? (
                <p className="mt-2 text-sm text-[var(--ink-muted)]">
                  Nothing in this view.
                </p>
              ) : (
                <div className="mt-2 max-h-80 overflow-auto rounded-xl border border-[var(--line)]">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className="sticky top-0 bg-[var(--bg-muted)] text-xs text-[var(--ink-muted)]">
                      <tr>
                        <th className="px-3 py-2 text-start font-medium">What happens</th>
                        <th className="px-3 py-2 text-start font-medium">Name</th>
                        <th className="px-3 py-2 text-start font-medium">Type</th>
                        <th className="px-3 py-2 text-start font-medium">City</th>
                        <th className="px-3 py-2 text-start font-medium">Note</th>
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
                              {actionLabel(r.action)}
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
          </section>
        ) : null}

        <section className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-[var(--ink)]">
            Previous uploads
          </h2>
          {historyQ.isLoading ? (
            <p className="mt-2 text-sm text-[var(--ink-muted)]">Loading…</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {(historyQ.data?.data ?? []).map((row) => (
                <li
                  key={String(row.id)}
                  className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-3"
                >
                  <span>
                    <span className="font-medium">{String(row.filename)}</span>
                    <span className="block text-[var(--ink-muted)] sm:inline sm:before:content-['·_']">
                      {statusLabel(String(row.status))}
                      {row.createdAt
                        ? ` · ${formatWhen(String(row.createdAt))}`
                        : ''}
                    </span>
                  </span>
                  {row.uploadedByUser &&
                  typeof row.uploadedByUser === 'object' &&
                  'fullName' in (row.uploadedByUser as object) ? (
                    <span className="text-[var(--ink-muted)]">
                      {(row.uploadedByUser as { fullName?: string }).fullName}
                    </span>
                  ) : null}
                </li>
              ))}
              {(historyQ.data?.data ?? []).length === 0 ? (
                <li className="text-[var(--ink-muted)]">
                  No files uploaded yet.
                </li>
              ) : null}
            </ul>
          )}
        </section>
      </div>
    </PageScaffold>
  );
}
