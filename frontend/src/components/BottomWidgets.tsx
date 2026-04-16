import { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

// April 2026 data
const TODAY_DATE = 4;
const DEADLINE_DAYS = [5, 6, 7, 10, 12, 15, 18, 22];
const URGENT_DAYS = DEADLINE_DAYS.filter((d) => d >= TODAY_DATE && d <= TODAY_DATE + 3);

const BID_TYPE_DATA = [
  { name: 'ISP', value: 35, color: '#2563EB', count: 16 },
  { name: 'ISMP', value: 25, color: '#F59E0B', count: 12 },
  { name: 'SI', value: 25, color: '#22C55E', count: 12 },
  { name: '기타', value: 15, color: '#8B5CF6', count: 7 },
];

// April 2026: April 1 is Wednesday => index 2 in Mon-Sun week
const FIRST_DAY_OF_WEEK = 2;
const DAYS_IN_MONTH = 30;
const DAY_NAMES = ['월', '화', '수', '목', '금', '토', '일'];

function MiniCalendar() {
  const [month] = useState({ year: 2026, month: 4, label: '2026년 4월' });

  // Build calendar cells
  const cells: (number | null)[] = [];
  for (let i = 0; i < FIRST_DAY_OF_WEEK; i++) cells.push(null);
  for (let d = 1; d <= DAYS_IN_MONTH; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  // Split into weeks
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div
      className="rounded-xl flex flex-col"
      style={{
        width: '340px',
        flexShrink: 0,
        backgroundColor: 'var(--dash-card)',
        border: '1px solid var(--dash-border)',
        padding: '20px',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="rounded-md flex items-center justify-center flex-shrink-0"
            style={{ width: '20px', height: '20px', backgroundColor: 'rgba(245,158,11,0.15)' }}
          >
            <Calendar style={{ width: '12px', height: '12px', color: '#F59E0B' }} />
          </div>
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--dash-text)' }}>마감일 캘린더</h3>
        </div>
        <div className="flex items-center gap-1">
          <span style={{ fontSize: '12px', color: 'var(--dash-text-2)' }}>{month.label}</span>
          <button
            className="rounded flex items-center justify-center"
            style={{ width: '22px', height: '22px', color: 'var(--dash-text-4)' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-2)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-4)')}
          >
            <ChevronLeft style={{ width: '14px', height: '14px' }} />
          </button>
          <button
            className="rounded flex items-center justify-center"
            style={{ width: '22px', height: '22px', color: 'var(--dash-text-4)' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-2)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-4)')}
          >
            <ChevronRight style={{ width: '14px', height: '14px' }} />
          </button>
        </div>
      </div>

      {/* Day names */}
      <div
        className="grid"
        style={{ gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '4px' }}
      >
        {DAY_NAMES.map((d, i) => (
          <div
            key={d}
            className="flex items-center justify-center"
            style={{
              fontSize: '11px',
              color: i === 5 ? '#60A5FA' : i === 6 ? '#F87171' : 'var(--dash-text-4)',
              paddingBottom: '4px',
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div
            key={wi}
            className="grid"
            style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}
          >
            {week.map((day, di) => {
              const isToday = day === TODAY_DATE;
              const isDeadline = day !== null && DEADLINE_DAYS.includes(day);
              const isUrgent = day !== null && URGENT_DAYS.includes(day);
              const isSat = di === 5;
              const isSun = di === 6;

              return (
                <div
                  key={di}
                  className="flex flex-col items-center justify-center"
                  style={{ height: '32px' }}
                >
                  {day !== null ? (
                    <div
                      className="relative flex items-center justify-center rounded-full"
                      style={{
                        width: '26px',
                        height: '26px',
                        cursor: 'pointer',
                        backgroundColor: isToday
                          ? '#2563EB'
                          : isUrgent
                          ? 'rgba(239,68,68,0.12)'
                          : isDeadline
                          ? 'rgba(245,158,11,0.1)'
                          : 'transparent',
                        color: isToday
                          ? 'white'
                          : isUrgent
                          ? '#EF4444'
                          : isDeadline
                          ? '#F59E0B'
                          : isSat
                          ? '#60A5FA'
                          : isSun
                          ? '#F87171'
                          : day < TODAY_DATE
                          ? 'var(--dash-text-6)'
                          : 'var(--dash-text-2)',
                        fontSize: '12px',
                        fontWeight: isToday || isDeadline ? 600 : 400,
                        border: isUrgent && !isToday ? '1px solid rgba(239,68,68,0.3)' : 'none',
                      }}
                    >
                      {day}
                      {isDeadline && !isToday && (
                        <span
                          className="absolute rounded-full"
                          style={{
                            bottom: '1px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '4px',
                            height: '4px',
                            backgroundColor: isUrgent ? '#EF4444' : '#F59E0B',
                          }}
                        />
                      )}
                    </div>
                  ) : (
                    <div style={{ width: '26px', height: '26px' }} />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div
        className="flex items-center gap-4 flex-wrap mt-3 pt-3"
        style={{ borderTop: '1px solid var(--dash-border)' }}
      >
        {[
          { color: '#2563EB', label: '오늘', dot: false },
          { color: '#EF4444', label: '마감 임박', dot: true },
          { color: '#F59E0B', label: '마감일', dot: true },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            {item.dot ? (
              <span
                className="rounded-full flex-shrink-0"
                style={{ width: '6px', height: '6px', backgroundColor: item.color }}
              />
            ) : (
              <span
                className="rounded-full flex items-center justify-center flex-shrink-0"
                style={{ width: '14px', height: '14px', backgroundColor: item.color, fontSize: '7px', color: 'white' }}
              >
                4
              </span>
            )}
            <span style={{ fontSize: '11px', color: 'var(--dash-text-3)' }}>{item.label}</span>
          </div>
        ))}
        <span style={{ fontSize: '11px', color: 'var(--dash-text-5)', marginLeft: 'auto' }}>
          이번 달 {DEADLINE_DAYS.length}건 마감
        </span>
      </div>
    </div>
  );
}

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
      {/* Header */}
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
        {/* Donut */}
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

        {/* Legend with bars */}
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

      {/* Bottom stats row */}
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

export function BottomWidgets() {
  return (
    <div className="flex gap-4">
      <MiniCalendar />
      <BidTypeChart />
    </div>
  );
}
