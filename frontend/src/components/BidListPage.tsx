import { useState } from 'react';
import {
  Bookmark, BookmarkX, Play, Building2, Banknote, Calendar,
  Eye, FileSearch, ListFilter,
} from 'lucide-react';
import { type Bid, type BidStatus, formatBudget, getDaysUntilDeadline, isDeadlineUrgent, TODAY } from './mockData';
import { RiskBadge } from './BidTable';

type DateFilter = 'today' | 'yesterday' | '3days' | '1week' | 'all';
type StatusFilter = 'all' | 'urgent' | 'danger';
type TabType = 'bookmarked' | 'inProgress';

const DATE_FILTERS: { key: DateFilter; label: string }[] = [
  { key: 'today', label: '오늘' },
  { key: 'yesterday', label: '어제' },
  { key: '3days', label: '3일' },
  { key: '1week', label: '1주일' },
  { key: 'all', label: '전체' },
];

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'urgent', label: '마감임박' },
  { key: 'danger', label: '위험공고' },
];

interface BidListPageProps {
  bids: Bid[];
  bidStatuses: Map<string, BidStatus>;
  onToggleBookmark: (bidId: string) => void;
  onSetInProgress: (bidId: string) => void;
}

export function BidListPage({ bids, bidStatuses, onToggleBookmark, onSetInProgress }: BidListPageProps) {
  return (
    <div className="flex gap-0" style={{ flex: 1, minHeight: 0, borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--dash-border)', backgroundColor: 'var(--dash-card)' }}>
      <LeftPanel bids={bids} bidStatuses={bidStatuses} onToggleBookmark={onToggleBookmark} onSetInProgress={onSetInProgress} />
      <div style={{ width: '1px', backgroundColor: 'var(--dash-border)', flexShrink: 0 }} />
      <RightPanel bids={bids} bidStatuses={bidStatuses} onToggleBookmark={onToggleBookmark} onSetInProgress={onSetInProgress} />
    </div>
  );
}

function LeftPanel({ bids, bidStatuses, onToggleBookmark, onSetInProgress }: BidListPageProps) {
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const getFromDate = (f: DateFilter): Date | null => {
    const base = new Date(TODAY);
    if (f === 'today') return new Date(base.setHours(0, 0, 0, 0));
    if (f === 'yesterday') { base.setDate(base.getDate() - 1); base.setHours(0, 0, 0, 0); return base; }
    if (f === '3days') { base.setDate(base.getDate() - 2); base.setHours(0, 0, 0, 0); return base; }
    if (f === '1week') { base.setDate(base.getDate() - 6); base.setHours(0, 0, 0, 0); return base; }
    return null;
  };

  const filtered = bids.filter((bid) => {
    const fromDate = getFromDate(dateFilter);
    if (fromDate && new Date(bid.collectedAt) < fromDate) return false;
    if (statusFilter === 'urgent') return isDeadlineUrgent(bid.deadline);
    if (statusFilter === 'danger') return bid.risk === 'danger';
    return true;
  });

  return (
    <div className="flex flex-col" style={{ flex: 3, minWidth: 0, overflow: 'hidden' }}>
      {/* 헤더 */}
      <div className="flex-shrink-0" style={{ padding: '12px 16px', borderBottom: '1px solid var(--dash-border)' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
          <div className="flex items-center gap-2">
            <ListFilter style={{ width: '14px', height: '14px', color: '#2563EB' }} />
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--dash-text)' }}>현황 리스트</h2>
            <span className="rounded-full" style={{ fontSize: '11px', padding: '1px 8px', backgroundColor: 'rgba(37,99,235,0.15)', color: '#2563EB' }}>
              {filtered.length}건
            </span>
          </div>
          <div className="flex items-center gap-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className="rounded-lg transition-colors"
                style={{
                  padding: '4px 10px',
                  fontSize: '12px',
                  backgroundColor: statusFilter === f.key
                    ? f.key === 'all' ? '#2563EB' : f.key === 'urgent' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)'
                    : 'transparent',
                  color: statusFilter === f.key
                    ? f.key === 'all' ? 'white' : f.key === 'urgent' ? '#EF4444' : '#F59E0B'
                    : 'var(--dash-text-3)',
                  border: `1px solid ${statusFilter === f.key
                    ? f.key === 'all' ? 'transparent' : f.key === 'urgent' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'
                    : 'var(--dash-border-btn)'}`,
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Calendar style={{ width: '13px', height: '13px', color: 'var(--dash-text-4)' }} />
          <span style={{ fontSize: '11px', color: 'var(--dash-text-4)' }}>수집일:</span>
          <div className="flex items-center gap-1">
            {DATE_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setDateFilter(f.key)}
                className="rounded-md transition-colors"
                style={{
                  padding: '3px 10px',
                  fontSize: '11px',
                  backgroundColor: dateFilter === f.key ? 'rgba(37,99,235,0.12)' : 'transparent',
                  color: dateFilter === f.key ? '#2563EB' : 'var(--dash-text-4)',
                  border: `1px solid ${dateFilter === f.key ? 'rgba(37,99,235,0.3)' : 'var(--dash-border-btn)'}`,
                  fontWeight: dateFilter === f.key ? 600 : 400,
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 테이블 */}
      <div className="flex-1 overflow-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--dash-scrollbar) transparent' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '560px' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <tr style={{ backgroundColor: 'var(--dash-card-deep)' }}>
              {[
                { label: '공고명', width: undefined },
                { label: '발주기관', width: '96px' },
                { label: '예산', width: '84px' },
                { label: '마감일', width: '84px' },
                { label: '위험도', width: '66px' },
                { label: '액션', width: '80px' },
              ].map((col) => (
                <th
                  key={col.label}
                  style={{
                    padding: '8px 12px',
                    textAlign: 'left',
                    fontSize: '11px',
                    color: 'var(--dash-text-4)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    width: col.width,
                    borderBottom: '1px solid var(--dash-border)',
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--dash-text-4)', fontSize: '13px' }}>
                  해당 기간에 수집된 공고가 없습니다
                </td>
              </tr>
            ) : (
              filtered.map((bid) => (
                <LeftRow
                  key={bid.id}
                  bid={bid}
                  bidStatus={bidStatuses.get(bid.id) ?? 'none'}
                  onToggleBookmark={onToggleBookmark}
                  onSetInProgress={onSetInProgress}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 푸터 */}
      <div className="flex-shrink-0 flex items-center" style={{ padding: '8px 16px', borderTop: '1px solid var(--dash-border)' }}>
        <span style={{ fontSize: '11px', color: 'var(--dash-text-5)' }}>{filtered.length}건 표시 중 (전체 {bids.length}건)</span>
      </div>
    </div>
  );
}

function LeftRow({ bid, bidStatus, onToggleBookmark, onSetInProgress }: {
  bid: Bid;
  bidStatus: BidStatus;
  onToggleBookmark: (bidId: string) => void;
  onSetInProgress: (bidId: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const urgent = isDeadlineUrgent(bid.deadline);
  const daysLeft = getDaysUntilDeadline(bid.deadline);
  const rowBg = hovered ? 'var(--dash-row-hover)' : 'transparent';

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ backgroundColor: rowBg, borderBottom: '1px solid var(--dash-border-faint)', transition: 'background-color 0.15s' }}
    >
      {/* 공고명 */}
      <td style={{ padding: '10px 12px', maxWidth: '220px' }}>
        <div style={{ fontSize: '13px', color: 'var(--dash-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '3px' }}>
          {bid.title}
        </div>
        <div className="flex items-center gap-1" style={{ flexWrap: 'wrap', rowGap: '2px' }}>
          {bidStatus === 'bookmarked' && (
            <span className="flex items-center gap-0.5 rounded" style={{ fontSize: '10px', padding: '0 4px', backgroundColor: 'rgba(37,99,235,0.15)', color: '#2563EB', flexShrink: 0, fontWeight: 500 }}>
              <Bookmark style={{ width: '9px', height: '9px', fill: 'currentColor' }} />찜
            </span>
          )}
          {bidStatus === 'inProgress' && (
            <span className="flex items-center gap-0.5 rounded" style={{ fontSize: '10px', padding: '0 4px', backgroundColor: 'rgba(34,197,94,0.15)', color: '#22C55E', flexShrink: 0, fontWeight: 500 }}>
              <Play style={{ width: '9px', height: '9px', fill: 'currentColor' }} />진행중
            </span>
          )}
          <span className="rounded" style={{ fontSize: '10px', padding: '0 4px', backgroundColor: 'rgba(37,99,235,0.12)', color: '#60A5FA', flexShrink: 0 }}>{bid.type}</span>
        </div>
      </td>
      {/* 발주기관 */}
      <td style={{ padding: '10px 12px' }}>
        <span style={{ fontSize: '12px', color: 'var(--dash-text-2)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '96px' }}>{bid.agency}</span>
      </td>
      {/* 예산 */}
      <td style={{ padding: '10px 12px' }}>
        <span style={{ fontSize: '13px', color: 'var(--dash-text)', fontWeight: 500, whiteSpace: 'nowrap' }}>{formatBudget(bid.budget)}</span>
      </td>
      {/* 마감일 */}
      <td style={{ padding: '10px 12px' }}>
        <span style={{ fontSize: '12px', fontWeight: urgent ? 600 : 400, color: urgent ? '#EF4444' : 'var(--dash-text-2)', whiteSpace: 'nowrap' }}>
          {bid.deadline.substring(5)}
        </span>
        {urgent && (
          <div className="mt-0.5">
            <span className="rounded-full" style={{ fontSize: '10px', padding: '0 5px', backgroundColor: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>D-{daysLeft}</span>
          </div>
        )}
      </td>
      {/* 위험도 */}
      <td style={{ padding: '10px 12px' }}>
        <RiskBadge risk={bid.risk} />
      </td>
      {/* 액션 */}
      <td style={{ padding: '10px 12px' }}>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggleBookmark(bid.id)}
            className="rounded-md flex items-center justify-center"
            style={{ width: '28px', height: '28px', color: bidStatus === 'bookmarked' ? '#2563EB' : 'var(--dash-text-3)', backgroundColor: bidStatus === 'bookmarked' ? 'rgba(37,99,235,0.12)' : 'transparent', border: 'none' }}
            onMouseEnter={(e) => { if (bidStatus !== 'bookmarked') (e.currentTarget as HTMLButtonElement).style.color = '#2563EB'; }}
            onMouseLeave={(e) => { if (bidStatus !== 'bookmarked') (e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-3)'; }}
            title="찜하기"
          >
            <Bookmark style={{ width: '14px', height: '14px', fill: bidStatus === 'bookmarked' ? 'currentColor' : 'none' }} />
          </button>
          <button
            onClick={() => onSetInProgress(bid.id)}
            className="rounded-md flex items-center justify-center"
            style={{ width: '28px', height: '28px', color: bidStatus === 'inProgress' ? '#22C55E' : 'var(--dash-text-3)', backgroundColor: bidStatus === 'inProgress' ? 'rgba(34,197,94,0.12)' : 'transparent', border: 'none' }}
            onMouseEnter={(e) => { if (bidStatus !== 'inProgress') (e.currentTarget as HTMLButtonElement).style.color = '#22C55E'; }}
            onMouseLeave={(e) => { if (bidStatus !== 'inProgress') (e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-3)'; }}
            title="진행하기"
          >
            <Play style={{ width: '13px', height: '13px', fill: bidStatus === 'inProgress' ? 'currentColor' : 'none' }} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function RightPanel({ bids, bidStatuses, onToggleBookmark, onSetInProgress }: BidListPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>('bookmarked');

  const bookmarkedBids = bids.filter((b) => bidStatuses.get(b.id) === 'bookmarked');
  const inProgressBids = bids.filter((b) => bidStatuses.get(b.id) === 'inProgress');
  const listBids = activeTab === 'bookmarked' ? bookmarkedBids : inProgressBids;

  return (
    <div className="flex flex-col" style={{ flex: 2, minWidth: 0, overflow: 'hidden' }}>
      {/* 헤더 */}
      <div className="flex-shrink-0" style={{ padding: '12px 16px', borderBottom: '1px solid var(--dash-border)' }}>
        <div className="flex items-center gap-2" style={{ marginBottom: '10px' }}>
          <FileSearch style={{ width: '14px', height: '14px', color: '#7C3AED' }} />
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--dash-text)' }}>대상 리스트</h2>
        </div>
        {/* 탭 */}
        <div className="flex gap-1">
          {([
            { key: 'bookmarked' as TabType, label: '찜한 공고', count: bookmarkedBids.length, activeColor: '#2563EB', activeBg: 'rgba(37,99,235,0.12)', activeBorder: 'rgba(37,99,235,0.3)' },
            { key: 'inProgress' as TabType, label: '진행중 공고', count: inProgressBids.length, activeColor: '#22C55E', activeBg: 'rgba(34,197,94,0.12)', activeBorder: 'rgba(34,197,94,0.3)' },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-1.5 rounded-lg transition-colors"
              style={{
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: activeTab === tab.key ? 600 : 400,
                color: activeTab === tab.key ? tab.activeColor : 'var(--dash-text-3)',
                backgroundColor: activeTab === tab.key ? tab.activeBg : 'transparent',
                border: `1px solid ${activeTab === tab.key ? tab.activeBorder : 'var(--dash-border-btn)'}`,
              }}
            >
              {tab.label}
              <span
                className="rounded-full"
                style={{
                  fontSize: '10px',
                  padding: '0 5px',
                  minWidth: '16px',
                  textAlign: 'center',
                  backgroundColor: activeTab === tab.key ? tab.activeColor : 'var(--dash-item-bg)',
                  color: activeTab === tab.key ? 'white' : 'var(--dash-text-4)',
                }}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 카드 목록 */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '12px', scrollbarWidth: 'thin', scrollbarColor: 'var(--dash-scrollbar) transparent' }}>
        {listBids.length === 0 ? (
          <RightEmptyState tab={activeTab} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {listBids.map((bid) => (
              <RightCard
                key={bid.id}
                bid={bid}
                bidStatus={bidStatuses.get(bid.id) ?? 'none'}
                tab={activeTab}
                onToggleBookmark={onToggleBookmark}
                onSetInProgress={onSetInProgress}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RightEmptyState({ tab }: { tab: TabType }) {
  const isBookmark = tab === 'bookmarked';
  return (
    <div className="flex flex-col items-center justify-center" style={{ height: '100%', minHeight: '240px', gap: '12px' }}>
      <div
        className="rounded-2xl flex items-center justify-center"
        style={{
          width: '52px',
          height: '52px',
          backgroundColor: isBookmark ? 'rgba(37,99,235,0.08)' : 'rgba(34,197,94,0.08)',
          border: `1px solid ${isBookmark ? 'rgba(37,99,235,0.15)' : 'rgba(34,197,94,0.15)'}`,
        }}
      >
        {isBookmark
          ? <Bookmark style={{ width: '22px', height: '22px', color: '#2563EB' }} />
          : <Play style={{ width: '22px', height: '22px', color: '#22C55E' }} />
        }
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--dash-text-3)', marginBottom: '4px' }}>
          {isBookmark ? '찜한 공고가 없습니다' : '진행중인 공고가 없습니다'}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--dash-text-5)' }}>
          {isBookmark ? '현황 리스트에서 공고를 찜해보세요' : '찜한 공고를 진행 상태로 변경해보세요'}
        </div>
      </div>
    </div>
  );
}

function RightCard({ bid, bidStatus, tab, onToggleBookmark, onSetInProgress }: {
  bid: Bid;
  bidStatus: BidStatus;
  tab: TabType;
  onToggleBookmark: (bidId: string) => void;
  onSetInProgress: (bidId: string) => void;
}) {
  const daysLeft = getDaysUntilDeadline(bid.deadline);
  const urgent = isDeadlineUrgent(bid.deadline);

  return (
    <div
      className="rounded-xl"
      style={{
        padding: '12px 14px',
        backgroundColor: 'var(--dash-item-bg)',
        border: `1px solid ${tab === 'inProgress' ? 'rgba(34,197,94,0.2)' : 'var(--dash-border-item)'}`,
        borderLeft: `3px solid ${tab === 'inProgress' ? '#22C55E' : '#2563EB'}`,
      }}
    >
      {/* 상태 배지 + 위험도 */}
      <div className="flex items-center gap-2" style={{ marginBottom: '6px' }}>
        <RiskBadge risk={bid.risk} />
        <span
          className="flex items-center gap-0.5 rounded"
          style={{
            fontSize: '10px',
            padding: '0 5px',
            fontWeight: 500,
            backgroundColor: tab === 'inProgress' ? 'rgba(34,197,94,0.15)' : 'rgba(37,99,235,0.15)',
            color: tab === 'inProgress' ? '#22C55E' : '#2563EB',
          }}
        >
          {tab === 'inProgress'
            ? <><Play style={{ width: '9px', height: '9px', fill: 'currentColor' }} />진행중</>
            : <><Bookmark style={{ width: '9px', height: '9px', fill: 'currentColor' }} />찜</>
          }
        </span>
      </div>

      {/* 공고명 */}
      <div
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--dash-text)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginBottom: '8px',
        }}
        title={bid.title}
      >
        {bid.title}
      </div>

      {/* 메타 정보 */}
      <div className="flex items-center flex-wrap" style={{ gap: '10px', marginBottom: '10px' }}>
        <span className="flex items-center gap-1" style={{ fontSize: '11px', color: 'var(--dash-text-3)' }}>
          <Building2 style={{ width: '11px', height: '11px', color: 'var(--dash-text-4)', flexShrink: 0 }} />
          {bid.agency}
        </span>
        <span className="flex items-center gap-1" style={{ fontSize: '11px', color: 'var(--dash-text-3)' }}>
          <Banknote style={{ width: '11px', height: '11px', color: 'var(--dash-text-4)', flexShrink: 0 }} />
          {formatBudget(bid.budget)}
        </span>
        <span
          className="flex items-center gap-1"
          style={{ fontSize: '11px', color: urgent ? '#EF4444' : 'var(--dash-text-3)', fontWeight: urgent ? 600 : 400 }}
        >
          <Calendar style={{ width: '11px', height: '11px', flexShrink: 0 }} />
          {bid.deadline.substring(5)}
          {urgent && (
            <span className="rounded-full" style={{ fontSize: '10px', padding: '0 4px', backgroundColor: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
              D-{daysLeft}
            </span>
          )}
        </span>
      </div>

      {/* 버튼 영역 */}
      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        {tab === 'bookmarked' ? (
          <>
            <button
              onClick={() => onToggleBookmark(bid.id)}
              className="rounded-md flex items-center gap-1"
              style={{ padding: '4px 10px', fontSize: '12px', color: '#2563EB', backgroundColor: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', cursor: 'pointer' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(37,99,235,0.18)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(37,99,235,0.1)'; }}
            >
              <BookmarkX style={{ width: '12px', height: '12px' }} />
              찜 해제
            </button>
            <button
              onClick={() => onSetInProgress(bid.id)}
              className="rounded-md flex items-center gap-1"
              style={{
                padding: '4px 10px',
                fontSize: '12px',
                color: bidStatus === 'inProgress' ? '#22C55E' : 'var(--dash-text-3)',
                backgroundColor: bidStatus === 'inProgress' ? 'rgba(34,197,94,0.12)' : 'transparent',
                border: `1px solid ${bidStatus === 'inProgress' ? 'rgba(34,197,94,0.3)' : 'var(--dash-border-btn)'}`,
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                if (bidStatus !== 'inProgress') {
                  (e.currentTarget as HTMLButtonElement).style.color = '#22C55E';
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(34,197,94,0.1)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(34,197,94,0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (bidStatus !== 'inProgress') {
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-3)';
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--dash-border-btn)';
                }
              }}
            >
              <Play style={{ width: '11px', height: '11px', fill: bidStatus === 'inProgress' ? 'currentColor' : 'none', flexShrink: 0 }} />
              {bidStatus === 'inProgress' ? '진행중' : '진행하기'}
            </button>
          </>
        ) : (
          <button
            className="rounded-md flex items-center gap-1"
            style={{ padding: '4px 10px', fontSize: '12px', color: 'var(--dash-text-3)', backgroundColor: 'transparent', border: '1px solid var(--dash-border-btn)', cursor: 'pointer' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = '#2563EB';
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(37,99,235,0.08)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(37,99,235,0.25)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-3)';
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--dash-border-btn)';
            }}
          >
            <Eye style={{ width: '12px', height: '12px' }} />
            상세 보기
          </button>
        )}
      </div>
    </div>
  );
}
