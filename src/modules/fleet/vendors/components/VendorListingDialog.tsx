import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  vendorKeys,
  vendorsApi,
  type VendorListingInput,
} from '../services/vendors.api';
import {
  Badge,
  Button,
  DialogShell,
  Input,
  Label,
  Select,
  Skeleton,
  Textarea,
  useToast,
} from '@/shared/ui';
import { ApiClientError } from '@/shared/api/client';
import type { Vendor } from '@/shared/api/types';

type ListingForm = {
  isPublished: boolean;
  nameEn: string;
  nameAr: string;
  nameRu: string;
  summary: string;
  summaryAr: string;
  address: string;
  area: string;
  lat: string;
  lng: string;
  stars: string;
  category: string;
  durationLabel: string;
  languages: string;
  priceFrom: string;
  priceCurrency: string;
  priceUnit: string;
  website: string;
  yandexMapsUrl: string;
  images: string;
};

const PRICE_UNITS = ['night', 'person', 'hour', 'trip'] as const;

function toForm(v: Vendor): ListingForm {
  const s = (x: string | number | null | undefined) => (x == null ? '' : String(x));
  return {
    isPublished: v.isPublished ?? true,
    nameEn: s(v.nameEn),
    nameAr: s(v.nameAr),
    nameRu: s(v.nameRu),
    summary: s(v.summary),
    summaryAr: s(v.summaryAr),
    address: s(v.address),
    area: s(v.area),
    lat: s(v.lat),
    lng: s(v.lng),
    stars: s(v.stars),
    category: s(v.category),
    durationLabel: s(v.durationLabel),
    languages: s(v.languages),
    priceFrom: s(v.priceFrom),
    priceCurrency: v.priceCurrency || 'RUB',
    priceUnit: s(v.priceUnit),
    website: s(v.website),
    yandexMapsUrl: s(v.yandexMapsUrl),
    images: (v.images ?? []).join('\n'),
  };
}

function toPayload(f: ListingForm): VendorListingInput {
  const text = (x: string) => (x.trim() ? x.trim() : null);
  const num = (x: string) => (x.trim() === '' ? null : Number(x));
  return {
    isPublished: f.isPublished,
    nameEn: text(f.nameEn),
    nameAr: text(f.nameAr),
    nameRu: text(f.nameRu),
    summary: text(f.summary),
    summaryAr: text(f.summaryAr),
    address: text(f.address),
    area: text(f.area),
    lat: num(f.lat),
    lng: num(f.lng),
    stars: num(f.stars),
    category: text(f.category),
    durationLabel: text(f.durationLabel),
    languages: text(f.languages),
    priceFrom: num(f.priceFrom),
    priceCurrency: f.priceCurrency.trim().toUpperCase() || 'RUB',
    priceUnit: (PRICE_UNITS as readonly string[]).includes(f.priceUnit)
      ? (f.priceUnit as VendorListingInput['priceUnit'])
      : null,
    website: text(f.website),
    yandexMapsUrl: text(f.yandexMapsUrl),
    images: f.images
      .split(/\s+/)
      .map((u) => u.trim())
      .filter(Boolean),
  };
}

function validationMessage(e: unknown): string {
  if (!(e instanceof ApiClientError)) return 'Could not save the listing';
  const details = e.details;
  if (Array.isArray(details) && details.length) {
    return details
      .slice(0, 3)
      .map((d: { path?: unknown[]; message?: string }) =>
        `${(d.path ?? []).join('.')}: ${d.message ?? 'invalid'}`,
      )
      .join(' · ');
  }
  return e.message;
}

export function VendorListingDialog({
  vendorId,
  onClose,
}: {
  vendorId: string | null;
  onClose: () => void;
}) {
  const vendor = useQuery({
    queryKey: vendorKeys.detail(vendorId ?? ''),
    queryFn: ({ signal }) => vendorsApi.get(vendorId!, signal),
    enabled: Boolean(vendorId),
  });

  return (
    <DialogShell open={Boolean(vendorId)} title="Website listing" onClose={onClose} wide>
      {vendor.isLoading || !vendor.data ? (
        <Skeleton className="h-64" />
      ) : (
        <ListingEditor key={vendor.data.id} vendor={vendor.data} onClose={onClose} />
      )}
    </DialogShell>
  );
}

function ListingEditor({ vendor, onClose }: { vendor: Vendor; onClose: () => void }) {
  const { push } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState<ListingForm>(() => toForm(vendor));
  const set = <K extends keyof ListingForm>(key: K, value: ListingForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = useMutation({
    mutationFn: () => vendorsApi.update(vendor.id, toPayload(form)),
    onSuccess: async () => {
      push({ tone: 'success', title: 'Website listing saved' });
      await qc.invalidateQueries({ queryKey: vendorKeys.all });
      onClose();
    },
    onError: (e) => push({ tone: 'error', title: validationMessage(e) }),
  });

  const images = toPayload(form).images ?? [];
  const isHotel = vendor.type === 'hotel';

  function submit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--line)] p-3">
        <div className="text-sm">
          <p className="font-semibold">{vendor.name}</p>
          <p className="text-[var(--ink-muted)]">
            {vendor.type}
            {vendor.city ? ` · ${vendor.city}` : ''}
            {vendor.dataSource ? ` · source: ${vendor.dataSource}` : ''}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={form.isPublished}
            onChange={(e) => set('isPublished', e.target.checked)}
          />
          Visible on website
          <Badge tone={form.isPublished ? 'success' : 'warning'}>
            {form.isPublished ? 'Published' : 'Hidden'}
          </Badge>
        </label>
      </div>

      <fieldset className="grid gap-3 sm:grid-cols-3">
        <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
          Names
        </legend>
        <div>
          <Label htmlFor="l-name-en">English</Label>
          <Input id="l-name-en" value={form.nameEn} placeholder={vendor.name} onChange={(e) => set('nameEn', e.target.value)} />
        </div>
        <div>
          <Label htmlFor="l-name-ar">Arabic</Label>
          <Input id="l-name-ar" dir="rtl" value={form.nameAr} onChange={(e) => set('nameAr', e.target.value)} />
        </div>
        <div>
          <Label htmlFor="l-name-ru">Russian</Label>
          <Input id="l-name-ru" value={form.nameRu} onChange={(e) => set('nameRu', e.target.value)} />
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="l-summary">Description (English)</Label>
          <Textarea id="l-summary" rows={3} value={form.summary} onChange={(e) => set('summary', e.target.value)} />
        </div>
        <div>
          <Label htmlFor="l-summary-ar">Description (Arabic)</Label>
          <Textarea id="l-summary-ar" dir="rtl" rows={3} value={form.summaryAr} onChange={(e) => set('summaryAr', e.target.value)} />
        </div>
      </div>

      <fieldset className="grid gap-3 sm:grid-cols-4">
        <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
          Indicative price (shown as “from”, ZEEN confirms final price)
        </legend>
        <div className="sm:col-span-2">
          <Label htmlFor="l-price">Price from</Label>
          <Input id="l-price" type="number" min={0} step="1" value={form.priceFrom} onChange={(e) => set('priceFrom', e.target.value)} />
        </div>
        <div>
          <Label htmlFor="l-cur">Currency</Label>
          <Input id="l-cur" maxLength={3} value={form.priceCurrency} onChange={(e) => set('priceCurrency', e.target.value.toUpperCase())} />
        </div>
        <div>
          <Label htmlFor="l-unit">Per</Label>
          <Select id="l-unit" value={form.priceUnit} onChange={(e) => set('priceUnit', e.target.value)}>
            <option value="">—</option>
            {PRICE_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>
        </div>
      </fieldset>

      <fieldset className="grid gap-3 sm:grid-cols-4">
        <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
          Details
        </legend>
        <div>
          <Label htmlFor="l-cat">Category</Label>
          <Input id="l-cat" value={form.category} onChange={(e) => set('category', e.target.value)} />
        </div>
        {isHotel ? (
          <div>
            <Label htmlFor="l-stars">Stars</Label>
            <Select id="l-stars" value={form.stars} onChange={(e) => set('stars', e.target.value)}>
              <option value="">—</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}★
                </option>
              ))}
            </Select>
          </div>
        ) : (
          <div>
            <Label htmlFor="l-dur">Duration</Label>
            <Input id="l-dur" placeholder="e.g. 3 hours" value={form.durationLabel} onChange={(e) => set('durationLabel', e.target.value)} />
          </div>
        )}
        <div className="sm:col-span-2">
          <Label htmlFor="l-lang">Languages</Label>
          <Input id="l-lang" placeholder="Arabic, English" value={form.languages} onChange={(e) => set('languages', e.target.value)} />
        </div>
      </fieldset>

      <fieldset className="grid gap-3 sm:grid-cols-4">
        <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
          Location
        </legend>
        <div className="sm:col-span-2">
          <Label htmlFor="l-addr">Address</Label>
          <Input id="l-addr" value={form.address} onChange={(e) => set('address', e.target.value)} />
        </div>
        <div>
          <Label htmlFor="l-lat">Latitude</Label>
          <Input id="l-lat" type="number" step="any" min={-90} max={90} value={form.lat} onChange={(e) => set('lat', e.target.value)} />
        </div>
        <div>
          <Label htmlFor="l-lng">Longitude</Label>
          <Input id="l-lng" type="number" step="any" min={-180} max={180} value={form.lng} onChange={(e) => set('lng', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="l-area">Area / district</Label>
          <Input id="l-area" value={form.area} onChange={(e) => set('area', e.target.value)} />
        </div>
        <div>
          <Label htmlFor="l-web">Website</Label>
          <Input id="l-web" type="url" placeholder="https://" value={form.website} onChange={(e) => set('website', e.target.value)} />
        </div>
        <div>
          <Label htmlFor="l-ymaps">Yandex Maps</Label>
          <Input id="l-ymaps" type="url" placeholder="https://yandex.ru/maps/…" value={form.yandexMapsUrl} onChange={(e) => set('yandexMapsUrl', e.target.value)} />
        </div>
      </fieldset>

      <div>
        <Label htmlFor="l-images">Photos (one https URL per line, first is the cover, max 20)</Label>
        <Textarea id="l-images" rows={4} className="font-mono text-xs" value={form.images} onChange={(e) => set('images', e.target.value)} />
        {images.length ? (
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {images.slice(0, 8).map((src, i) => (
              <img
                key={`${src}-${i}`}
                src={src}
                alt=""
                className="h-16 w-24 shrink-0 rounded-md border border-[var(--line)] object-cover"
                onError={(e) => {
                  e.currentTarget.style.opacity = '0.25';
                }}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending}>
          Save listing
        </Button>
      </div>
    </form>
  );
}
