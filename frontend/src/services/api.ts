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
} from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

// ─────────────────────────────────────────────
// 인증 토큰 저장 + 공통 fetch 래퍼
// ─────────────────────────────────────────────

const TOKEN_KEY = 'koneps_token';

export const setAuthToken = (token: string | null): void => {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
};

export const getAuthToken = (): string | null => {
  try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
};

/** 모든 API 호출 공통 래퍼. Authorization 헤더 자동 첨부 + 토큰 만료 시에만 세션 정리. */
export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(input, { ...init, headers });
  // 토큰이 있었는데 401이 나오면 만료/무효 → 세션 정리.
  // 토큰이 없는 401은 로그인 전 정상 흐름이므로 건드리지 않는다 (무한 리로드 방지).
  if (res.status === 401 && token) {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem('koneps_user');
    if (typeof window !== 'undefined') window.location.reload();
  }
  return res;
}

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
  parse_error_msg: string | null;
  bid_ntce_dtl_url: string | null;
  sales_manager: string | null;
  project_pm: string | null;
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

const NO_DOCS_PATTERNS = ['is_rfp 첨부 없음', '첨부파일이 없습니다', '분석 가능한 첨부파일이 없습니다'];

function mapPipelineStatus(status: string | null, failReason?: string | null): AiStatusType {
  if (status === 'analyzed') return 'complete';
  if (status === 'analyzing' || status === 'parsing') return 'analyzing';
  if (status === 'failed') {
    if (failReason && NO_DOCS_PATTERNS.some(p => failReason.includes(p))) return 'no_docs';
    return 'failed';
  }
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
    aiStatus: mapPipelineStatus(item.pipeline_status, item.parse_error_msg),
    type: mapBidType(item),
    dangerCount: 0,
    collectedAt: normalizeDate(item.collected_at),
    ntceDate: item.bid_ntce_dt ? item.bid_ntce_dt.slice(0, 10) : undefined,
    salesManager: item.sales_manager ?? undefined,
    projectPm: item.project_pm ?? undefined,
    is_bookmarked: item.is_bookmarked,
    is_in_progress: item.is_in_progress,
    is_expired: item.is_expired,
    ntce_dtl_url: item.bid_ntce_dtl_url ?? undefined,
    failReason: item.parse_error_msg ?? undefined,
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
    aiStatus: mapPipelineStatus(res.pipeline_status, res.parse_error_msg),
    type: mapBidType(res),
    dangerCount: riskFactors.filter((r) => r.severity === 'danger').length,
    collectedAt: normalizeDate(res.collected_at),
    ntceDate: res.bid_ntce_dt ? res.bid_ntce_dt.slice(0, 10) : undefined,
    salesManager: res.sales_manager ?? undefined,
    projectPm: res.project_pm ?? undefined,
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
    failReason: res.parse_error_msg ?? undefined,
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
    // BASE_URL이 상대경로("/api")일 수도 있어 base 인자를 명시 (절대 URL이면 base는 무시됨).
    const url = new URL(`${BASE_URL}/bids`, window.location.origin);
    url.searchParams.set('limit', String(params?.limit ?? 500));
    if (params?.offset != null)
      url.searchParams.set('offset', String(params.offset));
    if (params?.date_from) url.searchParams.set('date_from', params.date_from);
    if (params?.date_to) url.searchParams.set('date_to', params.date_to);
    if (params?.isp_ismp_only != null) url.searchParams.set('isp_ismp_only', String(params.isp_ismp_only));
    if (params?.bookmarked_only != null) url.searchParams.set('bookmarked_only', String(params.bookmarked_only));
    if (params?.in_progress_only != null) url.searchParams.set('in_progress_only', String(params.in_progress_only));
    if (params?.exclude_expired != null) url.searchParams.set('exclude_expired', String(params.exclude_expired));
    if (params?.search) url.searchParams.set('search', params.search);

    const res = await authFetch(url.toString(), {
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
    const res = await authFetch(`${BASE_URL}/bids/${encodeURIComponent(id)}`, {
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
  const res = await authFetch(`${BASE_URL}/bids/collect`, {
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
    const res = await authFetch(
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
    const res = await authFetch(
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
    const res = await authFetch(
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

export async function updateBidManagersApi(
  bid_ntce_no: string,
  salesManager: string,
  projectPm: string
): Promise<boolean> {
  try {
    const res = await authFetch(
      `${BASE_URL}/bids/${encodeURIComponent(bid_ntce_no)}/managers`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sales_manager: salesManager, project_pm: projectPm }),
        signal: AbortSignal.timeout(10_000),
      }
    );
    return res.ok;
  } catch (err) {
    console.warn('[api] updateBidManagersApi 실패:', err);
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
    const res = await authFetch(`${BASE_URL}/bids/stats`, {
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
    const res = await authFetch(`${BASE_URL}/bids/type-stats`, {
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
    const res = await authFetch(`${BASE_URL}/bids/collect`, {
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

export interface ApiLoginResponse extends ApiUser {
  access_token: string;
  token_type: string;
}

export async function loginApi(username: string, password: string): Promise<ApiLoginResponse | null | 'timeout'> {
  try {
    // 로그인은 토큰 없이 호출해야 하므로 raw fetch 사용.
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('[api] loginApi 실패:', err);
    if (err instanceof DOMException && err.name === 'TimeoutError') return 'timeout';
    return null;
  }
}

export async function updateProfileApi(
  name?: string,
  currentPassword?: string,
  newPassword?: string,
  position?: string,
): Promise<{ id: number; username: string; name: string; role: string } | { error: string } | 'timeout'> {
  try {
    const body: Record<string, string> = {};
    if (name !== undefined) body.name = name;
    if (currentPassword !== undefined) body.current_password = currentPassword;
    if (newPassword !== undefined) body.new_password = newPassword;
    if (position !== undefined) body.position = position;
    const res = await authFetch(`${BASE_URL}/auth/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { error: data.detail ?? '프로필 업데이트에 실패했습니다.' };
    }
    return await res.json();
  } catch (err) {
    if (err instanceof DOMException && err.name === 'TimeoutError') return 'timeout';
    return { error: '서버에 연결할 수 없습니다.' };
  }
}

export async function registerApi(
  username: string,
  password: string,
  name: string,
  position: string,
): Promise<{ id: number; username: string; name: string; role: string } | { error: string } | 'timeout'> {
  try {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, name, position }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { error: data.detail ?? '회원가입에 실패했습니다.' };
    }
    return await res.json();
  } catch (err) {
    if (err instanceof DOMException && err.name === 'TimeoutError') return 'timeout';
    return { error: '서버에 연결할 수 없습니다.' };
  }
}

const _emptyMemo: ApiMemo = { notice_id: 0, content: '', author_id: null, author_name: null, updated_at: null };

export async function fetchMemo(bid_ntce_no: string): Promise<ApiMemo> {
  try {
    const res = await authFetch(
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
    const res = await authFetch(url, {
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
    const res = await authFetch(
      `${BASE_URL}/analysis/${encodeURIComponent(bid_ntce_no)}/status`,
      { signal: AbortSignal.timeout(5_000) }
    );
    if (!res.ok) return { pipelineStatus: 'unknown', logs: [] };
    const data = await res.json() as {
      pipeline_status: string;
      logs: Array<{ ts: string; level: string; message: string }>;
    };
    const logs: AnalysisLog[] = (data.logs ?? []).map((l) => ({
      time: l.ts ? (() => {
        const d = new Date(l.ts);
        const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
        return kst.toISOString().slice(11, 19);
      })() : '',
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
  rfpRawText: string | null;
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
    const res = await authFetch(
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
    const res = await authFetch(`${BASE_URL}/outline/${encodeURIComponent(bid_ntce_no)}`, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const d = await res.json() as {
      sections: Record<string, unknown> | null;
      rfp_raw_text: string | null;
      guideline_base: string;
      model_used: string | null;
      generated_at: string | null;
    };
    return {
      sections: d.sections,
      rfpRawText: d.rfp_raw_text ?? null,
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
    const res = await authFetch(`${BASE_URL}/outline/${encodeURIComponent(bid_ntce_no)}/status`, { signal: AbortSignal.timeout(5_000) });
    if (!res.ok) return { exists: false, logs: [] };
    const d = await res.json() as { exists: boolean; logs: Array<{ ts: string; level: string; message: string }> };
    const logs: AnalysisLog[] = (d.logs ?? []).map((l) => ({
      time: l.ts ? (() => {
        const d = new Date(l.ts);
        const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
        return kst.toISOString().slice(11, 19);
      })() : '',
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
    const res = await authFetch(`${BASE_URL}/outline/${encodeURIComponent(bid_ntce_no)}/excel`);
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

export async function downloadAnalysisDocx(bid_ntce_no: string): Promise<void> {
  // AI 분석 결과 Word 다운로드 — 4 섹션(사업개요/평가항목/요구사항/독소조항)
  try {
    const res = await authFetch(`${BASE_URL}/analysis/${encodeURIComponent(bid_ntce_no)}/docx`);
    if (!res.ok) {
      console.warn('[api] downloadAnalysisDocx HTTP:', res.status);
      return;
    }
    const disposition = res.headers.get('Content-Disposition') ?? '';
    let filename = `(AI 분석) ${bid_ntce_no}.docx`;
    const m = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
    if (m) {
      try { filename = decodeURIComponent(m[1]); } catch { filename = m[1]; }
    }
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objUrl;
    a.download = filename;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (a.parentNode) document.body.removeChild(a);
      URL.revokeObjectURL(objUrl);
    }, 200);
  } catch (err) {
    console.warn('[api] downloadAnalysisDocx 실패:', err);
  }
}

export async function requestAnalysisApi(bid_ntce_no: string): Promise<boolean> {
  try {
    const res = await authFetch(
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

/** AI 분석 결과 삭제. 성공 시 pipeline_status는 'collected'로 되돌아간다. */
export async function deleteAnalysisApi(bid_ntce_no: string): Promise<boolean> {
  try {
    const res = await authFetch(
      `${BASE_URL}/analysis/${encodeURIComponent(bid_ntce_no)}`,
      { method: 'DELETE', signal: AbortSignal.timeout(10_000) }
    );
    return res.ok;
  } catch (err) {
    console.warn('[api] deleteAnalysisApi 실패:', err);
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
    const res = await authFetch(
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

export async function fetchAgencySettings(user_id: number): Promise<{ preferred: string[]; avoided: string[] }> {
  try {
    const res = await fetch(
      `${BASE_URL}/auth/agency-settings?user_id=${user_id}`,
      { signal: AbortSignal.timeout(10_000) }
    );
    if (!res.ok) return { preferred: [], avoided: [] };
    return await res.json();
  } catch (err) {
    console.warn('[api] fetchAgencySettings 실패:', err);
    return { preferred: [], avoided: [] };
  }
}

export async function saveAgencySettings(
  user_id: number,
  preferred: string[],
  avoided: string[]
): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/auth/agency-settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, preferred, avoided }),
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok;
  } catch (err) {
    console.warn('[api] saveAgencySettings 실패:', err);
    return false;
  }
}

// ─────────────────────────────────────────────
// 관리자 프롬프트 API
// ─────────────────────────────────────────────

export interface AdminPromptSummary {
  key: string;
  description: string | null;
  placeholders: string[];
  version: number;
  updated_at: string | null;
  updated_by: number | null;
}

export interface AdminPromptDetail extends AdminPromptSummary {
  content: string;
  default_content: string | null;
}

export interface AdminPromptHistoryItem {
  version: number;
  content: string;
  saved_at: string | null;
  saved_by: number | null;
}

export async function adminListPrompts(): Promise<AdminPromptSummary[]> {
  const res = await authFetch(`${BASE_URL}/admin/prompts`, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function adminGetPrompt(key: string): Promise<AdminPromptDetail> {
  const res = await authFetch(`${BASE_URL}/admin/prompts/${encodeURIComponent(key)}`, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function adminUpdatePrompt(key: string, content: string): Promise<{ version: number } | { error: string }> {
  const res = await authFetch(`${BASE_URL}/admin/prompts/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: data.detail ?? `HTTP ${res.status}` };
  }
  return res.json();
}

export async function adminGetPromptHistory(key: string): Promise<AdminPromptHistoryItem[]> {
  const res = await authFetch(`${BASE_URL}/admin/prompts/${encodeURIComponent(key)}/history`, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function adminRollbackPrompt(key: string, version: number): Promise<{ version: number } | { error: string }> {
  const res = await authFetch(`${BASE_URL}/admin/prompts/${encodeURIComponent(key)}/rollback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: data.detail ?? `HTTP ${res.status}` };
  }
  return res.json();
}

export async function adminResetPrompt(key: string): Promise<{ version: number } | { error: string }> {
  const res = await authFetch(`${BASE_URL}/admin/prompts/${encodeURIComponent(key)}/reset`, {
    method: 'POST',
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: data.detail ?? `HTTP ${res.status}` };
  }
  return res.json();
}

// ─────────────────────────────────────────────
// 관리자 LLM 설정 API
// ─────────────────────────────────────────────

export interface AdminLLMConfig {
  provider: string;
  model: string;
  fallback_provider: string | null;
  fallback_model: string | null;
  temperature: number;
  updated_at: string | null;
}

export interface AdminProviderModel {
  model: string;
  label: string | null;
  is_default: boolean;
}

export interface AdminProvider {
  provider: string;
  label: string;
  env_var: string;
  is_available: boolean;
  models: AdminProviderModel[];
}

export async function adminGetLLMConfig(): Promise<AdminLLMConfig> {
  const res = await authFetch(`${BASE_URL}/admin/llm-config`, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function adminUpdateLLMConfig(body: {
  provider: string;
  model: string;
  fallback_provider: string | null;
  fallback_model: string | null;
  temperature: number;
}): Promise<(AdminLLMConfig & { warning: string | null }) | { error: string }> {
  const res = await authFetch(`${BASE_URL}/admin/llm-config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: data.detail ?? `HTTP ${res.status}` };
  }
  return res.json();
}

export async function adminListProviders(): Promise<AdminProvider[]> {
  const res = await authFetch(`${BASE_URL}/admin/providers`, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function adminAddProviderModel(provider: string, model: string, label?: string): Promise<{ model: string } | { error: string }> {
  const res = await authFetch(`${BASE_URL}/admin/providers/${encodeURIComponent(provider)}/models`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, label: label ?? null }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: data.detail ?? `HTTP ${res.status}` };
  }
  return res.json();
}

export async function adminRemoveProviderModel(provider: string, model: string): Promise<{ deleted: boolean } | { error: string }> {
  const res = await authFetch(`${BASE_URL}/admin/providers/${encodeURIComponent(provider)}/models/${encodeURIComponent(model)}`, {
    method: 'DELETE',
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: data.detail ?? `HTTP ${res.status}` };
  }
  return res.json();
}

// ─────────────────────────────────────────────
// 관리자 운영 API (Phase 4)
// ─────────────────────────────────────────────

export interface AdminOpsStatus {
  analysis: {
    concurrency_limit: number;
    daily_cap: number;
    daily_count: number;
    active_in_flight: number;
    backoff_sec: number;
  };
  attachments: {
    converted_total: number;
    converted_libreai: number;
    converted_pypdf: number;
  };
  notices: { stuck_analyzing: number };
  analysis_results: { with_poison_clauses: number };
  seed: { prompts_count: number; llm_config_seeded: boolean };
}

export interface AdminOpsTestLLMResult {
  ok: boolean;
  provider?: string;
  model_used?: string;
  input_tokens?: number | null;
  output_tokens?: number | null;
  text?: string;
  elapsed_sec: number;
  error?: string;
}

export async function adminOpsStatus(): Promise<AdminOpsStatus> {
  const res = await authFetch(`${BASE_URL}/admin/ops/status`, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function adminOpsTestLLM(user_text: string): Promise<AdminOpsTestLLMResult> {
  const res = await authFetch(`${BASE_URL}/admin/ops/test-llm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_text }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { ok: false, elapsed_sec: 0, error: data.detail ?? `HTTP ${res.status}` };
  }
  return res.json();
}

export async function adminOpsResetStuck(): Promise<{ reset_count: number } | { error: string }> {
  const res = await authFetch(`${BASE_URL}/admin/ops/reset-stuck`, { method: 'POST', signal: AbortSignal.timeout(10_000) });
  if (!res.ok) return { error: `HTTP ${res.status}` };
  return res.json();
}

export async function adminOpsWipeConvertedMd(source: 'libreai' | 'pypdf' | null): Promise<{ wiped_count: number; source: string } | { error: string }> {
  const res = await authFetch(`${BASE_URL}/admin/ops/wipe-converted-md`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return { error: `HTTP ${res.status}` };
  return res.json();
}

export async function adminOpsWipePoisonClauses(): Promise<{ wiped_count: number } | { error: string }> {
  const res = await authFetch(`${BASE_URL}/admin/ops/wipe-poison-clauses`, { method: 'POST', signal: AbortSignal.timeout(10_000) });
  if (!res.ok) return { error: `HTTP ${res.status}` };
  return res.json();
}

export async function adminOpsReseedPrompts(): Promise<{ before: number; after: number } | { error: string }> {
  const res = await authFetch(`${BASE_URL}/admin/ops/reseed-prompts`, { method: 'POST', signal: AbortSignal.timeout(10_000) });
  if (!res.ok) return { error: `HTTP ${res.status}` };
  return res.json();
}
