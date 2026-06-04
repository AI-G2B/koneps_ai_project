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
}

export function AnalysisListPage({ bids, aiStatuses, bidFlags, onOpenAnalysisDetail, onToggleBookmark, onToggleInProgress }: AnalysisListPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>('complete');

  const counts: Record<TabType, number> = {
    complete:  bids.filter(b => (aiStatuses[b.id] ?? 'none') === 'complete').length,
    analyzing: bids.filter(b => (aiStatuses[b.id] ?? 'none') === 'analyzing').length,
    pending:   bids.filter(b => (aiStatuses[b.id] ?? 'none') === 'pending').length,
  };

  const filteredBids = bids.filter(b => (aiStatuses[b.id] ?? 'none') === activeTab);

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
              onToggleInProgress={onToggleInProgress}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BidCard({ bid, aiStatus, flags, onOpenAnalysisDetail, onToggleBookmark, onToggleInProgress }: {
  bid: Bid;
  aiStatus: AiStatusType;
  flags: BidFlags;
  onOpenAnalysisDetail: (bid: Bid) => void;
  onToggleBookmark: (bidId: string) => void;
  onToggleInProgress: (bidId: string) => void;
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
      {/* 상단: AI 상태 + 위험도 + 타입 + D-day */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <AiStatusIndicator status={aiStatus} />
        <RiskBadge risk={bid.risk} />
        {bid.type !== '기타' && (
          <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '4px', backgroundColor: 'rgba(37,99,235,0.1)', color: '#60A5FA', flexShrink: 0, fontWeight: 500 }}>
            {bid.type}
          </span>
        )}
        {urgent && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 12px', borderRadius: '40px', fontSize: '13px', fontWeight: 400, backgroundColor: 'var(--badge-red-bg)', color: '#F27A75', whiteSpace: 'nowrap', flexShrink: 0 }}>
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
          <span>{formatBudget(bid.budget)}</span>
          <span style={{ color: urgent ? '#F27A75' : 'var(--dash-text-4)' }}>{bid.deadline.substring(5)}</span>
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
          onClick={() => onToggleInProgress(bid.id)}
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
