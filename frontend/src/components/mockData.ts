export type RiskLevel = 'danger' | 'caution' | 'good';
export type AiStatusType = 'analyzing' | 'complete';
export type BidType = 'ISP' | 'ISMP' | 'SI' | '기타';

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
}

export const bids: Bid[] = [
  {
    id: '1',
    number: '나라-2026-04-11234',
    title: '행정안전부 전자정부 클라우드 전환 사업',
    agency: '행정안전부',
    budget: 2500000000,
    deadline: '2026-04-06',
    risk: 'danger',
    aiStatus: 'complete',
    type: 'ISP',
    dangerCount: 3,
  },
  {
    id: '2',
    number: '나라-2026-04-11235',
    title: '국토교통부 스마트시티 통합플랫폼 구축',
    agency: '국토교통부',
    budget: 1800000000,
    deadline: '2026-04-07',
    risk: 'caution',
    aiStatus: 'complete',
    type: 'SI',
    dangerCount: 1,
  },
  {
    id: '3',
    number: '나라-2026-04-11236',
    title: '보건복지부 복지급여 통합관리시스템 고도화',
    agency: '보건복지부',
    budget: 950000000,
    deadline: '2026-04-10',
    risk: 'good',
    aiStatus: 'analyzing',
    type: 'ISMP',
    dangerCount: 0,
  },
  {
    id: '4',
    number: '나라-2026-04-11237',
    title: '교육부 AI 기반 학습관리시스템 구축',
    agency: '교육부',
    budget: 3200000000,
    deadline: '2026-04-12',
    risk: 'caution',
    aiStatus: 'complete',
    type: 'ISP',
    dangerCount: 2,
  },
  {
    id: '5',
    number: '나라-2026-04-11238',
    title: '금융감독원 내부통제 고도화 시스템',
    agency: '금융감독원',
    budget: 780000000,
    deadline: '2026-04-05',
    risk: 'danger',
    aiStatus: 'analyzing',
    type: '기타',
    dangerCount: 4,
  },
  {
    id: '6',
    number: '나라-2026-04-11239',
    title: '중소벤처기업부 창업지원 데이터 플랫폼',
    agency: '중소벤처기업부',
    budget: 1200000000,
    deadline: '2026-04-15',
    risk: 'good',
    aiStatus: 'complete',
    type: 'ISMP',
    dangerCount: 0,
  },
  {
    id: '7',
    number: '나라-2026-04-11240',
    title: '환경부 탄소중립 모니터링 시스템 구축',
    agency: '환경부',
    budget: 2100000000,
    deadline: '2026-04-18',
    risk: 'good',
    aiStatus: 'complete',
    type: 'SI',
    dangerCount: 0,
  },
  {
    id: '8',
    number: '나라-2026-04-11241',
    title: '경찰청 디지털포렌식 역량강화 시스템',
    agency: '경찰청',
    budget: 890000000,
    deadline: '2026-04-22',
    risk: 'caution',
    aiStatus: 'analyzing',
    type: '기타',
    dangerCount: 1,
  },
];

export const TODAY = new Date('2026-04-04');

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
