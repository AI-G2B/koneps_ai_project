import {
  Target, Clock, Wallet, Truck, Code2, Gavel, BarChart2, Shield,
  GitBranch, Percent, AlertTriangle, FileText, ArrowRight,
  BrainCircuit, ChevronRight, Zap, Phone, ScrollText, Loader2,
} from 'lucide-react';
import { type Bid, formatBudget, getDaysUntilDeadline } from './mockData';
import { RiskBadge } from './BidTable';

interface BidDetailPanelProps {
  bid: Bid | null;
  detailLoading?: boolean;
}

export function BidDetailPanel({ bid, detailLoading = false }: BidDetailPanelProps) {
  if (!bid) {
    return (
      <div className="w-[390px] flex-shrink-0 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)' }}>
        <div className="text-center p-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.15)' }}>
            <FileText style={{ width: '24px', height: '24px', color: '#2563EB' }} />
          </div>
          <p style={{ fontSize: '13px', color: 'var(--dash-text-4)', lineHeight: 1.7 }}>공고를 선택하면<br />AI 분석 결과가 표시됩니다</p>
        </div>
      </div>
    );
  }

  const daysLeft = getDaysUntilDeadline(bid.deadline);
  const isUrgent = daysLeft <= 3;
  const detail = bid.detail;
  const riskFactors = bid.riskFactors ?? [];
  const isAnalyzing = bid.aiStatus === 'analyzing';
  // 네트워크로 상세 조회 중이거나 AI 파이프라인이 분석 중인 경우
  const showLoadingOverlay = detailLoading;

  const AI_ITEMS = detail ? [
    { icon: Target,    label: '사업 목적',   value: detail.purpose },
    { icon: Clock,     label: '수행 기간',   value: detail.execPeriod },
    { icon: Wallet,    label: '예산 규모',   value: detail.budget },
    { icon: Truck,     label: '납품 방식',   value: detail.deliveryMethod },
    { icon: Code2,     label: '기술 요건',   value: detail.techRequirement },
    { icon: Gavel,     label: '입찰 방식',   value: detail.bidMethod },
    { icon: BarChart2, label: '평가 방식',   value: detail.evalMethod },
    { icon: Shield,    label: '보안 요건',   value: detail.securityRequirement },
    { icon: GitBranch, label: '하도급 제한', value: detail.subcontractLimit },
    { icon: Percent,   label: '이행보증금',  value: detail.performanceBond },
    { icon: ScrollText,label: '필수 서류',   value: detail.requiredDocs },
    { icon: Phone,     label: '담당자',      value: detail.contactPerson },
  ] : [];

  return (
    <div className="w-[390px] flex-shrink-0 rounded-xl flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)' }}>
      {/* 헤더 */}
      <div className="flex-shrink-0 px-5 py-4" style={{ borderBottom: '1px solid var(--dash-border)', background: 'var(--dash-panel-header)' }}>
        <div className="flex items-center gap-2 mb-2.5">
          <span className="flex items-center gap-1.5 rounded-full" style={{ fontSize: '11px', padding: '2px 8px', backgroundColor: isAnalyzing ? 'rgba(245,158,11,0.15)' : 'rgba(37,99,235,0.15)', color: isAnalyzing ? '#F59E0B' : '#60A5FA', border: `1px solid ${isAnalyzing ? 'rgba(245,158,11,0.2)' : 'rgba(37,99,235,0.2)'}` }}>
            {isAnalyzing ? <Loader2 className="animate-spin" style={{ width: '10px', height: '10px' }} /> : <Zap style={{ width: '10px', height: '10px' }} />}
            {isAnalyzing ? 'AI 분석 중' : 'AI 분석 완료'}
          </span>
          <RiskBadge risk={bid.risk} />
          {isUrgent && (
            <span className="ml-auto rounded-full" style={{ fontSize: '11px', padding: '2px 8px', backgroundColor: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)', fontWeight: 600 }}>
              D-{daysLeft}
            </span>
          )}
        </div>

        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--dash-text)', lineHeight: 1.5, marginBottom: '12px' }}>
          {bid.title}
        </h3>

        <div className="grid grid-cols-2 gap-2">
          <InfoCell label="발주기관" value={bid.agency} />
          <InfoCell label="사업 유형" value={bid.type} />
          <InfoCell label="예산" value={formatBudget(bid.budget)} valueStyle={{ fontSize: '14px', fontWeight: 700, color: '#F59E0B' }} />
          <InfoCell label="마감일" value={`${bid.deadline.substring(5)} (${daysLeft}일 후)`} valueStyle={{ color: isUrgent ? '#EF4444' : 'var(--dash-text-2)', fontWeight: isUrgent ? 600 : 400 }} />
        </div>
      </div>

      {/* 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--dash-scrollbar) transparent' }}>

        {/* 네트워크 상세 로딩 */}
        {showLoadingOverlay && (
          <div className="px-5 py-6 flex flex-col items-center justify-center" style={{ borderBottom: '1px solid var(--dash-border)' }}>
            <Loader2 className="animate-spin mb-3" style={{ width: '28px', height: '28px', color: '#2563EB' }} />
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--dash-text)', marginBottom: '4px' }}>상세 정보를 불러오는 중입니다</div>
            <div style={{ fontSize: '12px', color: 'var(--dash-text-4)', textAlign: 'center', lineHeight: 1.6 }}>
              분석 결과 및 위험요소를 조회하고 있습니다.
            </div>
          </div>
        )}

        {/* 분석 중 안내 */}
        {!showLoadingOverlay && isAnalyzing && (
          <div className="px-5 py-6 flex flex-col items-center justify-center" style={{ borderBottom: '1px solid var(--dash-border)' }}>
            <Loader2 className="animate-spin mb-3" style={{ width: '28px', height: '28px', color: '#F59E0B' }} />
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--dash-text)', marginBottom: '4px' }}>AI 분석이 진행 중입니다</div>
            <div style={{ fontSize: '12px', color: 'var(--dash-text-4)', textAlign: 'center', lineHeight: 1.6 }}>
              공고 문서를 파싱하고 핵심 항목을<br />추출하고 있습니다. 잠시만 기다려주세요.
            </div>
          </div>
        )}

        {/* AI 핵심 항목 */}
        {!isAnalyzing && detail && (
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--dash-border)' }}>
            <SectionTitle icon={BrainCircuit} title="AI 추출 핵심항목" badge="12" accentColor="#2563EB" />
            <div className="grid grid-cols-2 gap-2 mt-3">
              {AI_ITEMS.map((item) => (
                <div key={item.label} className="flex items-start gap-2 rounded-lg" style={{ padding: '8px', backgroundColor: 'var(--dash-item-bg)', border: '1px solid var(--dash-border-item)' }}>
                  <item.icon style={{ width: '13px', height: '13px', color: '#2563EB', flexShrink: 0, marginTop: '1px' }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '10px', color: 'var(--dash-text-4)', marginBottom: '1px' }}>{item.label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--dash-text-detail)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.value}>
                      {item.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 위험요소 */}
        {!isAnalyzing && (
          <div className="px-5 py-4">
            <SectionTitle
              icon={AlertTriangle}
              title="위험요소 (독소조항)"
              badge={riskFactors.length > 0 ? `${riskFactors.length}건` : '없음'}
              accentColor={riskFactors.length > 0 ? '#EF4444' : '#22C55E'}
              badgeBg={riskFactors.length > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)'}
              badgeColor={riskFactors.length > 0 ? '#EF4444' : '#22C55E'}
            />
            {riskFactors.length === 0 ? (
              <div className="mt-3 rounded-lg flex items-center gap-2" style={{ padding: '12px', backgroundColor: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.15)' }}>
                <Shield style={{ width: '14px', height: '14px', color: '#22C55E', flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: '#22C55E' }}>독소조항이 감지되지 않았습니다</span>
              </div>
            ) : (
              <div className="space-y-2 mt-3">
                {riskFactors.map((w) => (
                  <WarningCard key={w.title} title={w.title} desc={w.desc} severity={w.severity} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="flex-shrink-0 px-5 py-4" style={{ borderTop: '1px solid var(--dash-border)' }}>
        <button
          disabled={isAnalyzing}
          className="w-full flex items-center justify-center gap-2 rounded-xl transition-all"
          style={{ padding: '11px 16px', fontSize: '14px', fontWeight: 600, color: 'white', background: isAnalyzing ? '#94A3B8' : 'linear-gradient(135deg, #2563EB, #1D4ED8)', boxShadow: isAnalyzing ? 'none' : '0 4px 16px rgba(37,99,235,0.3)', cursor: isAnalyzing ? 'not-allowed' : 'pointer' }}
          onMouseEnter={(e) => { if (!isAnalyzing) { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(37,99,235,0.4)'; }}}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = isAnalyzing ? 'none' : '0 4px 16px rgba(37,99,235,0.3)'; }}
        >
          <FileText style={{ width: '16px', height: '16px' }} />
          {isAnalyzing ? '분석 완료 후 생성 가능' : '제안목차 생성'}
          {!isAnalyzing && <ArrowRight style={{ width: '14px', height: '14px' }} />}
        </button>
        <button
          className="w-full flex items-center justify-center gap-1.5 rounded-xl transition-colors mt-2"
          style={{ padding: '9px 16px', fontSize: '13px', color: 'var(--dash-text-2)', backgroundColor: 'transparent', border: '1px solid var(--dash-border-med)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text)'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--dash-item-bg-alt)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-2)'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
        >
          상세 분석 리포트 보기
          <ChevronRight style={{ width: '13px', height: '13px' }} />
        </button>
      </div>
    </div>
  );
}

function InfoCell({ label, value, valueStyle }: { label: string; value: string; valueStyle?: React.CSSProperties }) {
  return (
    <div className="rounded-lg" style={{ padding: '8px 10px', backgroundColor: 'var(--dash-item-bg-alt)' }}>
      <div style={{ fontSize: '10px', color: 'var(--dash-text-4)', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '12px', color: 'var(--dash-text-2)', ...valueStyle }}>{value}</div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, badge, accentColor, badgeBg, badgeColor }: { icon: React.ElementType; title: string; badge?: string; accentColor: string; badgeBg?: string; badgeColor?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="rounded-md flex items-center justify-center flex-shrink-0" style={{ width: '20px', height: '20px', backgroundColor: `${accentColor}20` }}>
        <Icon style={{ width: '12px', height: '12px', color: accentColor }} />
      </div>
      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--dash-text)' }}>{title}</span>
      {badge && (
        <span className="ml-auto rounded-full" style={{ fontSize: '11px', padding: '1px 7px', backgroundColor: badgeBg || `${accentColor}20`, color: badgeColor || accentColor }}>
          {badge}
        </span>
      )}
    </div>
  );
}

function WarningCard({ title, desc, severity }: { title: string; desc: string; severity: 'high' | 'medium' }) {
  const isHigh = severity === 'high';
  return (
    <div className="rounded-lg" style={{ padding: '10px 12px', backgroundColor: isHigh ? 'rgba(239,68,68,0.07)' : 'rgba(249,115,22,0.07)', borderTop: `1px solid ${isHigh ? 'rgba(239,68,68,0.15)' : 'rgba(249,115,22,0.15)'}`, borderRight: `1px solid ${isHigh ? 'rgba(239,68,68,0.15)' : 'rgba(249,115,22,0.15)'}`, borderBottom: `1px solid ${isHigh ? 'rgba(239,68,68,0.15)' : 'rgba(249,115,22,0.15)'}`, borderLeft: `3px solid ${isHigh ? '#EF4444' : '#F97316'}` }}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <AlertTriangle style={{ width: '12px', height: '12px', color: isHigh ? '#EF4444' : '#F97316', flexShrink: 0 }} />
        <span style={{ fontSize: '11px', fontWeight: 600, color: isHigh ? '#EF4444' : '#F97316' }}>독소조항</span>
        <span style={{ fontSize: '11px', color: 'var(--dash-text)', fontWeight: 500 }}>— {title}</span>
      </div>
      <p style={{ fontSize: '11px', color: 'var(--dash-text-2)', lineHeight: 1.6 }}>{desc}</p>
    </div>
  );
}
