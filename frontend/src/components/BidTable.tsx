import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, Calendar, Star, Ban, Inbox, RefreshCw } from 'lucide-react';
import { formatBudget, isDeadlineUrgent, getDaysUntilDeadline, type Bid, type RiskLevel, type BidFlags, type AiStatusType, TODAY } from '../types';
import type { AgencySettings } from '../App';

const BADGE_FONT = 'Inter, Noto Sans KR, sans-serif';

const DOT = (color: string, animate = false) => (
  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: color, flexShrink: 0, display: 'inline-block', ...(animate ? { animation: 'pulse 1.2s ease-in-out infinite' } : {}) }} />
);

const badge = (bg: string, color: string, size: 'md' | 'sm' = 'md') => ({
  display: 'inline-flex' as const, alignItems: 'center' as const, gap: '5px',
  padding: size === 'md' ? '4px 12px' : '3px 8px',
  borderRadius: '40px',
  fontSize: size === 'md' ? '13px' : '11px',
  fontWeight: 400,
  fontFamily: BADGE_FONT,
  backgroundColor: bg,
  color,
  whiteSpace: 'nowrap' as const,
  flexShrink: 0 as const,
});

export function RiskBadge({ risk }: { risk: RiskLevel }) {
  const config: Record<RiskLevel, { label: string; dot: string; bg: string; text: string }> = {
    danger: { label: '위험', dot: '#F27A75', bg: 'var(--badge-red-bg)',    text: '#F27A75' },
    caution: { label: '주의', dot: '#FFC379', bg: 'var(--badge-orange-bg)', text: '#FFC379' },
    good:   { label: '양호', dot: '#5BC37E', bg: 'var(--badge-green-bg)',  text: '#5BC37E' },
  };
  const c = config[risk];
  return (
    <span style={badge(c.bg, c.text)}>
      {DOT(c.dot)}{c.label}
    </span>
  );
}

export function AiStatusIndicator({ status }: { status: AiStatusType }) {
  if (status === 'none')     return <span style={badge('var(--badge-gray-bg)',   '#81878F')}>{DOT('#81878F')}분석 전</span>;
  if (status === 'pending')  return <span style={badge('var(--badge-gray-bg)',   '#81878F')}>{DOT('#81878F', true)}대기중</span>;
  if (status === 'analyzing')return <span style={badge('var(--badge-orange-bg)', '#FFC379')}>{DOT('#FFC379', true)}분석중</span>;
  return                            <span style={badge('var(--badge-green-bg)',  '#5BC37E')}>{DOT('#5BC37E')}완료</span>;
}

type SortKey = 'budget' | 'deadline' | null;
type SortDir = 'asc' | 'desc';
type DateFilter = 'today' | 'yesterday' | '3days' | '1week' | 'all';
type StatusFilter = 'all' | 'urgent' | 'danger';

const PAGE_SIZE = 10;

const riskOrder: Record<RiskLevel, number> = { danger: 0, caution: 1, good: 2 };

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

interface BidTableProps {
  bids: Bid[];
  isLoading?: boolean;
  selectedBid: Bid | null;
  onSelectBid: (bid: Bid) => void;
  agencySettings: AgencySettings;
  bidFlags?: Record<string, BidFlags>;
  aiStatuses?: Record<string, AiStatusType>;
  onToggleBookmark?: (bidId: string) => void;
  onToggleInProgress?: (bidId: string) => void;
  pursuedBids?: Set<string>;
  onTogglePursued?: (bidId: string) => void;
  hideFilters?: boolean;
  ceoMode?: boolean;
  onRequestAnalysis?: (bidId: string) => void;
  showBidNumber?: boolean;
}

export function BidTable({ bids, isLoading = false, selectedBid, onSelectBid, agencySettings, bidFlags, aiStatuses, onToggleBookmark: _onToggleBookmark, onToggleInProgress: _onToggleInProgress, pursuedBids, onTogglePursued: _onTogglePursued, hideFilters = false, ceoMode = false, onRequestAnalysis: _onRequestAnalysis, showBidNumber = false }: BidTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [currentPage, setCurrentPage] = useState(1);
  const excludeExpired = true;

  const handleSort = (key: SortKey) => {
    if (ceoMode) return;
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const getDateRange = (filter: DateFilter): Date | null => {
    const base = new Date(TODAY);
    if (filter === 'today') return new Date(base.setHours(0, 0, 0, 0));
    if (filter === 'yesterday') { base.setDate(base.getDate() - 1); base.setHours(0, 0, 0, 0); return base; }
    if (filter === '3days') { base.setDate(base.getDate() - 2); base.setHours(0, 0, 0, 0); return base; }
    if (filter === '1week') { base.setDate(base.getDate() - 6); base.setHours(0, 0, 0, 0); return base; }
    return null;
  };

  const filteredBids = (hideFilters || ceoMode) ? bids : bids.filter((bid) => {
    if (excludeExpired && getDaysUntilDeadline(bid.deadline) < 0) return false;
    const fromDate = getDateRange(dateFilter);
    if (fromDate && new Date(bid.collectedAt) < fromDate) return false;
    if (statusFilter === 'urgent') return isDeadlineUrgent(bid.deadline);
    if (statusFilter === 'danger') return bid.risk === 'danger';
    return true;
  });

  const sortedBids = ceoMode
    ? [...filteredBids].sort((a, b) => riskOrder[a.risk] - riskOrder[b.risk])
    : [...filteredBids].sort((a, b) => {
        if (!sortKey) return 0;
        let cmp = 0;
        if (sortKey === 'budget') cmp = a.budget - b.budget;
        else if (sortKey === 'deadline') cmp = a.deadline.localeCompare(b.deadline);

        return sortDir === 'asc' ? cmp : -cmp;
      });

  const totalPages = Math.ceil(sortedBids.length / PAGE_SIZE);
  const pagedBids = sortedBids.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => { setCurrentPage(1); }, [statusFilter, dateFilter, sortKey, excludeExpired]);

  const getPageNumbers = (): (number | '...')[] => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = new Set([1, totalPages, currentPage, Math.max(1, currentPage - 1), Math.min(totalPages, currentPage + 1)]);
    const sorted = [...pages].sort((a, b) => a - b);
    const result: (number | '...')[] = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push('...');
      result.push(sorted[i]);
    }
    return result;
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronsUpDown style={{ width: '12px', height: '12px', color: 'var(--dash-text-5)' }} />;
    if (sortDir === 'asc') return <ChevronUp style={{ width: '12px', height: '12px', color: '#2563EB' }} />;
    return <ChevronDown style={{ width: '12px', height: '12px', color: '#2563EB' }} />;
  };

  return (
    <div className="flex-1 min-w-0 rounded-xl flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)' }}>
      <div className="flex-shrink-0" style={{ padding: '12px 16px', borderBottom: '1px solid var(--dash-border)' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: (hideFilters || ceoMode) ? 0 : '8px' }}>
          <div className="flex items-center gap-3">
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--dash-text)' }}>
              {ceoMode ? '진행 중인 공고' : hideFilters ? '추진 공고 목록' : '공고 목록'}
            </h2>
            <span className="rounded-full" style={{ fontSize: '11px', padding: '1px 8px', backgroundColor: ceoMode ? 'rgba(124,58,237,0.15)' : hideFilters ? 'rgba(139,92,246,0.15)' : 'rgba(37,99,235,0.15)', color: ceoMode ? '#7C3AED' : hideFilters ? '#8B5CF6' : '#2563EB' }}>{sortedBids.length}건</span>
          </div>
          {!hideFilters && !ceoMode && (
            <div className="flex items-center gap-2">
              {STATUS_FILTERS.map((f) => (
                <button key={f.key} onClick={() => setStatusFilter(f.key)} className="rounded-lg transition-colors"
                  style={{ padding: '4px 10px', fontSize: '12px', backgroundColor: statusFilter === f.key ? f.key === 'all' ? '#2563EB' : f.key === 'urgent' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)' : 'transparent', color: statusFilter === f.key ? f.key === 'all' ? 'white' : f.key === 'urgent' ? '#EF4444' : '#F59E0B' : 'var(--dash-text-3)', border: `1px solid ${statusFilter === f.key ? f.key === 'all' ? 'transparent' : f.key === 'urgent' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)' : 'var(--dash-border-btn)'}` }}>
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {!hideFilters && !ceoMode && (
          <div className="flex items-center gap-2">
            <Calendar style={{ width: '13px', height: '13px', color: 'var(--dash-text-4)' }} />
            <span style={{ fontSize: '11px', color: 'var(--dash-text-4)' }}>수집일:</span>
            <div className="flex items-center gap-1">
              {DATE_FILTERS.map((f) => (
                <button key={f.key} onClick={() => setDateFilter(f.key)} className="rounded-md transition-colors"
                  style={{ padding: '3px 10px', fontSize: '11px', backgroundColor: dateFilter === f.key ? 'rgba(37,99,235,0.12)' : 'transparent', color: dateFilter === f.key ? '#2563EB' : 'var(--dash-text-4)', border: `1px solid ${dateFilter === f.key ? 'rgba(37,99,235,0.3)' : 'var(--dash-border-btn)'}`, fontWeight: dateFilter === f.key ? 600 : 400 }}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '680px' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <tr style={{ backgroundColor: 'var(--dash-card-deep)' }}>
              {[
                ...(showBidNumber ? [{ label: '공고번호', key: null as SortKey, width: '130px' }] : []),
                { label: '공고일', key: null as SortKey, width: '64px', align: 'center' as const },
                { label: '공고명', key: null as SortKey, width: undefined as string | undefined },
                { label: '상태', key: null as SortKey, width: '72px' },
                { label: '발주기관', key: null as SortKey, width: '85px' },
                { label: '예산', key: 'budget' as SortKey, width: '80px' },
                { label: '마감일', key: 'deadline' as SortKey, width: '90px' },
                { label: 'AI분석', key: null as SortKey, width: '90px' },
                { label: '액션', key: null as SortKey, width: '70px' },
              ].map((col) => (
                <th key={col.label} onClick={() => col.key && handleSort(col.key)}
                  style={{ padding: '8px 12px', textAlign: (col as any).align ?? 'left', fontSize: '11px', color: 'var(--dash-text-4)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500, whiteSpace: 'nowrap', width: col.width, cursor: col.key ? 'pointer' : 'default', borderBottom: '1px solid var(--dash-border)', userSelect: 'none' }}>
                  <div className="flex items-center gap-1">{col.label}{col.key && !ceoMode && <SortIcon col={col.key} />}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={showBidNumber ? 9 : 8}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '8px' }}>
                  <Loader2 className="animate-spin" style={{ width: '24px', height: '24px', color: '#2563EB' }} />
                  <span style={{ fontSize: '13px', color: 'var(--dash-text-3)' }}>공고를 불러오는 중입니다...</span>
                </div>
              </td></tr>
            ) : sortedBids.length === 0 ? (
              <tr><td colSpan={showBidNumber ? 9 : 8} style={{ padding: '48px', textAlign: 'center' }}>
                {ceoMode ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <Inbox style={{ width: '28px', height: '28px', color: 'var(--dash-text-4)' }} />
                    <div style={{ fontSize: '13px', color: 'var(--dash-text-4)' }}>진행 중인 공고가 없습니다</div>
                    <div style={{ fontSize: '12px', color: 'var(--dash-text-5)' }}>담당자가 공고에 진행 등록을 하면 여기에 표시됩니다</div>
                  </div>
                ) : bids.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <Inbox style={{ width: '28px', height: '28px', color: 'var(--dash-text-4)' }} />
                    <div style={{ fontSize: '13px', color: 'var(--dash-text-4)' }}>수집된 공고가 없습니다</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--dash-text-4)' }}>
                      <RefreshCw style={{ width: '12px', height: '12px' }} />
                      동기화 버튼을 눌러 공고를 불러오세요
                    </div>
                  </div>
                ) : (
                  <span style={{ color: 'var(--dash-text-4)', fontSize: '13px' }}>해당 기간에 수집된 공고가 없습니다</span>
                )}
              </td></tr>
            ) : (
              pagedBids.map((bid) => (
                <BidRow
                  key={bid.id}
                  bid={bid}
                  isSelected={selectedBid?.id === bid.id}
                  urgent={isDeadlineUrgent(bid.deadline)}
                  daysLeft={getDaysUntilDeadline(bid.deadline)}
                  onSelect={() => onSelectBid(bid)}
                  isPreferred={agencySettings.preferred.includes(bid.agency)}
                  isAvoided={agencySettings.avoided.includes(bid.agency)}
                  flags={bidFlags?.[bid.id] ?? { bookmarked: false, inProgress: false }}
                  aiStatus={aiStatuses?.[bid.id] ?? 'none'}
                  isPursued={pursuedBids?.has(bid.id) ?? false}
                  showBidNumber={showBidNumber}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between flex-shrink-0" style={{ padding: '8px 16px', borderTop: '1px solid var(--dash-border)' }}>
        <span style={{ fontSize: '11px', color: 'var(--dash-text-5)' }}>{pagedBids.length}건 표시 중 (전체 {sortedBids.length}건)</span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-md flex items-center justify-center"
              style={{ width: '26px', height: '26px', color: currentPage === 1 ? 'var(--dash-text-6)' : 'var(--dash-text-3)', backgroundColor: 'transparent', border: '1px solid var(--dash-border-btn)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
            >
              <ChevronLeft style={{ width: '13px', height: '13px' }} />
            </button>
            {getPageNumbers().map((page, i) => (
              page === '...'
                ? <span key={`ellipsis-${i}`} style={{ width: '26px', textAlign: 'center', fontSize: '12px', color: 'var(--dash-text-4)' }}>…</span>
                : <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className="rounded-md flex items-center justify-center"
                    style={{ width: '26px', height: '26px', fontSize: '12px', backgroundColor: page === currentPage ? '#2563EB' : 'transparent', color: page === currentPage ? 'white' : 'var(--dash-text-3)', border: page === currentPage ? 'none' : '1px solid var(--dash-border-btn)', fontWeight: page === currentPage ? 600 : 400 }}
                  >
                    {page}
                  </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-md flex items-center justify-center"
              style={{ width: '26px', height: '26px', color: currentPage === totalPages ? 'var(--dash-text-6)' : 'var(--dash-text-3)', backgroundColor: 'transparent', border: '1px solid var(--dash-border-btn)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
            >
              <ChevronRight style={{ width: '13px', height: '13px' }} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function BidRow({ bid, isSelected, urgent, daysLeft, onSelect, isPreferred, isAvoided, flags, aiStatus, isPursued, showBidNumber = false }: {
  bid: Bid; isSelected: boolean; urgent: boolean; daysLeft: number; onSelect: () => void;
  isPreferred: boolean; isAvoided: boolean;
  flags: BidFlags;
  aiStatus: AiStatusType;
  isPursued: boolean;
  showBidNumber?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [titleTooltip, setTitleTooltip] = useState<{ x: number; y: number } | null>(null);
  const rowBg = isSelected ? 'rgba(37,99,235,0.1)' : hovered ? 'var(--dash-row-hover)' : 'transparent';

  return (
    <>
    <tr onClick={onSelect} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ backgroundColor: rowBg, borderBottom: '1px solid var(--dash-border-faint)', borderLeft: `2px solid ${isSelected ? '#2563EB' : isPursued ? '#8B5CF6' : isAvoided ? '#EF4444' : isPreferred ? '#2563EB' : 'transparent'}`, cursor: 'pointer', transition: 'background-color 0.15s, border-left-color 0.15s' }}>
      {showBidNumber && (
        <td style={{ padding: '12px', verticalAlign: 'middle' }}>
          <span style={{ fontSize: '11px', color: 'var(--dash-text-3)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{bid.number}</span>
        </td>
      )}
      <td style={{ padding: '8px 8px', verticalAlign: 'middle', width: '64px', textAlign: 'center' }}>
        <span style={{ fontSize: '11px', color: 'var(--dash-text-3)', whiteSpace: 'nowrap' }}>
          {bid.ntceDate ? bid.ntceDate.slice(5).replace('-', '.') : '-'}
        </span>
      </td>
      <td style={{ padding: '12px', verticalAlign: 'middle' }}>
        <div
          onMouseEnter={(e) => {
            const el = e.currentTarget;
            if (el.scrollHeight > el.clientHeight) {
              const rect = el.getBoundingClientRect();
              setTitleTooltip({ x: rect.left, y: rect.bottom + 6 });
            }
          }}
          onMouseLeave={() => setTitleTooltip(null)}
          style={{ fontSize: '13px', color: isSelected ? '#93C5FD' : 'var(--dash-text)', whiteSpace: 'normal', wordBreak: 'keep-all', lineHeight: 1.5 }}>
          {bid.title}
        </div>
        {bid.type !== '기타' && (
          <span className="rounded" style={{ display: 'inline-block', marginTop: '4px', fontSize: '10px', padding: '1px 5px', backgroundColor: 'rgba(37,99,235,0.12)', color: '#60A5FA' }}>{bid.type}</span>
        )}
      </td>
      <td style={{ padding: '12px', verticalAlign: 'middle', width: '72px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {flags.bookmarked && (
            <span style={{ fontSize: '11px', color: '#4A7FD4', fontWeight: 500, whiteSpace: 'nowrap' }}>관심공고</span>
          )}
          {flags.inProgress && (
            <span style={{ fontSize: '11px', color: '#5BC37E', fontWeight: 500, whiteSpace: 'nowrap' }}>진행중</span>
          )}
        </div>
      </td>
      <td style={{ padding: '12px', verticalAlign: 'middle' }}>
        <span style={{ fontSize: '12px', color: 'var(--dash-text-2)', display: 'block', wordBreak: 'keep-all', overflowWrap: 'break-word', maxWidth: '80px', lineHeight: 1.5 }}>{bid.agency}</span>
        {isPreferred && (
          <span className="flex items-center gap-0.5 rounded" style={{ fontSize: '10px', padding: '0 4px', marginTop: '2px', backgroundColor: 'rgba(37,99,235,0.12)', color: '#2563EB', display: 'inline-flex' }}>
            <Star style={{ width: '9px', height: '9px' }} />선호
          </span>
        )}
        {isAvoided && (
          <span className="flex items-center gap-0.5 rounded" style={{ fontSize: '10px', padding: '0 4px', marginTop: '2px', backgroundColor: 'rgba(239,68,68,0.12)', color: '#EF4444', display: 'inline-flex' }}>
            <Ban style={{ width: '9px', height: '9px' }} />기피
          </span>
        )}
      </td>
      <td style={{ padding: '12px', verticalAlign: 'middle' }}>
        <span style={{ fontSize: '13px', color: 'var(--dash-text)', fontWeight: 500, whiteSpace: 'nowrap' }}>{formatBudget(bid.budget)}</span>
      </td>
      <td style={{ padding: '12px', verticalAlign: 'middle' }}>
        <div>
          <span style={{ fontSize: '12px', fontWeight: urgent ? 600 : 400, color: urgent ? '#EF4444' : 'var(--dash-text-2)', whiteSpace: 'nowrap' }}>{bid.deadline.substring(5)}</span>
          {daysLeft < 0 ? (
            <div className="flex items-center gap-1 mt-0.5">
              <span style={badge('var(--badge-gray-bg)', '#81878F', 'sm')}>{DOT('#81878F')}마감</span>
            </div>
          ) : urgent ? (
            <div className="flex items-center gap-1 mt-0.5">
              <span style={badge('var(--badge-red-bg)', '#F27A75', 'sm')}>{DOT('#F27A75')}D-{daysLeft}</span>
            </div>
          ) : null}
        </div>
      </td>
      <td style={{ padding: '12px', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
        <AiStatusIndicator status={aiStatus} />
      </td>
    </tr>
    {titleTooltip && createPortal(
      <div style={{
        position: 'fixed',
        top: titleTooltip.y,
        left: Math.min(titleTooltip.x, window.innerWidth - 420),
        zIndex: 9999,
        maxWidth: '400px',
        backgroundColor: '#1e293b',
        color: '#f1f5f9',
        fontSize: '12px',
        lineHeight: 1.6,
        padding: '7px 11px',
        borderRadius: '7px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
        wordBreak: 'keep-all',
        pointerEvents: 'none',
      }}>
        {bid.title}
      </div>,
      document.body
    )}
    </>
  );
}
