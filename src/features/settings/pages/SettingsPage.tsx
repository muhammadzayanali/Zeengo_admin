import { ops, useOpsSnapshot } from '@/ops-demo/useOpsStore';
import {
  PageScaffold,
  StatusBadge,
  TabBar,
  useToast,
} from '@/shared/ui';
import { useState } from 'react';

const ROLES = ['Admin', 'Ops Mgr', 'Splizer', 'Driver', 'Support'] as const;

export function SettingsPage() {
  const snap = useOpsSnapshot();
  const { push } = useToast();
  const [tab, setTab] = useState('rbac');
  const configured = Object.values(snap.apiKeys).filter(Boolean).length;

  return (
    <PageScaffold
      title="Settings"
      description="RBAC matrix, AI model allocation, and integration keys."
      filters={
        <TabBar
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'rbac', label: 'Role permissions' },
            { id: 'ai', label: 'AI models' },
            { id: 'keys', label: `API keys (${configured}/5)` },
          ]}
        />
      }
    >
      {tab === 'rbac' ? (
        <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-[var(--bg-muted)] text-xs font-medium uppercase text-[var(--ink-muted)]">
                <tr>
                  <th className="px-4 py-3 text-start">Feature / Module</th>
                  {ROLES.map((r) => (
                    <th key={r} className="px-3 py-3 text-center">{r}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(snap.rbac).map(([feature, roles]) => (
                  <tr key={feature} className="border-t border-[var(--line)]">
                    <td className="px-4 py-3 font-medium">{feature}</td>
                    {ROLES.map((r) => (
                      <td key={r} className="px-3 py-3 text-center">
                        <button
                          type="button"
                          className="text-base"
                          title="Toggle access"
                          onClick={async () => {
                            await ops.toggleRbac(feature, r);
                            push({ tone: 'success', title: `${feature} · ${r} updated` });
                          }}
                        >
                          {roles[r] ? '✓' : '✕'}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === 'ai' ? (
        <div className="space-y-3 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)]">
          {(
            [
              ['sos', 'SOS Emergency Assessment / Legal'],
              ['parser', 'AI Parser Data Extraction'],
              ['email', 'Email Template Generation'],
              ['chatbot', 'Russia Chatbot Intent Tagging'],
              ['summary', 'Client Profile Summaries'],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] py-3 last:border-0">
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-[var(--ink-muted)]">{snap.aiModels[key]}</p>
              </div>
              <select
                className="rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm"
                value={snap.aiModels[key]}
                onChange={(e) => void ops.setAiModel(key, e.target.value)}
              >
                <option>Claude Opus 4.6</option>
                <option>Claude Sonnet 4.6</option>
                <option>Claude Haiku 4.5</option>
              </select>
            </div>
          ))}
        </div>
      ) : null}

      {tab === 'keys' ? (
        <div className="space-y-3 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow)]">
          <p className="text-sm text-[var(--ink-muted)]">
            Configured: <strong className="text-[var(--ink)]">{configured}/5</strong> — keys stay placeholder in UI-only mode.
          </p>
          {(
            [
              ['anthropic', 'Anthropic Claude API', 'ANTHROPIC_API_KEY'],
              ['stripe', 'Stripe Secret + Webhook', 'STRIPE_SECRET_KEY'],
              ['maps', 'Google Maps WebGL', 'VITE_GOOGLE_MAPS_KEY'],
              ['firebase', 'Firebase Cloud Messaging', 'FIREBASE_PROJECT_ID'],
              ['s3', 'AWS S3 / Cloudflare R2', 'S3_ACCESS_KEY_ID'],
            ] as const
          ).map(([key, label, env]) => (
            <div key={key} className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] py-3 last:border-0">
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="font-mono text-xs text-[var(--ink-muted)]">{env}</p>
              </div>
              <button
                type="button"
                onClick={() => void ops.setApiKeyConfigured(key, !snap.apiKeys[key])}
              >
                <StatusBadge tone={snap.apiKeys[key] ? 'success' : 'default'}>
                  {snap.apiKeys[key] ? 'Configured' : 'Not configured'}
                </StatusBadge>
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </PageScaffold>
  );
}
