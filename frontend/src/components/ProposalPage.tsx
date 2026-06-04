import { BookOpen, CheckCircle2, Circle, ClipboardList, FileText, Loader2, ShieldAlert, Sparkles } from 'lucide-react';
import { type Bid, type BidFlags, type AiStatusType, getDaysUntilDeadline } from '../types';
import { type ProposalOutline } from '../services/api';

interface ProposalPageProps {
  bids: Bid[];
  bidFlags: Record<string, BidFlags>;
  outlinesMap: Record<string, ProposalOutline>;
  outlineStatusMap: Record<string, 'none' | 'generating' | 'complete'>;
  aiStatuses: Record<string, AiStatusType>;
  onOpenAnalysisDetail: (bid: Bid) => void;
  onRequestOutline: (bidId: string) => void;
}

function DdayBadge({ deadline }: { deadline: string }) {
  const days = getDaysUntilDeadline(deadline);
  const label = days === 0 ? 'D-day' : days > 0 ? `D-${days}` : `D+${Math.abs(days)}`;
  const color = days <= 0 ? '#EF4444' : days <= 3 ? '#F97316' : '#6B7280';
  return (
    <span style={{ fontSize: '11px', fontWeight: 700, color, backgroundColor: `${color}18`, padding: '2px 7px', borderRadius: '10px', flexShrink: 0 }}>
      {label}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  if (type === '기타') return null;
  return (
    <span style={{ fontSize: '10px', fontWeight: 700, color: '#2563EB', backgroundColor: 'rgba(37,99,235,0.1)', padding: '2px 6px', borderRadius: '6px', flexShrink: 0 }}>
      {type}
    </span>
  );
}

function CheckItem({
  icon: Icon,
  label,
  done,
  loading,
  loadingLabel,
  doneLabel,
  pendingLabel,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  done: boolean;
  loading?: boolean;
  loadingLabel?: string;
  doneLabel: string;
  pendingLabel: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', cursor: onClick ? 'pointer' : 'default' }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.backgroundColor = 'var(--dash-row-hover)'; }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; }}
    >
      {loading ? (
        <Loader2 style={{ width: '15px', height: '15px', color: '#2563EB', flexShrink: 0, animation: 'spin 1s linear infinite' }} />
      ) : done ? (
        <CheckCircle2 style={{ width: '15px', height: '15px', color: '#22C55E', flexShrink: 0 }} />
      ) : (
        <Circle style={{ width: '15px', height: '15px', color: 'var(--dash-text-4)', flexShrink: 0 }} />
      )}
      <Icon style={{ width: '14px', height: '14px', color: done ? '#22C55E' : 'var(--dash-text-3)', flexShrink: 0 }} />
      <span style={{ fontSize: '13px', color: 'var(--dash-text-2)', flex: 1 }}>{label}</span>
      <span style={{ fontSize: '12px', color: loading ? '#2563EB' : done ? '#22C55E' : 'var(--dash-text-4)', fontWeight: 500 }}>
        {loading ? (loadingLabel ?? '처리 중...') : done ? doneLabel : pendingLabel}
      </span>
    </div>
  );
}

function BidCard({
  bid,
  aiStatus,
  outlineStatus,
  onOpenAnalysisDetail,
  onRequestOutline,
}: {
  bid: Bid;
  aiStatus: AiStatusType | undefined;
  outlineStatus: 'none' | 'generating' | 'complete' | undefined;
  onOpenAnalysisDetail: (bid: Bid) => void;
  onRequestOutline: (bidId: string) => void;
}) {
  const analysisComplete = aiStatus === 'complete';
  const riskReviewComplete = analysisComplete && Array.isArray(bid.riskFactors) && bid.riskFactors.length > 0;
  const outlineComplete = outlineStatus === 'complete';
  const outlineGenerating = outlineStatus === 'generating';
  const memo = (bid as Record<string, unknown>).memo;
  const memoComplete = typeof memo === 'string' && memo.trim().length > 0;

  const doneCount = [analysisComplete, riskReviewComplete, outlineComplete, memoComplete].filter(Boolean).length;
  const allDone = doneCount === 4;
  const progressColor = allDone ? '#22C55E' : doneCount > 0 ? '#2563EB' : 'var(--dash-border)';

  return (
    <div style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '12px', marginBottom: '12px', overflow: 'hidden' }}>
      {/* 카드 상단 */}
      <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '3px' }}>
            <TypeBadge type={bid.type} />
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--dash-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {bid.title}
            </span>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--dash-text-3)' }}>{bid.agency}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <DdayBadge deadline={bid.deadline} />
          <span style={{ fontSize: '12px', fontWeight: 600, color: allDone ? '#22C55E' : '#2563EB' }}>
            {doneCount}/4 완료
          </span>
        </div>
      </div>

      {/* 프로그레스 바 */}
      <div style={{ height: '3px', backgroundColor: 'var(--dash-border)', margin: '0 16px' }}>
        <div style={{ height: '3px', borderRadius: '2px', backgroundColor: progressColor, width: `${(doneCount / 4) * 100}%`, transition: 'width 0.3s ease' }} />
      </div>

      {/* 체크리스트 */}
      <div style={{ padding: '8px' }}>
        <CheckItem
          icon={Sparkles}
          label="AI 분석"
          done={analysisComplete}
          doneLabel="완료"
          pendingLabel="미완료"
          onClick={() => onOpenAnalysisDetail(bid)}
        />
        <CheckItem
          icon={ShieldAlert}
          label="독소조항 검토"
          done={riskReviewComplete}
          doneLabel="검토 완료"
          pendingLabel="AI 분석 후 자동 생성"
          onClick={() => onOpenAnalysisDetail(bid)}
        />
        <CheckItem
          icon={BookOpen}
          label="제안목차 생성"
          done={outlineComplete}
          loading={outlineGenerating}
          loadingLabel="생성 중..."
          doneLabel="생성 완료"
          pendingLabel="생성 필요"
          onClick={outlineComplete ? () => onOpenAnalysisDetail(bid) : outlineGenerating ? undefined : () => onRequestOutline(bid.id)}
        />
        <CheckItem
          icon={FileText}
          label="메모 작성"
          done={memoComplete}
          doneLabel="작성됨"
          pendingLabel="메모 없음"
          onClick={() => onOpenAnalysisDetail(bid)}
        />
      </div>
    </div>
  );
}

export function ProposalPage({
  bids,
  bidFlags,
  aiStatuses,
  outlineStatusMap,
  onOpenAnalysisDetail,
  onRequestOutline,
}: ProposalPageProps) {
  const inProgressBids = bids.filter(b => bidFlags[b.id]?.inProgress ?? false);

  return (
    <div style={{ flex: 1, padding: '32px 32px 40px', overflowY: 'auto' }}>
      {/* 헤더 */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--dash-text)', margin: '0 0 4px' }}>제안 준비 체크리스트</h1>
        <p style={{ fontSize: '13px', color: 'var(--dash-text-3)', margin: 0 }}>진행 중인 공고의 제안 준비 현황을 관리하세요</p>
      </div>

      {inProgressBids.length === 0 ? (
        <div style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '12px', padding: '60px 24px', textAlign: 'center' }}>
          <ClipboardList style={{ width: '48px', height: '48px', color: 'var(--dash-text-4)', margin: '0 auto 16px' }} />
          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--dash-text)', margin: '0 0 8px' }}>진행 등록된 공고가 없습니다</p>
          <p style={{ fontSize: '13px', color: 'var(--dash-text-3)', margin: 0 }}>공고 목록에서 진행 등록을 하면 이곳에서 제안 준비 현황을 관리할 수 있습니다</p>
        </div>
      ) : (
        inProgressBids.map(bid => (
          <BidCard
            key={bid.id}
            bid={bid}
            aiStatus={aiStatuses[bid.id]}
            outlineStatus={outlineStatusMap[bid.id]}
            onOpenAnalysisDetail={onOpenAnalysisDetail}
            onRequestOutline={onRequestOutline}
          />
        ))
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
