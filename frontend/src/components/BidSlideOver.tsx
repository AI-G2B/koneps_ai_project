import { useEffect } from 'react';
import {
  X, Bookmark, BookmarkX, Play,
  Target, Clock, Wallet, Truck, Code2, Gavel,
  BarChart2, Shield, GitBranch, Percent, AlertTriangle,
  FileText, ArrowRight, BrainCircuit, ScrollText, Phone,
  ExternalLink, Download, Zap, Loader2, ChevronRight,
} from 'lucide-react';
import { type Bid, type BidStatus, formatBudget, getDaysUntilDeadline } from './mockData';
import { RiskBadge } from './BidTable';
import { useToast } from './ToastProvider';

interface BidSlideOverProps {
  bid: Bid | null;
  isOpen: boolean;
  onClose: () => void;
  bidStatuses: Map<string, BidStatus>;
  onToggleBookmark: (bidId: string) => void;
  onSetInProgress: (bidId: string) => void;
}

export function BidSlideOver({ bid, isOpen, onClose, bidStatuses, onToggleBookmark, onSetInProgress }: BidSlideOverProps) {
  const { showToast } = useToast();

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const daysLeft = bid ? getDaysUntilDeadline(bid.deadline) : 0;
  const isUrgent = daysLeft <= 3;
  const isAnalyzing = bid?.aiStatus === 'analyzing';
  const detail = bid?.detail;
  const riskFactors = bid?.riskFactors ?? [];
  const bidStatus = bid ? (bidStatuses.get(bid.id) ?? 'none') : 'none';

  const AI_HIGHLIGHT_ITEMS = detail ? [
    { icon: Wallet,    label: '예산규모', value: detail.budget },
    { icon: BarChart2, label: '평가방식', value: detail.evalMethod },
    { icon: Clock,     label: '수행기간', value: detail.execPeriod },
  ] : [];

  const AI_DETAIL_ITEMS = detail ? [
    { icon: Truck,      label: '납품방식',   value: detail.deliveryMethod },
    { icon: Code2,      label: '기술요건',   value: detail.techRequirement },
    { icon: Gavel,      label: '입찰방식',   value: detail.bidMethod },
    { icon: Shield,     label: '보안요건',   value: detail.securityRequirement },
    { icon: GitBranch,  label: '하도급제한', value: detail.subcontractLimit },
    { icon: Percent,    label: '이행보증금', value: detail.performanceBond },
    { icon: ScrollText, label: '필수서류',   value: detail.requiredDocs },
    { icon: Phone,      label: '담당자',     value: detail.contactPerson },
    { icon: Target,     label: '사업목적',   value: detail.purpose },
  ] : [];

  return (
    <>
      {/* 딤 오버레이 */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.15)',
          zIndex: 49,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: isOpen ? 'opacity 250ms ease-out' : 'opacity 200ms ease-in',
        }}
      />
      {/* 슬라이드 오버 패널 */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100vh',
          width: '480px',
          zIndex: 50,
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: isOpen ? 'transform 250ms ease-out' : 'transform 200ms ease-in',
          backgroundColor: 'var(--dash-card)',
          borderLeft: '1px solid var(--dash-border)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.18)',
        }}
      >
      {bid && (
        <>
          {/* ── 헤더 ── */}
          <div
            className="flex-shrink-0"
            style={{ padding: '14px 20px 16px', borderBottom: '1px solid var(--dash-border)', background: 'var(--dash-panel-header)' }}
          >
            {/* 상단 배지 + 버튼 행 */}
            <div className="flex items-center gap-2" style={{ marginBottom: '10px' }}>
              {/* X 닫기 */}
              <button
                onClick={onClose}
                className="flex items-center justify-center rounded-md transition-colors flex-shrink-0"
                style={{ width: '26px', height: '26px', backgroundColor: 'var(--dash-item-bg-alt)', border: '1px solid var(--dash-border-med)', color: 'var(--dash-text-3)', cursor: 'pointer' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#EF4444'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.4)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-3)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--dash-border-med)'; }}
              >
                <X style={{ width: '13px', height: '13px' }} />
              </button>

              {/* AI 분석 상태 배지 */}
              <span
                className="flex items-center gap-1.5 rounded-full"
                style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  backgroundColor: isAnalyzing ? 'rgba(245,158,11,0.15)' : 'rgba(37,99,235,0.15)',
                  color: isAnalyzing ? '#F59E0B' : '#60A5FA',
                  border: `1px solid ${isAnalyzing ? 'rgba(245,158,11,0.2)' : 'rgba(37,99,235,0.2)'}`,
                }}
              >
                {isAnalyzing
                  ? <Loader2 className="animate-spin" style={{ width: '10px', height: '10px' }} />
                  : <Zap style={{ width: '10px', height: '10px' }} />
                }
                {isAnalyzing ? 'AI 분석 중' : 'AI 분석 완료'}
              </span>

              {/* 위험도 배지 */}
              <RiskBadge risk={bid.risk} />

              {/* D-day 배지 */}
              {isUrgent && (
                <span
                  className="rounded-full"
                  style={{ fontSize: '11px', padding: '2px 8px', backgroundColor: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)', fontWeight: 600 }}
                >
                  D-{daysLeft}
                </span>
              )}

              {/* 우측 버튼들 */}
              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  title="나라장터 원문 링크"
                  onClick={() => window.open('https://www.g2b.go.kr', '_blank')}
                  className="flex items-center justify-center rounded-md transition-colors"
                  style={{ width: '26px', height: '26px', backgroundColor: 'var(--dash-item-bg-alt)', border: '1px solid var(--dash-border-med)', color: 'var(--dash-text-3)', cursor: 'pointer' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#2563EB'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(37,99,235,0.4)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-3)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--dash-border-med)'; }}
                >
                  <ExternalLink style={{ width: '12px', height: '12px' }} />
                </button>
                <button
                  title="RFP 다운로드"
                  onClick={() => showToast('info', '준비 중입니다')}
                  className="flex items-center justify-center rounded-md transition-colors"
                  style={{ width: '26px', height: '26px', backgroundColor: 'var(--dash-item-bg-alt)', border: '1px solid var(--dash-border-med)', color: 'var(--dash-text-3)', cursor: 'pointer' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#2563EB'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(37,99,235,0.4)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-3)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--dash-border-med)'; }}
                >
                  <Download style={{ width: '12px', height: '12px' }} />
                </button>
              </div>
            </div>

            {/* 공고명 */}
            <h3
              style={{
                fontSize: '15px',
                fontWeight: 700,
                color: 'var(--dash-text)',
                lineHeight: 1.5,
                marginBottom: '12px',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {bid.title}
            </h3>

            {/* 메타 정보 그리드 */}
            <div className="grid grid-cols-4 gap-2">
              <InfoCell label="발주기관" value={bid.agency} />
              <InfoCell label="사업 유형" value={bid.type} />
              <InfoCell
                label="예산"
                value={formatBudget(bid.budget)}
                valueStyle={{ fontSize: '13px', fontWeight: 700, color: '#F59E0B' }}
              />
              <InfoCell
                label="마감일"
                value={`${bid.deadline.substring(5)} (${daysLeft}일 후)`}
                valueStyle={{ color: isUrgent ? '#EF4444' : 'var(--dash-text-2)', fontWeight: isUrgent ? 600 : 400 }}
              />
            </div>
          </div>

          {/* ── 상태 버튼 영역 ── */}
          <div
            className="flex-shrink-0 flex items-center gap-2"
            style={{ padding: '10px 20px', borderBottom: '1px solid var(--dash-border)' }}
          >
            {/* 찜하기 */}
            <button
              onClick={() => onToggleBookmark(bid.id)}
              className="flex items-center gap-1.5 rounded-lg transition-colors"
              style={{
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: 500,
                color: bidStatus === 'bookmarked' ? '#2563EB' : 'var(--dash-text-3)',
                backgroundColor: bidStatus === 'bookmarked' ? 'rgba(37,99,235,0.1)' : 'transparent',
                border: `1px solid ${bidStatus === 'bookmarked' ? 'rgba(37,99,235,0.3)' : 'var(--dash-border-btn)'}`,
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                if (bidStatus !== 'bookmarked') {
                  (e.currentTarget as HTMLButtonElement).style.color = '#2563EB';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(37,99,235,0.3)';
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(37,99,235,0.06)';
                }
              }}
              onMouseLeave={(e) => {
                if (bidStatus !== 'bookmarked') {
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-3)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--dash-border-btn)';
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                }
              }}
            >
              {bidStatus === 'bookmarked'
                ? <><BookmarkX style={{ width: '14px', height: '14px' }} />찜 해제</>
                : <><Bookmark style={{ width: '14px', height: '14px' }} />찜하기</>
              }
            </button>

            {/* 진행하기 */}
            <button
              onClick={() => onSetInProgress(bid.id)}
              className="flex items-center gap-1.5 rounded-lg transition-colors"
              style={{
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: 500,
                color: bidStatus === 'inProgress' ? '#22C55E' : 'var(--dash-text-3)',
                backgroundColor: bidStatus === 'inProgress' ? 'rgba(34,197,94,0.1)' : 'transparent',
                border: `1px solid ${bidStatus === 'inProgress' ? 'rgba(34,197,94,0.3)' : 'var(--dash-border-btn)'}`,
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                if (bidStatus !== 'inProgress') {
                  (e.currentTarget as HTMLButtonElement).style.color = '#22C55E';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(34,197,94,0.3)';
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(34,197,94,0.06)';
                }
              }}
              onMouseLeave={(e) => {
                if (bidStatus !== 'inProgress') {
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-3)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--dash-border-btn)';
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                }
              }}
            >
              <Play style={{ width: '13px', height: '13px', fill: bidStatus === 'inProgress' ? 'currentColor' : 'none' }} />
              {bidStatus === 'inProgress' ? '진행중' : '진행하기'}
            </button>
          </div>

          {/* ── 스크롤 영역 ── */}
          <div
            className="flex-1 overflow-y-auto"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--dash-scrollbar) transparent' }}
          >
            {/* AI 분석 중 안내 */}
            {isAnalyzing && (
              <div
                className="flex flex-col items-center justify-center"
                style={{ padding: '40px 20px', borderBottom: '1px solid var(--dash-border)' }}
              >
                <Loader2 className="animate-spin" style={{ width: '28px', height: '28px', color: '#F59E0B', marginBottom: '12px' }} />
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--dash-text)', marginBottom: '4px' }}>
                  AI 분석이 진행 중입니다
                </div>
                <div style={{ fontSize: '12px', color: 'var(--dash-text-4)', textAlign: 'center', lineHeight: 1.6 }}>
                  공고 문서를 파싱하고 핵심 항목을<br />추출하고 있습니다. 잠시만 기다려주세요.
                </div>
              </div>
            )}

            {/* AI 추출 핵심항목 */}
            {!isAnalyzing && (
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--dash-border)' }}>
                <SlideOverSectionTitle
                  icon={BrainCircuit}
                  title="AI 추출 핵심항목"
                  badge={detail ? `${AI_HIGHLIGHT_ITEMS.length + AI_DETAIL_ITEMS.length}건` : undefined}
                  accentColor="#2563EB"
                />
                {!detail ? (
                  <div style={{ marginTop: '12px', textAlign: 'center', padding: '20px', color: 'var(--dash-text-4)', fontSize: '12px' }}>
                    공고를 선택하면 AI 분석 결과가 표시됩니다
                  </div>
                ) : (
                  <>
                    {/* 상단 하이라이트 카드 (3개) */}
                    <div className="flex gap-2" style={{ marginTop: '12px' }}>
                      {AI_HIGHLIGHT_ITEMS.map((item) => (
                        <div
                          key={item.label}
                          className="flex flex-col rounded-lg"
                          style={{ flex: 1, padding: '10px 12px', backgroundColor: 'var(--dash-item-bg)', border: '1px solid var(--dash-border-item)' }}
                        >
                          <div className="flex items-center gap-1" style={{ marginBottom: '6px' }}>
                            <item.icon style={{ width: '11px', height: '11px', color: '#2563EB', flexShrink: 0 }} />
                            <div style={{ fontSize: '11px', color: 'var(--dash-text-4)' }}>{item.label}</div>
                          </div>
                          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--dash-text)', lineHeight: 1.3 }} title={item.value}>
                            {item.value}
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* 나머지 항목 (2단 그리드) */}
                    <div className="grid grid-cols-2 gap-2" style={{ marginTop: '8px' }}>
                      {AI_DETAIL_ITEMS.map((item) => (
                        <div
                          key={item.label}
                          className="flex items-start gap-2 rounded-lg"
                          style={{ padding: '12px', backgroundColor: 'var(--dash-item-bg)', border: '1px solid var(--dash-border-item)' }}
                        >
                          <item.icon style={{ width: '12px', height: '12px', color: '#2563EB', flexShrink: 0, marginTop: '1px' }} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '10px', color: 'var(--dash-text-4)', marginBottom: '1px' }}>{item.label}</div>
                            <div
                              style={{ fontSize: '12px', color: 'var(--dash-text-detail)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', whiteSpace: 'normal' }}
                              title={item.value}
                            >
                              {item.value}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 위험요소 (독소조항) */}
            {!isAnalyzing && (
              <div style={{ padding: '16px 20px' }}>
                <SlideOverSectionTitle
                  icon={AlertTriangle}
                  title="위험요소 (독소조항)"
                  badge={riskFactors.length > 0 ? `${riskFactors.length}건` : '없음'}
                  accentColor={riskFactors.length > 0 ? '#EF4444' : '#22C55E'}
                  badgeBg={riskFactors.length > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)'}
                  badgeColor={riskFactors.length > 0 ? '#EF4444' : '#22C55E'}
                />
                {riskFactors.length === 0 ? (
                  <div
                    className="flex items-center gap-2 rounded-lg"
                    style={{ marginTop: '12px', padding: '12px', backgroundColor: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.15)' }}
                  >
                    <Shield style={{ width: '14px', height: '14px', color: '#22C55E', flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', color: '#22C55E' }}>독소조항이 감지되지 않았습니다</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                    {riskFactors.map((w) => (
                      <RiskCard key={w.title} title={w.title} desc={w.desc} severity={w.severity} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── CTA 영역 (하단 고정) ── */}
          <div
            className="flex-shrink-0"
            style={{ padding: '12px 20px', borderTop: '1px solid var(--dash-border)' }}
          >
            <button
              disabled={isAnalyzing}
              className="w-full flex items-center justify-center gap-2 rounded-xl transition-all"
              style={{
                padding: '11px 16px',
                fontSize: '14px',
                fontWeight: 600,
                color: 'white',
                background: isAnalyzing ? '#94A3B8' : 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                boxShadow: isAnalyzing ? 'none' : '0 4px 16px rgba(37,99,235,0.3)',
                cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                border: 'none',
              }}
              onMouseEnter={(e) => { if (!isAnalyzing) { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(37,99,235,0.4)'; } }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = isAnalyzing ? 'none' : '0 4px 16px rgba(37,99,235,0.3)'; }}
            >
              <FileText style={{ width: '15px', height: '15px' }} />
              {isAnalyzing ? '분석 완료 후 생성 가능' : '제안목차 생성'}
              {!isAnalyzing && <ArrowRight style={{ width: '14px', height: '14px' }} />}
            </button>
            <button
              className="w-full flex items-center justify-center gap-1.5 rounded-xl transition-colors"
              style={{ marginTop: '8px', padding: '9px 16px', fontSize: '13px', color: 'var(--dash-text-2)', backgroundColor: 'transparent', border: '1px solid var(--dash-border-med)', cursor: 'pointer' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text)'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--dash-item-bg-alt)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-2)'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
            >
              상세 분석 리포트 보기
              <ChevronRight style={{ width: '13px', height: '13px' }} />
            </button>
          </div>
        </>
      )}
    </div>
    </>
  );
}

function InfoCell({ label, value, valueStyle }: { label: string; value: string; valueStyle?: React.CSSProperties }) {
  return (
    <div className="rounded-lg" style={{ padding: '7px 10px', backgroundColor: 'var(--dash-item-bg-alt)' }}>
      <div style={{ fontSize: '10px', color: 'var(--dash-text-4)', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '12px', color: 'var(--dash-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...valueStyle }}>{value}</div>
    </div>
  );
}

function SlideOverSectionTitle({ icon: Icon, title, badge, accentColor, badgeBg, badgeColor }: {
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
        style={{ width: '20px', height: '20px', backgroundColor: `${accentColor}22` }}
      >
        <Icon style={{ width: '12px', height: '12px', color: accentColor }} />
      </div>
      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--dash-text)' }}>{title}</span>
      {badge && (
        <span
          className="ml-auto rounded-full"
          style={{ fontSize: '11px', padding: '1px 7px', backgroundColor: badgeBg || `${accentColor}22`, color: badgeColor || accentColor }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

function RiskCard({ title, desc, severity }: { title: string; desc: string; severity: 'high' | 'medium' }) {
  const isHigh = severity === 'high';
  const color = isHigh ? '#EF4444' : '#F97316';
  const bg = isHigh ? 'rgba(239,68,68,0.07)' : 'rgba(249,115,22,0.07)';
  const border = isHigh ? 'rgba(239,68,68,0.15)' : 'rgba(249,115,22,0.15)';

  return (
    <div
      className="rounded-lg"
      style={{
        padding: '10px 12px',
        backgroundColor: bg,
        border: `1px solid ${border}`,
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div className="flex items-center gap-1.5" style={{ marginBottom: '6px' }}>
        <AlertTriangle style={{ width: '12px', height: '12px', color, flexShrink: 0 }} />
        <span style={{ fontSize: '11px', fontWeight: 600, color }}>
          {isHigh ? '고위험' : '중위험'}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--dash-text)', fontWeight: 500 }}>— {title}</span>
      </div>
      <p style={{ fontSize: '11px', color: 'var(--dash-text-2)', lineHeight: 1.6, marginBottom: '0' }}>{desc}</p>
    </div>
  );
}
