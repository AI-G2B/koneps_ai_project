import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { type Bid, type BidFlags, type AiStatusType, formatBudget, getDaysUntilDeadline, TODAY } from '../types';
import { type ApiTypeStatItem } from '../services/api';
import { RiskBadge } from './BidTable';
import { BidSlideOver } from './BidSlideOver';

function CustomTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div
        className="rounded-lg"
        style={{
          padding: '8px 12px',
          backgroundColor: 'var(--dash-hover)',
          border: '1px solid var(--dash-border-strong)',
        }}
      >
        <div style={{ fontSize: '12px', color: 'var(--dash-text)', fontWeight: 600 }}>{data.name}</div>
        <div style={{ fontSize: '11px', color: data.color, marginTop: '2px' }}>
          {data.value}% · {data.count}건
        </div>
      </div>
    );
  }
  return null;
}

function BidTypeChart({ bids, ceoMode }: { bids: Bid[]; ceoMode: boolean; typeStats?: ApiTypeStatItem[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState<'today' | 'yesterday' | '3days' | 'week' | 'all'>('all');

  const TYPE_FILTERS: { key: typeof typeFilter; label: string }[] = [
    { key: 'today',     label: '오늘' },
    { key: 'yesterday', label: '어제' },
    { key: '3days',     label: '3일' },
    { key: 'week',      label: '1주일' },
    { key: 'all',       label: '전체' },
  ];

  const now = new Date();
  const filteredBids = bids.filter((bid) => {
    const d = new Date(bid.collectedAt ?? bid.deadline ?? '');
    const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
    switch (typeFilter) {
      case 'today':     return diffDays < 1;
      case 'yesterday': return diffDays >= 1 && diffDays < 2;
      case '3days':     return diffDays < 3;
      case 'week':      return diffDays < 7;
      default:          return true;
    }
  });

  const total = filteredBids.length;

  const chartData = total > 0
    ? [
        { name: 'ISP',  value: filteredBids.filter(b => b.type === 'ISP').length,  color: '#2563EB' },
        { name: 'ISMP', value: filteredBids.filter(b => b.type === 'ISMP').length, color: '#7C3AED' },
        { name: '기타', value: filteredBids.filter(b => b.type === '기타').length, color: '#94A3B8' },
      ]
        .filter(d => d.value > 0)
        .map(d => ({ ...d, count: d.value, value: Math.round((d.value / total) * 100) }))
    : [];

  return (
    <div
      className="flex-1 rounded-xl"
      style={{
        backgroundColor: 'var(--dash-card)',
        border: '1px solid var(--dash-border)',
        padding: '14px 16px',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="rounded-md flex items-center justify-center flex-shrink-0"
          style={{ width: '20px', height: '20px', backgroundColor: 'rgba(37,99,235,0.15)' }}
        >
          <div
            className="rounded-sm"
            style={{ width: '10px', height: '10px', backgroundColor: '#2563EB' }}
          />
        </div>
        <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--dash-text)' }}>
          {ceoMode ? '진행중 사업 유형 분포' : '공고 유형 분석'}
        </h3>
        <span style={{ fontSize: '11px', color: 'var(--dash-text-5)', marginLeft: 'auto' }}>
          {ceoMode ? `진행중 ${total}건 기준` : `${total}건 기준`}
        </span>
      </div>
      {!ceoMode && (
        <div className="flex gap-1 mb-2">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setTypeFilter(f.key)}
              style={{
                fontSize: '11px',
                padding: '3px 10px',
                borderRadius: '6px',
                border: '1px solid var(--dash-border-btn)',
                backgroundColor: typeFilter === f.key ? '#2563EB' : 'var(--dash-item-bg)',
                color: typeFilter === f.key ? '#ffffff' : 'var(--dash-text-2)',
                cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {chartData.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '120px', color: 'var(--dash-text-4)', fontSize: '12px' }}>
          해당 기간에 수집된 공고가 없습니다
        </div>
      ) : (
      <div className="flex items-center gap-4">
        <div style={{ width: '120px', height: '120px', flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={34}
                outerRadius={52}
                paddingAngle={3}
                dataKey="value"
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={entry.color}
                    stroke="transparent"
                    opacity={activeIndex === null || activeIndex === index ? 1 : 0.4}
                    style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-2">
          {chartData.map((item, i) => (
            <div
              key={item.name}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
              style={{ cursor: 'pointer', opacity: activeIndex === null || activeIndex === i ? 1 : 0.5, transition: 'opacity 0.2s' }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span
                    className="rounded-sm flex-shrink-0"
                    style={{ width: '10px', height: '10px', backgroundColor: item.color }}
                  />
                  <span style={{ fontSize: '13px', color: 'var(--dash-text-2)' }}>{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: '12px', color: 'var(--dash-text-3)' }}>{item.count}건</span>
                  <span style={{ fontSize: '13px', color: 'var(--dash-text)', fontWeight: 600, minWidth: '36px', textAlign: 'right' }}>
                    {item.value}%
                  </span>
                </div>
              </div>
              <div
                className="rounded-full overflow-hidden"
                style={{ height: '4px', backgroundColor: 'var(--dash-border)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${item.value}%`, backgroundColor: item.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      <div
        className="grid grid-cols-4 gap-3 mt-3 pt-3"
        style={{ borderTop: '1px solid var(--dash-border)' }}
      >
        {chartData.map((item) => (
          <div
            key={item.name}
            className="rounded-lg text-center"
            style={{
              padding: '7px 6px',
              backgroundColor: 'var(--dash-item-bg)',
              border: `1px solid ${item.color}22`,
            }}
          >
            <div style={{ fontSize: '15px', fontWeight: 700, color: item.color, lineHeight: 1 }}>
              {item.count}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--dash-text-4)', marginTop: '3px' }}>{item.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const CAL_TODAY_YEAR = TODAY.getFullYear();
const CAL_TODAY_MONTH = TODAY.getMonth() + 1;
const CAL_TODAY_DAY = TODAY.getDate();
const CAL_DAY_NAMES = ['월', '화', '수', '목', '금', '토', '일'];
function calFirstDow(y: number, m: number) { return (new Date(y, m - 1, 1).getDay() + 6) % 7; }
function calDaysInMonth(y: number, m: number) { return new Date(y, m, 0).getDate(); }

interface CalPopup { day: number; top?: number; bottom?: number; left: number; }

function DeadlineCalendar({ bids, onOpenSlideOver }: { bids: Bid[]; onOpenSlideOver: (bid: Bid) => void }) {
  const [calYear, setCalYear] = useState(CAL_TODAY_YEAR);
  const [calMonth, setCalMonth] = useState(CAL_TODAY_MONTH);
  const [popup, setPopup] = useState<CalPopup | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const firstDow = calFirstDow(calYear, calMonth);
  const daysInMonth = calDaysInMonth(calYear, calMonth);
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const deadlineMap = new Map<number, Bid[]>();
  for (const bid of bids) {
    if (!bid.deadline) continue;
    const dateStr = bid.deadline.slice(0, 10);
    const [y, m, d] = dateStr.split('-').map(Number);
    if (y === calYear && m === calMonth) {
      deadlineMap.set(d, [...(deadlineMap.get(d) ?? []), bid]);
    }
  }

  const isThisMonth = calYear === CAL_TODAY_YEAR && calMonth === CAL_TODAY_MONTH;
  const totalDeadlines = [...deadlineMap.values()].reduce((s, a) => s + a.length, 0);

  const prevMonth = () => {
    setPopup(null);
    if (calMonth === 1) { setCalYear(y => y - 1); setCalMonth(12); } else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    setPopup(null);
    if (calMonth === 12) { setCalYear(y => y + 1); setCalMonth(1); } else setCalMonth(m => m + 1);
  };

  useEffect(() => {
    if (!popup) return;
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) setPopup(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [popup]);

  const handleDayClick = (day: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (!deadlineMap.has(day)) return;
    if (popup?.day === day) { setPopup(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const pw = 280, ph = 300;
    const left = Math.max(8, Math.min(rect.left + rect.width / 2 - pw / 2, window.innerWidth - pw - 8));
    const spaceBelow = window.innerHeight - rect.bottom;
    setPopup(spaceBelow < ph
      ? { day, bottom: window.innerHeight - rect.top + 8, left }
      : { day, top: rect.bottom + 8, left });
  };

  const popupBids = popup ? (deadlineMap.get(popup.day) ?? []) : [];

  return (
    <div className="flex-1 rounded-xl" style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', padding: '14px 8px', overflow: 'hidden' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', padding: '0 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(245,158,11,0.15)' }}>
            <Calendar style={{ width: '11px', height: '11px', color: '#F59E0B' }} />
          </div>
          <h3 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--dash-text)', whiteSpace: 'nowrap' }}>마감일 캘린더</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
          <span style={{ fontSize: '11px', color: 'var(--dash-text-2)', whiteSpace: 'nowrap' }}>{calYear}년 {calMonth}월</span>
          <button onClick={prevMonth} style={{ width: '20px', height: '20px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dash-text-4)', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-2)')}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-4)')}>
            <ChevronLeft style={{ width: '13px', height: '13px' }} />
          </button>
          <button onClick={nextMonth} style={{ width: '20px', height: '20px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dash-text-4)', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-2)')}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-4)')}>
            <ChevronRight style={{ width: '13px', height: '13px' }} />
          </button>
        </div>
      </div>

      {/* 요일 헤더 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '4px' }}>
        {CAL_DAY_NAMES.map((d, i) => (
          <div key={d} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: i === 5 ? '#60A5FA' : i === 6 ? '#F87171' : 'var(--dash-text-4)', paddingBottom: '4px' }}>{d}</div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {week.map((day, di) => {
              const isToday = isThisMonth && day === CAL_TODAY_DAY;
              const bidsOnDay = day ? deadlineMap.get(day) : undefined;
              const isDeadline = !!bidsOnDay;
              const isUrgent = isDeadline && isThisMonth && day !== null && day >= CAL_TODAY_DAY && day <= CAL_TODAY_DAY + 3;
              const isSelected = day === popup?.day;
              const isSat = di === 5;
              const isSun = di === 6;
              return (
                <div key={di} style={{ height: '28px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  {day !== null ? (
                    <div
                      onClick={(e) => handleDayClick(day, e)}
                      style={{
                        position: 'relative', width: '24px', height: '24px', borderRadius: '9999px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: isDeadline ? 'pointer' : 'default',
                        fontSize: '11px', fontWeight: isToday || isDeadline ? 600 : 400,
                        transition: 'background-color 0.15s',
                        backgroundColor: isToday ? '#2563EB' : isSelected ? 'rgba(34,197,94,0.2)' : isUrgent ? 'rgba(239,68,68,0.12)' : isDeadline ? 'rgba(245,158,11,0.1)' : 'transparent',
                        color: isToday ? 'white' : isSelected ? '#22C55E' : isUrgent ? '#EF4444' : isDeadline ? '#F59E0B' : isSat ? '#60A5FA' : isSun ? '#F87171' : isThisMonth && day < CAL_TODAY_DAY ? 'var(--dash-text-5)' : 'var(--dash-text-2)',
                        border: isSelected ? '1px solid rgba(34,197,94,0.4)' : isUrgent && !isToday ? '1px solid rgba(239,68,68,0.3)' : 'none',
                      }}
                    >
                      {day}
                      {isDeadline && !isToday && (
                        <span style={{ position: 'absolute', bottom: '1px', left: '50%', transform: 'translateX(-50%)', width: '4px', height: '4px', borderRadius: '9999px', backgroundColor: isSelected ? '#22C55E' : isUrgent ? '#EF4444' : '#F59E0B' }} />
                      )}
                    </div>
                  ) : <div style={{ width: '24px', height: '24px' }} />}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* 범례 */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginTop: '8px', paddingTop: '8px', paddingLeft: '4px', paddingRight: '4px', borderTop: '1px solid var(--dash-border)' }}>
        {[
          { color: '#2563EB', label: '오늘', dot: false },
          { color: '#EF4444', label: '마감 임박', dot: true },
          { color: '#F59E0B', label: '마감일', dot: true },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            {item.dot
              ? <span style={{ width: '5px', height: '5px', borderRadius: '9999px', backgroundColor: item.color, flexShrink: 0 }} />
              : <span style={{ width: '12px', height: '12px', borderRadius: '9999px', backgroundColor: item.color, fontSize: '6px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{CAL_TODAY_DAY}</span>
            }
            <span style={{ fontSize: '10px', color: 'var(--dash-text-3)' }}>{item.label}</span>
          </div>
        ))}
        <span style={{ fontSize: '10px', color: 'var(--dash-text-5)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>{calYear}년 {calMonth}월 {totalDeadlines}건 마감</span>
      </div>

      {/* 플로팅 팝업 */}
      {popup && popupBids.length > 0 && createPortal(
        <div ref={popupRef} style={{ position: 'fixed', top: popup.top, bottom: popup.bottom, left: popup.left, zIndex: 1000, width: '280px', maxHeight: '300px', overflowY: 'auto', backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border-strong)', borderRadius: '10px', padding: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--dash-text-3)', marginBottom: '8px' }}>
            {calMonth}월 {popup.day}일 마감 공고 ({popupBids.length}건)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {popupBids.map(bid => (
              <div key={bid.id} onClick={() => { onOpenSlideOver(bid); setPopup(null); }}
                style={{ padding: '8px 10px', borderRadius: '8px', backgroundColor: 'var(--dash-item-bg)', border: '1px solid var(--dash-border-item)', cursor: 'pointer', transition: 'background-color 0.15s' }}
                onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--dash-item-bg-alt)')}
                onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--dash-item-bg)')}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--dash-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px' }}>{bid.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', color: 'var(--dash-text-3)' }}>{bid.agency}</span>
                  <span style={{ fontSize: '11px', color: '#F59E0B', fontWeight: 600 }}>{formatBudget(bid.budget)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export function BottomWidgets({ bids, bidFlags, aiStatuses, outlineStatusMap: _outlineStatusMap, onToggleBookmark, onToggleInProgress, onOpenAnalysisDetail, onRequestAnalysis, ceoMode = false, typeStats }: {
  bids: Bid[];
  bidFlags: Record<string, BidFlags>;
  aiStatuses?: Record<string, AiStatusType>;
  outlineStatusMap?: Record<string, 'none' | 'generating' | 'complete'>;
  onToggleBookmark: (bidId: string) => void;
  onToggleInProgress: (bidId: string) => void;
  onOpenAnalysisDetail?: (bid: Bid) => void;
  onRequestAnalysis?: (bidId: string) => void;
  ceoMode?: boolean;
  typeStats?: ApiTypeStatItem[];
}) {
  const [slideOverBid, setSlideOverBid] = useState<Bid | null>(null);
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);

  const openSlideOver = (bid: Bid) => {
    setSlideOverBid(bid);
    setIsSlideOverOpen(true);
  };

  const inProgressBids = bids.filter(b => bidFlags[b.id]?.inProgress ?? false);

  return (
    <>
      <div className="flex gap-3">
        <div style={{ flex: 3, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <DeadlineCalendar bids={inProgressBids} onOpenSlideOver={openSlideOver} />
        </div>
        <div style={{ flex: 7, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <BidTypeChart bids={bids} ceoMode={ceoMode} typeStats={typeStats} />
        </div>
      </div>
      <BidSlideOver
        bid={slideOverBid}
        isOpen={isSlideOverOpen}
        onClose={() => setIsSlideOverOpen(false)}
        bidFlags={bidFlags}
        aiStatuses={aiStatuses}
        onToggleBookmark={onToggleBookmark}
        onToggleInProgress={onToggleInProgress}
        onOpenAnalysisDetail={onOpenAnalysisDetail}
        onRequestAnalysis={onRequestAnalysis}
        ceoMode={ceoMode}
      />
    </>
  );
}
