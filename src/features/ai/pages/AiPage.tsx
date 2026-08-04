import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { aiApi } from '../services/ai.api';
import {
  Button,
  Card,
  Input,
  Label,
  PageScaffold,
  Select,
  Textarea,
  useToast,
} from '@/shared/ui';
import { ApiClientError } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import type {
  AiEodReportResult,
  ChatbotResult,
  EmailDraftResult,
  ParseItineraryResult,
} from '@/shared/api/types';

const TABS = ['parse', 'chatbot', 'email', 'eod'] as const;
type Tab = (typeof TABS)[number];

export function AiPage() {
  const { t } = useTranslation();
  const { push } = useToast();
  const [tab, setTab] = useState<Tab>('parse');
  const [loading, setLoading] = useState(false);

  const [parseResult, setParseResult] = useState<ParseItineraryResult | null>(null);
  const [chatbotResult, setChatbotResult] = useState<ChatbotResult | null>(null);
  const [emailResult, setEmailResult] = useState<EmailDraftResult | null>(null);
  const [eodResult, setEodResult] = useState<AiEodReportResult | null>(null);

  const tabLabels: Record<Tab, string> = {
    parse: t('ai.parseTitle'),
    chatbot: t('ai.chatbot'),
    email: t('ai.emailDraft'),
    eod: t('ai.eodTitle'),
  };

  async function handleParse(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const result = await aiApi.parseItinerary(String(form.get('rawText') || ''));
      setParseResult(result);
      push({ tone: 'success', title: t('ai.parsed') });
    } catch (error) {
      push({
        tone: 'error',
        title: t('ai.parseFailed'),
        description: error instanceof ApiClientError ? error.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleChatbot(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const result = await aiApi.chatbot(
        String(form.get('message') || ''),
        chatbotResult?.sessionId,
      );
      setChatbotResult(result);
    } catch (error) {
      push({
        tone: 'error',
        title: t('ai.chatFailed'),
        description: error instanceof ApiClientError ? error.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleEmail(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const result = await aiApi.emailDraft({
        purpose: String(form.get('purpose') || ''),
        context: String(form.get('context') || '') || undefined,
        tone: (String(form.get('tone') || 'formal') as 'formal' | 'friendly' | 'concise'),
        recipientName: String(form.get('recipientName') || '') || undefined,
      });
      setEmailResult(result);
      push({ tone: 'success', title: t('ai.draftReady') });
    } catch (error) {
      push({
        tone: 'error',
        title: t('ai.draftFailed'),
        description: error instanceof ApiClientError ? error.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleEod(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const result = await aiApi.eodReport(String(form.get('reportDate') || '') || undefined);
      setEodResult(result);
      push({ tone: 'success', title: t('ai.eodReady') });
    } catch (error) {
      push({
        tone: 'error',
        title: t('ai.eodFailed'),
        description: error instanceof ApiClientError ? error.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageScaffold title={t('ai.title')} description={t('ai.description')}>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-[var(--danger)]/30 bg-[var(--danger)]/5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--danger)]">
            {t('ai.priorityTitle')}
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--ink)]">
            <li>{t('ai.prioritySos')}</li>
            <li>{t('ai.priorityAssign')}</li>
            <li>{t('ai.priorityEod')}</li>
          </ul>
        </Card>
        <Card>
          <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--ink-muted)]">
            {t('ai.capabilitiesTitle')}
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--ink)]">
            <li>{t('ai.capParse')}</li>
            <li>{t('ai.capChat')}</li>
            <li>{t('ai.capEmail')}</li>
            <li>{t('ai.capEod')}</li>
          </ul>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tabKey) => (
          <button
            key={tabKey}
            type="button"
            onClick={() => setTab(tabKey)}
            className={cn(
              'rounded-xl px-4 py-2 text-sm font-semibold',
              tab === tabKey
                ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                : 'bg-[var(--bg-muted)] text-[var(--ink-muted)] hover:text-[var(--ink)]',
            )}
          >
            {tabLabels[tabKey]}
          </button>
        ))}
      </div>

      {tab === 'parse' ? (
        <Card>
          <h2 className="text-lg font-bold">{t('ai.parseTitle')}</h2>
          <form onSubmit={handleParse} className="mt-4 flex flex-col gap-4">
            <div>
              <Label htmlFor="rawText">{t('ai.parseTitle')}</Label>
              <Textarea
                id="rawText"
                name="rawText"
                rows={8}
                required
                placeholder={t('ai.parsePlaceholder')}
              />
            </div>
            <Button type="submit" loading={loading} className="self-end">
              {t('ai.parse')}
            </Button>
          </form>
          {parseResult ? (
            <div className="mt-6 flex flex-col gap-3">
              <p className="text-sm text-[var(--ink-muted)]">{parseResult.parser}</p>
              {parseResult.days.map((day) => (
                <div key={day.dayNumber} className="rounded-xl border border-[var(--line)] p-3">
                  <p className="font-semibold">
                    {day.dayNumber} · {day.items.length}
                  </p>
                  <ul className="mt-2 flex flex-col gap-1 text-sm">
                    {day.items.map((item, idx) => (
                      <li key={idx}>
                        {item.time ? `${item.time} · ` : ''}
                        {item.title}
                        {item.locationName ? ` (${item.locationName})` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      ) : null}

      {tab === 'chatbot' ? (
        <Card>
          <h2 className="text-lg font-bold">{t('ai.chatbot')}</h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">{t('ai.chatbotHint')}</p>
          <form onSubmit={handleChatbot} className="mt-4 flex flex-col gap-4">
            <div>
              <Label htmlFor="message">{t('ai.message')}</Label>
              <Textarea id="message" name="message" rows={3} required />
            </div>
            <Button type="submit" loading={loading} className="self-end">
              {t('ai.send')}
            </Button>
          </form>
          {chatbotResult ? (
            <div className="mt-6 rounded-xl bg-[var(--bg-muted)] p-4 text-sm">
              <p className="font-semibold">{chatbotResult.source}</p>
              <p className="mt-1">{chatbotResult.reply}</p>
            </div>
          ) : null}
        </Card>
      ) : null}

      {tab === 'email' ? (
        <Card>
          <h2 className="text-lg font-bold">{t('ai.emailDraft')}</h2>
          <form onSubmit={handleEmail} className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="purpose">{t('ai.purpose')}</Label>
              <Input
                id="purpose"
                name="purpose"
                required
                placeholder={t('ai.purposePlaceholder')}
              />
            </div>
            <div>
              <Label htmlFor="recipientName">{t('ai.recipient')}</Label>
              <Input id="recipientName" name="recipientName" />
            </div>
            <div>
              <Label htmlFor="tone">{t('common.status')}</Label>
              <Select id="tone" name="tone" defaultValue="formal">
                <option value="formal">formal</option>
                <option value="friendly">friendly</option>
                <option value="concise">concise</option>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="context">{t('ai.context')}</Label>
              <Textarea id="context" name="context" rows={4} />
            </div>
            <Button type="submit" loading={loading} className="sm:col-span-2 self-end">
              {t('ai.draftEmail')}
            </Button>
          </form>
          {emailResult ? (
            <div className="mt-6 rounded-xl bg-[var(--bg-muted)] p-4 text-sm">
              <p className="font-semibold">{emailResult.subject}</p>
              <p className="mt-2 whitespace-pre-wrap">{emailResult.body}</p>
              <p className="mt-2 text-xs text-[var(--ink-muted)]">{emailResult.source}</p>
            </div>
          ) : null}
        </Card>
      ) : null}

      {tab === 'eod' ? (
        <Card>
          <h2 className="text-lg font-bold">{t('ai.eodTitle')}</h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">{t('ai.eodHint')}</p>
          <form onSubmit={handleEod} className="mt-4 flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="reportDate">{t('common.date')}</Label>
              <Input id="reportDate" name="reportDate" type="date" />
            </div>
            <Button type="submit" loading={loading}>
              {t('ai.generateEod')}
            </Button>
          </form>
          {eodResult ? (
            <div className="mt-6 rounded-xl bg-[var(--bg-muted)] p-4 text-sm">
              <p className="font-semibold">{eodResult.reportDate}</p>
              <p className="mt-2 whitespace-pre-wrap">{eodResult.content}</p>
              <p className="mt-2 text-xs text-[var(--ink-muted)]">{eodResult.source}</p>
            </div>
          ) : null}
        </Card>
      ) : null}
    </PageScaffold>
  );
}
