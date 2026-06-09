import { AlertTriangle, Briefcase, TrendingUp, Clock, DollarSign, Shield } from 'lucide-react';
import { type Bid, type BidFlags, type AiStatusType, formatBudget, getDaysUntilDeadline } from '../types';
import { RiskBadge, AiStatusIndicator } from './BidTable';

interface StrategyReportPageProps {
  bids: Bid[];
  bidFlags: Record<string, BidFlags>;
  aiStatuses: Record<string, AiStatusType>;
}

const CEO_COLOR = '#7C3AED';
const CEO_BG = 'rgba(124,58,237,0.08)';
const CEO_BORDER = 'rgba(124,58,237,0.2)';

export function StrategyReportPage({ bids, bidFlags, aiStatuses }: StrategyReportPageProps) {
  const inProgressBids = bids.filter(b => bidFlags[b.id]?.inProgress ?? false);

  if (inProgressBids.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <PageHeader />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', gap: '12px', backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '12px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', backgroundColor: CEO_BG, border: `1px solid ${CEO_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Briefcase style={{ width: '26px', height: '26px', color: CEO_COLOR }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--dash-text)', marginBottom: '6px' }}>아직 진행 중인 사업이 없습니다</div>
            <div style={{ fontSize: '13px', color: 'var(--dash-text-4)' }}>담당자가 공고에 진행 등록을 하면 여기에 표시됩니다</div>
          </div>
        </div>
      </div>
    );
  }

  const totalBudget = inProgressBids.reduce((s, b) => s + b.budget, 0);
  const avgDaysLeft = Math.round(
    inProgressBids.reduce((s, b) => s + getDaysUntilDeadline(b.deadline), 0) / inProgressBids.length
  );
  const dangerCount = inProgressBids.filter(b => b.risk === 'danger').length;
  const dangerPct = Math.round((dangerCount / inProgressBids.length) * 100);

  const sortedBids = [...inProgressBids].sort((a, b) => {
    const order = { danger: 0, caution: 1, good: 2 };
    return order[a.risk] - order[b.risk];
  });

  const dangerBids = inProgressBids.filter(b => b.risk === 'danger');

  const summaryCards = [
    { icon: Briefcase,   label: '총 진행 사업',      value: `${inProgressBids.length}건`,     color: CEO_COLOR,  bg: CEO_BG,                      border: CEO_BORDER },
    { icon: DollarSign,  label: '총 사업 예산',      value: formatBudget(totalBudget),        color: '#0891B2',  bg: 'rgba(8,145,178,0.08)',       border: 'rgba(8,145,178,0.2)' },
    { icon: Clock,       label: '평균 마감까지',      value: `${avgDaysLeft}일`,               color: '#F59E0B',  bg: 'rgba(245,158,11,0.08)',      border: 'rgba(245,158,11,0.2)' },
    { icon: AlertTriangle, label: '위험 공고 비율',   value: `${dangerPct}%`,                  color: '#EF4444',  bg: 'rgba(239,68,68,0.08)',       border: 'rgba(239,68,68,0.2)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader />

      {/* 요약 카드 4개 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        {summaryCards.map((card) => (
          <div key={card.label} style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '12px', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: card.bg, border: `1px solid ${card.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <card.icon style={{ width: '16px', height: '16px', color: card.color }} />
              </div>
              <span style={{ fontSize: '12px', color: 'var(--dash-text-3)' }}>{card.label}</span>
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--dash-text)' }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* 진행중 공고 현황 테이블 */}
      <div style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--dash-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp style={{ width: '15px', height: '15px', color: CEO_COLOR }} />
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--dash-text)', margin: 0 }}>진행 중인 공고 현황</h2>
          <span style={{ fontSize: '11px', padding: '1px 8px', borderRadius: '10px', backgroundColor: CEO_BG, color: CEO_COLOR }}>{inProgressBids.length}건</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--dash-card-deep)' }}>
                {['공고명', '발주기관', '예산', '마감일', '위험도', 'AI 분석'].map(col => (
                  <th key={col} style={{ padding: '9px 14px', textAlign: 'left', fontSize: '11px', color: 'var(--dash-text-4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', borderBottom: '1px solid var(--dash-border)' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedBids.map((bid) => {
                const daysLeft = getDaysUntilDeadline(bid.deadline);
                const urgent = daysLeft <= 3;
                return (
                  <tr key={bid.id} style={{ borderBottom: '1px solid var(--dash-border-faint)' }}>
                    <td style={{ padding: '10px 14px', maxWidth: '260px' }}>
                      <div style={{ fontSize: '13px', color: 'var(--dash-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bid.title}</div>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--dash-text-2)', whiteSpace: 'nowrap' }}>{bid.agency}</td>
                    <td style={{ padding: '10px 14px', fontSize: '13px', color: 'var(--dash-text)', fontWeight: 500, whiteSpace: 'nowrap' }}>{formatBudget(bid.budget)}</td>
                    <td style={{ padding: '10px 14px', fontSize: '12px', color: urgent ? '#F27A75' : 'var(--dash-text-2)', fontWeight: urgent ? 600 : 400, whiteSpace: 'nowrap' }}>
                      {bid.deadline.substring(5)}{urgent && (daysLeft < 0 ? ' (마감)' : ` (D-${daysLeft})`)}
                    </td>
                    <td style={{ padding: '10px 14px' }}><RiskBadge risk={bid.risk} /></td>
                    <td style={{ padding: '10px 14px' }}><AiStatusIndicator status={aiStatuses[bid.id] ?? 'none'} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 위험 공고 요약 */}
      <div style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--dash-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield style={{ width: '15px', height: '15px', color: '#EF4444' }} />
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--dash-text)', margin: 0 }}>위험 공고 요약</h2>
          <span style={{ fontSize: '11px', padding: '1px 8px', borderRadius: '10px', backgroundColor: dangerBids.length > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', color: dangerBids.length > 0 ? '#EF4444' : '#22C55E' }}>{dangerBids.length}건</span>
        </div>
        {dangerBids.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', fontSize: '13px', color: '#22C55E' }}>위험 공고가 없습니다 ✓</div>
        ) : (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {dangerBids.map((bid) => (
              <div key={bid.id} style={{ padding: '14px 16px', borderRadius: '10px', backgroundColor: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)', borderLeft: '3px solid #EF4444' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--dash-text)' }}>{bid.title}</span>
                  {(bid.riskFactors?.length ?? 0) > 0 && (
                    <span style={{ fontSize: '11px', padding: '1px 7px', borderRadius: '10px', backgroundColor: 'rgba(239,68,68,0.12)', color: '#EF4444', flexShrink: 0 }}>독소조항 {bid.riskFactors!.length}건</span>
                  )}
                </div>
                {bid.riskFactors && bid.riskFactors.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {bid.riskFactors.slice(0, 2).map((rf, i) => (
                      <div key={i} style={{ fontSize: '12px', color: 'var(--dash-text-3)' }}>
                        <span style={{ color: '#EF4444', fontWeight: 600 }}>• </span>{rf.category}: {rf.clause}
                      </div>
                    ))}
                    {bid.riskFactors.length > 2 && (
                      <div style={{ fontSize: '11px', color: 'var(--dash-text-4)' }}>+{bid.riskFactors.length - 2}건 더보기</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PageHeader() {
  return (
    <div>
      <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--dash-text)', margin: '0 0 4px' }}>전략 리포트</h1>
      <p style={{ fontSize: '13px', color: 'var(--dash-text-3)', margin: 0 }}>진행 중인 사업의 현황을 요약합니다</p>
    </div>
  );
}
