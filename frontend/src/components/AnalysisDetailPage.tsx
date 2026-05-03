import { useState } from 'react';
import {
  ArrowLeft, BrainCircuit, Trash2, RefreshCw, Download,
  Circle, CheckCircle2, XCircle,
} from 'lucide-react';
import { type Bid, formatBudget, getDaysUntilDeadline } from './mockData';
import { RiskBadge } from './BidTable';
import { useToast } from './ToastProvider';

interface AnalysisDetailPageProps {
  bid: Bid;
  onBack: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  '현황분석 요구사항': 'rgba(37,99,235,0.05)',
  '전략 요구사항': 'rgba(124,58,237,0.05)',
  '서비스 요구사항': 'rgba(34,197,94,0.05)',
  '기술 요구사항': 'rgba(245,158,11,0.05)',
  '거버넌스 요구사항': 'rgba(239,68,68,0.05)',
};
const DEFAULT_CATEGORY_COLOR = 'rgba(100,116,139,0.05)';

function getCategoryColor(category: string): string {
  for (const key of Object.keys(CATEGORY_COLORS)) {
    if (category.startsWith(key.split(' ')[0])) return CATEGORY_COLORS[key];
  }
  return DEFAULT_CATEGORY_COLOR;
}

export function AnalysisDetailPage({ bid, onBack }: AnalysisDetailPageProps) {
  const { showToast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const detail = bid.detail;
  const requirements = detail?.requirements ?? [];
  const analysisLogs = detail?.analysisLogs ?? [];
  const analysisModel = detail?.analysisModel;
  const daysLeft = getDaysUntilDeadline(bid.deadline);
  const isUrgent = daysLeft <= 3;

  const statusLabel =
    bid.aiStatus === 'complete' ? '완료' :
    bid.aiStatus === 'analyzing' ? '분석중' :
    bid.aiStatus === 'pending' ? '대기' : '-';

  const infoGrid = [
    { label: '수요기관', value: bid.agency },
    { label: '마감일시', value: `${bid.deadline} (D${daysLeft >= 0 ? `-${daysLeft}` : `+${Math.abs(daysLeft)}`})`, urgent: isUrgent },
    { label: '추정가격', value: formatBudget(bid.budget) },
    { label: '배정예산', value: detail?.budget ?? '-' },
    { label: '공고번호', value: bid.number },
    { label: '상태', value: statusLabel },
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--dash-bg)', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* 1. 상단 네비게이션 */}
      <div>
        <button
          onClick={onBack}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '6px 12px', border: '1px solid var(--dash-border)',
            borderRadius: '8px', background: 'var(--dash-card)',
            color: 'var(--dash-text-3)', fontSize: '13px', cursor: 'pointer',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-3)'; }}
        >
          <ArrowLeft style={{ width: '14px', height: '14px' }} />
          뒤로
        </button>
      </div>

      {/* 2. 공고 헤더 */}
      <div style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '12px', padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--dash-text)', margin: 0 }}>{bid.title}</h1>
          <RiskBadge risk={bid.risk} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', border: '1px solid var(--dash-border)', borderRadius: '8px', overflow: 'hidden' }}>
          {infoGrid.map((item, i) => (
            <div
              key={i}
              style={{
                padding: '10px 16px',
                borderBottom: i < infoGrid.length - 2 ? '1px solid var(--dash-border)' : undefined,
                borderRight: i % 2 === 0 ? '1px solid var(--dash-border)' : undefined,
                display: 'flex', gap: '12px', alignItems: 'baseline',
              }}
            >
              <span style={{ fontSize: '12px', color: 'var(--dash-text-4)', minWidth: '56px', flexShrink: 0 }}>{item.label}</span>
              <span style={{ fontSize: '13px', color: item.urgent ? '#EF4444' : 'var(--dash-text)', fontWeight: item.urgent ? 600 : 400 }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. 분석 액션 버튼 영역 */}
      <div style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '12px', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        {analysisModel && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 12px', borderRadius: '40px', fontSize: '13px', fontWeight: 400, fontFamily: 'Inter, Noto Sans KR, sans-serif', backgroundColor: 'var(--badge-blue-bg)', color: '#4A7FD4', whiteSpace: 'nowrap', flexShrink: 0, marginRight: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#4A7FD4', flexShrink: 0, display: 'inline-block' }} />
            {analysisModel}
          </span>
        )}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => showToast('info', '준비 중입니다')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: 'none', backgroundColor: '#2563EB', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
          >
            <BrainCircuit style={{ width: '14px', height: '14px' }} />
            AI 재분석
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.4)', backgroundColor: 'transparent', color: '#EF4444', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
          >
            <Trash2 style={{ width: '14px', height: '14px' }} />
            분석 결과 삭제
          </button>
          <button
            onClick={() => showToast('info', '준비 중입니다')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: '1px solid var(--dash-border)', backgroundColor: 'transparent', color: 'var(--dash-text-3)', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
          >
            <RefreshCw style={{ width: '14px', height: '14px' }} />
            목차 재생성
          </button>
          <button
            onClick={() => showToast('info', '준비 중입니다')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: '1px solid var(--dash-border)', backgroundColor: 'transparent', color: 'var(--dash-text-3)', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
          >
            <Download style={{ width: '14px', height: '14px' }} />
            엑셀 다운로드
          </button>
        </div>
      </div>

      {/* 삭제 확인 다이얼로그 */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '12px', padding: '24px', width: '320px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--dash-text)', margin: '0 0 8px' }}>분석 결과 삭제</h3>
            <p style={{ fontSize: '13px', color: 'var(--dash-text-3)', margin: '0 0 20px', lineHeight: 1.6 }}>이 공고의 AI 분석 결과를 삭제하시겠습니까?<br />삭제된 데이터는 복구할 수 없습니다.</p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid var(--dash-border)', backgroundColor: 'transparent', color: 'var(--dash-text-3)', fontSize: '13px', cursor: 'pointer' }}
              >
                취소
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); showToast('warning', '분석 결과가 삭제되었습니다'); }}
                style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', backgroundColor: '#EF4444', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. 분석 로그 */}
      {analysisLogs.length > 0 && (
        <div style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '12px', padding: '20px 24px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--dash-text)', margin: '0 0 16px' }}>분석 로그</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {analysisLogs.map((log, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', position: 'relative' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                    {log.status === 'success' && <CheckCircle2 style={{ width: '16px', height: '16px', color: '#22C55E' }} />}
                    {log.status === 'error' && <XCircle style={{ width: '16px', height: '16px', color: '#EF4444' }} />}
                    {log.status === 'info' && <Circle style={{ width: '16px', height: '16px', color: '#60A5FA' }} />}
                  </div>
                  {i < analysisLogs.length - 1 && (
                    <div style={{ flex: 1, width: '2px', backgroundColor: 'var(--dash-border)', minHeight: '20px' }} />
                  )}
                </div>
                <div style={{ paddingBottom: i < analysisLogs.length - 1 ? '12px' : '0', paddingTop: '2px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--dash-text-4)', marginRight: '8px' }}>{log.time}</span>
                  <span style={{ fontSize: '14px', color: 'var(--dash-text)' }}>{log.message}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. 요구사항 목록 테이블 */}
      <div style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--dash-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--dash-text)', margin: 0 }}>AI 추출 요구사항</h2>
          {requirements.length > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 12px', borderRadius: '40px', fontSize: '13px', fontWeight: 400, fontFamily: 'Inter, Noto Sans KR, sans-serif', backgroundColor: 'var(--badge-blue-bg)', color: '#4A7FD4', whiteSpace: 'nowrap', flexShrink: 0 }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#4A7FD4', flexShrink: 0, display: 'inline-block' }} />
              {requirements.length}건
            </span>
          )}
        </div>

        {requirements.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--dash-text-4)', fontSize: '13px' }}>
            AI 분석 완료 후 요구사항이 표시됩니다
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '140px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '160px' }} />
                <col style={{ width: '200px' }} />
                <col />
              </colgroup>
              <thead>
                <tr style={{ position: 'sticky', top: 0, backgroundColor: 'var(--dash-card)', zIndex: 1 }}>
                  {['분류', 'CODE', '명칭', '정의', '상세설명'].map((col) => (
                    <th
                      key={col}
                      style={{
                        padding: '10px 14px', textAlign: 'left',
                        fontSize: '12px', fontWeight: 600, color: 'var(--dash-text-4)',
                        borderBottom: '1px solid var(--dash-border)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requirements.map((req, i) => {
                  const bg = getCategoryColor(req.category);
                  return (
                    <tr
                      key={i}
                      style={{ backgroundColor: bg }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.filter = 'brightness(0.97)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.filter = 'none'; }}
                    >
                      <td style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--dash-text-3)', borderBottom: '1px solid var(--dash-border)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{req.category}</td>
                      <td style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: 'var(--dash-text)', borderBottom: '1px solid var(--dash-border)', fontFamily: 'monospace' }}>{req.code}</td>
                      <td style={{ padding: '10px 14px', fontSize: '13px', color: 'var(--dash-text)', borderBottom: '1px solid var(--dash-border)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{req.name}</td>
                      <td style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--dash-text-3)', borderBottom: '1px solid var(--dash-border)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>{req.definition}</td>
                      <td style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--dash-text-3)', borderBottom: '1px solid var(--dash-border)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>{req.detail}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
