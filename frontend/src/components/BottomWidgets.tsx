import { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

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
  return <BidTypeChart />;
}
