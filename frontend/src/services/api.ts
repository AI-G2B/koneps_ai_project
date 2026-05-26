import {
  type Bid,
  type BidDetail,
  type RiskFactor,
  type Severity,
  type RiskLevel,
  type BidType,
  type AiStatusType,
  type Attachment,
  type AnalysisLog,
  type RequirementItem,
} from '../components/mockData';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

// ─────────────────────────────────────────────
// 백엔드 응답 타입 (notices 테이블 기반)
// ─────────────────────────────────────────────

export interface AttachmentSchema {
  id: number | null;
  file_name: string;
  file_url: string;
  file_type: string;
  local_path: string | null;
  parse_status: string;
}

export interface ApiBidListItem {
  id: number;
  bid_ntce_no: string;
  bid_ntce_nm: string;
  ntce_instt_nm: string | null;
  ntce_kind_nm: string | null;
  is_isp_ismp: boolean;
  isp_ismp_type: string | null;
  is_bookmarked: boolean;
  is_in_progress: boolean;
  is_expired: boolean;
  presmpt_prce: number | null;
  asign_bdgt_amt: number | null;
  bid_clse_dt: string | null;
  bid_ntce_dt: string | null;
  collected_at: string | null;
  pipeline_status: string;
  bid_ntce_dtl_url: string | null;
}

export interface ApiPoisonItem {
  category: string;   // S1~L4 또는 OTHER
  clause: string;     // RFP 원문 조항
  severity: string;   // caution | warning | danger
  reason: string;     // 판단 근거
  source: string;     // 출처
}

export interface ApiPoisonClauses {
  items: ApiPoisonItem[];
  risk_level: string; // safe | caution | warning | danger
  summary: string;
}

export interface ApiAnalysisResult {
  project_type: string | null;
  estimated_price: number | null;
  allocated_budget: number | null;
  project_duration: string | null;
  contract_method: string | null;
  submit_deadline: string | null;
  risk_level: string | null;
  issuing_org: string | null;
  project_summary: string | null;
  project_scope: string | null;
  qualification: string | null;
  eval_criteria: Array<Record<string, unknown>> | null;
  requirements: Record<string, unknown> | null;
  tech_requirements: string[] | null;
  poison_clauses: ApiPoisonClauses | null;
  raw_analysis: Record<string, unknown> | null;
  model_used: string | null;
  analysis_status: string | null;
  analyzed_at: string | null;
}

export interface ApiBidDetailResponse extends ApiBidListItem {
  bid_ntce_ord: string;
  notice_type: string;
  dminstt_nm: string | null;
  bid_mtd_nm: string | null;
  cntrct_cncls_mthd_nm: string | null;
  openg_dt: string | null;
  analysis_result: ApiAnalysisResult | null;
  attachments: AttachmentSchema[];
}

export interface ApiBidListResponse {
  total: number;
  bids: ApiBidListItem[];
}

// ─────────────────────────────────────────────
// Mapper: 백엔드 응답 → 프론트엔드 Bid 타입
// ─────────────────────────────────────────────

function mapRiskLevel(overallRisk?: string | null): RiskLevel {
  if (overallRisk === 'danger') return 'danger';
  if (overallRisk === 'warning' || overallRisk === 'caution') return 'caution';
  return 'good';
}

function mapBidType(item: ApiBidListItem): BidType {
  if (item.isp_ismp_type) {
    const t = item.isp_ismp_type.toUpperCase();
    if (t === 'ISP') return 'ISP';
    if (t === 'ISMP') return 'ISMP';
  }
  return '기타';
}

function mapPipelineStatus(status: string | null): AiStatusType {
  if (status === 'analyzed') return 'complete';
  if (status === 'analyzing' || status === 'parsing') return 'analyzing';
  return 'none';
}

function normalizeDate(dateStr: string | null | undefined): string {
  return dateStr ? dateStr.slice(0, 10) : '';
}

function mapPoisonItem(item: ApiPoisonItem): RiskFactor {
  const sev = (item.severity ?? 'caution').toLowerCase();
  const severity: Severity = sev === 'danger' ? 'danger' : sev === 'warning' ? 'warning' : 'caution';
  return {
    category: item.category ?? 'OTHER',
    clause: item.clause ?? '',
    severity,
    reason: item.reason ?? '',
    source: item.source ?? '',
  };
}

function mapAnalysisResultToBidDetail(
  analysis: ApiAnalysisResult,
  budget: number | null,
): BidDetail {
  const price = analysis.estimated_price ?? analysis.allocated_budget ?? budget;
  const budgetStr = price
    ? price >= 100_000_000
      ? `${(price / 100_000_000).toFixed(1).replace(/\.0$/, '')}억원`
      : `${(price / 10_000).toFixed(0)}만원`
    : '미공개';

  const techRequirement =
    Array.isArray(analysis.tech_requirements) && analysis.tech_requirements.length > 0
      ? analysis.tech_requirements.join(', ')
      : '미정';

  const evalMethod =
    Array.isArray(analysis.eval_criteria) && analysis.eval_criteria.length > 0
      ? `${analysis.eval_criteria.length}개 평가항목`
      : '미정';

  // analysis.requirements는 {groups:[{group_name, items:[{id,name,description}]}]} 구조.
  // BidDetail.requirements가 기대하는 RequirementItem[]로 평탄화.
  const requirements: RequirementItem[] = [];
  const reqObj = analysis.requirements as { groups?: Array<{ group_name?: string; items?: Array<{ id?: string; name?: string; description?: string }> }> } | null;
  if (reqObj && Array.isArray(reqObj.groups)) {
    for (const g of reqObj.groups) {
      for (const item of (g.items ?? [])) {
        requirements.push({
          category: g.group_name ?? '',
          code: item.id ?? '',
          name: item.name ?? '',
          definition: '',
          detail: item.description ?? '',
        });
      }
    }
  }

  return {
    purpose: analysis.project_summary ?? analysis.project_scope ?? '미정',
    execPeriod: analysis.project_duration ?? '미정',
    budget: budgetStr,
    deliveryMethod: '미정',
    techRequirement,
    bidMethod: analysis.contract_method ?? '미정',
    evalMethod,
    securityRequirement: analysis.qualification ?? '해당 없음',
    subcontractLimit: '미정',
    performanceBond: '미정',
    requiredDocs: '미정',
    contactPerson: analysis.issuing_org ?? '미정',
    analysisModel: analysis.model_used ?? undefined,
    requirements,
  };
}

export function mapApiBidListItemToBid(item: ApiBidListItem): Bid {
  const budget = item.asign_bdgt_amt ?? item.presmpt_prce ?? 0;
  return {
    id: item.bid_ntce_no,
    number: item.bid_ntce_no,
    title: item.bid_ntce_nm,
    agency: item.ntce_instt_nm ?? '',
    budget,
    presmptPrce: item.presmpt_prce ?? null,
    asignBdgtAmt: item.asign_bdgt_amt ?? null,
    deadline: normalizeDate(item.bid_clse_dt),
    risk: 'good' as RiskLevel,
    aiStatus: mapPipelineStatus(item.pipeline_status),
    type: mapBidType(item),
    dangerCount: 0,
    collectedAt: normalizeDate(item.collected_at),
    is_bookmarked: item.is_bookmarked,
    is_in_progress: item.is_in_progress,
    is_expired: item.is_expired,
    ntce_dtl_url: item.bid_ntce_dtl_url ?? undefined,
  };
}

export function mapApiBidDetailToBid(res: ApiBidDetailResponse): Bid {
  const budget = res.asign_bdgt_amt ?? res.presmpt_prce ?? 0;
  const poison = res.analysis_result?.poison_clauses ?? null;
  const riskFactors = (poison?.items ?? []).map(mapPoisonItem);
  const risk = mapRiskLevel(poison?.risk_level ?? res.analysis_result?.risk_level);

  return {
    id: res.bid_ntce_no,
    number: res.bid_ntce_no,
    title: res.bid_ntce_nm,
    agency: res.ntce_instt_nm ?? '',
    budget,
    presmptPrce: res.presmpt_prce ?? null,
    asignBdgtAmt: res.asign_bdgt_amt ?? null,
    deadline: normalizeDate(res.bid_clse_dt),
    risk,
    aiStatus: mapPipelineStatus(res.pipeline_status),
    type: mapBidType(res),
    dangerCount: riskFactors.filter((r) => r.severity === 'danger').length,
    collectedAt: normalizeDate(res.collected_at),
    is_bookmarked: res.is_bookmarked,
    is_in_progress: res.is_in_progress,
    is_expired: res.is_expired,
    ntce_dtl_url: res.bid_ntce_dtl_url ?? undefined,
    detail: res.analysis_result
      ? mapAnalysisResultToBidDetail(res.analysis_result, budget)
      : undefined,
    riskFactors,
    attachments: (res.attachments ?? []).map((a): Attachment => ({
      id: a.id,
      fileName: a.file_name,
      fileUrl: a.file_url.startsWith('http') ? a.file_url : `${BASE_URL}/${a.file_url.replace(/^\//, '')}`,
      fileType: a.file_type,
    })),
  };
}

// ─────────────────────────────────────────────
// API 함수
// ─────────────────────────────────────────────

export interface FetchBidsParams {
  limit?: number;
  offset?: number;
  date_range?: 'today' | 'yesterday' | '3days' | '1week' | 'all';
  date_from?: string;
  date_to?: string;
  isp_ismp_only?: boolean;
  bookmarked_only?: boolean;
  in_progress_only?: boolean;
  exclude_expired?: boolean;
  search?: string;
}

export type BidFlagsMap = Record<string, { bookmarked: boolean; inProgress: boolean }>;

export async function fetchBids(params?: FetchBidsParams): Promise<{ bids: Bid[]; flags: BidFlagsMap }> {
  try {
    const url = new URL(`${BASE_URL}/bids`);
    url.searchParams.set('limit', String(params?.limit ?? 100));
    if (params?.offset != null)
      url.searchParams.set('offset', String(params.offset));
    if (params?.date_from) url.searchParams.set('date_from', params.date_from);
    if (params?.date_to) url.searchParams.set('date_to', params.date_to);
    if (params?.isp_ismp_only != null) url.searchParams.set('isp_ismp_only', String(params.isp_ismp_only));
    if (params?.bookmarked_only != null) url.searchParams.set('bookmarked_only', String(params.bookmarked_only));
    if (params?.in_progress_only != null) url.searchParams.set('in_progress_only', String(params.in_progress_only));
    if (params?.exclude_expired != null) url.searchParams.set('exclude_expired', String(params.exclude_expired));
    if (params?.search) url.searchParams.set('search', params.search);

    const res = await fetch(url.toString(), {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data: ApiBidListResponse = await res.json();
    const flags: BidFlagsMap = {};
    data.bids.forEach(item => {
      flags[item.bid_ntce_no] = {
        bookmarked: item.is_bookmarked ?? false,
        inProgress: item.is_in_progress ?? false,
      };
    });
    return { bids: data.bids.map(mapApiBidListItemToBid), flags };
  } catch (err) {
    console.error('[api] fetchBids 실패:', err);
    throw err;
  }
}

export async function fetchBidById(id: string): Promise<Bid> {
  try {
    const res = await fetch(`${BASE_URL}/bids/${encodeURIComponent(id)}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data: ApiBidDetailResponse = await res.json();
    return mapApiBidDetailToBid(data);
  } catch (err) {
    console.error(`[api] fetchBidById(${id}) 실패:`, err);
    throw err;
  }
}

export async function triggerCollect(): Promise<{ saved: number; skipped: number; errors: number }> {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const res = await fetch(`${BASE_URL}/bids/collect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ start_date: today, end_date: today }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export interface SearchBidsResult {
  source: 'db' | 'naramarket' | 'local' | 'empty';
  results: Bid[];
  total: number;
}

export async function searchBids(query: string): Promise<SearchBidsResult> {
  try {
    const res = await fetch(
      `${BASE_URL}/bids/search?query=${encodeURIComponent(query)}`,
      { signal: AbortSignal.timeout(10_000) },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      source: data.source as SearchBidsResult['source'],
      results: (data.results as ApiBidListItem[]).map(mapApiBidListItemToBid),
      total: data.total,
    };
  } catch (err) {
    console.error('[api] searchBids 실패:', err);
    return { source: 'empty', results: [], total: 0 };
  }
}

export async function toggleBookmarkApi(
  bid_ntce_no: string,
  is_bookmarked: boolean
): Promise<boolean> {
  try {
    const res = await fetch(
      `${BASE_URL}/bids/${encodeURIComponent(bid_ntce_no)}/bookmark?is_bookmarked=${is_bookmarked}`,
      { method: 'PATCH', signal: AbortSignal.timeout(10_000) }
    );
    if (!res.ok) {
      console.warn('[api] toggleBookmarkApi HTTP:', res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[api] toggleBookmarkApi 실패:', err);
    return false;
  }
}

export async function toggleInProgressApi(
  bid_ntce_no: string,
  is_in_progress: boolean
): Promise<boolean> {
  try {
    const res = await fetch(
      `${BASE_URL}/bids/${encodeURIComponent(bid_ntce_no)}/in_progress?is_in_progress=${is_in_progress}`,
      { method: 'PATCH', signal: AbortSignal.timeout(10_000) }
    );
    if (!res.ok) {
      console.warn('[api] toggleInProgressApi HTTP:', res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[api] toggleInProgressApi 실패:', err);
    return false;
  }
}

export interface ApiDashboardStats {
  today_new: number;
  deadline_soon: number;
  analysis_done: number;
  proposal_count: number;
}

export async function fetchDashboardStats(): Promise<ApiDashboardStats | null> {
  try {
    const res = await fetch(`${BASE_URL}/bids/stats`, {
      signal: AbortSignal.timeout(10_000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[api] fetchDashboardStats 실패:', err);
    return null;
  }
}

export interface ApiTypeStatItem {
  type: string;
  count: number;
  ratio: number;
}

export async function fetchTypeStats(): Promise<ApiTypeStatItem[]> {
  try {
    const res = await fetch(`${BASE_URL}/bids/type-stats`, {
      signal: AbortSignal.timeout(10_000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[api] fetchTypeStats 실패:', err);
    return [];
  }
}

export interface CollectResult {
  saved: number;
  skipped: number;
  errors: number;
}

export async function collectBidsApi(): Promise<CollectResult | null> {
  try {
    const res = await fetch(`${BASE_URL}/bids/collect`, {
      method: 'POST',
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[api] collectBidsApi 실패:', err);
    return null;
  }
}

export interface ApiMemo {
  notice_id: number;
  content: string;
  author_id: number | null;
  author_name: string | null;
  updated_at: string | null;
}

export interface ApiUser {
  id: number;
  username: string;
  name: string;
  role: string;
}

export async function loginApi(username: string, password: string): Promise<ApiUser | null> {
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('[api] loginApi 실패:', err);
    return null;
  }
}

const _emptyMemo: ApiMemo = { notice_id: 0, content: '', author_id: null, author_name: null, updated_at: null };

export async function fetchMemo(bid_ntce_no: string): Promise<ApiMemo> {
  try {
    const res = await fetch(
      `${BASE_URL}/bids/${encodeURIComponent(bid_ntce_no)}/memo`,
      { signal: AbortSignal.timeout(10_000) }
    );
    console.warn('[memo] fetchMemo HTTP:', res.status);
    if (res.status === 404) return _emptyMemo;
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[memo] fetchMemo 오류:', res.status, text);
      return _emptyMemo;
    }
    return await res.json();
  } catch (err) {
    console.error('[memo] fetchMemo 실패:', err);
    return _emptyMemo;
  }
}

export async function saveMemo(
  bid_ntce_no: string,
  content: string,
  author_id: number | null = null,
  author_name: string | null = null,
): Promise<boolean> {
  try {
    const url = `${BASE_URL}/bids/${encodeURIComponent(bid_ntce_no)}/memo`;
    const body = JSON.stringify({ content, author_id, author_name });
    console.log('[memo] PUT 요청:', url, body);
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    console.warn('[memo] saveMemo HTTP:', res.status);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[memo] saveMemo 오류:', res.status, text);
    }
    return res.ok;
  } catch (err) {
    console.error('[memo] saveMemo 실패:', err);
    return false;
  }
}

export interface AnalysisStatus {
  pipelineStatus: string;
  logs: AnalysisLog[];
}

export async function fetchAnalysisStatus(bid_ntce_no: string): Promise<AnalysisStatus> {
  try {
    const res = await fetch(
      `${BASE_URL}/analysis/${encodeURIComponent(bid_ntce_no)}/status`,
      { signal: AbortSignal.timeout(5_000) }
    );
    if (!res.ok) return { pipelineStatus: 'unknown', logs: [] };
    const data = await res.json() as {
      pipeline_status: string;
      logs: Array<{ ts: string; level: string; message: string }>;
    };
    const logs: AnalysisLog[] = (data.logs ?? []).map((l) => ({
      time: l.ts ? l.ts.slice(11, 19) : '',
      message: l.message,
      status: l.level === 'success' ? 'success'
            : l.level === 'error' ? 'error'
            : 'info',
    }));
    return { pipelineStatus: data.pipeline_status, logs };
  } catch (err) {
    console.warn('[api] fetchAnalysisStatus 실패:', err);
    return { pipelineStatus: 'unknown', logs: [] };
  }
}

// ─────────────────────────────────────────────
// 제안목차
// ─────────────────────────────────────────────

export interface ProposalOutline {
  sections: Record<string, unknown> | null;
  guidelineBase: string;
  modelUsed: string | null;
  generatedAt: string | null;
}

export interface OutlineStatus {
  exists: boolean;
  logs: AnalysisLog[];
}

export async function requestOutlineApi(bid_ntce_no: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${BASE_URL}/outline/run/${encodeURIComponent(bid_ntce_no)}`,
      { method: 'POST', signal: AbortSignal.timeout(10_000) },
    );
    return res.ok;
  } catch (err) {
    console.warn('[api] requestOutlineApi 실패:', err);
    return false;
  }
}

export async function fetchOutline(bid_ntce_no: string): Promise<ProposalOutline | null> {
  try {
    const res = await fetch(`${BASE_URL}/outline/${encodeURIComponent(bid_ntce_no)}`, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const d = await res.json() as {
      sections: Record<string, unknown> | null;
      guideline_base: string;
      model_used: string | null;
      generated_at: string | null;
    };
    return {
      sections: d.sections,
      guidelineBase: d.guideline_base,
      modelUsed: d.model_used,
      generatedAt: d.generated_at,
    };
  } catch (err) {
    console.warn('[api] fetchOutline 실패:', err);
    return null;
  }
}

export async function fetchOutlineStatus(bid_ntce_no: string): Promise<OutlineStatus> {
  try {
    const res = await fetch(`${BASE_URL}/outline/${encodeURIComponent(bid_ntce_no)}/status`, { signal: AbortSignal.timeout(5_000) });
    if (!res.ok) return { exists: false, logs: [] };
    const d = await res.json() as { exists: boolean; logs: Array<{ ts: string; level: string; message: string }> };
    const logs: AnalysisLog[] = (d.logs ?? []).map((l) => ({
      time: l.ts ? l.ts.slice(11, 19) : '',
      message: l.message,
      status: l.level === 'success' ? 'success'
            : l.level === 'error' ? 'error'
            : 'info',
    }));
    return { exists: d.exists, logs };
  } catch (err) {
    console.warn('[api] fetchOutlineStatus 실패:', err);
    return { exists: false, logs: [] };
  }
}

export async function downloadOutlineExcel(bid_ntce_no: string): Promise<void> {
  // fetch → blob(same-origin) → <a download="명시적 파일명">로 다운로드 트리거.
  // iframe/window.open 방식은 cross-origin 응답에서 Content-Disposition을 무시해
  // 임의 UUID로 저장되는 문제가 있어 사용하지 않는다.
  try {
    const res = await fetch(`${BASE_URL}/outline/${encodeURIComponent(bid_ntce_no)}/excel`);
    if (!res.ok) {
      console.warn('[api] downloadOutlineExcel HTTP:', res.status);
      return;
    }
    // 백엔드 Content-Disposition: filename*=UTF-8''...
    const disposition = res.headers.get('Content-Disposition') ?? '';
    let filename = `(제안목차) ${bid_ntce_no}.xlsx`;
    const m = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
    if (m) {
      try { filename = decodeURIComponent(m[1]); } catch { filename = m[1]; }
    }
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objUrl;
    a.download = filename;            // 파일명 강제
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    // click 완료 후 정리
    setTimeout(() => {
      if (a.parentNode) document.body.removeChild(a);
      URL.revokeObjectURL(objUrl);
    }, 200);
  } catch (err) {
    console.warn('[api] downloadOutlineExcel 실패:', err);
  }
}

export async function requestAnalysisApi(bid_ntce_no: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${BASE_URL}/analysis/run/${encodeURIComponent(bid_ntce_no)}`,
      { method: 'POST', signal: AbortSignal.timeout(10_000) }
    );
    if (res.status === 501) {
      console.warn('[api] AI 분석 미구현 상태');
      return false;
    }
    return res.ok;
  } catch (err) {
    console.warn('[api] requestAnalysisApi 실패:', err);
    return false;
  }
}

export interface UploadAttachmentResult {
  ok: boolean;
  file_name: string;
  attachment_id: number;
  reanalysis_started: boolean;
  error?: string;
}

/** RFP 등 추가 자료를 직접 업로드하고 자동 재분석을 시작한다. */
export async function uploadAttachmentApi(
  bid_ntce_no: string,
  file: File,
): Promise<UploadAttachmentResult> {
  try {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(
      `${BASE_URL}/bids/${encodeURIComponent(bid_ntce_no)}/attachments`,
      { method: 'POST', body: form, signal: AbortSignal.timeout(60_000) },
    );
    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const j = await res.json();
        if (j?.detail) detail = String(j.detail);
      } catch {
        /* ignore */
      }
      return { ok: false, file_name: file.name, attachment_id: 0, reanalysis_started: false, error: detail };
    }
    const j = await res.json();
    return {
      ok: true,
      file_name: j.file_name ?? file.name,
      attachment_id: j.attachment_id ?? 0,
      reanalysis_started: Boolean(j.reanalysis_started),
    };
  } catch (err) {
    console.warn('[api] uploadAttachmentApi 실패:', err);
    return {
      ok: false,
      file_name: file.name,
      attachment_id: 0,
      reanalysis_started: false,
      error: err instanceof Error ? err.message : '업로드 실패',
    };
  }
}
