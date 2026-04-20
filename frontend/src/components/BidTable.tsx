import { useState } from 'react';
import { Eye, ExternalLink, Loader2, CheckCircle2, ChevronUp, ChevronDown, ChevronsUpDown, Calendar, Star, Ban } from 'lucide-react';
import { bids, formatBudget, isDeadlineUrgent, getDaysUntilDeadline, type Bid, type RiskLevel, TODAY } from './mockData';
import type { AgencySettings } from '../App';

export function RiskBadge({ risk }: { risk: RiskLevel }) {
  const config: Record<RiskLevel, { label: string; bg: string; text: string; border: string }> = {
    danger: { label: '위험', bg: 'rgba(239,68,68,0.12)', text: '#EF4444', border: 'rgba(239,68,68,0.3)' },
    caution: { label: '주의', bg: 'rgba(249,115,22,0.12)', text: '#F97316', border: 'rgba(249,115,22,0.3)' },
    good: { label: '양호', bg: 'rgba(34,197,94,0.12)', text: '#22C55E', border: 'rgba(34,197,94,0.3)' },
  };
  const c = config[risk];
  return (
    <span className="inline-flex items-center rounded-md" style={{ padding: '2px 8px', fontSize: '11px', fontWeight: 500, backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
      {c.label}
    </span>
  );
}

export function AiStatusIndicator({ status }: { status: 'analyzing' | 'complete' }) {
  if (status === 'analyzing') {
    return (
      <span className="flex items-center gap-1.5" style={{ color: '#F59E0B' }}>
        <Loader2 className="animate-spin" style={{ width: '13px', height: '13px' }} />
        <span style={{ fontSize: '12px' }}>분석중</span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5" style={{ color: '#22C55E' }}>
      <CheckCircle2 style={{ width: '13px', height: '13px' }} />
      <span style={{ fontSize: '12px' }}>완료</span>
    </span>
  );
}

type SortKey = 'budget' | 'deadline' | 'risk' | null;
type SortDir = 'asc' | 'desc';
type DateFilter = 'today' | 'yesterday' | '3days' | '1week' | 'all';
type StatusFilter = 'all' | 'urgent' | 'danger';

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
  selectedBid: Bid | null;
  onSelectBid: (bid: Bid) => void;
  agencySettings: AgencySettings;
}

export function BidTable({ selectedBid, onSelectBid, agencySettings }: BidTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');

  const handleSort = (key: SortKey) => {
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

  const filteredBids = bids.filter((bid) => {
    const fromDate = getDateRange(dateFilter);
    if (fromDate && new Date(bid.collectedAt) < fromDate) return false;
    if (statusFilter === 'urgent') return isDeadlineUrgent(bid.deadline);
    if (statusFilter === 'danger') return bid.risk === 'danger';
    return true;
  });

  const sortedBids = [...filteredBids].sort((a, b) => {
    if (!sortKey) return 0;
    let cmp = 0;
    if (sortKey === 'budget') cmp = a.budget - b.budget;
    else if (sortKey === 'deadline') cmp = a.deadline.localeCompare(b.deadline);
    else if (sortKey === 'risk') cmp = riskOrder[a.risk] - riskOrder[b.risk];
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronsUpDown style={{ width: '12px', height: '12px', color: 'var(--dash-text-5)' }} />;
    if (sortDir === 'asc') return <ChevronUp style={{ width: '12px', height: '12px', color: '#2563EB' }} />;
    return <ChevronDown style={{ width: '12px', height: '12px', color: '#2563EB' }} />;
  };

  return (
    <div className="flex-1 min-w-0 rounded-xl flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)' }}>
      <div className="flex-shrink-0" style={{ padding: '12px 16px', borderBottom: '1px solid var(--dash-border)' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--dash-text)' }}>공고 목록</h2>
            <span className="rounded-full" style={{ fontSize: '11px', padding: '1px 8px', backgroundColor: 'rgba(37,99,235,0.15)', color: '#2563EB' }}>{sortedBids.length}건</span>
          </div>
          <div className="flex items-center gap-2">
            {STATUS_FILTERS.map((f) => (
              <button key={f.key} onClick={() => setStatusFilter(f.key)} className="rounded-lg transition-colors"
                style={{ padding: '4px 10px', fontSize: '12px', backgroundColor: statusFilter === f.key ? f.key === 'all' ? '#2563EB' : f.key === 'urgent' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)' : 'transparent', color: statusFilter === f.key ? f.key === 'all' ? 'white' : f.key === 'urgent' ? '#EF4444' : '#F59E0B' : 'var(--dash-text-3)', border: `1px solid ${statusFilter === f.key ? f.key === 'all' ? 'transparent' : f.key === 'urgent' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)' : 'var(--dash-border-btn)'}` }}>
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
              <button key={f.key} onClick={() => setDateFilter(f.key)} className="rounded-md transition-colors"
                style={{ padding: '3px 10px', fontSize: '11px', backgroundColor: dateFilter === f.key ? 'rgba(37,99,235,0.12)' : 'transparent', color: dateFilter === f.key ? '#2563EB' : 'var(--dash-text-4)', border: `1px solid ${dateFilter === f.key ? 'rgba(37,99,235,0.3)' : 'var(--dash-border-btn)'}`, fontWeight: dateFilter === f.key ? 600 : 400 }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '680px' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <tr style={{ backgroundColor: 'var(--dash-card-deep)' }}>
              {[
                { label: '공고번호', key: null, width: '130px' },
                { label: '공고명', key: null, width: undefined },
                { label: '발주기관', key: null, width: '100px' },
                { label: '예산', key: 'budget' as SortKey, width: '90px' },
                { label: '마감일', key: 'deadline' as SortKey, width: '90px' },
                { label: '위험도', key: 'risk' as SortKey, width: '70px' },
                { label: 'AI분석', key: null, width: '80px' },
                { label: '액션', key: null, width: '70px' },
              ].map((col) => (
                <th key={col.label} onClick={() => col.key && handleSort(col.key)}
                  style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', color: 'var(--dash-text-4)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500, whiteSpace: 'nowrap', width: col.width, cursor: col.key ? 'pointer' : 'default', borderBottom: '1px solid var(--dash-border)', userSelect: 'none' }}>
                  <div className="flex items-center gap-1">{col.label}{col.key && <SortIcon col={col.key} />}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedBids.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--dash-text-4)', fontSize: '13px' }}>해당 기간에 수집된 공고가 없습니다</td></tr>
            ) : (
              sortedBids.map((bid) => (
                <BidRow
                  key={bid.id}
                  bid={bid}
                  isSelected={selectedBid?.id === bid.id}
                  urgent={isDeadlineUrgent(bid.deadline)}
                  daysLeft={getDaysUntilDeadline(bid.deadline)}
                  onSelect={() => onSelectBid(bid)}
                  isPreferred={agencySettings.preferred.includes(bid.agency)}
                  isAvoided={agencySettings.avoided.includes(bid.agency)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between flex-shrink-0" style={{ padding: '8px 16px', borderTop: '1px solid var(--dash-border)' }}>
        <span style={{ fontSize: '11px', color: 'var(--dash-text-5)' }}>{sortedBids.length}건 표시 중 (전체 {bids.length}건)</span>
        <div className="flex items-center gap-1">
          {[1, 2, 3, '...', 6].map((page, i) => (
            <button key={i} className="rounded-md flex items-center justify-center" style={{ width: '26px', height: '26px', fontSize: '12px', backgroundColor: page === 1 ? '#2563EB' : 'transparent', color: page === 1 ? 'white' : 'var(--dash-text-3)', border: page === 1 ? 'none' : '1px solid var(--dash-border-btn)' }}>{page}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function BidRow({ bid, isSelected, urgent, daysLeft, onSelect, isPreferred, isAvoided }: {
  bid: Bid; isSelected: boolean; urgent: boolean; daysLeft: number; onSelect: () => void;
  isPreferred: boolean; isAvoided: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const rowBg = isSelected ? 'rgba(37,99,235,0.1)' : hovered ? 'var(--dash-row-hover)' : 'transparent';

  return (
    <tr onClick={onSelect} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ backgroundColor: rowBg, borderBottom: '1px solid var(--dash-border-faint)', borderLeft: `2px solid ${isSelected ? '#2563EB' : isAvoided ? '#EF4444' : isPreferred ? '#2563EB' : 'transparent'}`, cursor: 'pointer', transition: 'background-color 0.15s, border-left-color 0.15s' }}>
      <td style={{ padding: '10px 12px' }}>
        <span style={{ fontSize: '11px', color: 'var(--dash-text-4)', fontFamily: 'monospace' }}>{bid.number.split('-').slice(-1)[0]}</span>
      </td>
      <td style={{ padding: '10px 12px', maxWidth: '200px' }}>
        <div className="flex items-center gap-1.5" style={{ marginBottom: '2px' }}>
          {isPreferred && (
            <span className="flex items-center gap-0.5 rounded" style={{ fontSize: '10px', padding: '0 4px', backgroundColor: 'rgba(37,99,235,0.12)', color: '#2563EB', flexShrink: 0 }}>
              <Star style={{ width: '9px', height: '9px' }} />선호
            </span>
          )}
          {isAvoided && (
            <span className="flex items-center gap-0.5 rounded" style={{ fontSize: '10px', padding: '0 4px', backgroundColor: 'rgba(239,68,68,0.12)', color: '#EF4444', flexShrink: 0 }}>
              <Ban style={{ width: '9px', height: '9px' }} />기피
            </span>
          )}
          <div style={{ fontSize: '13px', color: isSelected ? '#93C5FD' : 'var(--dash-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {bid.title}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded" style={{ fontSize: '10px', padding: '0 4px', backgroundColor: 'rgba(37,99,235,0.12)', color: '#60A5FA' }}>{bid.type}</span>
          <span style={{ fontSize: '10px', color: 'var(--dash-text-5)' }}>{bid.number}</span>
        </div>
      </td>
      <td style={{ padding: '10px 12px' }}>
        <span style={{ fontSize: '12px', color: 'var(--dash-text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: '100px' }}>{bid.agency}</span>
      </td>
      <td style={{ padding: '10px 12px' }}>
        <span style={{ fontSize: '13px', color: 'var(--dash-text)', fontWeight: 500, whiteSpace: 'nowrap' }}>{formatBudget(bid.budget)}</span>
      </td>
      <td style={{ padding: '10px 12px' }}>
        <div>
          <span style={{ fontSize: '12px', fontWeight: urgent ? 600 : 400, color: urgent ? '#EF4444' : 'var(--dash-text-2)', whiteSpace: 'nowrap' }}>{bid.deadline.substring(5)}</span>
          {urgent && (
            <div className="flex items-center gap-1 mt-0.5">
              <span className="rounded-full" style={{ fontSize: '10px', padding: '0 5px', backgroundColor: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>D-{daysLeft}</span>
            </div>
          )}
        </div>
      </td>
      <td style={{ padding: '10px 12px' }}><RiskBadge risk={bid.risk} /></td>
      <td style={{ padding: '10px 12px' }}><AiStatusIndicator status={bid.aiStatus} /></td>
      <td style={{ padding: '10px 12px' }}>
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); onSelect(); }} className="rounded-md flex items-center justify-center" style={{ width: '28px', height: '28px', color: 'var(--dash-text-3)', backgroundColor: 'transparent' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#2563EB'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(37,99,235,0.1)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-3)'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
            title="상세 보기">
            <Eye style={{ width: '14px', height: '14px' }} />
          </button>
          <button onClick={(e) => e.stopPropagation()} className="rounded-md flex items-center justify-center" style={{ width: '28px', height: '28px', color: 'var(--dash-text-3)', backgroundColor: 'transparent' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-2)'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--dash-item-bg-alt)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-3)'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
            title="나라장터에서 보기">
            <ExternalLink style={{ width: '14px', height: '14px' }} />
          </button>
        </div>
      </td>
    </tr>
  );
}
