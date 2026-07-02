import { CheckCircle2, Clock, Download, FileText, Loader2 } from 'lucide-react';
import { type Bid, type BidFlags, getDaysUntilDeadline } from '../types';
import { type ProposalOutline } from '../services/api';

interface ProposalOutlinePageProps {
  bids: Bid[];
  bidFlags: Record<string, BidFlags>;
  outlinesMap: Record<string, ProposalOutline>;
  outlineStatusMap: Record<string, 'none' | 'generating' | 'complete'>;
  onOpenAnalysisDetail: (bid: Bid) => void;
  onRequestOutline: (bidId: string) => void;
  onDownloadOutline: (bidId: string) => void;
}

function DdayBadge({ deadline }: { deadline: string }) {
  const days = getDaysUntilDeadline(deadline);
  const label = days < 0 ? '마감' : days === 0 ? 'D-day' : `D-${days}`;
  const color = days < 0 ? '#81878F' : days === 0 ? '#EF4444' : days <= 3 ? '#F97316' : '#6B7280';
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

function BidRow({
  bid,
  status,
  onOpenAnalysisDetail,
  onRequestOutline,
  onDownloadOutline,
}: {
  bid: Bid;
  status: 'none' | 'generating' | 'complete' | undefined;
  onOpenAnalysisDetail: (bid: Bid) => void;
  onRequestOutline: (bidId: string) => void;
  onDownloadOutline: (bidId: string) => void;
}) {
  return (
    <div
      style={{ padding: '12px 16px', borderBottom: '1px solid var(--dash-border)', display: 'flex', alignItems: 'center', gap: '12px' }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--dash-row-hover)')}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
    >
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <TypeBadge type={bid.type} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--dash-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {bid.title}
          </span>
        </div>
        <span style={{ fontSize: '12px', color: 'var(--dash-text-3)' }}>{bid.agency}</span>
      </div>

      <DdayBadge deadline={bid.deadline} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        {status === 'complete' && (
          <>
            <button
              onClick={() => onOpenAnalysisDetail(bid)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '7px', border: '1px solid #2563EB', backgroundColor: 'transparent', color: '#2563EB', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              <FileText style={{ width: '13px', height: '13px' }} />
              목차 보기
            </button>
            <button
              onClick={() => onDownloadOutline(bid.id)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '7px', border: '1px solid #16A34A', backgroundColor: 'transparent', color: '#16A34A', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              <Download style={{ width: '13px', height: '13px' }} />
              Excel 다운로드
            </button>
          </>
        )}
        {status === 'generating' && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, color: 'var(--dash-text-3)' }}>
            <Loader2 style={{ width: '13px', height: '13px', animation: 'spin 1s linear infinite' }} />
            생성 중...
          </span>
        )}
        {(status === 'none' || status === undefined) && (
          <button
            onClick={() => onRequestOutline(bid.id)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 14px', borderRadius: '7px', border: 'none', backgroundColor: '#2563EB', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
          >
            목차 생성
          </button>
        )}
      </div>
    </div>
  );
}

export function ProposalOutlinePage({
  bids,
  bidFlags,
  outlineStatusMap,
  onOpenAnalysisDetail,
  onRequestOutline,
  onDownloadOutline,
}: ProposalOutlinePageProps) {
  const inProgressBids = bids.filter(b => bidFlags[b.id]?.inProgress ?? false);

  const completeBids = inProgressBids.filter(b => outlineStatusMap[b.id] === 'complete');
  const generatingBids = inProgressBids.filter(b => outlineStatusMap[b.id] === 'generating');
  const notStartedBids = inProgressBids.filter(b => {
    const s = outlineStatusMap[b.id];
    return s === 'none' || s === undefined;
  });

  const completeCount = completeBids.length;
  const pendingCount = notStartedBids.length + generatingBids.length;

  return (
    <div style={{ flex: 1, padding: '32px 32px 40px', overflowY: 'auto' }}>
      {/* 헤더 */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--dash-text)', margin: '0 0 4px' }}>제안목차</h1>
        <p style={{ fontSize: '13px', color: 'var(--dash-text-3)', margin: 0 }}>진행 중인 공고의 제안목차 생성 현황</p>
      </div>

      {/* 현황 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px' }}>
        <div style={{ backgroundColor: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '12px', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <CheckCircle2 style={{ width: '28px', height: '28px', color: '#22C55E', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--dash-text)', lineHeight: 1 }}>{completeCount}</div>
            <div style={{ fontSize: '12px', color: 'var(--dash-text-3)', marginTop: '4px' }}>생성 완료</div>
          </div>
        </div>
        <div style={{ backgroundColor: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: '12px', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Clock style={{ width: '28px', height: '28px', color: '#F97316', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--dash-text)', lineHeight: 1 }}>{pendingCount}</div>
            <div style={{ fontSize: '12px', color: 'var(--dash-text-3)', marginTop: '4px' }}>미생성</div>
          </div>
        </div>
      </div>

      {/* 공고 목록 */}
      {inProgressBids.length === 0 ? (
        <div style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '12px', padding: '60px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--dash-text)', margin: '0 0 8px' }}>진행 등록된 공고가 없습니다</p>
          <p style={{ fontSize: '13px', color: 'var(--dash-text-3)', margin: 0 }}>공고 목록에서 진행 등록을 하면 이곳에서 제안목차를 관리할 수 있습니다</p>
        </div>
      ) : (
        <div style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '12px', overflow: 'hidden' }}>
          {completeBids.length > 0 && (
            <>
              <div style={{ padding: '8px 16px', backgroundColor: 'var(--dash-item-bg)', fontSize: '12px', fontWeight: 600, color: 'var(--dash-text-3)' }}>
                생성 완료 ({completeBids.length}건)
              </div>
              {completeBids.map(bid => (
                <BidRow
                  key={bid.id}
                  bid={bid}
                  status="complete"
                  onOpenAnalysisDetail={onOpenAnalysisDetail}
                  onRequestOutline={onRequestOutline}
                  onDownloadOutline={onDownloadOutline}
                />
              ))}
            </>
          )}
          {(generatingBids.length > 0 || notStartedBids.length > 0) && (
            <>
              <div style={{ padding: '8px 16px', backgroundColor: 'var(--dash-item-bg)', fontSize: '12px', fontWeight: 600, color: 'var(--dash-text-3)', borderTop: completeBids.length > 0 ? '1px solid var(--dash-border)' : undefined }}>
                미생성 ({generatingBids.length + notStartedBids.length}건)
              </div>
              {generatingBids.map(bid => (
                <BidRow
                  key={bid.id}
                  bid={bid}
                  status="generating"
                  onOpenAnalysisDetail={onOpenAnalysisDetail}
                  onRequestOutline={onRequestOutline}
                  onDownloadOutline={onDownloadOutline}
                />
              ))}
              {notStartedBids.map(bid => (
                <BidRow
                  key={bid.id}
                  bid={bid}
                  status="none"
                  onOpenAnalysisDetail={onOpenAnalysisDetail}
                  onRequestOutline={onRequestOutline}
                  onDownloadOutline={onDownloadOutline}
                />
              ))}
            </>
          )}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
