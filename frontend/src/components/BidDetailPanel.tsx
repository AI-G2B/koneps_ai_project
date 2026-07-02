import React, { useRef, useState } from 'react';
import {
  Target, Clock, Wallet, Truck, Code2, Gavel, BarChart2, Shield,
  GitBranch, Percent, AlertTriangle, FileText,
  Sparkles, ChevronRight, Phone, ScrollText, Loader2,
  ExternalLink, Download,
} from 'lucide-react';
import { type Bid, type BidFlags, type AiStatusType, type RiskFactor, type AnalysisLog, formatBudget, getDaysUntilDeadline } from '../types';
import { RiskBadge } from './BidTable';
import { useToast } from './ToastProvider';

interface BidDetailPanelProps {
  bid: Bid | null;
  detailLoading?: boolean;
  onNavigateToProposal?: () => void;
  aiStatuses?: Record<string, AiStatusType>;
  onOpenAnalysisDetail?: (bid: Bid) => void;
  onRequestAnalysis?: (bidId: string) => void;
  ceoMode?: boolean;
  showFullDetail?: boolean;
  analysisLogs?: AnalysisLog[];
  outlineStatus?: 'none' | 'generating' | 'complete';
  onRequestOutline?: (bidId: string) => void;
  onDownloadOutline?: (bidId: string) => void;
  bidFlags?: Record<string, BidFlags>;
  onToggleInProgress?: (bidId: string) => void;
  onUpdateManagers?: (bidId: string, salesManager: string, projectPm: string) => void;
}

export function BidDetailPanel({ bid, detailLoading = false, aiStatuses, onOpenAnalysisDetail, onRequestAnalysis, ceoMode = false, showFullDetail = false, analysisLogs, outlineStatus = 'none', onRequestOutline, onDownloadOutline, bidFlags, onToggleInProgress, onUpdateManagers }: BidDetailPanelProps) {
  const { showToast } = useToast();
  const [showInProgressConfirm, setShowInProgressConfirm] = React.useState<'add' | 'remove' | null>(null);
  const [regSalesManager, setRegSalesManager] = React.useState('');
  const [regProjectPm, setRegProjectPm] = React.useState('');
  const [showFileMenu, setShowFileMenu] = useState(false);
  const fileMenuRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!showFileMenu) return;
    const handler = (e: MouseEvent) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target as Node)) {
        setShowFileMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showFileMenu]);

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
  const aiStatus: AiStatusType = aiStatuses?.[bid.id] ?? bid.aiStatus ?? 'none';
  const isNoneOrPending = aiStatus === 'none' || aiStatus === 'pending';
  const isAnalyzing = aiStatus === 'analyzing';
  const isNoDocs = aiStatus === 'no_docs';
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

  const CEO_ITEMS = (ceoMode && detail) ? [
    { icon: Wallet,    label: '예산 규모',               value: detail.budget },
    { icon: Clock,     label: '마감일',                  value: bid.deadline ? `${bid.deadline.substring(5)} ${(isNaN(daysLeft) || daysLeft >= 9999) ? '(기간 미정)' : daysLeft < 0 ? '(마감)' : `(${daysLeft}일 후)`}` : '기간 미정' },
    { icon: BarChart2, label: '평가방식 (기술/가격 배점)', value: detail.evalMethod },
    { icon: Phone,     label: '담당자 연락처',             value: detail.contactPerson },
  ] : [];

  return (
    <div className="w-[390px] flex-shrink-0 rounded-xl flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)' }}>
      {/* 헤더 */}
      <div className="flex-shrink-0" style={{ padding: ceoMode ? '10px 20px 12px' : '16px 20px', borderBottom: '1px solid var(--dash-border)', background: 'var(--dash-panel-header)' }}>
        <div className="flex items-center gap-2 mb-2.5">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 12px', borderRadius: '40px', fontSize: '13px', fontWeight: 400, fontFamily: 'Inter, Noto Sans KR, sans-serif', backgroundColor: isAnalyzing ? 'var(--badge-orange-bg)' : (isNoneOrPending || isNoDocs) ? 'var(--badge-gray-bg)' : 'var(--badge-green-bg)', color: isAnalyzing ? '#FFC379' : (isNoneOrPending || isNoDocs) ? '#81878F' : '#5BC37E', whiteSpace: 'nowrap', flexShrink: 0 }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isAnalyzing ? '#FFC379' : (isNoneOrPending || isNoDocs) ? '#81878F' : '#5BC37E', flexShrink: 0, display: 'inline-block', ...(isAnalyzing || aiStatus === 'pending' ? { animation: 'pulse 1.2s ease-in-out infinite' } : {}) }} />
            {isAnalyzing ? 'AI 분석 중' : isNoDocs ? '문서 없음' : isNoneOrPending ? '분석 전' : 'AI 분석 완료'}
          </span>
          <RiskBadge risk={bid.risk} />
          <div className="flex items-center gap-1.5 ml-auto">
            {daysLeft < 0 ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 12px', borderRadius: '40px', fontSize: '13px', fontWeight: 400, fontFamily: 'Inter, Noto Sans KR, sans-serif', backgroundColor: 'var(--badge-gray-bg)', color: '#81878F', whiteSpace: 'nowrap', flexShrink: 0 }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#81878F', flexShrink: 0, display: 'inline-block' }} />마감
              </span>
            ) : isUrgent ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 12px', borderRadius: '40px', fontSize: '13px', fontWeight: 400, fontFamily: 'Inter, Noto Sans KR, sans-serif', backgroundColor: 'var(--badge-red-bg)', color: '#F27A75', whiteSpace: 'nowrap', flexShrink: 0 }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#F27A75', flexShrink: 0, display: 'inline-block' }} />D-{daysLeft}
              </span>
            ) : null}
            <button
              title={bid.ntce_dtl_url ? '나라장터 원문 보기' : '나라장터 홈으로 이동'}
              onClick={() => window.open(bid.ntce_dtl_url || 'https://www.g2b.go.kr', '_blank')}
              className="flex items-center justify-center rounded-md transition-colors"
              style={{ width: '26px', height: '26px', backgroundColor: 'var(--dash-item-bg-alt)', border: '1px solid var(--dash-border-med)', color: bid.ntce_dtl_url ? 'var(--dash-text-3)' : 'var(--dash-text-5)', cursor: 'pointer' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#2563EB'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(37,99,235,0.4)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = bid.ntce_dtl_url ? 'var(--dash-text-3)' : 'var(--dash-text-5)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--dash-border-med)'; }}
            >
              <ExternalLink style={{ width: '12px', height: '12px' }} />
            </button>
            {!ceoMode && (
              <div ref={fileMenuRef} style={{ position: 'relative' }}>
                <button
                  title={bid.attachments?.length ? `첨부파일 ${bid.attachments.length}개` : '첨부파일 없음'}
                  onClick={() => {
                    const files = bid.attachments ?? [];
                    if (files.length === 0) { showToast('info', '첨부파일이 없습니다'); return; }
                    if (files.length === 1) { window.open(files[0].fileUrl, '_blank'); return; }
                    setShowFileMenu(v => !v);
                  }}
                  className="flex items-center justify-center rounded-md transition-colors"
                  style={{ width: '26px', height: '26px', backgroundColor: 'var(--dash-item-bg-alt)', border: '1px solid var(--dash-border-med)', color: bid.attachments?.length ? 'var(--dash-text-3)' : 'var(--dash-text-5)', cursor: 'pointer' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#2563EB'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(37,99,235,0.4)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = bid.attachments?.length ? 'var(--dash-text-3)' : 'var(--dash-text-5)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--dash-border-med)'; }}
                >
                  <Download style={{ width: '12px', height: '12px' }} />
                </button>
                {showFileMenu && (bid.attachments?.length ?? 0) > 1 && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, minWidth: '220px', maxWidth: '320px', backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 50, overflow: 'hidden' }}>
                    <div style={{ padding: '6px 10px', fontSize: '11px', color: 'var(--dash-text-4)', borderBottom: '1px solid var(--dash-border-faint)' }}>
                      첨부파일 {bid.attachments!.length}개
                    </div>
                    {bid.attachments!.map((file, i) => (
                      <button
                        key={i}
                        onClick={() => { window.open(file.fileUrl, '_blank'); setShowFileMenu(false); }}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', fontSize: '12px', color: 'var(--dash-text-2)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--dash-row-hover)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
                      >
                        <Download style={{ width: '12px', height: '12px', color: '#2563EB', flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.fileName}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--dash-text)', lineHeight: 1.5, marginBottom: '12px' }}>
          {bid.title}
        </h3>

        <div className="grid grid-cols-2 gap-2">
          <InfoCell label="발주기관" value={bid.agency} />
          <InfoCell label="사업 유형" value={bid.type} />
          <InfoCell label="추정가격" value={bid.presmptPrce != null ? formatBudget(bid.presmptPrce) : '-'} valueStyle={{ fontSize: '14px', fontWeight: 700, color: '#F59E0B' }} />
          <InfoCell label="배정예산" value={bid.asignBdgtAmt != null ? formatBudget(bid.asignBdgtAmt) : '-'} valueStyle={{ fontSize: '14px', fontWeight: 700, color: '#F59E0B' }} />
          <InfoCell label="공고일" value={bid.ntceDate ? bid.ntceDate.replace(/-/g, '.') : '-'} />
          <InfoCell label="마감일" value={bid.deadline ? `${bid.deadline.substring(5)} ${(isNaN(daysLeft) || daysLeft >= 9999) ? '(기간 미정)' : daysLeft < 0 ? '(마감)' : `(${daysLeft}일 후)`}` : '기간 미정'} valueStyle={{ color: isUrgent ? '#EF4444' : 'var(--dash-text-2)', fontWeight: isUrgent ? 600 : 400 }} />
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

        {/* 분석 전 안내 */}
        {!showLoadingOverlay && isNoneOrPending && (
          <div className="px-5 py-6 flex flex-col items-center justify-center" style={{ borderBottom: '1px solid var(--dash-border)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
              <Sparkles style={{ width: '20px', height: '20px', color: '#2563EB' }} />
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--dash-text)', marginBottom: '4px' }}>AI 분석 대기 중</div>
            <div style={{ fontSize: '12px', color: 'var(--dash-text-4)', textAlign: 'center', lineHeight: 1.6 }}>
              진행 등록을 하거나 상세 리포트에서<br />직접 분석을 시작할 수 있습니다.
            </div>
            {aiStatus === 'none' && !ceoMode && (
              <button
                onClick={() => onRequestAnalysis?.(bid.id)}
                style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(37,99,235,0.08)', color: '#2563EB', border: '1px solid rgba(37,99,235,0.2)', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer' }}
              >
                <Sparkles style={{ width: '13px', height: '13px' }} />
                AI 분석 시작
              </button>
            )}
          </div>
        )}

        {/* 분석 중 안내 */}
        {!showLoadingOverlay && isAnalyzing && (
          <div className="px-5 py-6" style={{ borderBottom: '1px solid var(--dash-border)' }}>
            <div className="flex flex-col items-center justify-center mb-4">
              <Loader2 className="animate-spin mb-3" style={{ width: '28px', height: '28px', color: '#F59E0B' }} />
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--dash-text)', marginBottom: '4px' }}>AI 분석이 진행 중입니다</div>
              <div style={{ fontSize: '12px', color: 'var(--dash-text-4)', textAlign: 'center', lineHeight: 1.6 }}>
                Gemini가 첨부 문서를 분석 중입니다 (30초~2분 소요).
              </div>
            </div>
            {analysisLogs && analysisLogs.length > 0 && (
              <div className="rounded-lg" style={{ padding: '10px 12px', backgroundColor: 'var(--dash-card-deep)', border: '1px solid var(--dash-border)', maxHeight: '220px', overflowY: 'auto' }}>
                {analysisLogs.map((log, i) => (
                  <div key={i} className="flex items-start gap-2" style={{ fontSize: '11px', padding: '3px 0', lineHeight: 1.5 }}>
                    <span style={{ color: 'var(--dash-text-5)', fontFamily: 'monospace', flexShrink: 0 }}>{log.time}</span>
                    <span style={{ color: log.status === 'success' ? '#22C55E' : log.status === 'error' ? '#EF4444' : 'var(--dash-text-2)' }}>{log.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AI 핵심 항목 */}
        {!isAnalyzing && !isNoneOrPending && detail && (
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--dash-border)' }}>
            <SectionTitle
              icon={Sparkles}
              title={ceoMode && !showFullDetail ? '핵심 요약' : 'AI 추출 핵심항목'}
              badge={ceoMode && !showFullDetail ? '4건' : '12'}
              accentColor="#2563EB"
            />
            {ceoMode && !showFullDetail ? (
              <div className="grid grid-cols-2 gap-2 mt-3">
                {CEO_ITEMS.map((item) => (
                  <div key={item.label} className="flex flex-col rounded-lg" style={{ padding: '16px', backgroundColor: 'var(--dash-item-bg)', border: '1px solid var(--dash-border-item)' }}>
                    <div className="flex items-center gap-1" style={{ marginBottom: '8px' }}>
                      <item.icon style={{ width: '12px', height: '12px', color: '#2563EB', flexShrink: 0 }} />
                      <div style={{ fontSize: '11px', color: 'var(--dash-text-4)' }}>{item.label}</div>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--dash-text)', lineHeight: 1.3 }} title={item.value}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
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
            )}
          </div>
        )}

        {/* 위험요소 */}
        {!isAnalyzing && !isNoneOrPending && (
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
                {riskFactors.map((w, i) => (
                  <WarningCard key={i} {...w} ceoMode={ceoMode && !showFullDetail} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="flex-shrink-0 px-5 py-4" style={{ borderTop: '1px solid var(--dash-border)' }}>
        {!ceoMode && onToggleInProgress && bid && (() => {
          const flags = bidFlags?.[bid.id] ?? { bookmarked: false, inProgress: false };
          return (
            <button
              onClick={() => {
                if (!flags.inProgress) {
                  setRegSalesManager(bid.salesManager ?? '');
                  setRegProjectPm(bid.projectPm ?? '');
                }
                setShowInProgressConfirm(flags.inProgress ? 'remove' : 'add');
              }}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl transition-colors"
              style={{
                marginBottom: '8px',
                padding: '9px 16px',
                fontSize: '13px',
                fontWeight: 500,
                color: flags.inProgress ? '#22C55E' : 'var(--dash-text-2)',
                backgroundColor: flags.inProgress ? 'rgba(34,197,94,0.1)' : 'transparent',
                border: `1px solid ${flags.inProgress ? 'rgba(34,197,94,0.3)' : 'var(--dash-border-med)'}`,
                cursor: 'pointer',
              }}
            >
              {flags.inProgress ? '진행 프로젝트 등록됨' : '진행 프로젝트로 등록'}
            </button>
          );
        })()}
        {!ceoMode && bid && (() => {
          const analysisDone = aiStatus === 'complete';
          const supported = bid.type === 'ISP' || bid.type === 'ISMP';
          const generating = outlineStatus === 'generating';
          const complete = outlineStatus === 'complete';
          const disabled = !analysisDone || !supported || generating;
          const label = complete
            ? '제안목차 Excel 다운로드'
            : generating
            ? '제안목차 생성 중...'
            : !analysisDone
            ? 'AI 분석 먼저 진행하세요'
            : !supported
            ? '제안목차 미지원 유형 (ISP/ISMP만)'
            : '제안목차 자동 생성';
          const bg = complete || (!disabled && !generating) ? '#2563EB' : 'var(--dash-card-deep)';
          const color = complete || (!disabled && !generating) ? '#fff' : 'var(--dash-text-4)';
          return (
            <button
              onClick={() => {
                if (complete) onDownloadOutline?.(bid.id);
                else if (!disabled) onRequestOutline?.(bid.id);
              }}
              disabled={disabled && !complete}
              className="w-full flex items-center justify-center gap-2 rounded-xl"
              style={{ padding: '11px 16px', fontSize: '14px', fontWeight: 600, color, backgroundColor: bg, border: '1px solid var(--dash-border-med)', cursor: disabled && !complete ? 'not-allowed' : 'pointer' }}
            >
              {generating ? <Loader2 className="animate-spin" style={{ width: '16px', height: '16px' }} />
                : complete ? <Download style={{ width: '16px', height: '16px' }} />
                : <Clock style={{ width: '16px', height: '16px' }} />}
              {label}
            </button>
          );
        })()}
        <button
          className="w-full flex items-center justify-center gap-1.5 rounded-xl transition-colors"
          onClick={() => { if (bid) onOpenAnalysisDetail?.(bid); }}
          style={{ marginTop: ceoMode ? 0 : '8px', padding: '9px 16px', fontSize: '13px', color: 'var(--dash-text-2)', backgroundColor: 'transparent', border: '1px solid var(--dash-border-med)', cursor: 'pointer' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text)'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--dash-item-bg-alt)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-2)'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
        >
          {ceoMode ? '제안 PM 상세 보고서 보기' : '상세 분석 리포트 보기'}
          <ChevronRight style={{ width: '13px', height: '13px' }} />
        </button>
      </div>

      {/* 진행하기 확인 다이얼로그 */}
      {showInProgressConfirm && bid && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div style={{ backgroundColor: 'var(--dash-card)', borderRadius: '12px', padding: '24px', maxWidth: '360px', width: '100%', margin: '0 16px', border: '1px solid var(--dash-border)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--dash-text)', margin: '0 0 8px', textAlign: showInProgressConfirm === 'remove' ? 'center' : 'left' }}>
              {showInProgressConfirm === 'add' ? '진행 프로젝트로 등록' : '진행 프로젝트에서 제거하시겠습니까?'}
            </h3>
            {showInProgressConfirm === 'add' ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--dash-text-3)', marginBottom: '4px' }}>영업대표</div>
                    <input
                      value={regSalesManager}
                      onChange={(e) => setRegSalesManager(e.target.value)}
                      placeholder="이름 입력 (선택)"
                      style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--dash-border-med)', backgroundColor: 'var(--dash-input-bg)', color: 'var(--dash-text)', marginTop: '4px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--dash-text-3)', marginBottom: '4px' }}>제안 PM</div>
                    <input
                      value={regProjectPm}
                      onChange={(e) => setRegProjectPm(e.target.value)}
                      placeholder="이름 입력 (선택)"
                      style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--dash-border-med)', backgroundColor: 'var(--dash-input-bg)', color: 'var(--dash-text)', marginTop: '4px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div style={{ marginBottom: '20px' }} />
            )}
            <div style={{ display: 'flex', gap: '8px', justifyContent: showInProgressConfirm === 'remove' ? 'center' : 'flex-end' }}>
              <button
                onClick={() => setShowInProgressConfirm(null)}
                style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid var(--dash-border)', backgroundColor: 'transparent', color: 'var(--dash-text-3)', fontSize: '13px', cursor: 'pointer' }}
              >
                취소
              </button>
              <button
                onClick={() => {
                  onToggleInProgress?.(bid.id);
                  if (showInProgressConfirm === 'add' && (regSalesManager || regProjectPm)) {
                    onUpdateManagers?.(bid.id, regSalesManager, regProjectPm);
                  }
                  setShowInProgressConfirm(null);
                }}
                style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', backgroundColor: showInProgressConfirm === 'add' ? '#2563EB' : '#EF4444', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
              >
                {showInProgressConfirm === 'add' ? '등록' : '제거'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCell({ label, value, valueStyle }: { label: string; value: string; valueStyle?: React.CSSProperties }) {
  return (
    <div className="rounded-lg" style={{ padding: '5px 8px', backgroundColor: 'var(--dash-item-bg-alt)' }}>
      <div style={{ fontSize: '10px', color: 'var(--dash-text-4)', marginBottom: '1px' }}>{label}</div>
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

const SEVERITY_CFG = {
  danger:  { color: '#EF4444', bg: 'rgba(239,68,68,0.07)',  border: 'rgba(239,68,68,0.15)',  label: '위험' },
  warning: { color: '#F97316', bg: 'rgba(249,115,22,0.07)', border: 'rgba(249,115,22,0.15)', label: '경고' },
  caution: { color: '#EAB308', bg: 'rgba(234,179,8,0.07)',  border: 'rgba(234,179,8,0.15)',  label: '주의' },
} as const;

function WarningCard({ category, clause, severity, reason, source, ceoMode = false }: RiskFactor & { ceoMode?: boolean }) {
  const cfg = SEVERITY_CFG[severity] ?? SEVERITY_CFG.caution;
  return (
    <div className="rounded-lg" style={{ padding: '10px 12px', backgroundColor: cfg.bg, border: `1px solid ${cfg.border}`, borderLeft: `3px solid ${cfg.color}` }}>
      <div className="flex items-center gap-1.5" style={{ marginBottom: ceoMode ? 0 : '6px' }}>
        <AlertTriangle style={{ width: '12px', height: '12px', color: cfg.color, flexShrink: 0 }} />
        <span style={{ fontSize: '11px', fontWeight: 600, color: cfg.color }}>{cfg.label}</span>
        <span style={{ fontSize: '11px', color: 'var(--dash-text)', fontWeight: 500 }}>— {category}</span>
      </div>
      {!ceoMode && (
        <>
          <p style={{ fontSize: '11px', color: 'var(--dash-text)', lineHeight: 1.6, marginBottom: '4px' }}>{clause}</p>
          {reason && <p style={{ fontSize: '11px', color: 'var(--dash-text-2)', lineHeight: 1.6, marginBottom: source ? '2px' : 0 }}>판단근거: {reason}</p>}
          {source && <p style={{ fontSize: '10px', color: 'var(--dash-text-4)', margin: 0 }}>출처: {source}</p>}
        </>
      )}
    </div>
  );
}
