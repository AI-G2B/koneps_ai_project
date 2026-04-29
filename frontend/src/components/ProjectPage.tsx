import { useState } from 'react';
import { Briefcase, Building2, Banknote, Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { type Bid, type BidStatus, formatBudget, getDaysUntilDeadline, isDeadlineUrgent, TODAY } from './mockData';
import { RiskBadge, AiStatusIndicator } from './BidTable';
import { BidDetailPanel } from './BidDetailPanel';
import { BidSlideOver } from './BidSlideOver';

interface ProjectPageProps {
  bids: Bid[];
  bidStatuses: Map<string, BidStatus>;
  onSelectBid: (bid: Bid) => void;
  selectedBid: Bid | null;
  onToggleBookmark: (bidId: string) => void;
  onSetInProgress: (bidId: string) => void;
}

const TODAY_YEAR = TODAY.getFullYear();
const TODAY_MONTH = TODAY.getMonth() + 1;
const TODAY_DAY = TODAY.getDate();
const DAY_NAMES = ['월', '화', '수', '목', '금', '토', '일'];

function getFirstDayOfWeek(year: number, month: number): number {
  return (new Date(year, month - 1, 1).getDay() + 6) % 7; // 0=Mon
}
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function ProjectPage({ bids, bidStatuses, onSelectBid, selectedBid, onToggleBookmark, onSetInProgress }: ProjectPageProps) {
  const inProgressBids = bids.filter((bid) => bidStatuses.get(bid.id) === 'inProgress');
  const [slideOverBid, setSlideOverBid] = useState<Bid | null>(null);
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);

  const openSlideOver = (bid: Bid) => {
    setSlideOverBid(bid);
    setIsSlideOverOpen(true);
  };

  return (
    <>
      <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0 }}>
        {/* 왼쪽: 카드 목록 + 캘린더 (가로 배열) */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: '16px', minHeight: 0 }}>
          <div style={{ flex: 2, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <CardList inProgressBids={inProgressBids} onSelectBid={onSelectBid} selectedBid={selectedBid} />
          </div>
          <div style={{ flex: 1, maxWidth: '320px', flexShrink: 0 }}>
            <ProjectCalendar inProgressBids={inProgressBids} onOpenSlideOver={openSlideOver} />
          </div>
        </div>

        {/* 오른쪽: 상세 패널 */}
        <BidDetailPanel bid={selectedBid} />
      </div>
      <BidSlideOver
        bid={slideOverBid}
        isOpen={isSlideOverOpen}
        onClose={() => setIsSlideOverOpen(false)}
        bidStatuses={bidStatuses}
        onToggleBookmark={onToggleBookmark}
        onSetInProgress={onSetInProgress}
      />
    </>
  );
}

function CardList({ inProgressBids, onSelectBid, selectedBid }: {
  inProgressBids: Bid[];
  onSelectBid: (bid: Bid) => void;
  selectedBid: Bid | null;
}) {
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', borderRadius: '12px', backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', overflow: 'hidden' }}>
      {/* 헤더 */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderBottom: '1px solid var(--dash-border)' }}>
        <Briefcase style={{ width: '15px', height: '15px', color: '#22C55E' }} />
        <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--dash-text)' }}>진행 프로젝트</h2>
        <span style={{ fontSize: '11px', padding: '1px 8px', borderRadius: '9999px', backgroundColor: 'rgba(34,197,94,0.15)', color: '#22C55E' }}>
          {inProgressBids.length}건
        </span>
      </div>

      {/* 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px', scrollbarWidth: 'thin', scrollbarColor: 'var(--dash-scrollbar) transparent' }}>
        {inProgressBids.length === 0 ? (
          <EmptyState />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {inProgressBids.map((bid) => (
              <ProjectCard
                key={bid.id}
                bid={bid}
                isSelected={selectedBid?.id === bid.id}
                onSelect={() => onSelectBid(bid)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '200px', gap: '12px' }}>
      <div style={{ width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.12)' }}>
        <Briefcase style={{ width: '24px', height: '24px', color: '#22C55E' }} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--dash-text-3)', marginBottom: '4px' }}>진행 중인 프로젝트가 없습니다</div>
        <div style={{ fontSize: '12px', color: 'var(--dash-text-5)' }}>공고 목록에서 진행하기 버튼을 눌러 추가하세요</div>
      </div>
    </div>
  );
}

function ProjectCard({ bid, isSelected, onSelect }: {
  bid: Bid;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const daysLeft = getDaysUntilDeadline(bid.deadline);
  const urgent = isDeadlineUrgent(bid.deadline);

  return (
    <div
      onClick={onSelect}
      style={{
        padding: '14px 16px',
        borderRadius: '12px',
        backgroundColor: isSelected ? 'rgba(34,197,94,0.06)' : 'var(--dash-surface)',
        border: `1px solid ${isSelected ? 'rgba(34,197,94,0.35)' : 'var(--dash-border)'}`,
        borderLeft: `3px solid ${isSelected ? '#22C55E' : 'transparent'}`,
        cursor: 'pointer',
        transition: 'background-color 0.15s, border-color 0.15s',
      }}
      onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--dash-item-bg-alt)'; }}
      onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--dash-surface)'; }}
    >
      {/* 제목 행 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <RiskBadge risk={bid.risk} />
        <span style={{ fontSize: '13px', fontWeight: 600, color: isSelected ? '#86EFAC' : 'var(--dash-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
          {bid.title}
        </span>
        <span style={{ flexShrink: 0, fontSize: '10px', padding: '1px 6px', borderRadius: '9999px', backgroundColor: 'rgba(34,197,94,0.12)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.25)' }}>
          진행중
        </span>
      </div>

      {/* 메타 정보 행 */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--dash-text-3)' }}>
          <Building2 style={{ width: '12px', height: '12px', color: 'var(--dash-icon-off)', flexShrink: 0 }} />
          {bid.agency}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--dash-text-3)' }}>
          <Banknote style={{ width: '12px', height: '12px', color: 'var(--dash-icon-off)', flexShrink: 0 }} />
          {formatBudget(bid.budget)}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: urgent ? '#EF4444' : 'var(--dash-text-3)', fontWeight: urgent ? 600 : 400 }}>
          <Calendar style={{ width: '12px', height: '12px', flexShrink: 0 }} />
          {bid.deadline.substring(5)}
          <span style={{ fontSize: '10px', padding: '0 5px', marginLeft: '2px', borderRadius: '9999px', backgroundColor: daysLeft < 0 ? 'rgba(239,68,68,0.15)' : urgent ? 'rgba(239,68,68,0.15)' : 'rgba(37,99,235,0.1)', color: daysLeft < 0 ? '#EF4444' : urgent ? '#EF4444' : '#60A5FA' }}>
            {daysLeft >= 0 ? `D-${daysLeft}` : `D+${Math.abs(daysLeft)}`}
          </span>
        </span>
        <AiStatusIndicator status={bid.aiStatus} />
      </div>
    </div>
  );
}

function ProjectCalendar({ inProgressBids, onOpenSlideOver }: { inProgressBids: Bid[]; onOpenSlideOver: (bid: Bid) => void }) {
  const [calYear, setCalYear] = useState(TODAY_YEAR);
  const [calMonth, setCalMonth] = useState(TODAY_MONTH);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const firstDow = getFirstDayOfWeek(calYear, calMonth);
  const daysInMonth = getDaysInMonth(calYear, calMonth);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  // 이번 캘린더 월의 마감일 맵 구성
  const deadlineMap = new Map<number, Bid[]>();
  for (const bid of inProgressBids) {
    const [y, m, d] = bid.deadline.split('-').map(Number);
    if (y === calYear && m === calMonth) {
      deadlineMap.set(d, [...(deadlineMap.get(d) ?? []), bid]);
    }
  }

  const isThisMonth = calYear === TODAY_YEAR && calMonth === TODAY_MONTH;
  const totalDeadlines = [...deadlineMap.values()].reduce((sum, arr) => sum + arr.length, 0);

  const prevMonth = () => {
    setSelectedDay(null);
    if (calMonth === 1) { setCalYear((y) => y - 1); setCalMonth(12); }
    else setCalMonth((m) => m - 1);
  };
  const nextMonth = () => {
    setSelectedDay(null);
    if (calMonth === 12) { setCalYear((y) => y + 1); setCalMonth(1); }
    else setCalMonth((m) => m + 1);
  };

  const handleDayClick = (day: number) => {
    if (!deadlineMap.has(day)) return;
    const bids = deadlineMap.get(day) ?? [];
    if (bids.length === 1) {
      onOpenSlideOver(bids[0]);
    } else {
      setSelectedDay(selectedDay === day ? null : day);
    }
  };

  const popupBids = selectedDay ? (deadlineMap.get(selectedDay) ?? []) : [];

  return (
    <div style={{ flexShrink: 0, borderRadius: '12px', backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', padding: '16px 20px' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '20px', height: '20px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(245,158,11,0.15)' }}>
            <Calendar style={{ width: '12px', height: '12px', color: '#F59E0B' }} />
          </div>
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--dash-text)' }}>마감일 캘린더</h3>
          <span style={{ fontSize: '11px', color: 'var(--dash-text-5)' }}>· 진행 프로젝트 기준</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '12px', color: 'var(--dash-text-2)' }}>{calYear}년 {calMonth}월</span>
          <button onClick={prevMonth} style={{ width: '22px', height: '22px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dash-text-4)', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-2)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-4)')}>
            <ChevronLeft style={{ width: '14px', height: '14px' }} />
          </button>
          <button onClick={nextMonth} style={{ width: '22px', height: '22px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dash-text-4)', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-2)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-4)')}>
            <ChevronRight style={{ width: '14px', height: '14px' }} />
          </button>
        </div>
      </div>

      {/* 요일 헤더 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '4px' }}>
        {DAY_NAMES.map((d, i) => (
          <div key={d} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: i === 5 ? '#60A5FA' : i === 6 ? '#F87171' : 'var(--dash-text-4)', paddingBottom: '4px' }}>
            {d}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {week.map((day, di) => {
              const isToday = isThisMonth && day === TODAY_DAY;
              const bidsOnDay = day ? deadlineMap.get(day) : undefined;
              const isDeadline = !!bidsOnDay;
              const isUrgent = isDeadline && isThisMonth && day !== null && day >= TODAY_DAY && day <= TODAY_DAY + 3;
              const isSelected = day === selectedDay;
              const isSat = di === 5;
              const isSun = di === 6;

              return (
                <div key={di} style={{ height: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  {day !== null ? (
                    <div
                      onClick={() => handleDayClick(day)}
                      style={{
                        position: 'relative',
                        width: '26px',
                        height: '26px',
                        borderRadius: '9999px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: isDeadline ? 'pointer' : 'default',
                        fontSize: '12px',
                        fontWeight: isToday || isDeadline ? 600 : 400,
                        transition: 'background-color 0.15s',
                        backgroundColor: isToday ? '#2563EB' : isSelected ? 'rgba(34,197,94,0.2)' : isUrgent ? 'rgba(239,68,68,0.12)' : isDeadline ? 'rgba(245,158,11,0.1)' : 'transparent',
                        color: isToday ? 'white' : isSelected ? '#22C55E' : isUrgent ? '#EF4444' : isDeadline ? '#F59E0B' : isSat ? '#60A5FA' : isSun ? '#F87171' : isThisMonth && day < TODAY_DAY ? 'var(--dash-text-6)' : 'var(--dash-text-2)',
                        border: isSelected ? '1px solid rgba(34,197,94,0.4)' : isUrgent && !isToday ? '1px solid rgba(239,68,68,0.3)' : 'none',
                      }}
                    >
                      {day}
                      {isDeadline && !isToday && (
                        <span style={{ position: 'absolute', bottom: '1px', left: '50%', transform: 'translateX(-50%)', width: '4px', height: '4px', borderRadius: '9999px', backgroundColor: isSelected ? '#22C55E' : isUrgent ? '#EF4444' : '#F59E0B' }} />
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

      {/* 범례 */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--dash-border)' }}>
        {[
          { color: '#2563EB', label: '오늘', dot: false },
          { color: '#EF4444', label: '마감 임박', dot: true },
          { color: '#F59E0B', label: '마감일', dot: true },
        ].map((item) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {item.dot ? (
              <span style={{ width: '6px', height: '6px', borderRadius: '9999px', backgroundColor: item.color, flexShrink: 0 }} />
            ) : (
              <span style={{ width: '14px', height: '14px', borderRadius: '9999px', backgroundColor: item.color, fontSize: '7px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {TODAY_DAY}
              </span>
            )}
            <span style={{ fontSize: '11px', color: 'var(--dash-text-3)' }}>{item.label}</span>
          </div>
        ))}
        <span style={{ fontSize: '11px', color: 'var(--dash-text-5)', marginLeft: 'auto' }}>
          {calYear}년 {calMonth}월 {totalDeadlines}건 마감
        </span>
      </div>

      {/* 날짜 클릭 팝업 */}
      {selectedDay !== null && popupBids.length > 0 && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--dash-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#22C55E' }}>
              {calMonth}월 {selectedDay}일 마감 공고 ({popupBids.length}건)
            </span>
            <button
              onClick={() => setSelectedDay(null)}
              style={{ width: '20px', height: '20px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dash-text-4)', background: 'none', border: 'none', cursor: 'pointer' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-2)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-4)')}
            >
              <X style={{ width: '13px', height: '13px' }} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {popupBids.map((bid) => (
              <div
                key={bid.id}
                onClick={() => { onOpenSlideOver(bid); setSelectedDay(null); }}
                style={{ padding: '8px 10px', borderRadius: '8px', backgroundColor: 'var(--dash-surface)', border: '1px solid var(--dash-border)', cursor: 'pointer', transition: 'background-color 0.15s' }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--dash-item-bg-alt)')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--dash-surface)')}
              >
                <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--dash-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px' }}>
                  {bid.title}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RiskBadge risk={bid.risk} />
                  <span style={{ fontSize: '11px', color: 'var(--dash-text-4)' }}>{bid.agency}</span>
                  <span style={{ fontSize: '11px', color: 'var(--dash-text-5)' }}>·</span>
                  <span style={{ fontSize: '11px', color: 'var(--dash-text-4)' }}>{formatBudget(bid.budget)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
