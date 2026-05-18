import {
  bids as mockBids,
  type Bid,
  type BidDetail,
  type RiskFactor,
  type RiskLevel,
  type BidType,
  type AiStatusType,
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

export interface ApiAnalysisResult {
  budget_amt: number | null;
  budget_raw: string | null;
  bid_qualify: string | null;
  exec_period_months: number | null;
  exec_period_raw: string | null;
  manmonth_total: number | null;
  manmonth_detail: Record<string, unknown> | null;
  eval_tech_score: number | null;
  eval_price_score: number | null;
  task_scope: string | null;
  joint_supply_yn: boolean | null;
  joint_supply_detail: string | null;
  required_docs: Record<string, unknown> | null;
  exec_location: string | null;
  key_tech_spec: string | null;
  disqualify_reason: string | null;
  contact_person: Record<string, unknown> | null;
  past_performance: string | null;
  submit_deadline: string | null;
  model_used: string | null;
  analyzed_at: string | null;
  confidence_score: number | null;
}

export interface ApiRiskFactor {
  risk_category: string | null;
  risk_level: string | null;
  clause_title: string | null;
  clause_summary: string | null;
  mitigation_suggest: string | null;
}

export interface ApiBidDetailResponse extends ApiBidListItem {
  bid_ntce_ord: string;
  notice_type: string;
  dminstt_nm: string | null;
  bid_mtd_nm: string | null;
  cntrct_cncls_mthd_nm: string | null;
  openg_dt: string | null;
  analysis_result: ApiAnalysisResult | null;
  risk_factors: ApiRiskFactor[];
  attachments: AttachmentSchema[];
}

export interface ApiBidListResponse {
  total: number;
  bids: ApiBidListItem[];
}

// ─────────────────────────────────────────────
// Mapper: 백엔드 응답 → 프론트엔드 Bid 타입
// ─────────────────────────────────────────────

function mapRiskLevel(riskFactors: ApiRiskFactor[], overallRisk?: string): RiskLevel {
  if (overallRisk) {
    if (overallRisk === 'high' || overallRisk === 'danger') return 'danger';
    if (overallRisk === 'medium' || overallRisk === 'caution') return 'caution';
    if (overallRisk === 'low' || overallRisk === 'good') return 'good';
  }
  const hasHigh = riskFactors.some((r) => r.risk_level === 'high');
  const hasMedium = riskFactors.some((r) => r.risk_level === 'medium');
  if (hasHigh) return 'danger';
  if (hasMedium) return 'caution';
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

function mapApiRiskFactor(rf: ApiRiskFactor): RiskFactor {
  return {
    title: rf.clause_title ?? '알 수 없는 조항',
    desc: rf.clause_summary ?? rf.mitigation_suggest ?? '',
    severity: rf.risk_level === 'high' ? 'high' : 'medium',
  };
}

function formatContactPerson(contact: Record<string, unknown> | null): string {
  if (!contact) return '미정';
  const name = contact.name as string | undefined;
  const tel = contact.tel as string | undefined;
  const dept = contact.dept as string | undefined;
  const email = contact.email as string | undefined;
  const parts: string[] = [];
  if (name) parts.push(name);
  if (dept) parts.push(dept);
  if (tel) parts.push(tel);
  if (email) parts.push(email);
  return parts.length > 0 ? parts.join(' / ') : '미정';
}

function formatRequiredDocs(docs: Record<string, unknown> | null): string {
  if (!docs) return '미정';
  if (Array.isArray(docs)) return (docs as string[]).join(', ');
  if (typeof docs === 'string') return docs;
  const values = Object.values(docs);
  if (values.length > 0) {
    if (Array.isArray(values[0])) return (values[0] as string[]).join(', ');
    return values.filter((v) => typeof v === 'string').join(', ');
  }
  return '미정';
}

function mapAnalysisResultToBidDetail(
  analysis: ApiAnalysisResult,
  budget: number | null,
): BidDetail {
  const budgetStr = analysis.budget_raw
    ? analysis.budget_raw
    : budget
    ? budget >= 100_000_000
      ? `${(budget / 100_000_000).toFixed(1).replace(/\.0$/, '')}억원 (부가세 포함)`
      : `${(budget / 10_000).toFixed(0)}만원 (부가세 포함)`
    : '미공개';

  const execPeriod = analysis.exec_period_raw
    ? analysis.exec_period_raw
    : analysis.exec_period_months
    ? `${analysis.exec_period_months}개월`
    : '미정';

  const evalMethod =
    analysis.eval_tech_score != null && analysis.eval_price_score != null
      ? `기술 ${analysis.eval_tech_score} / 가격 ${analysis.eval_price_score}`
      : '미정';

  return {
    purpose: analysis.task_scope ?? '미정',
    execPeriod,
    budget: budgetStr,
    deliveryMethod: analysis.exec_location ?? '미정',
    techRequirement: analysis.key_tech_spec ?? '미정',
    bidMethod: analysis.bid_qualify ?? '미정',
    evalMethod,
    securityRequirement: analysis.disqualify_reason ?? '해당 없음',
    subcontractLimit: '미정',
    performanceBond: '미정',
    requiredDocs: formatRequiredDocs(analysis.required_docs),
    contactPerson: formatContactPerson(analysis.contact_person),
    analysisModel: analysis.model_used ?? undefined,
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
    deadline: normalizeDate(item.bid_clse_dt),
    risk: 'good' as RiskLevel,
    aiStatus: mapPipelineStatus(item.pipeline_status),
    type: mapBidType(item),
    dangerCount: 0,
    collectedAt: normalizeDate(item.bid_ntce_dt),
    is_bookmarked: item.is_bookmarked,
    is_in_progress: item.is_in_progress,
    is_expired: item.is_expired,
    ntce_dtl_url: item.bid_ntce_dtl_url ?? undefined,
  };
}

export function mapApiBidDetailToBid(res: ApiBidDetailResponse): Bid {
  const budget = res.asign_bdgt_amt ?? res.presmpt_prce ?? 0;
  const riskFactors = (res.risk_factors ?? []).map(mapApiRiskFactor);
  const risk = mapRiskLevel(res.risk_factors ?? []);

  return {
    id: res.bid_ntce_no,
    number: res.bid_ntce_no,
    title: res.bid_ntce_nm,
    agency: res.ntce_instt_nm ?? '',
    budget,
    deadline: normalizeDate(res.bid_clse_dt),
    risk,
    aiStatus: mapPipelineStatus(res.pipeline_status),
    type: mapBidType(res),
    dangerCount: riskFactors.filter((r) => r.severity === 'high').length,
    collectedAt: normalizeDate(res.bid_ntce_dt),
    is_bookmarked: res.is_bookmarked,
    is_in_progress: res.is_in_progress,
    is_expired: res.is_expired,
    ntce_dtl_url: res.bid_ntce_dtl_url ?? undefined,
    detail: res.analysis_result
      ? mapAnalysisResultToBidDetail(res.analysis_result, budget)
      : undefined,
    riskFactors,
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
    console.warn('[api] fetchBids 실패 → mockData fallback:', err);
    return { bids: mockBids, flags: {} };
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
    console.warn(`[api] fetchBidById(${id}) 실패 → mockData fallback:`, err);
    const found = mockBids.find((b) => b.id === id || b.number === id);
    if (found) return found;
    throw new Error(`공고 ID ${id}를 찾을 수 없습니다`);
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
    console.warn('[api] searchBids 실패 → local fallback:', err);
    const q = query.toLowerCase();
    const matched = mockBids.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.agency.toLowerCase().includes(q) ||
        b.number.includes(q),
    );
    return { source: 'local', results: matched, total: matched.length };
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
