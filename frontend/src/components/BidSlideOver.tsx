import { useEffect, useRef, useState } from 'react';
import {
  X, Bookmark, BookmarkX, Play,
  Target, Clock, Wallet, Truck, Code2, Gavel,
  BarChart2, Shield, GitBranch, Percent, AlertTriangle,
  Sparkles, ScrollText, Phone,
  ExternalLink, Download, Loader2, ChevronRight,
} from 'lucide-react';
import { type Bid, type BidFlags, type AiStatusType, type RiskFactor, type AnalysisLog, formatBudget, getDaysUntilDeadline } from '../types';
import { RiskBadge } from './BidTable';
import { useToast } from './ToastProvider';

const isRfpFile = (fileName: string): boolean => {
  const rfpKeywords = ['제안요청서', 'RFP', '제안요청', '과업지시서', '제안서'];
  return rfpKeywords.some(keyword => fileName.includes(keyword));
};

const getRfpBadgeText = (fileName: string): string => {
  if (fileName.includes('과업지시서')) return '과업지시서';
  if (fileName.includes('RFP')) return 'RFP';
  if (fileName.includes('제안요청서')) return '제안요청서';
  if (fileName.includes('제안요청')) return '제안요청서';
  if (fileName.includes('제안서')) return '제안서';
  return '제안요청서';
};

interface BidSlideOverProps {
  bid: Bid | null;
  isOpen: boolean;
  onClose: () => void;
  bidFlags: Record<string, BidFlags>;
  aiStatuses?: Record<string, AiStatusType>;
  onToggleBookmark: (bidId: string) => void;
  onToggleInProgress: (bidId: string) => void;
  onOpenAnalysisDetail?: (bid: Bid) => void;
  onRequestAnalysis?: (bidId: string) => void;
  ceoMode?: boolean;
  showFullDetail?: boolean;
  analysisLogs?: AnalysisLog[];
  outlineStatus?: 'none' | 'generating' | 'complete';
  onRequestOutline?: (bidId: string) => void;
  onDownloadOutline?: (bidId: string) => void;
  onUpdateManagers?: (bidId: string, salesManager: string, projectPm: string) => void;
}

export function BidSlideOver({ bid, isOpen, onClose, bidFlags, aiStatuses, onToggleBookmark, onToggleInProgress, onOpenAnalysisDetail, onRequestAnalysis, ceoMode = false, showFullDetail = false, analysisLogs, outlineStatus = 'none', onRequestOutline, onDownloadOutline, onUpdateManagers }: BidSlideOverProps) {
  const { showToast } = useToast();
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [showConfirm, setShowConfirm] = useState<'add' | 'remove' | null>(null);
  const [regSalesManager, setRegSalesManager] = useState('');
  const [regProjectPm, setRegProjectPm] = useState('');
  const [hoveredFileIndex, setHoveredFileIndex] = useState<number | null>(null);
  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);
  const fileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showFileMenu) return;
    const handler = (e: MouseEvent) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target as Node)) {
        setShowFileMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showFileMenu]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const daysLeft = bid ? getDaysUntilDeadline(bid.deadline) : 0;
  const isUrgent = daysLeft <= 3;
  const aiStatus: AiStatusType = bid ? (aiStatuses?.[bid.id] ?? bid.aiStatus ?? 'none') : 'none';
  const isNoneOrPending = aiStatus === 'none' || aiStatus === 'pending';
  const isAnalyzing = aiStatus === 'analyzing';
  const detail = bid?.detail;
  const riskFactors = bid?.riskFactors ?? [];
  const flags = bid ? (bidFlags[bid.id] ?? { bookmarked: false, inProgress: false }) : { bookmarked: false, inProgress: false };


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

  const CEO_ITEMS = (ceoMode && bid && detail) ? [
    { icon: Wallet,    label: '예산 규모',               value: detail.budget },
    { icon: Clock,     label: '마감일',                  value: bid.deadline ? `${bid.deadline.substring(5)} ${(isNaN(daysLeft) || daysLeft >= 9999) ? '(기간 미정)' : daysLeft < 0 ? '(마감)' : `(${daysLeft}일 후)`}` : '기간 미정' },
    { icon: BarChart2, label: '평가방식 (기술/가격 배점)', value: detail.evalMethod },
    { icon: Phone,     label: '담당자 연락처',             value: detail.contactPerson },
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
          width: '560px',
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
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 12px', borderRadius: '40px', fontSize: '13px', fontWeight: 400, fontFamily: 'Inter, Noto Sans KR, sans-serif', backgroundColor: isAnalyzing ? 'var(--badge-orange-bg)' : isNoneOrPending ? 'var(--badge-gray-bg)' : 'var(--badge-green-bg)', color: isAnalyzing ? '#FFC379' : isNoneOrPending ? '#81878F' : '#5BC37E', whiteSpace: 'nowrap', flexShrink: 0 }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isAnalyzing ? '#FFC379' : isNoneOrPending ? '#81878F' : '#5BC37E', flexShrink: 0, display: 'inline-block', ...(isAnalyzing || aiStatus === 'pending' ? { animation: 'pulse 1.2s ease-in-out infinite' } : {}) }} />
                {isAnalyzing ? 'AI 분석 중' : isNoneOrPending ? '분석 전' : 'AI 분석 완료'}
              </span>

              {/* 위험도 배지 */}
              <RiskBadge risk={bid.risk} />

              {/* D-day 배지 */}
              {daysLeft < 0 ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 12px', borderRadius: '40px', fontSize: '13px', fontWeight: 400, fontFamily: 'Inter, Noto Sans KR, sans-serif', backgroundColor: 'var(--badge-gray-bg)', color: '#81878F', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#81878F', flexShrink: 0, display: 'inline-block' }} />
                  마감
                </span>
              ) : isUrgent ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 12px', borderRadius: '40px', fontSize: '13px', fontWeight: 400, fontFamily: 'Inter, Noto Sans KR, sans-serif', backgroundColor: 'var(--badge-red-bg)', color: '#F27A75', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#F27A75', flexShrink: 0, display: 'inline-block' }} />
                  D-{daysLeft}
                </span>
              ) : null}

              {/* 우측 버튼들 */}
              <div className="flex items-center gap-1.5 ml-auto">
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
                      <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, minWidth: '260px', maxWidth: '400px', backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 50, overflow: 'hidden' }}>
                        <div style={{ padding: '6px 10px', fontSize: '11px', color: 'var(--dash-text-4)', borderBottom: '1px solid var(--dash-border-faint)' }}>
                          첨부파일 {bid.attachments!.length}개
                        </div>
                        {bid.attachments!.map((file, i) => (
                          <div
                            key={i}
                            style={{ position: 'relative' }}
                            onMouseEnter={() => setHoveredFileIndex(i)}
                            onMouseLeave={() => setHoveredFileIndex(null)}
                          >
                            {/* 커스텀 툴팁 — 파일명 20자 이상일 때만 */}
                            {file.fileName.length >= 20 && (
                              <span style={{
                                position: 'absolute',
                                bottom: 'calc(100% + 6px)',
                                left: 0,
                                backgroundColor: 'var(--dash-tooltip-bg)',
                                color: '#FFFFFF',
                                fontSize: '11px',
                                padding: '5px 8px',
                                borderRadius: '6px',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all',
                                maxWidth: '320px',
                                zIndex: 999,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                pointerEvents: 'none',
                                opacity: hoveredFileIndex === i ? 1 : 0,
                                transition: 'opacity 0.15s',
                              }}>
                                {file.fileName}
                              </span>
                            )}
                            <button
                              onClick={() => { window.open(file.fileUrl, '_blank'); setShowFileMenu(false); }}
                              title={file.fileName}
                              style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', fontSize: '12px',
                                color: 'var(--dash-text)',
                                backgroundColor: isRfpFile(file.fileName)
                                  ? (hoveredFileIndex === i ? 'rgba(245,158,11,0.08)' : 'var(--dash-card)')
                                  : (hoveredFileIndex === i ? 'var(--dash-row-hover)' : 'transparent'),
                                border: '1px solid transparent',
                                borderRadius: isRfpFile(file.fileName) ? '4px' : '0',
                                cursor: 'pointer', textAlign: 'left',
                                transition: 'background-color 0.12s, border-color 0.12s',
                              }}
                            >
                              <Download style={{ width: '12px', height: '12px', color: isRfpFile(file.fileName) ? '#D97706' : 'var(--dash-text-3)', flexShrink: 0 }} />
                              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.fileName}</span>
                              {isRfpFile(file.fileName) && (
                                <span style={{ backgroundColor: 'rgba(245,158,11,0.12)', color: '#D97706', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '4px', fontSize: '10px', padding: '2px 6px', fontWeight: 500, flexShrink: 0 }}>
                                  {getRfpBadgeText(file.fileName)}
                                </span>
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
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
                label="추정가격"
                value={bid.presmptPrce != null ? formatBudget(bid.presmptPrce) : '-'}
                valueStyle={ceoMode
                  ? { fontSize: '16px', fontWeight: 700, color: '#F59E0B' }
                  : { fontSize: '13px', fontWeight: 700, color: '#F59E0B' }}
              />
              <InfoCell
                label="배정예산"
                value={bid.asignBdgtAmt != null ? formatBudget(bid.asignBdgtAmt) : '-'}
                valueStyle={ceoMode
                  ? { fontSize: '16px', fontWeight: 700, color: '#F59E0B' }
                  : { fontSize: '13px', fontWeight: 700, color: '#F59E0B' }}
              />
              <InfoCell
                label="공고일"
                value={bid.ntceDate ? bid.ntceDate.replace(/-/g, '.') : '-'}
              />
              <InfoCell
                label="마감일"
                value={`${bid.deadline.substring(5)} ${(isNaN(daysLeft) || daysLeft >= 9999) ? '(기간 미정)' : daysLeft < 0 ? '(마감)' : `(${daysLeft}일 후)`}`}
                valueStyle={ceoMode
                  ? { fontSize: '16px', fontWeight: 700, color: isUrgent ? '#EF4444' : 'var(--dash-text-2)' }
                  : { color: isUrgent ? '#EF4444' : 'var(--dash-text-2)', fontWeight: isUrgent ? 600 : 400 }}
              />
            </div>
          </div>

          {/* ── 상태 버튼 영역 ── */}
          {!ceoMode && (
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
                  color: flags.bookmarked ? '#2563EB' : 'var(--dash-text-3)',
                  backgroundColor: flags.bookmarked ? 'rgba(37,99,235,0.1)' : 'transparent',
                  border: `1px solid ${flags.bookmarked ? 'rgba(37,99,235,0.3)' : 'var(--dash-border-btn)'}`,
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!flags.bookmarked) {
                    (e.currentTarget as HTMLButtonElement).style.color = '#2563EB';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(37,99,235,0.3)';
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(37,99,235,0.06)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!flags.bookmarked) {
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-3)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--dash-border-btn)';
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                  }
                }}
              >
                {flags.bookmarked
                  ? <><BookmarkX style={{ width: '14px', height: '14px' }} />관심공고 해제</>
                  : <><Bookmark style={{ width: '14px', height: '14px' }} />관심공고 추가</>
                }
              </button>

              {/* 진행하기 */}
              <button
                onClick={() => {
                  if (!flags.inProgress) {
                    setRegSalesManager(bid.salesManager ?? '');
                    setRegProjectPm(bid.projectPm ?? '');
                  }
                  setShowConfirm(flags.inProgress ? 'remove' : 'add');
                }}
                className="flex items-center gap-1.5 rounded-lg transition-colors"
                style={{
                  padding: '6px 14px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: flags.inProgress ? '#22C55E' : 'var(--dash-text-3)',
                  backgroundColor: flags.inProgress ? 'rgba(34,197,94,0.1)' : 'transparent',
                  border: `1px solid ${flags.inProgress ? 'rgba(34,197,94,0.3)' : 'var(--dash-border-btn)'}`,
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!flags.inProgress) {
                    (e.currentTarget as HTMLButtonElement).style.color = '#22C55E';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(34,197,94,0.3)';
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(34,197,94,0.06)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!flags.inProgress) {
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-3)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--dash-border-btn)';
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                  }
                }}
              >
                <Play style={{ width: '13px', height: '13px', fill: flags.inProgress ? 'currentColor' : 'none' }} />
                {flags.inProgress ? '진행 프로젝트 등록됨' : '진행 프로젝트로 등록'}
              </button>
            </div>
          )}

          {/* ── 스크롤 영역 ── */}
          <div
            className="flex-1 overflow-y-auto"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--dash-scrollbar) transparent' }}
          >
            {/* 분석 전 안내 */}
            {isNoneOrPending && (
              <div
                className="flex flex-col items-center justify-center"
                style={{ padding: '40px 20px', borderBottom: '1px solid var(--dash-border)' }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                  <Sparkles style={{ width: '20px', height: '20px', color: '#2563EB' }} />
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--dash-text)', marginBottom: '4px' }}>
                  AI 분석 대기 중
                </div>
                <div style={{ fontSize: '12px', color: 'var(--dash-text-4)', textAlign: 'center', lineHeight: 1.6 }}>
                  진행 등록을 하거나 상세 리포트에서<br />직접 분석을 시작할 수 있습니다.
                </div>
                {aiStatus === 'none' && (
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

            {/* AI 분석 중 안내 */}
            {isAnalyzing && (
              <div style={{ padding: '20px', borderBottom: '1px solid var(--dash-border)' }}>
                <div className="flex flex-col items-center justify-center mb-4">
                  <Loader2 className="animate-spin" style={{ width: '28px', height: '28px', color: '#F59E0B', marginBottom: '12px' }} />
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--dash-text)', marginBottom: '4px' }}>
                    AI 분석이 진행 중입니다
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--dash-text-4)', textAlign: 'center', lineHeight: 1.6 }}>
                    Gemini가 첨부 문서를 분석 중입니다 (30초~2분 소요).
                  </div>
                </div>
                {analysisLogs && analysisLogs.length > 0 && (
                  <div className="rounded-lg" style={{ padding: '10px 12px', backgroundColor: 'var(--dash-card-deep)', border: '1px solid var(--dash-border)', maxHeight: '240px', overflowY: 'auto' }}>
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

            {/* AI 추출 핵심항목 / 핵심 요약 */}
            {!isAnalyzing && !isNoneOrPending && (
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--dash-border)' }}>
                <SlideOverSectionTitle
                  icon={Sparkles}
                  title={ceoMode && !showFullDetail ? '핵심 요약' : 'AI 추출 핵심항목'}
                  badge={ceoMode && !showFullDetail
                    ? (detail ? '4건' : undefined)
                    : (detail ? `${AI_HIGHLIGHT_ITEMS.length + AI_DETAIL_ITEMS.length}건` : undefined)}
                  accentColor="#2563EB"
                />
                {!detail ? (
                  <div style={{ marginTop: '12px', textAlign: 'center', padding: '20px', color: 'var(--dash-text-4)', fontSize: '12px' }}>
                    공고를 선택하면 AI 분석 결과가 표시됩니다
                  </div>
                ) : ceoMode && !showFullDetail ? (
                  <div className="grid grid-cols-2 gap-2" style={{ marginTop: '12px' }}>
                    {CEO_ITEMS.map((item) => (
                      <div
                        key={item.label}
                        className="flex flex-col rounded-lg"
                        style={{ padding: '16px', backgroundColor: 'var(--dash-item-bg)', border: '1px solid var(--dash-border-item)' }}
                      >
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
                  <>
                    {/* 상단 하이라이트 카드 (3개) */}
                    <div className="flex gap-2" style={{ marginTop: '12px' }}>
                      {AI_HIGHLIGHT_ITEMS.map((item, index) => (
                        <div
                          key={item.label}
                          className="flex flex-col rounded-lg"
                          style={{ flex: 1, padding: '10px 12px', backgroundColor: 'var(--dash-item-bg)', border: '1px solid var(--dash-border-item)', alignItems: 'center', justifyContent: 'center', textAlign: 'center', position: 'relative' }}
                          onMouseEnter={() => setHoveredCardIndex(index)}
                          onMouseLeave={() => setHoveredCardIndex(null)}
                        >
                          <div className="flex items-center justify-center gap-1" style={{ marginBottom: '6px' }}>
                            <item.icon style={{ width: '11px', height: '11px', color: '#2563EB', flexShrink: 0 }} />
                            <div style={{ fontSize: '11px', color: 'var(--dash-text-4)' }}>{item.label}</div>
                          </div>
                          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--dash-text)', lineHeight: 1.3, textAlign: 'center' }}>
                            {item.value}
                          </div>
                          {hoveredCardIndex === index && item.value && item.value.length >= 10 && (
                            <div style={{
                              position: 'absolute',
                              bottom: 'calc(100% + 6px)',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              backgroundColor: 'var(--dash-tooltip-bg)',
                              color: '#FFFFFF',
                              fontSize: '11px',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-all',
                              maxWidth: '200px',
                              zIndex: 999,
                              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                              pointerEvents: 'none',
                              textAlign: 'left',
                            }}>
                              {item.value}
                            </div>
                          )}
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
            {!isAnalyzing && !isNoneOrPending && (
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
                    {riskFactors.map((w, i) => (
                      <RiskCard key={i} {...w} ceoMode={ceoMode && !showFullDetail} />
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

              const bg = complete
                ? '#2563EB'
                : generating
                ? 'var(--dash-card-deep)'
                : disabled
                ? 'var(--dash-card-deep)'
                : '#2563EB';
              const color = complete
                ? '#fff'
                : generating || disabled
                ? 'var(--dash-text-4)'
                : '#fff';

              return (
                <button
                  onClick={() => {
                    if (complete) onDownloadOutline?.(bid.id);
                    else if (!disabled) onRequestOutline?.(bid.id);
                  }}
                  disabled={disabled && !complete}
                  className="w-full flex items-center justify-center gap-2 rounded-xl"
                  style={{
                    padding: '11px 16px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color,
                    backgroundColor: bg,
                    border: '1px solid var(--dash-border-med)',
                    cursor: disabled && !complete ? 'not-allowed' : 'pointer',
                  }}
                >
                  {generating ? (
                    <Loader2 className="animate-spin" style={{ width: '15px', height: '15px' }} />
                  ) : complete ? (
                    <Download style={{ width: '15px', height: '15px' }} />
                  ) : (
                    <ScrollText style={{ width: '15px', height: '15px' }} />
                  )}
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
              {ceoMode ? '담당자 상세 보고서 보기' : '상세 분석 리포트 보기'}
              <ChevronRight style={{ width: '13px', height: '13px' }} />
            </button>
          </div>
        </>
      )}
    </div>

    {/* 진행하기 확인 다이얼로그 */}
    {showConfirm && bid && (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <div style={{ backgroundColor: 'var(--dash-card)', borderRadius: '12px', padding: '24px', maxWidth: '360px', width: '100%', margin: '0 16px', border: '1px solid var(--dash-border)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--dash-text)', margin: '0 0 8px', textAlign: showConfirm === 'remove' ? 'center' : 'left' }}>
            {showConfirm === 'add' ? '진행 프로젝트로 등록' : '진행 프로젝트에서 제거하시겠습니까?'}
          </h3>
          {showConfirm === 'add' ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--dash-text-3)', marginBottom: '4px' }}>영업담당자</div>
                  <input
                    value={regSalesManager}
                    onChange={(e) => setRegSalesManager(e.target.value)}
                    placeholder="이름 입력 (선택)"
                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--dash-border-med)', backgroundColor: 'var(--dash-input-bg)', color: 'var(--dash-text)', marginTop: '4px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--dash-text-3)', marginBottom: '4px' }}>담당 PM</div>
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
          <div style={{ display: 'flex', gap: '8px', justifyContent: showConfirm === 'remove' ? 'center' : 'flex-end' }}>
            <button
              onClick={() => setShowConfirm(null)}
              style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid var(--dash-border)', backgroundColor: 'transparent', color: 'var(--dash-text-3)', fontSize: '13px', cursor: 'pointer' }}
            >
              취소
            </button>
            <button
              onClick={() => {
                onToggleInProgress(bid.id);
                if (showConfirm === 'add' && (regSalesManager || regProjectPm)) {
                  onUpdateManagers?.(bid.id, regSalesManager, regProjectPm);
                }
                setShowConfirm(null);
              }}
              style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', backgroundColor: showConfirm === 'add' ? '#2563EB' : '#EF4444', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
            >
              {showConfirm === 'add' ? '등록' : '제거'}
            </button>
          </div>
        </div>
      </div>
    )}
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

const RISK_SEVERITY_CFG = {
  danger:  { color: '#EF4444', bg: 'rgba(239,68,68,0.07)',  border: 'rgba(239,68,68,0.15)',  label: '위험' },
  warning: { color: '#F97316', bg: 'rgba(249,115,22,0.07)', border: 'rgba(249,115,22,0.15)', label: '경고' },
  caution: { color: '#EAB308', bg: 'rgba(234,179,8,0.07)',  border: 'rgba(234,179,8,0.15)',  label: '주의' },
} as const;

function RiskCard({ category, clause, severity, reason, source, ceoMode = false }: RiskFactor & { ceoMode?: boolean }) {
  const cfg = RISK_SEVERITY_CFG[severity] ?? RISK_SEVERITY_CFG.caution;

  return (
    <div
      className="rounded-lg"
      style={{
        padding: '10px 12px',
        backgroundColor: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderLeft: `3px solid ${cfg.color}`,
      }}
    >
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
