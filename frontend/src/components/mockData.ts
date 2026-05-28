export type RiskLevel = 'danger' | 'caution' | 'good';
export type AiStatusType = 'none' | 'pending' | 'analyzing' | 'complete';
export type BidType = 'ISP' | 'ISMP' | '기타';

export interface BidFlags {
  bookmarked: boolean;
  inProgress: boolean;
}

export type Severity = 'caution' | 'warning' | 'danger';

export interface RiskFactor {
  category: string;   // S1~L4 또는 OTHER
  clause: string;     // RFP 원문 조항
  severity: Severity; // caution | warning | danger
  reason: string;     // 판단 근거
  source: string;     // 출처 (절/조항/페이지)
}

export interface RequirementItem {
  category: string;
  code: string;
  name: string;
  definition: string;
  detail: string;
}

export interface AnalysisLog {
  time: string;
  message: string;
  status: 'info' | 'success' | 'error';
}

export interface Attachment {
  id: number | null;
  fileName: string;
  fileUrl: string;
  fileType: string;
}

export interface BidDetail {
  purpose: string;
  execPeriod: string;
  budget: string;
  deliveryMethod: string;
  techRequirement: string;
  bidMethod: string;
  evalMethod: string;
  securityRequirement: string;
  subcontractLimit: string;
  performanceBond: string;
  requiredDocs: string;
  contactPerson: string;
  analysisModel?: string;
  analysisLogs?: AnalysisLog[];
  requirements?: RequirementItem[];
}

export interface Bid {
  id: string;
  number: string;
  title: string;
  agency: string;
  budget: number;
  deadline: string;
  risk: RiskLevel;
  aiStatus: AiStatusType;
  type: BidType;
  dangerCount: number;
  collectedAt: string;
  is_bookmarked?: boolean;
  is_in_progress?: boolean;
  is_expired?: boolean;
  ntce_dtl_url?: string;
  detail?: BidDetail;
  riskFactors?: RiskFactor[];
  attachments?: Attachment[];
}

export const TODAY = new Date();

export const formatBudget = (amount: number): string => {
  if (amount >= 100000000) {
    const eok = amount / 100000000;
    return `${eok % 1 === 0 ? eok.toFixed(0) : eok.toFixed(1)}억원`;
  }
  return `${(amount / 10000).toFixed(0)}만원`;
};

export const getDaysUntilDeadline = (deadline: string): number => {
  const deadlineDate = new Date(deadline);
  return Math.ceil((deadlineDate.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24));
};

export const isDeadlineUrgent = (deadline: string): boolean => {
  return getDaysUntilDeadline(deadline) <= 3;
};
