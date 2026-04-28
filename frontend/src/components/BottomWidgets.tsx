import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { type Bid, formatBudget, TODAY } from './mockData';
import { RiskBadge } from './BidTable';

const BID_TYPE_DATA = [
  { name: 'ISP', value: 47, color: '#2563EB', count: 16 },
  { name: 'ISMP', value: 33, color: '#F59E0B', count: 12 },
  { name: '기타', value: 20, color: '#8B5CF6', count: 7 },
];

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

function BidTypeChart() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <div
      className="flex-1 rounded-xl"
      style={{
        backgroundColor: 'var(--dash-card)',
        border: '1px solid var(--dash-border)',
        padding: '20px',
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div
          className="rounded-md flex items-center justify-center flex-shrink-0"
          style={{ width: '20px', height: '20px', backgroundColor: 'rgba(37,99,235,0.15)' }}
        >
          <div
            className="rounded-sm"
            style={{ width: '10px', height: '10px', backgroundColor: '#2563EB' }}
          />
        </div>
        <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--dash-text)' }}>공고 유형 분석</h3>
        <span style={{ fontSize: '11px', color: 'var(--dash-text-5)', marginLeft: 'auto' }}>총 47건 기준</span>
      </div>

      <div className="flex items-center gap-6">
        <div style={{ width: '160px', height: '160px', flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={BID_TYPE_DATA}
                cx="50%"
                cy="50%"
                innerRadius={46}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {BID_TYPE_DATA.map((entry, index) => (
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

        <div className="flex-1 space-y-3">
          {BID_TYPE_DATA.map((item, i) => (
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

      <div
        className="grid grid-cols-4 gap-3 mt-4 pt-4"
        style={{ borderTop: '1px solid var(--dash-border)' }}
      >
        {BID_TYPE_DATA.map((item) => (
          <div
            key={item.name}
            className="rounded-lg text-center"
            style={{
              padding: '10px 8px',
              backgroundColor: 'var(--dash-item-bg)',
              border: `1px solid ${item.color}22`,
            }}
          >
            <div style={{ fontSize: '20px', fontWeight: 700, color: item.color, lineHeight: 1 }}>
              {item.count}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--dash-text-4)', marginTop: '3px' }}>{item.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface PopupState {
  dateStr: string;
  top: number;
  left: number;
}

function DeadlineCalendar({ bids }: { bids: Bid[] }) {
  const [currentMonth, setCurrentMonth] = useState(
    () => new Date(TODAY.getFullYear(), TODAY.getMonth(), 1)
  );
  const [popup, setPopup] = useState<PopupState | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const bidsByDate = useMemo(() => {
    const map = new Map<string, Bid[]>();
    bids.forEach((bid) => {
      const arr = map.get(bid.deadline) ?? [];
      arr.push(bid);
      map.set(bid.deadline, arr);
    });
    return map;
  }, [bids]);

  const cells = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const result: (string | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      result.push(
        `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      );
    }
    return result;
  }, [currentMonth]);

  useEffect(() => {
    if (!popup) return;
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setPopup(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [popup]);

  const handleDayClick = (dateStr: string, e: React.MouseEvent<HTMLButtonElement>) => {
    if (!bidsByDate.has(dateStr)) return;
    if (popup?.dateStr === dateStr) {
      setPopup(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const popupWidth = 288;
    const left = rect.left + rect.width / 2 - popupWidth / 2;
    const clampedLeft = Math.max(8, Math.min(left, window.innerWidth - popupWidth - 8));
    setPopup({ dateStr, top: rect.bottom + 8, left: clampedLeft });
  };

  const todayStr = TODAY.toISOString().slice(0, 10);
  const popupBids = popup ? (bidsByDate.get(popup.dateStr) ?? []) : [];

  return (
    <div
      className="flex-1 rounded-xl"
      style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', padding: '20px' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div
          className="rounded-md flex items-center justify-center flex-shrink-0"
          style={{ width: '20px', height: '20px', backgroundColor: 'rgba(239,68,68,0.15)' }}
        >
          <div className="rounded-sm" style={{ width: '10px', height: '10px', backgroundColor: '#EF4444' }} />
        </div>
        <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--dash-text)' }}>마감일 캘린더</h3>
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            className="flex items-center justify-center rounded-md"
            style={{ width: '22px', height: '22px', backgroundColor: 'var(--dash-item-bg-alt)', border: '1px solid var(--dash-border)', color: 'var(--dash-text-3)', cursor: 'pointer' }}
          >
            <ChevronLeft style={{ width: '12px', height: '12px' }} />
          </button>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--dash-text)', minWidth: '72px', textAlign: 'center' }}>
            {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
          </span>
          <button
            onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
            className="flex items-center justify-center rounded-md"
            style={{ width: '22px', height: '22px', backgroundColor: 'var(--dash-item-bg-alt)', border: '1px solid var(--dash-border)', color: 'var(--dash-text-3)', cursor: 'pointer' }}
          >
            <ChevronRight style={{ width: '12px', height: '12px' }} />
          </button>
        </div>
      </div>

      {/* Day of week headers */}
      <div className="grid grid-cols-7 mb-1">
        {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
          <div
            key={d}
            className="text-center"
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: i === 0 ? '#EF4444' : i === 6 ? '#60A5FA' : 'var(--dash-text-4)',
              padding: '4px 0',
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((dateStr, i) => {
          if (!dateStr) return <div key={`empty-${i}`} />;
          const hasBids = bidsByDate.has(dateStr);
          const count = hasBids ? bidsByDate.get(dateStr)!.length : 0;
          const isToday = dateStr === todayStr;
          const isSelected = popup?.dateStr === dateStr;
          const dayNum = parseInt(dateStr.slice(8), 10);
          const dayOfWeek = new Date(dateStr).getDay();
          const isPast = dateStr < todayStr;

          return (
            <button
              key={dateStr}
              onClick={(e) => handleDayClick(dateStr, e)}
              className="relative flex flex-col items-center rounded-lg transition-colors"
              style={{
                padding: '4px 2px',
                cursor: hasBids ? 'pointer' : 'default',
                backgroundColor: isSelected
                  ? 'rgba(37,99,235,0.15)'
                  : isToday
                  ? 'rgba(37,99,235,0.08)'
                  : 'transparent',
                border: isSelected
                  ? '1px solid rgba(37,99,235,0.4)'
                  : isToday
                  ? '1px solid rgba(37,99,235,0.2)'
                  : '1px solid transparent',
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: isToday ? 700 : 400,
                  lineHeight: 1,
                  color: isToday
                    ? '#2563EB'
                    : dayOfWeek === 0
                    ? '#EF4444'
                    : dayOfWeek === 6
                    ? '#60A5FA'
                    : isPast
                    ? 'var(--dash-text-4)'
                    : 'var(--dash-text-2)',
                }}
              >
                {dayNum}
              </span>
              {hasBids && (
                <span
                  className="mt-0.5 rounded-full flex items-center justify-center"
                  style={{
                    width: '16px',
                    height: '16px',
                    backgroundColor: isSelected ? '#2563EB' : '#EF4444',
                    fontSize: '9px',
                    fontWeight: 700,
                    color: 'white',
                    flexShrink: 0,
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div
        className="flex items-center gap-3 mt-3 pt-3"
        style={{ borderTop: '1px solid var(--dash-border)' }}
      >
        <div className="flex items-center gap-1.5">
          <span style={{ width: '8px', height: '8px', borderRadius: '9999px', backgroundColor: '#EF4444', display: 'inline-block' }} />
          <span style={{ fontSize: '11px', color: 'var(--dash-text-4)' }}>마감일</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span style={{ width: '8px', height: '8px', borderRadius: '4px', backgroundColor: 'rgba(37,99,235,0.3)', display: 'inline-block', border: '1px solid rgba(37,99,235,0.4)' }} />
          <span style={{ fontSize: '11px', color: 'var(--dash-text-4)' }}>오늘</span>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--dash-text-5)', marginLeft: 'auto' }}>
          이번달 {[...bidsByDate.keys()].filter(d => d.startsWith(`${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`)).length}일 마감
        </span>
      </div>

      {/* Popup */}
      {popup && popupBids.length > 0 && createPortal(
        <div
          ref={popupRef}
          style={{
            position: 'fixed',
            top: popup.top,
            left: popup.left,
            zIndex: 9000,
            width: '288px',
            backgroundColor: 'var(--dash-card)',
            border: '1px solid var(--dash-border-strong)',
            borderRadius: '10px',
            padding: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--dash-text-3)', marginBottom: '8px' }}>
            {popup.dateStr.substring(5).replace('-', '/')} 마감 공고 ({popupBids.length}건)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {popupBids.map((bid) => (
              <div
                key={bid.id}
                className="rounded-lg"
                style={{ padding: '8px 10px', backgroundColor: 'var(--dash-item-bg)', border: '1px solid var(--dash-border-item)' }}
              >
                <div
                  style={{
                    fontSize: '12px', fontWeight: 600, color: 'var(--dash-text)',
                    lineHeight: 1.4, marginBottom: '5px',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                  title={bid.title}
                >
                  {bid.title}
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: '11px', color: 'var(--dash-text-3)' }}>{bid.agency}</span>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: '11px', color: '#F59E0B', fontWeight: 600 }}>{formatBudget(bid.budget)}</span>
                    <RiskBadge risk={bid.risk} />
                  </div>
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

export function BottomWidgets({ bids }: { bids: Bid[] }) {
  return (
    <div className="flex gap-4">
      <BidTypeChart />
      <DeadlineCalendar bids={bids} />
    </div>
  );
}
