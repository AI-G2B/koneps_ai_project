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

export interface ApiBidListItem {
  bid_ntce_no: string;
  bid_ntce_nm: string;
  ntce_instt_nm: string;
  presmpt_prce: number | null;
  asign_bdgt_amt: number | null;
  bid_clse_dt: string;        // "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm:ss"
  bid_ntce_dt: string;
  is_isp_ismp: boolean | null;
  isp_ismp_type: string | null;
  pipeline_status: string | null; // "completed" | "processing" | "pending" | "failed"
  // 선택적: 백엔드가 사전 집계해서 보내줄 수도 있음
  danger_count?: number;
  overall_risk?: string;
}

export interface ApiAnalysisResult {
  budget_amt: number | null;
  bid_qualify: string | null;
  exec_period_months: number | null;
  manmonth_total: number | null;
  eval_tech_score: number | null;
  eval_price_score: number | null;
  task_scope: string | null;
  joint_supply_yn: boolean | null;
  required_docs: string | null;
  exec_location: string | null;
  key_tech_spec: string | null;
  disqualify_reason: string | null;
  contact_person: string | null;
}

export interface ApiRiskFactor {
  risk_category: string | null;
  risk_level: string | null;  // "high" | "medium" | "low"
  clause_title: string | null;
  clause_summary: string | null;
  mitigation_suggest: string | null;
}

export interface ApiBidDetailResponse extends ApiBidListItem {
  analysis_result: ApiAnalysisResult | null;
  risk_factors: ApiRiskFactor[];
}

// 페이지네이션 응답 (백엔드가 래핑할 경우)
export interface ApiBidListResponse {
  items: ApiBidListItem[];
  total: number;
  page: number;
  per_page: number;
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
    if (t === 'SI') return 'SI';
  }
  return '기타';
}

function mapPipelineStatus(status: string | null): AiStatusType {
  if (status === 'completed') return 'complete';
  return 'analyzing';
}

function normalizeDate(dateStr: string): string {
  // "YYYY-MM-DDTHH:mm:ss" → "YYYY-MM-DD"
  return dateStr ? dateStr.slice(0, 10) : '';
}

function mapApiRiskFactor(rf: ApiRiskFactor): RiskFactor {
  return {
    title: rf.clause_title ?? '알 수 없는 조항',
    desc: rf.clause_summary ?? rf.mitigation_suggest ?? '',
    severity: rf.risk_level === 'high' ? 'high' : 'medium',
  };
}

function mapAnalysisResultToBidDetail(
  analysis: ApiAnalysisResult,
  budget: number | null,
): BidDetail {
  const budgetFormatted = budget
    ? budget >= 100_000_000
      ? `${(budget / 100_000_000).toFixed(1).replace(/\.0$/, '')}억원 (부가세 포함)`
      : `${(budget / 10_000).toFixed(0)}만원 (부가세 포함)`
    : '미공개';

  const execPeriod = analysis.exec_period_months
    ? `${analysis.exec_period_months}개월`
    : '미정';

  const evalMethod =
    analysis.eval_tech_score != null && analysis.eval_price_score != null
      ? `기술 ${analysis.eval_tech_score} / 가격 ${analysis.eval_price_score}`
      : '미정';

  return {
    purpose: analysis.task_scope ?? '미정',
    execPeriod,
    budget: budgetFormatted,
    deliveryMethod: analysis.exec_location ?? '미정',
    techRequirement: analysis.key_tech_spec ?? '미정',
    bidMethod: analysis.bid_qualify ?? '미정',
    evalMethod,
    securityRequirement: analysis.disqualify_reason ?? '해당 없음',
    subcontractLimit: '미정',
    performanceBond: '미정',
    requiredDocs: analysis.required_docs ?? '미정',
    contactPerson: analysis.contact_person ?? '미정',
  };
}

export function mapApiBidListItemToBid(item: ApiBidListItem): Bid {
  const budget = item.presmpt_prce ?? item.asign_bdgt_amt ?? 0;
  return {
    id: String(item.bid_ntce_no),
    number: item.bid_ntce_no,
    title: item.bid_ntce_nm,
    agency: item.ntce_instt_nm,
    budget,
    deadline: normalizeDate(item.bid_clse_dt),
    risk: mapRiskLevel([], item.overall_risk),
    aiStatus: mapPipelineStatus(item.pipeline_status),
    type: mapBidType(item),
    dangerCount: item.danger_count ?? 0,
    collectedAt: normalizeDate(item.bid_ntce_dt),
  };
}

export function mapApiBidDetailToBid(res: ApiBidDetailResponse): Bid {
  const budget = res.presmpt_prce ?? res.asign_bdgt_amt ?? 0;
  const riskFactors = (res.risk_factors ?? []).map(mapApiRiskFactor);
  const risk = mapRiskLevel(res.risk_factors ?? [], res.overall_risk);

  return {
    id: String(res.bid_ntce_no),
    number: res.bid_ntce_no,
    title: res.bid_ntce_nm,
    agency: res.ntce_instt_nm,
    budget,
    deadline: normalizeDate(res.bid_clse_dt),
    risk,
    aiStatus: mapPipelineStatus(res.pipeline_status),
    type: mapBidType(res),
    dangerCount: riskFactors.filter((r) => r.severity === 'high').length,
    collectedAt: normalizeDate(res.bid_ntce_dt),
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
  page?: number;
  per_page?: number;
  date_from?: string; // "YYYY-MM-DD"
  date_to?: string;
}

/**
 * 공고 목록 조회. 실패 시 mockData로 fallback.
 */
export async function fetchBids(params?: FetchBidsParams): Promise<Bid[]> {
  try {
    const url = new URL(`${BASE_URL}/bids`);
    if (params?.page != null) url.searchParams.set('page', String(params.page));
    if (params?.per_page != null) url.searchParams.set('per_page', String(params.per_page));
    if (params?.date_from) url.searchParams.set('date_from', params.date_from);
    if (params?.date_to) url.searchParams.set('date_to', params.date_to);

    const res = await fetch(url.toString(), {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data: ApiBidListItem[] | ApiBidListResponse = await res.json();

    // 배열 또는 페이지네이션 래퍼 모두 처리
    const items: ApiBidListItem[] = Array.isArray(data) ? data : data.items;
    return items.map(mapApiBidListItemToBid);
  } catch (err) {
    console.warn('[api] fetchBids 실패 → mockData fallback:', err);
    return mockBids;
  }
}

/**
 * 공고 상세 조회 (분석결과 + 위험요소 포함). 실패 시 mockData에서 해당 공고 반환.
 */
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
