export type RiskLevel = 'danger' | 'caution' | 'good';
export type AiStatusType = 'analyzing' | 'complete';
export type BidType = 'ISP' | 'ISMP' | 'SI' | '기타';

export interface RiskFactor {
  title: string;
  desc: string;
  severity: 'high' | 'medium';
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
  detail?: BidDetail;
  riskFactors?: RiskFactor[];
}

export const TODAY = new Date('2026-04-04');

export const bids: Bid[] = [
  {
    id: '1', number: '나라-2026-04-11234', title: '행정안전부 전자정부 클라우드 전환 사업',
    agency: '행정안전부', budget: 2500000000, deadline: '2026-04-06',
    risk: 'danger', aiStatus: 'complete', type: 'ISP', dangerCount: 3, collectedAt: '2026-04-04',
    detail: {
      purpose: '전자정부 서비스 클라우드 전환 및 표준화',
      execPeriod: '12개월 (2026.06~2027.05)',
      budget: '25억원 (부가세 포함)',
      deliveryMethod: '현장+원격 혼합 수행',
      techRequirement: 'AWS/Azure 클라우드 필수',
      bidMethod: '제한경쟁입찰',
      evalMethod: '기술 70 / 가격 30',
      securityRequirement: 'CC인증 / 클라우드 보안인증',
      subcontractLimit: '계약금액의 50% 이내',
      performanceBond: '계약금액의 10%',
      requiredDocs: '사업수행계획서, 유사실적증명서, 기술인력확인서',
      contactPerson: '김담당 (044-205-1234)',
    },
    riskFactors: [
      { title: '최저가 낙찰제 적용', desc: '극단적 가격 경쟁 심화 예상 — 수익성 악화 및 덤핑 입찰 위험이 높습니다.', severity: 'high' },
      { title: '하도급 제한 50% 이하', desc: '외부 인력 활용 비율 제약으로 수행 체계 구성에 어려움이 있습니다.', severity: 'medium' },
      { title: '납기 위약금 일 0.3%', desc: '일정 지연 시 큰 손실 위험 — 프로젝트 리스크가 높은 조항입니다.', severity: 'high' },
    ],
  },
  {
    id: '2', number: '나라-2026-04-11235', title: '국토교통부 스마트시티 통합플랫폼 구축',
    agency: '국토교통부', budget: 1800000000, deadline: '2026-04-07',
    risk: 'caution', aiStatus: 'complete', type: 'SI', dangerCount: 1, collectedAt: '2026-04-04',
    detail: {
      purpose: '스마트시티 데이터 통합 및 플랫폼 고도화',
      execPeriod: '10개월 (2026.07~2027.04)',
      budget: '18억원 (부가세 포함)',
      deliveryMethod: '현장 상주 수행',
      techRequirement: 'IoT/빅데이터 플랫폼 구축 경험',
      bidMethod: '일반경쟁입찰',
      evalMethod: '기술 60 / 가격 40',
      securityRequirement: '정보보안 관리체계(ISMS) 인증',
      subcontractLimit: '계약금액의 40% 이내',
      performanceBond: '계약금액의 10%',
      requiredDocs: '사업수행계획서, 유사실적증명서',
      contactPerson: '이담당 (044-201-5678)',
    },
    riskFactors: [
      { title: '과업 범위 불명확', desc: '제안요청서 내 과업 범위가 포괄적으로 기술되어 추가 업무 발생 가능성이 있습니다.', severity: 'medium' },
    ],
  },
  {
    id: '3', number: '나라-2026-04-11236', title: '보건복지부 복지급여 통합관리시스템 고도화',
    agency: '보건복지부', budget: 950000000, deadline: '2026-04-10',
    risk: 'good', aiStatus: 'analyzing', type: 'ISMP', dangerCount: 0, collectedAt: '2026-04-04',
    detail: {
      purpose: '복지급여 통합관리 및 대국민 서비스 고도화',
      execPeriod: '8개월 (2026.06~2027.01)',
      budget: '9.5억원 (부가세 포함)',
      deliveryMethod: '원격 수행 가능',
      techRequirement: 'Java/Spring 기반 웹 시스템 개발 경험',
      bidMethod: '제한경쟁입찰',
      evalMethod: '기술 80 / 가격 20',
      securityRequirement: '개인정보보호법 준수',
      subcontractLimit: '계약금액의 30% 이내',
      performanceBond: '계약금액의 5%',
      requiredDocs: '사업수행계획서, 기술인력확인서',
      contactPerson: '박담당 (044-202-9012)',
    },
    riskFactors: [],
  },
  {
    id: '4', number: '나라-2026-04-11237', title: '교육부 AI 기반 학습관리시스템 구축',
    agency: '교육부', budget: 3200000000, deadline: '2026-04-12',
    risk: 'caution', aiStatus: 'complete', type: 'ISP', dangerCount: 2, collectedAt: '2026-04-03',
    detail: {
      purpose: 'AI 기반 맞춤형 학습 지원 시스템 구축',
      execPeriod: '14개월 (2026.07~2027.08)',
      budget: '32억원 (부가세 포함)',
      deliveryMethod: '현장+원격 혼합',
      techRequirement: 'AI/ML 모델 개발 및 운영 경험',
      bidMethod: '제한경쟁입찰',
      evalMethod: '기술 75 / 가격 25',
      securityRequirement: 'CC인증 필수',
      subcontractLimit: '계약금액의 50% 이내',
      performanceBond: '계약금액의 10%',
      requiredDocs: '사업수행계획서, AI 개발 실적증명서, 기술인력확인서',
      contactPerson: '최담당 (044-203-3456)',
    },
    riskFactors: [
      { title: '과업 범위 과다', desc: 'ISP 수립 + 시스템 구축을 동시에 요구하여 공수 산정 초과 위험이 있습니다.', severity: 'medium' },
      { title: '검수 기준 불명확', desc: '납품물 검수 기준이 주관적으로 기술되어 분쟁 가능성이 있습니다.', severity: 'medium' },
    ],
  },
  {
    id: '5', number: '나라-2026-04-11238', title: '금융감독원 내부통제 고도화 시스템',
    agency: '금융감독원', budget: 780000000, deadline: '2026-04-05',
    risk: 'danger', aiStatus: 'analyzing', type: '기타', dangerCount: 4, collectedAt: '2026-04-03',
    detail: {
      purpose: '내부통제 시스템 고도화 및 감시 체계 강화',
      execPeriod: '6개월 (2026.05~2026.10)',
      budget: '7.8억원 (부가세 포함)',
      deliveryMethod: '현장 상주 필수',
      techRequirement: '금융 시스템 개발 경험 필수',
      bidMethod: '수의계약',
      evalMethod: '기술 90 / 가격 10',
      securityRequirement: '금융보안원 보안 가이드 준수',
      subcontractLimit: '계약금액의 20% 이내',
      performanceBond: '계약금액의 15%',
      requiredDocs: '사업수행계획서, 금융업 실적증명서, 보안서약서',
      contactPerson: '정담당 (02-3145-7890)',
    },
    riskFactors: [
      { title: '하도급 전면 금지', desc: '자체 인력으로만 수행해야 하여 인력 운용에 심각한 제약이 있습니다.', severity: 'high' },
      { title: '지체상금 일 1%', desc: '업계 평균(0.3%) 대비 3배 이상 높은 지체상금으로 리스크가 매우 높습니다.', severity: 'high' },
      { title: '계약 해지 권한 과다', desc: '발주처가 일방적으로 계약을 해지할 수 있는 조항이 포함되어 있습니다.', severity: 'high' },
      { title: '6개월 하자보수', desc: '준공 후 하자보수 기간이 6개월로 업무 부담이 지속됩니다.', severity: 'medium' },
    ],
  },
  {
    id: '6', number: '나라-2026-04-11239', title: '중소벤처기업부 창업지원 데이터 플랫폼',
    agency: '중소벤처기업부', budget: 1200000000, deadline: '2026-04-15',
    risk: 'good', aiStatus: 'complete', type: 'ISMP', dangerCount: 0, collectedAt: '2026-04-03',
    detail: {
      purpose: '창업 지원 데이터 통합 및 분석 플랫폼 구축',
      execPeriod: '10개월 (2026.06~2027.03)',
      budget: '12억원 (부가세 포함)',
      deliveryMethod: '원격 수행 가능',
      techRequirement: '빅데이터 분석 및 시각화 경험',
      bidMethod: '일반경쟁입찰',
      evalMethod: '기술 70 / 가격 30',
      securityRequirement: '개인정보보호법 준수',
      subcontractLimit: '계약금액의 50% 이내',
      performanceBond: '계약금액의 10%',
      requiredDocs: '사업수행계획서, 유사실적증명서',
      contactPerson: '한담당 (044-204-2345)',
    },
    riskFactors: [],
  },
  {
    id: '7', number: '나라-2026-04-11240', title: '환경부 탄소중립 모니터링 시스템 구축',
    agency: '환경부', budget: 2100000000, deadline: '2026-04-18',
    risk: 'good', aiStatus: 'complete', type: 'SI', dangerCount: 0, collectedAt: '2026-04-02',
    detail: {
      purpose: '탄소중립 이행 현황 모니터링 및 분석 시스템 구축',
      execPeriod: '12개월 (2026.06~2027.05)',
      budget: '21억원 (부가세 포함)',
      deliveryMethod: '현장+원격 혼합',
      techRequirement: '환경 데이터 수집/분석 시스템 경험',
      bidMethod: '제한경쟁입찰',
      evalMethod: '기술 65 / 가격 35',
      securityRequirement: '정보보안 관리체계(ISMS) 인증',
      subcontractLimit: '계약금액의 50% 이내',
      performanceBond: '계약금액의 10%',
      requiredDocs: '사업수행계획서, 유사실적증명서, 기술인력확인서',
      contactPerson: '오담당 (044-201-6789)',
    },
    riskFactors: [],
  },
  {
    id: '8', number: '나라-2026-04-11241', title: '경찰청 디지털포렌식 역량강화 시스템',
    agency: '경찰청', budget: 890000000, deadline: '2026-04-22',
    risk: 'caution', aiStatus: 'analyzing', type: '기타', dangerCount: 1, collectedAt: '2026-04-02',
    detail: {
      purpose: '디지털포렌식 수사 역량 강화 및 시스템 고도화',
      execPeriod: '8개월 (2026.06~2027.01)',
      budget: '8.9억원 (부가세 포함)',
      deliveryMethod: '현장 상주 필수',
      techRequirement: '디지털포렌식 솔루션 개발 경험',
      bidMethod: '제한경쟁입찰',
      evalMethod: '기술 85 / 가격 15',
      securityRequirement: '국가정보원 보안 적합성 검토',
      subcontractLimit: '계약금액의 30% 이내',
      performanceBond: '계약금액의 10%',
      requiredDocs: '사업수행계획서, 보안서약서, 신원조회동의서',
      contactPerson: '임담당 (02-3150-1234)',
    },
    riskFactors: [
      { title: '보안서약 위반 시 형사처벌', desc: '보안 사고 발생 시 형사처벌 조항이 포함되어 있어 각별한 주의가 필요합니다.', severity: 'medium' },
    ],
  },
  {
    id: '9', number: '나라-2026-03-11220', title: '국세청 세무행정 디지털 전환 ISP',
    agency: '국세청', budget: 1500000000, deadline: '2026-04-20',
    risk: 'good', aiStatus: 'complete', type: 'ISP', dangerCount: 0, collectedAt: '2026-03-31',
    detail: {
      purpose: '세무행정 전반의 디지털 전환 전략 수립',
      execPeriod: '6개월 (2026.05~2026.10)',
      budget: '15억원 (부가세 포함)',
      deliveryMethod: '현장+원격 혼합',
      techRequirement: 'ISP 수립 경험 5건 이상',
      bidMethod: '제한경쟁입찰',
      evalMethod: '기술 80 / 가격 20',
      securityRequirement: '개인정보보호법 준수',
      subcontractLimit: '계약금액의 50% 이내',
      performanceBond: '계약금액의 10%',
      requiredDocs: '사업수행계획서, ISP 수행실적증명서',
      contactPerson: '송담당 (044-204-5678)',
    },
    riskFactors: [],
  },
  {
    id: '10', number: '나라-2026-03-11215', title: '산업통상자원부 에너지 데이터 플랫폼 구축',
    agency: '산업통상자원부', budget: 4200000000, deadline: '2026-04-25',
    risk: 'caution', aiStatus: 'complete', type: 'ISMP', dangerCount: 1, collectedAt: '2026-03-30',
    detail: {
      purpose: '에너지 데이터 수집/분석/활용 통합 플랫폼 구축',
      execPeriod: '16개월 (2026.06~2027.09)',
      budget: '42억원 (부가세 포함)',
      deliveryMethod: '현장 상주 수행',
      techRequirement: '에너지 분야 데이터 플랫폼 구축 경험',
      bidMethod: '일반경쟁입찰',
      evalMethod: '기술 70 / 가격 30',
      securityRequirement: 'ISMS-P 인증',
      subcontractLimit: '계약금액의 50% 이내',
      performanceBond: '계약금액의 10%',
      requiredDocs: '사업수행계획서, 유사실적증명서, 기술인력확인서',
      contactPerson: '윤담당 (044-203-8901)',
    },
    riskFactors: [
      { title: '규모 대비 기간 부족', desc: '42억 규모 사업을 16개월 내 완료해야 하여 일정 리스크가 존재합니다.', severity: 'medium' },
    ],
  },
];

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
