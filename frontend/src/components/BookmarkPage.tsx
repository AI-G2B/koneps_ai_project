import { Bookmark, BookmarkX, Play, Building2, Banknote, Calendar } from 'lucide-react';
import { type Bid, type BidFlags, formatBudget, getDaysUntilDeadline, isDeadlineUrgent } from '../types';
import { RiskBadge, AiStatusIndicator } from './BidTable';
import { BidDetailPanel } from './BidDetailPanel';

interface BookmarkPageProps {
  bids: Bid[];
  bidFlags: Record<string, BidFlags>;
  onToggleBookmark: (bidId: string) => void;
  onToggleInProgress: (bidId: string) => void;
  onSelectBid: (bid: Bid) => void;
  selectedBid: Bid | null;
}

export function BookmarkPage({ bids, bidFlags, onToggleBookmark, onToggleInProgress, onSelectBid, selectedBid }: BookmarkPageProps) {
  const bookmarkedBids = bids.filter((b) => bidFlags[b.id]?.bookmarked ?? false);

  return (
    <div className="flex gap-4" style={{ flex: 1, minHeight: 0 }}>
      {/* 카드 목록 */}
      <div className="flex-1 min-w-0 rounded-xl flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)' }}>
        {/* 헤더 */}
        <div className="flex-shrink-0 flex items-center gap-3" style={{ padding: '12px 16px', borderBottom: '1px solid var(--dash-border)' }}>
          <Bookmark style={{ width: '15px', height: '15px', color: '#2563EB', fill: '#2563EB' }} />
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--dash-text)' }}>관심 공고</h2>
          <span className="rounded-full" style={{ fontSize: '11px', padding: '1px 8px', backgroundColor: 'rgba(37,99,235,0.15)', color: '#2563EB' }}>
            {bookmarkedBids.length}건
          </span>
        </div>

        {/* 목록 */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '12px', scrollbarWidth: 'thin', scrollbarColor: 'var(--dash-scrollbar) transparent' }}>
          {bookmarkedBids.length === 0 ? (
            <EmptyState />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {bookmarkedBids.map((bid) => (
                <BidCard
                  key={bid.id}
                  bid={bid}
                  isSelected={selectedBid?.id === bid.id}
                  flags={bidFlags[bid.id] ?? { bookmarked: false, inProgress: false }}
                  onSelect={() => onSelectBid(bid)}
                  onToggleBookmark={onToggleBookmark}
                  onToggleInProgress={onToggleInProgress}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 상세 패널 */}
      <BidDetailPanel bid={selectedBid} />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center" style={{ height: '100%', minHeight: '300px', gap: '12px', color: 'var(--dash-text-4)' }}>
      <div className="rounded-2xl flex items-center justify-center" style={{ width: '56px', height: '56px', backgroundColor: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.12)' }}>
        <Bookmark style={{ width: '24px', height: '24px', color: '#2563EB' }} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--dash-text-3)', marginBottom: '4px' }}>관심공고가 없습니다</div>
        <div style={{ fontSize: '12px', color: 'var(--dash-text-5)' }}>공고 목록에서 관심 공고를 추가해보세요</div>
      </div>
    </div>
  );
}

function BidCard({ bid, isSelected, flags, onSelect, onToggleBookmark, onToggleInProgress }: {
  bid: Bid;
  isSelected: boolean;
  flags: BidFlags;
  onSelect: () => void;
  onToggleBookmark: (bidId: string) => void;
  onToggleInProgress: (bidId: string) => void;
}) {
  const daysLeft = getDaysUntilDeadline(bid.deadline);
  const urgent = isDeadlineUrgent(bid.deadline);

  return (
    <div
      onClick={onSelect}
      className="rounded-xl"
      style={{
        padding: '14px 16px',
        backgroundColor: isSelected ? 'rgba(37,99,235,0.08)' : 'var(--dash-surface)',
        border: `1px solid ${isSelected ? 'rgba(37,99,235,0.35)' : 'var(--dash-border)'}`,
        borderLeft: `3px solid ${isSelected ? '#2563EB' : 'transparent'}`,
        cursor: 'pointer',
        transition: 'background-color 0.15s, border-color 0.15s',
      }}
      onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--dash-item-bg-alt)'; }}
      onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--dash-surface)'; }}
    >
      <div className="flex items-start gap-3">
        {/* 공고 정보 */}
        <div className="flex-1 min-w-0">
          {/* 제목 행 */}
          <div className="flex items-center gap-2" style={{ marginBottom: '8px' }}>
            <RiskBadge risk={bid.risk} />
            {bid.type !== '기타' && (
              <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', backgroundColor: 'rgba(37,99,235,0.1)', color: '#60A5FA', flexShrink: 0, fontWeight: 500 }}>
                {bid.type}
              </span>
            )}
            <span
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: isSelected ? '#1E40AF' : 'var(--dash-text)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
                minWidth: 0,
              }}
            >
              {bid.title}
            </span>
          </div>

          {/* 메타 정보 행 */}
          <div className="flex items-center flex-wrap" style={{ gap: '12px' }}>
            <span className="flex items-center gap-1" style={{ fontSize: '12px', color: 'var(--dash-text-3)' }}>
              <Building2 style={{ width: '12px', height: '12px', color: 'var(--dash-icon-off)', flexShrink: 0 }} />
              {bid.agency}
            </span>
            <span className="flex items-center gap-1" style={{ fontSize: '12px', color: 'var(--dash-text-3)' }}>
              <Banknote style={{ width: '12px', height: '12px', color: 'var(--dash-icon-off)', flexShrink: 0 }} />
              {formatBudget(bid.budget)}
            </span>
            <span className="flex items-center gap-1" style={{ fontSize: '12px', color: urgent ? '#EF4444' : 'var(--dash-text-3)', fontWeight: urgent ? 600 : 400 }}>
              <Calendar style={{ width: '12px', height: '12px', flexShrink: 0 }} />
              {bid.deadline.substring(5)}
              {urgent && (
                <span className="rounded-full" style={{ fontSize: '10px', padding: '0 5px', backgroundColor: 'rgba(239,68,68,0.15)', color: '#EF4444', marginLeft: '2px' }}>
                  D-{daysLeft}
                </span>
              )}
            </span>
            <AiStatusIndicator status={bid.aiStatus} />
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onToggleBookmark(bid.id)}
            className="rounded-md flex items-center gap-1"
            style={{ padding: '5px 10px', height: '30px', fontSize: '12px', color: '#2563EB', backgroundColor: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(37,99,235,0.18)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(37,99,235,0.1)'; }}
            title="관심공고 해제"
          >
            <BookmarkX style={{ width: '13px', height: '13px' }} />
            <span>관심공고 해제</span>
          </button>
          <button
            onClick={() => onToggleInProgress(bid.id)}
            className="rounded-md flex items-center gap-1"
            style={{
              padding: '5px 10px',
              height: '30px',
              fontSize: '12px',
              color: flags.inProgress ? '#22C55E' : 'var(--dash-text-3)',
              backgroundColor: flags.inProgress ? 'rgba(34,197,94,0.12)' : 'transparent',
              border: `1px solid ${flags.inProgress ? 'rgba(34,197,94,0.3)' : 'var(--dash-border-btn)'}`,
            }}
            onMouseEnter={(e) => { if (!flags.inProgress) { (e.currentTarget as HTMLButtonElement).style.color = '#22C55E'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(34,197,94,0.1)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(34,197,94,0.3)'; } }}
            onMouseLeave={(e) => { if (!flags.inProgress) { (e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-3)'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--dash-border-btn)'; } }}
            title="진행 등록"
          >
            <Play style={{ width: '12px', height: '12px', fill: flags.inProgress ? 'currentColor' : 'none', flexShrink: 0 }} />
            <span>{flags.inProgress ? '진행' : '진행 등록'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
