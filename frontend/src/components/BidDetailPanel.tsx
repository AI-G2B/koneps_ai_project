import {
  Target,
  Clock,
  Wallet,
  Truck,
  Code2,
  Gavel,
  BarChart2,
  Shield,
  GitBranch,
  Percent,
  AlertTriangle,
  FileText,
  ArrowRight,
  BrainCircuit,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { type Bid, formatBudget, getDaysUntilDeadline } from './mockData';
import { RiskBadge, AiStatusIndicator } from './BidTable';

const AI_ITEMS = [
  { icon: Target, label: '사업 목적', value: '클라우드 전환 및 표준화' },
  { icon: Clock, label: '수행 기간', value: '12개월 (2026.06~2027.05)' },
  { icon: Wallet, label: '예산 규모', value: '25억원 (부가세 포함)' },
  { icon: Truck, label: '납품 방식', value: '현장+원격 혼합 수행' },
  { icon: Code2, label: '기술 요건', value: 'AWS/Azure 클라우드 필수' },
  { icon: Gavel, label: '입찰 방식', value: '제한경쟁입찰' },
  { icon: BarChart2, label: '평가 방식', value: '기술 70 / 가격 30' },
  { icon: Shield, label: '보안 요건', value: 'CC인증 / 클라우드 보안인증' },
  { icon: GitBranch, label: '하도급 제한', value: '계약금액의 50% 이내' },
  { icon: Percent, label: '이행보증금', value: '계약금액의 10%' },
];

const WARNINGS = [
  {
    title: '최저가 낙찰제 적용',
    desc: '극단적 가격 경쟁 심화 예상 — 수익성 악화 및 덤핑 입찰 위험이 높습니다.',
    severity: 'high' as const,
  },
  {
    title: '하도급 제한 50% 이하',
    desc: '외부 인력 활용 비율 제약으로 수행 체계 구성에 어려움이 있습니다.',
    severity: 'medium' as const,
  },
  {
    title: '납기 위약금 일 0.3%',
    desc: '일정 지연 시 큰 손실 위험 — 프로젝트 리스크가 높은 조항입니다.',
    severity: 'high' as const,
  },
];

interface BidDetailPanelProps {
  bid: Bid | null;
}

export function BidDetailPanel({ bid }: BidDetailPanelProps) {
  if (!bid) {
    return (
      <div
        className="w-[390px] flex-shrink-0 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)' }}
      >
        <div className="text-center p-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ backgroundColor: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.15)' }}
          >
            <FileText style={{ width: '24px', height: '24px', color: '#2563EB' }} />
          </div>
          <p style={{ fontSize: '13px', color: 'var(--dash-text-4)', lineHeight: 1.7 }}>
            공고를 선택하면<br />AI 분석 결과가 표시됩니다
          </p>
        </div>
      </div>
    );
  }

  const daysLeft = getDaysUntilDeadline(bid.deadline);
  const isUrgent = daysLeft <= 3;

  return (
    <div
      className="w-[390px] flex-shrink-0 rounded-xl flex flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)' }}
    >
      {/* Panel header */}
      <div
        className="flex-shrink-0 px-5 py-4"
        style={{
          borderBottom: '1px solid var(--dash-border)',
          background: 'var(--dash-panel-header)',
        }}
      >
        {/* Badges row */}
        <div className="flex items-center gap-2 mb-2.5">
          <span
            className="flex items-center gap-1.5 rounded-full"
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              backgroundColor: 'rgba(37,99,235,0.15)',
              color: '#60A5FA',
              border: '1px solid rgba(37,99,235,0.2)',
            }}
          >
            <Zap style={{ width: '10px', height: '10px' }} />
            AI 분석 완료
          </span>
          <RiskBadge risk={bid.risk} />
          {isUrgent && (
            <span
              className="ml-auto rounded-full"
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                backgroundColor: 'rgba(239,68,68,0.15)',
                color: '#EF4444',
                border: '1px solid rgba(239,68,68,0.25)',
                fontWeight: 600,
              }}
            >
              D-{daysLeft}
            </span>
          )}
        </div>

        {/* Title */}
        <h3
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--dash-text)',
            lineHeight: 1.5,
            marginBottom: '12px',
          }}
        >
          {bid.title}
        </h3>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-2">
          <InfoCell label="발주기관" value={bid.agency} />
          <InfoCell label="사업 유형" value={bid.type} />
          <InfoCell
            label="예산"
            value={formatBudget(bid.budget)}
            valueStyle={{ fontSize: '14px', fontWeight: 700, color: '#F59E0B' }}
          />
          <InfoCell
            label="마감일"
            value={`${bid.deadline.substring(5)} (${daysLeft}일 후)`}
            valueStyle={{ color: isUrgent ? '#EF4444' : 'var(--dash-text-2)', fontWeight: isUrgent ? 600 : 400 }}
          />
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--dash-scrollbar) transparent' }}>
        {/* AI Key Items */}
        <div
          className="px-5 py-4"
          style={{ borderBottom: '1px solid var(--dash-border)' }}
        >
          <SectionTitle
            icon={BrainCircuit}
            title="AI 추출 핵심항목"
            badge="10"
            accentColor="#2563EB"
          />
          <div className="grid grid-cols-2 gap-2 mt-3">
            {AI_ITEMS.map((item) => (
              <div
                key={item.label}
                className="flex items-start gap-2 rounded-lg"
                style={{
                  padding: '8px',
                  backgroundColor: 'var(--dash-item-bg)',
                  border: '1px solid var(--dash-border-item)',
                }}
              >
                <item.icon
                  style={{ width: '13px', height: '13px', color: '#2563EB', flexShrink: 0, marginTop: '1px' }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '10px', color: 'var(--dash-text-4)', marginBottom: '1px' }}>{item.label}</div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--dash-text-detail)',
                      lineHeight: 1.4,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Warnings */}
        <div className="px-5 py-4">
          <SectionTitle
            icon={AlertTriangle}
            title="위험요소 (독소조항)"
            badge={`${WARNINGS.length}건`}
            accentColor="#EF4444"
            badgeBg="rgba(239,68,68,0.12)"
            badgeColor="#EF4444"
          />
          <div className="space-y-2 mt-3">
            {WARNINGS.map((w) => (
              <WarningCard key={w.title} title={w.title} desc={w.desc} severity={w.severity} />
            ))}
          </div>
        </div>
      </div>

      {/* CTA footer */}
      <div
        className="flex-shrink-0 px-5 py-4"
        style={{ borderTop: '1px solid var(--dash-border)' }}
      >
        <button
          className="w-full flex items-center justify-center gap-2 rounded-xl transition-all"
          style={{
            padding: '11px 16px',
            fontSize: '14px',
            fontWeight: 600,
            color: 'white',
            background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
            boxShadow: '0 4px 16px rgba(37,99,235,0.3)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(37,99,235,0.4)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(37,99,235,0.3)';
          }}
        >
          <FileText style={{ width: '16px', height: '16px' }} />
          제안목차 생성
          <ArrowRight style={{ width: '14px', height: '14px' }} />
        </button>
        <button
          className="w-full flex items-center justify-center gap-1.5 rounded-xl transition-colors mt-2"
          style={{
            padding: '9px 16px',
            fontSize: '13px',
            color: 'var(--dash-text-2)',
            backgroundColor: 'transparent',
            border: '1px solid var(--dash-border-med)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text)';
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--dash-item-bg-alt)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-2)';
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
          }}
        >
          상세 분석 리포트 보기
          <ChevronRight style={{ width: '13px', height: '13px' }} />
        </button>
      </div>
    </div>
  );
}

function InfoCell({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: string;
  valueStyle?: React.CSSProperties;
}) {
  return (
    <div
      className="rounded-lg"
      style={{ padding: '8px 10px', backgroundColor: 'var(--dash-item-bg-alt)' }}
    >
      <div style={{ fontSize: '10px', color: 'var(--dash-text-4)', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '12px', color: 'var(--dash-text-2)', ...valueStyle }}>{value}</div>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  badge,
  accentColor,
  badgeBg,
  badgeColor,
}: {
  icon: React.ElementType;
  title: string;
  badge?: string;
  accentColor: string;
  badgeBg?: string;
  badgeColor?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="rounded-md flex items-center justify-center flex-shrink-0"
        style={{
          width: '20px',
          height: '20px',
          backgroundColor: `${accentColor}20`,
        }}
      >
        <Icon style={{ width: '12px', height: '12px', color: accentColor }} />
      </div>
      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--dash-text)' }}>{title}</span>
      {badge && (
        <span
          className="ml-auto rounded-full"
          style={{
            fontSize: '11px',
            padding: '1px 7px',
            backgroundColor: badgeBg || `${accentColor}20`,
            color: badgeColor || accentColor,
          }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

function WarningCard({
  title,
  desc,
  severity,
}: {
  title: string;
  desc: string;
  severity: 'high' | 'medium';
}) {
  const isHigh = severity === 'high';
  return (
    <div
      className="rounded-lg"
      style={{
        padding: '10px 12px',
        backgroundColor: isHigh ? 'rgba(239,68,68,0.07)' : 'rgba(249,115,22,0.07)',
        borderTop: `1px solid ${isHigh ? 'rgba(239,68,68,0.15)' : 'rgba(249,115,22,0.15)'}`,
        borderRight: `1px solid ${isHigh ? 'rgba(239,68,68,0.15)' : 'rgba(249,115,22,0.15)'}`,
        borderBottom: `1px solid ${isHigh ? 'rgba(239,68,68,0.15)' : 'rgba(249,115,22,0.15)'}`,
        borderLeft: `3px solid ${isHigh ? '#EF4444' : '#F97316'}`,
      }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <AlertTriangle
          style={{ width: '12px', height: '12px', color: isHigh ? '#EF4444' : '#F97316', flexShrink: 0 }}
        />
        <span
          style={{ fontSize: '11px', fontWeight: 600, color: isHigh ? '#EF4444' : '#F97316' }}
        >
          독소조항
        </span>
        <span style={{ fontSize: '11px', color: 'var(--dash-text)', fontWeight: 500 }}>— {title}</span>
      </div>
      <p style={{ fontSize: '11px', color: 'var(--dash-text-2)', lineHeight: 1.6 }}>{desc}</p>
    </div>
  );
}
