import { useState } from 'react';
import { Sparkles, FileText, Bookmark, BookmarkX, Play } from 'lucide-react';
import { type Bid, type BidFlags, type AiStatusType, formatBudget, getDaysUntilDeadline, isDeadlineUrgent } from '../types';
import { RiskBadge, AiStatusIndicator } from './BidTable';

type TabType = 'complete' | 'analyzing' | 'pending';

const TABS: { key: TabType; label: string }[] = [
  { key: 'complete',  label: '분석 완료' },
  { key: 'analyzing', label: '분석 중' },
  { key: 'pending',   label: '대기중' },
];

interface AnalysisListPageProps {
  bids: Bid[];
  aiStatuses: Record<string, AiStatusType>;
  bidFlags: Record<string, BidFlags>;
  onOpenAnalysisDetail: (bid: Bid) => void;
  onToggleBookmark: (bidId: string) => void;
  onToggleInProgress: (bidId: string) => void;
  onUpdateManagers?: (bidId: string, salesManager: string, projectPm: string) => void;
}

export function AnalysisListPage({ bids, aiStatuses, bidFlags, onOpenAnalysisDetail, onToggleBookmark, onToggleInProgress, onUpdateManagers }: AnalysisListPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>('complete');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerTargetBid, setRegisterTargetBid] = useState<Bid | null>(null);
  const [regSalesManager, setRegSalesManager] = useState('');
  const [regProjectPm, setRegProjectPm] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelTargetBid, setCancelTargetBid] = useState<Bid | null>(null);

  // 마감됐고 진행 중이 아닌 공고는 제외
  const visibleBids = bids.filter(b =>
    getDaysUntilDeadline(b.deadline) >= 0 || (bidFlags[b.id]?.inProgress ?? false)
  );

  const counts: Record<TabType, number> = {
    complete:  visibleBids.filter(b => (aiStatuses[b.id] ?? 'none') === 'complete').length,
    analyzing: visibleBids.filter(b => (aiStatuses[b.id] ?? 'none') === 'analyzing').length,
    pending:   visibleBids.filter(b => (aiStatuses[b.id] ?? 'none') === 'pending').length,
  };

  const filteredBids = visibleBids.filter(b => (aiStatuses[b.id] ?? 'none') === activeTab);

  const handleRequestRegister = (bid: Bid) => {
    setRegisterTargetBid(bid);
    setRegSalesManager(bid.salesManager ?? '');
    setRegProjectPm(bid.projectPm ?? '');
    setShowRegisterModal(true);
  };

  const handleConfirmRegister = () => {
    if (!registerTargetBid) return;
    onToggleInProgress(registerTargetBid.id);
    if (regSalesManager || regProjectPm) {
      onUpdateManagers?.(registerTargetBid.id, regSalesManager, regProjectPm);
    }
    setShowRegisterModal(false);
    setRegisterTargetBid(null);
  };

  const handleRequestCancel = (bid: Bid) => {
    setCancelTargetBid(bid);
    setShowCancelModal(true);
  };

  const handleConfirmCancel = () => {
    if (!cancelTargetBid) return;
    onToggleInProgress(cancelTargetBid.id);
    setShowCancelModal(false);
    setCancelTargetBid(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* 1. 헤더 */}
      <div>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--dash-text)', margin: '0 0 4px' }}>AI 분석</h1>
        <p style={{ fontSize: '13px', color: 'var(--dash-text-3)', margin: 0 }}>AI 분석이 완료된 공고 목록입니다</p>
      </div>

      {/* 2. 탭 */}
      <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--dash-border)', paddingBottom: '0' }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '8px 14px',
                fontSize: '13px', fontWeight: isActive ? 600 : 400,
                color: isActive ? '#2563EB' : 'var(--dash-text-3)',
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                marginBottom: '-1px',
                transition: 'color 0.15s',
              }}
            >
              {tab.label}
              <span style={{
                fontSize: '11px', padding: '1px 6px', borderRadius: '10px',
                backgroundColor: isActive ? 'rgba(37,99,235,0.12)' : 'var(--dash-item-bg-alt)',
                color: isActive ? '#2563EB' : 'var(--dash-text-4)',
                minWidth: '20px', textAlign: 'center',
              }}>
                {counts[tab.key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. 카드 목록 */}
      {filteredBids.length === 0 ? (
        <EmptyState tab={activeTab} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
          {filteredBids.map((bid) => (
            <BidCard
              key={bid.id}
              bid={bid}
              aiStatus={aiStatuses[bid.id] ?? 'none'}
              flags={bidFlags[bid.id] ?? { bookmarked: false, inProgress: false }}
              onOpenAnalysisDetail={onOpenAnalysisDetail}
              onToggleBookmark={onToggleBookmark}
              onRequestRegister={handleRequestRegister}
              onRequestCancel={handleRequestCancel}
            />
          ))}
        </div>
      )}

      {/* 진행 취소 확인 모달 */}
      {showCancelModal && cancelTargetBid && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowCancelModal(false)}
        >
          <div
            style={{ backgroundColor: 'var(--dash-card)', borderRadius: '12px', padding: '24px', maxWidth: '360px', width: '100%', margin: '0 16px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--dash-text)', margin: '0 0 8px' }}>진행 취소</h3>
            <p style={{ fontSize: '13px', color: 'var(--dash-text-3)', margin: '0 0 20px', lineHeight: 1.6 }}>
              진행 프로젝트에서 제거하시겠습니까?
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCancelModal(false)}
                style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid var(--dash-border)', backgroundColor: 'transparent', color: 'var(--dash-text-3)', fontSize: '13px', cursor: 'pointer' }}
              >
                취소
              </button>
              <button
                onClick={handleConfirmCancel}
                style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', backgroundColor: '#EF4444', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 진행 등록 모달 */}
      {showRegisterModal && registerTargetBid && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowRegisterModal(false)}
        >
          <div
            style={{ backgroundColor: 'var(--dash-card)', borderRadius: '12px', padding: '24px', maxWidth: '360px', width: '100%', margin: '0 16px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--dash-text)', margin: '0 0 8px' }}>진행 프로젝트로 등록</h3>
            <p style={{ fontSize: '13px', color: 'var(--dash-text-3)', margin: '0 0 16px', lineHeight: 1.6 }}>
              등록하면 AI 분석이 자동으로 시작됩니다.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--dash-text-3)', marginBottom: '4px' }}>영업담당자</div>
                <input
                  value={regSalesManager}
                  onChange={(e) => setRegSalesManager(e.target.value)}
                  placeholder="이름 입력 (선택)"
                  style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--dash-border-med)', backgroundColor: 'var(--dash-input-bg)', color: 'var(--dash-text)', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--dash-text-3)', marginBottom: '4px' }}>담당 PM</div>
                <input
                  value={regProjectPm}
                  onChange={(e) => setRegProjectPm(e.target.value)}
                  placeholder="이름 입력 (선택)"
                  style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--dash-border-med)', backgroundColor: 'var(--dash-input-bg)', color: 'var(--dash-text)', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowRegisterModal(false)}
                style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid var(--dash-border)', backgroundColor: 'transparent', color: 'var(--dash-text-3)', fontSize: '13px', cursor: 'pointer' }}
              >
                취소
              </button>
              <button
                onClick={handleConfirmRegister}
                style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', backgroundColor: '#2563EB', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
              >
                등록
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BidCard({ bid, aiStatus, flags, onOpenAnalysisDetail, onToggleBookmark, onRequestRegister, onRequestCancel }: {
  bid: Bid;
  aiStatus: AiStatusType;
  flags: BidFlags;
  onOpenAnalysisDetail: (bid: Bid) => void;
  onToggleBookmark: (bidId: string) => void;
  onRequestRegister: (bid: Bid) => void;
  onRequestCancel: (bid: Bid) => void;
}) {
  const daysLeft = getDaysUntilDeadline(bid.deadline);
  const urgent = isDeadlineUrgent(bid.deadline);

  return (
    <div
      style={{
        backgroundColor: 'var(--dash-card)',
        border: '1px solid var(--dash-border)',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex', flexDirection: 'column', gap: '10px',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(37,99,235,0.3)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--dash-border)'; }}
    >
      {/* 상단: ISP/ISMP 타입 → AI 상태 → 위험도 → D-day */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        {bid.type !== '기타' && (
          <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '4px', backgroundColor: 'rgba(37,99,235,0.1)', color: '#60A5FA', flexShrink: 0, fontWeight: 500 }}>
            {bid.type}
          </span>
        )}
        <AiStatusIndicator status={aiStatus} />
        <RiskBadge risk={bid.risk} />
        {urgent && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', borderRadius: '40px', fontSize: '11px', fontWeight: 400, backgroundColor: 'var(--badge-red-bg)', color: '#F27A75', whiteSpace: 'nowrap', flexShrink: 0 }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#F27A75', flexShrink: 0, display: 'inline-block' }} />
            D-{daysLeft}
          </span>
        )}
      </div>

      {/* 중앙: 공고명 + 메타 */}
      <div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--dash-text)', lineHeight: 1.45, marginBottom: '6px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
          {bid.title}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--dash-text-3)', marginBottom: '4px' }}>{bid.agency}</div>
        <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--dash-text-4)' }}>
          <span><span style={{ color: 'var(--dash-text-5)' }}>예산: </span>{formatBudget(bid.budget)}</span>
          <span style={{ color: urgent ? '#F27A75' : 'var(--dash-text-4)' }}><span style={{ color: urgent ? '#F27A75' : 'var(--dash-text-5)' }}>마감일: </span>{bid.deadline.substring(5)}</span>
        </div>
      </div>

      {/* 하단 버튼 */}
      <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
        <button
          onClick={() => onOpenAnalysisDetail(bid)}
          style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '7px 12px', borderRadius: '8px', border: '1px solid rgba(37,99,235,0.3)', backgroundColor: 'transparent', color: '#2563EB', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(37,99,235,0.06)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
        >
          <FileText style={{ width: '12px', height: '12px' }} />
          상세 분석 리포트
        </button>
        <button
          onClick={() => onToggleBookmark(bid.id)}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '7px 10px', borderRadius: '8px', border: `1px solid ${flags.bookmarked ? 'rgba(37,99,235,0.3)' : 'var(--dash-border)'}`, backgroundColor: flags.bookmarked ? 'rgba(37,99,235,0.06)' : 'transparent', color: flags.bookmarked ? '#2563EB' : 'var(--dash-text-3)', fontSize: '12px', cursor: 'pointer' }}
          onMouseEnter={(e) => { if (!flags.bookmarked) (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(37,99,235,0.2)'; }}
          onMouseLeave={(e) => { if (!flags.bookmarked) (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--dash-border)'; }}
        >
          {flags.bookmarked
            ? <><BookmarkX style={{ width: '12px', height: '12px' }} />관심공고 해제</>
            : <><Bookmark style={{ width: '12px', height: '12px' }} />관심공고 추가</>
          }
        </button>
        <button
          onClick={() => flags.inProgress ? onRequestCancel(bid) : onRequestRegister(bid)}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '7px 10px', borderRadius: '8px', border: `1px solid ${flags.inProgress ? 'rgba(34,197,94,0.3)' : 'var(--dash-border)'}`, backgroundColor: flags.inProgress ? 'rgba(34,197,94,0.06)' : 'transparent', color: flags.inProgress ? '#22C55E' : 'var(--dash-text-3)', fontSize: '12px', cursor: 'pointer' }}
          onMouseEnter={(e) => { if (!flags.inProgress) (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(34,197,94,0.2)'; }}
          onMouseLeave={(e) => { if (!flags.inProgress) (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--dash-border)'; }}
        >
          <Play style={{ width: '12px', height: '12px', fill: flags.inProgress ? 'currentColor' : 'none' }} />
          {flags.inProgress ? '진행' : '진행 등록'}
        </button>
      </div>
    </div>
  );
}

function EmptyState({ tab }: { tab: TabType }) {
  const messages: Record<TabType, { title: string; sub: string }> = {
    complete:  { title: '아직 분석 완료된 공고가 없습니다', sub: '관심공고 추가 또는 진행 등록을 하면 AI 분석이 시작됩니다' },
    analyzing: { title: '현재 분석 중인 공고가 없습니다', sub: '' },
    pending:   { title: '대기 중인 공고가 없습니다', sub: '' },
  };
  const { title, sub } = messages[tab];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', gap: '12px' }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Sparkles style={{ width: '24px', height: '24px', color: '#2563EB' }} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--dash-text)', marginBottom: '4px' }}>{title}</div>
        {sub && <div style={{ fontSize: '12px', color: 'var(--dash-text-4)' }}>{sub}</div>}
      </div>
    </div>
  );
}
