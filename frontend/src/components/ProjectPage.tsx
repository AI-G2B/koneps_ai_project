import { useState, useEffect, useRef } from 'react';
import { Briefcase, Building2, Banknote, Calendar, ChevronLeft, ChevronRight, X, FileText } from 'lucide-react';
import { type Bid, type BidFlags, type AiStatusType, formatBudget, getDaysUntilDeadline, isDeadlineUrgent, TODAY } from './mockData';
import { RiskBadge, AiStatusIndicator } from './BidTable';
import { BidDetailPanel } from './BidDetailPanel';
import { BidSlideOver } from './BidSlideOver';
import { fetchMemo, saveMemo } from '../services/api';

interface CurrentUser {
  id: number;
  username: string;
  name: string;
  role: string;
}

interface ProjectPageProps {
  bids: Bid[];
  bidFlags: Record<string, BidFlags>;
  aiStatuses?: Record<string, AiStatusType>;
  onSelectBid: (bid: Bid) => void;
  selectedBid: Bid | null;
  onToggleBookmark: (bidId: string) => void;
  onToggleInProgress: (bidId: string) => void;
  onOpenAnalysisDetail?: (bid: Bid) => void;
  onRequestAnalysis?: (bidId: string) => void;
  ceoMode?: boolean;
  currentUser?: CurrentUser | null;
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay === 1) return '어제';
  if (diffDay < 7) return `${diffDay}일 전`;
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
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

export function ProjectPage({ bids, bidFlags, aiStatuses, onSelectBid, selectedBid, onToggleBookmark, onToggleInProgress, onOpenAnalysisDetail, onRequestAnalysis, ceoMode = false, currentUser }: ProjectPageProps) {
  const inProgressBids = bids.filter((b) => bidFlags[b.id]?.inProgress ?? false);
  const [slideOverBid, setSlideOverBid] = useState<Bid | null>(null);
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);

  const openSlideOver = (bid: Bid) => {
    setSlideOverBid(bid);
    setIsSlideOverOpen(true);
  };

  return (
    <>
      <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0 }}>
        {/* 왼쪽: 카드 목록 + 캘린더 */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: '16px', minHeight: 0, alignItems: 'stretch' }}>
          <div style={{ flex: 2, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <CardList inProgressBids={inProgressBids} onSelectBid={onSelectBid} selectedBid={selectedBid} aiStatuses={aiStatuses} />
          </div>
          <div style={{ flexShrink: 0, flexGrow: 0, width: '280px', display: 'flex', flexDirection: 'column', height: '100%', gap: '12px', overflow: 'hidden' }}>
            <ProjectCalendar inProgressBids={inProgressBids} onOpenSlideOver={openSlideOver} />
            <MemoPanel selectedBid={selectedBid} currentUser={currentUser ?? null} />
          </div>
        </div>

        {/* 오른쪽: 상세 패널 */}
        <BidDetailPanel bid={selectedBid} aiStatuses={aiStatuses} onOpenAnalysisDetail={onOpenAnalysisDetail} onRequestAnalysis={onRequestAnalysis} ceoMode={ceoMode} showFullDetail={ceoMode} />
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
        showFullDetail={ceoMode}
      />
    </>
  );
}

function CardList({ inProgressBids, onSelectBid, selectedBid, aiStatuses }: {
  inProgressBids: Bid[];
  onSelectBid: (bid: Bid) => void;
  selectedBid: Bid | null;
  aiStatuses?: Record<string, AiStatusType>;
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
                aiStatus={aiStatuses?.[bid.id] ?? bid.aiStatus}
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

function ProjectCard({ bid, isSelected, onSelect, aiStatus }: {
  bid: Bid;
  isSelected: boolean;
  onSelect: () => void;
  aiStatus: AiStatusType;
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
        <span style={{ fontSize: '13px', fontWeight: 600, color: isSelected ? '#5BC37E' : 'var(--dash-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
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
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: isNaN(daysLeft) ? 'var(--dash-text-3)' : daysLeft < 0 ? 'var(--dash-text-3)' : urgent ? '#EF4444' : 'var(--dash-text-3)', fontWeight: isNaN(daysLeft) ? 400 : daysLeft < 0 ? 400 : urgent ? 600 : 400 }}>
          <Calendar style={{ width: '12px', height: '12px', flexShrink: 0 }} />
          {bid.deadline ? bid.deadline.substring(5) : ''}
          <span style={{ fontSize: '10px', padding: '0 5px', marginLeft: '2px', borderRadius: '9999px', backgroundColor: isNaN(daysLeft) ? 'rgba(129,135,143,0.12)' : daysLeft < 0 ? 'rgba(129,135,143,0.12)' : urgent ? 'rgba(239,68,68,0.15)' : 'rgba(37,99,235,0.1)', color: isNaN(daysLeft) ? '#81878F' : daysLeft < 0 ? '#81878F' : urgent ? '#EF4444' : '#60A5FA' }}>
            {isNaN(daysLeft) ? '기간 미정' : daysLeft < 0 ? '마감' : `D-${daysLeft}`}
          </span>
        </span>
        <AiStatusIndicator status={aiStatus} />
      </div>
    </div>
  );
}

function MemoPanel({ selectedBid, currentUser }: { selectedBid: Bid | null; currentUser: CurrentUser | null }) {
  const [memoContent, setMemoContent] = useState('');
  const [memoSaving, setMemoSaving] = useState(false);
  const [memoSaved, setMemoSaved] = useState(false);
  const [memoLoading, setMemoLoading] = useState(false);
  const [memoAuthorName, setMemoAuthorName] = useState<string | null>(null);
  const [memoUpdatedAt, setMemoUpdatedAt] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef('');
  const prevBidNumberRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (debounceRef.current && prevBidNumberRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
        await saveMemo(prevBidNumberRef.current, contentRef.current, currentUser?.id ?? null, currentUser?.name ?? null);
      }

      prevBidNumberRef.current = selectedBid?.number ?? null;

      if (!selectedBid || cancelled) {
        setMemoContent('');
        contentRef.current = '';
        setMemoAuthorName(null);
        setMemoUpdatedAt(null);
        return;
      }

      setMemoLoading(true);
      setMemoSaved(false);
      console.log('[memo] 불러오기:', selectedBid.number);
      const memo = await fetchMemo(selectedBid.number);
      console.log('[memo] 불러온 내용:', memo);
      if (!cancelled) {
        setMemoContent(memo.content);
        contentRef.current = memo.content;
        setMemoAuthorName(memo.author_name ?? null);
        setMemoUpdatedAt(memo.updated_at ?? null);
        setMemoLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [selectedBid?.id]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMemoContent(value);
    contentRef.current = value;
    setMemoSaved(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!selectedBid) return;
      debounceRef.current = null;
      setMemoSaving(true);
      console.log('[memo] 저장 시도:', selectedBid.number, value);
      const ok = await saveMemo(selectedBid.number, value, currentUser?.id ?? null, currentUser?.name ?? null);
      console.log('[memo] 저장 결과:', ok);
      setMemoSaving(false);
      if (ok) {
        setMemoSaved(true);
        if (currentUser?.name) setMemoAuthorName(currentUser.name);
        setMemoUpdatedAt(new Date().toISOString());
        if (savedResetRef.current) clearTimeout(savedResetRef.current);
        savedResetRef.current = setTimeout(() => setMemoSaved(false), 2000);
      }
    }, 800);
  };

  const statusText = memoLoading ? '불러오는 중...' : memoSaving ? '저장 중...' : memoSaved ? '저장됨 ✓' : '자동 저장';
  const statusColor = memoSaved ? '#5BC37E' : memoSaving || memoLoading ? 'var(--dash-text-4)' : 'var(--dash-text-5)';

  const textareaBase: React.CSSProperties = {
    width: '100%',
    resize: 'none',
    padding: '10px 12px',
    backgroundColor: 'var(--dash-input-bg)',
    border: `1px solid ${focused ? '#2563EB' : 'var(--dash-border-med)'}`,
    borderRadius: '8px',
    fontSize: '13px',
    color: 'var(--dash-text)',
    lineHeight: 1.6,
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minHeight: '180px', maxHeight: '300px', overflow: 'hidden' }}>
      {/* 헤더 */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
        <FileText style={{ width: '13px', height: '13px', color: '#60A5FA', flexShrink: 0 }} />
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--dash-text)', flexShrink: 0 }}>메모</span>
        {selectedBid && (
          <span style={{ fontSize: '11px', color: 'var(--dash-text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
            {selectedBid.title}
          </span>
        )}
      </div>

      {/* 작성자 정보 */}
      {selectedBid && memoContent && (memoAuthorName || memoUpdatedAt) && (
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          {memoAuthorName && (
            <span style={{ fontSize: '11px', color: 'var(--dash-text-3)' }}>마지막 수정: {memoAuthorName}</span>
          )}
          {memoUpdatedAt && (
            <span style={{ fontSize: '11px', color: 'var(--dash-text-5)' }}>{formatRelativeTime(memoUpdatedAt)}</span>
          )}
        </div>
      )}

      {!selectedBid ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <FileText style={{ width: '18px', height: '18px', color: 'var(--dash-text-5)' }} />
          <span style={{ fontSize: '12px', color: 'var(--dash-text-4)', textAlign: 'center', lineHeight: 1.4 }}>
            공고를 선택하면 메모를 작성할 수 있습니다
          </span>
          <textarea disabled rows={4} style={{ ...textareaBase, opacity: 0.4, cursor: 'not-allowed', marginTop: '4px' }} />
        </div>
      ) : (
        <>
          <textarea
            value={memoContent}
            onChange={handleChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            disabled={memoLoading}
            placeholder="이 공고에 대한 메모를 작성하세요..."
            style={{ ...textareaBase, flex: 1, minHeight: 0, overflowY: 'auto' }}
          />
          <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: '10px', color: statusColor }}>{statusText}</span>
          </div>
        </>
      )}
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
  // ISO 형식("2026-06-02T10:00:00+09:00") 대응을 위해 slice(0,10) 처리
  const deadlineMap = new Map<number, Bid[]>();
  console.log('[ProjectCalendar] inProgressBids:', inProgressBids.map(b => ({ id: b.id, title: b.title, deadline: b.deadline })));
  console.log('[ProjectCalendar] 현재 연/월:', calYear, calMonth);
  for (const bid of inProgressBids) {
    if (!bid.deadline) continue;
    const dateStr = bid.deadline.slice(0, 10); // "YYYY-MM-DD"
    const [y, m, d] = dateStr.split('-').map(Number);
    console.log('[ProjectCalendar] bid deadline 파싱:', bid.title, dateStr, '->', y, m, d);
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
    <div style={{ flexShrink: 0, height: '360px', borderRadius: '12px', backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', padding: '14px 8px', overflow: 'hidden' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', padding: '0 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
          <div style={{ width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(245,158,11,0.15)' }}>
            <Calendar style={{ width: '11px', height: '11px', color: '#F59E0B' }} />
          </div>
          <h3 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--dash-text)', whiteSpace: 'nowrap' }}>마감일 캘린더</h3>
          <span style={{ fontSize: '10px', color: 'var(--dash-text-5)', whiteSpace: 'nowrap' }}>· 진행 프로젝트</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
          <span style={{ fontSize: '11px', color: 'var(--dash-text-2)', whiteSpace: 'nowrap' }}>{calYear}년 {calMonth}월</span>
          <button onClick={prevMonth} style={{ width: '20px', height: '20px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dash-text-4)', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-2)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-4)')}>
            <ChevronLeft style={{ width: '13px', height: '13px' }} />
          </button>
          <button onClick={nextMonth} style={{ width: '20px', height: '20px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dash-text-4)', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-2)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-4)')}>
            <ChevronRight style={{ width: '13px', height: '13px' }} />
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
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '10px', paddingTop: '10px', paddingLeft: '4px', paddingRight: '4px', borderTop: '1px solid var(--dash-border)' }}>
        {[
          { color: '#2563EB', label: '오늘', dot: false },
          { color: '#EF4444', label: '마감 임박', dot: true },
          { color: '#F59E0B', label: '마감일', dot: true },
        ].map((item) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            {item.dot ? (
              <span style={{ width: '5px', height: '5px', borderRadius: '9999px', backgroundColor: item.color, flexShrink: 0 }} />
            ) : (
              <span style={{ width: '12px', height: '12px', borderRadius: '9999px', backgroundColor: item.color, fontSize: '6px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {TODAY_DAY}
              </span>
            )}
            <span style={{ fontSize: '10px', color: 'var(--dash-text-3)' }}>{item.label}</span>
          </div>
        ))}
        <span style={{ fontSize: '10px', color: 'var(--dash-text-5)', marginLeft: 'auto', whiteSpace: 'nowrap', flexShrink: 0 }}>
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
