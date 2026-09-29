import { http, apiRequest } from '@/shared/api/client';

export type ImportSheetSummary = {
  sheet: string
  create: number
  update: number
  unchanged: number
  invalid: number
  rows?: Array<{
    action: string
    businessKey: string
    name: string
    type: string
    city: string | null
    reason?: string
    changes?: string[]
  }>
}

export type ImportPreviewResult = {
  id: string
  filename: string
  sourceKind: string
  status: string
  summary: {
    sheets: Array<{
      sheet: string
      create: number
      update: number
      unchanged: number
      invalid: number
    }>
    totals: {
      create: number
      update: number
      unchanged: number
      invalid: number
    }
  }
  sheets: ImportSheetSummary[]
}

export const masterDataApi = {
  listImports: () =>
    apiRequest<{ data: Array<Record<string, unknown>> }>({
      method: 'GET',
      url: '/master-data/imports',
    }),
  getImport: (id: string) =>
    apiRequest<Record<string, unknown>>({
      method: 'GET',
      url: `/master-data/imports/${id}`,
    }),
  preview: async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    const { data } = await http.post('/master-data/imports/preview', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    if (data && typeof data === 'object' && 'success' in data) {
      if (data.success === true) return data.data as ImportPreviewResult
      throw new Error(data.error?.message || 'Preview failed')
    }
    return data as ImportPreviewResult
  },
  commit: (id: string) =>
    apiRequest<{ id: string; status: string; report: Record<string, number> }>({
      method: 'POST',
      url: `/master-data/imports/${id}/commit`,
    }),
}
