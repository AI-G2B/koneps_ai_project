import { useRef, useState, useEffect, type ChangeEvent } from 'react';
import {
  ArrowLeft, Sparkles, Trash2, RefreshCw, Download,
  Circle, CheckCircle2, XCircle, Loader2, ScrollText,
  AlertTriangle, Upload, ChevronUp, ChevronDown, FileText, FileX,
} from 'lucide-react';
import { type Bid, type BidFlags, type AiStatusType, type AnalysisLog, formatBudget, getDaysUntilDeadline } from '../types';
import { RiskBadge } from './BidTable';
import { useToast } from './ToastProvider';

interface AnalysisDetailPageProps {
  bid: Bid;
  onBack: () => void;
  aiStatus?: AiStatusType;
  onRequestAnalysis?: (bidId: string, opts?: { rerun?: boolean }) => void;
  onDeleteAnalysis?: (bidId: string) => Promise<boolean>;
  analysisLogs?: AnalysisLog[];
  outline?: import('../services/api').ProposalOutline | null;
  outlineStatus?: 'none' | 'generating' | 'complete';
  outlineLogs?: AnalysisLog[];
  onRequestOutline?: (bidId: string) => void;
  onRegenerateOutline?: (bidId: string) => void;
  onDownloadOutline?: (bidId: string) => void;
  onUploadAttachment?: (bidId: string, file: File) => Promise<boolean>;
  bidFlags?: Record<string, BidFlags>;
  onToggleInProgress?: (bidId: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  '현황분석 요구사항': 'rgba(37,99,235,0.04)',
  '전략 요구사항': 'rgba(124,58,237,0.04)',
  '서비스 요구사항': 'rgba(34,197,94,0.04)',
  '기술 요구사항': 'rgba(245,158,11,0.04)',
  '거버넌스 요구사항': 'rgba(239,68,68,0.04)',
};
const DEFAULT_CATEGORY_COLOR = 'rgba(100,116,139,0.04)';

function getCategoryColor(category: string): string {
  for (const key of Object.keys(CATEGORY_COLORS)) {
    if (category.startsWith(key.split(' ')[0])) return CATEGORY_COLORS[key];
  }
  return DEFAULT_CATEGORY_COLOR;
}

type DetailTab = 'analysis' | 'poison' | 'outline';

interface OutlineNode {
  code?: string;
  number?: string;
  level?: number;
  title?: string;
  eval_mapping?: string;
  page_count?: number | null;
  children?: OutlineNode[];
}

function OutlineTreeNode({ node, depth }: { node: OutlineNode; depth: number }) {
  const isTop = depth === 0;
  const number = node.code ?? node.number ?? '';
  return (
    <div style={{ marginLeft: depth * 20 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '10px',
          padding: isTop ? '10px 0' : '6px 0',
          borderBottom: isTop ? '1px solid var(--dash-border-faint)' : undefined,
        }}
      >
        {number && (
          <span style={{ fontSize: isTop ? '14px' : '13px', fontWeight: 700, color: isTop ? 'var(--dash-text)' : 'var(--dash-text-3)', fontFamily: 'monospace', minWidth: '54px' }}>
            {number}
          </span>
        )}
        <span style={{ fontSize: isTop ? '15px' : '14px', fontWeight: isTop ? 700 : 500, color: 'var(--dash-text)', flex: 1, lineHeight: 1.55, wordBreak: 'keep-all' }}>
          {node.title ?? '—'}
        </span>
        {node.eval_mapping && (
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#2563EB', backgroundColor: 'rgba(37,99,235,0.1)', padding: '2px 8px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
            {node.eval_mapping}
          </span>
        )}
        {node.page_count != null && (
          <span style={{ fontSize: '12px', color: 'var(--dash-text-4)', whiteSpace: 'nowrap' }}>
            {node.page_count}p
          </span>
        )}
      </div>
      {node.children && node.children.length > 0 && (
        <div>
          {node.children.map((child, i) => (
            <OutlineTreeNode key={i} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// 독소조항 16개 체크리스트 정의 (prompts/rfp_analysis.py와 동기)
const POISON_CATEGORIES: Array<{
  code: string;
  group: string;
  name: string;
  criteria: string;
  level: 'caution' | 'warning' | 'danger';
}> = [
  { code: 'S1', group: '과업/산출물', name: '백지수표형 과업 요구', criteria: '"필요시 추가 과업 무상 수행" 명시 — 무한 과업 확장 리스크 사업자 전가', level: 'danger' },
  { code: 'S2', group: '과업/산출물', name: '구축(SI) 수준 산출물 요구', criteria: 'ISP/ISMP에 물리 ERD·화면설계서·소스코드 진단 요구 — 컨설팅 대가에 미포함 공수 강제', level: 'warning' },
  { code: 'S3', group: '과업/산출물', name: '과도한 인쇄/번역 비용 전가', criteria: '100부 이상 컬러 인쇄 또는 전문 영문 번역본 의무', level: 'caution' },
  { code: 'S4', group: '과업/산출물', name: '종료 후 무상 자문 강제', criteria: '사업 종료 후 6개월 이상 정기 방문 자문 무상 지원 — 하자보수 범위 초과', level: 'warning' },
  { code: 'P1', group: '인력/환경',   name: '인력 교체 시 인건비 전가', criteria: '7일 이상 중복 투입 인건비를 사업자가 부담 — 1MM에 2인분 인건비 이중 부담', level: 'danger' },
  { code: 'P2', group: '인력/환경',   name: '체재비 없는 지방 상주', criteria: '비수도권 전원 상주 + 체재비/숙소 미지원 — 수도권 인력 수급 불가, 마진 증발', level: 'danger' },
  { code: 'P3', group: '인력/환경',   name: '발주처 일방적 인력 퇴출권', criteria: '협의·소명 절차 없이 3일 이내 즉시 교체 요구 — 노동법 위반 소지', level: 'warning' },
  { code: 'P4', group: '인력/환경',   name: '과도한 PM 직급 제한', criteria: 'PM을 등기이사/임원급으로 한정 — 입찰 가능 풀 부당 제한', level: 'caution' },
  { code: 'C1', group: '비용/대가',   name: '인질형 대금 지급', criteria: '잔금을 후속 SI 예산 확보·예타 통과에 연동 — 사업자 통제 불가 요인에 지급 연동', level: 'danger' },
  { code: 'C2', group: '비용/대가',   name: '상용 SW/장비 기증 강요', criteria: '사업자가 EA툴/노트북 구매 후 발주처에 기증 — 자산취득비 용역비 전가', level: 'warning' },
  { code: 'C3', group: '비용/대가',   name: '선금 지급 차단', criteria: '선금 전면 불가 또는 기재부 특례(70~80%) 무시 30% 미만 제한', level: 'caution' },
  { code: 'C4', group: '비용/대가',   name: '출장비 실비 정산 불가', criteria: '전국 단위 현장실사 필수임에도 출장비 제안가 포함 — 예측 불가 비용 사업자 부담', level: 'warning' },
  { code: 'L1', group: '법무/지재권', name: '지식재산권 독점 귀속', criteria: '산출물·방법론·도구 일체 발주기관 단독 귀속 — 계약예규 공동소유 원칙 위반', level: 'danger' },
  { code: 'L2', group: '법무/지재권', name: '물리적 하드디스크 압수', criteria: '사업 종료 시 PC/노트북 HDD 물리 파기·반납 강제 — 완전삭제(Wiping)로 충분', level: 'danger' },
  { code: 'L3', group: '법무/지재권', name: '제3자 저작권 무과실 책임', criteria: '발주처 제공 자료로 인한 분쟁도 사업자 100% 책임 — 발주처 귀책 사유까지 전가', level: 'warning' },
  { code: 'L4', group: '법무/지재권', name: '징벌적 지연배상금', criteria: '1일 0.25% 이상 (법정 0.125% 초과) 또는 상한선(30%) 미설정', level: 'caution' },
];

function generateReportHTML(bid: Bid): string {
  const detail = bid.detail;
  const riskFactors = bid.riskFactors ?? [];
  let html = '';

  if (detail) {
    html += '<h2>AI 추출 핵심항목</h2>';
    const items = [
      { label: '예산규모',   value: detail.budget },
      { label: '수행기간',   value: detail.execPeriod },
      { label: '평가방식',   value: detail.evalMethod },
      { label: '사업목적',   value: detail.purpose },
      { label: '납품방식',   value: detail.deliveryMethod },
      { label: '기술요건',   value: detail.techRequirement },
      { label: '입찰방식',   value: detail.bidMethod },
      { label: '보안요건',   value: detail.securityRequirement },
    ];
    html += '<table>';
    items.forEach((item) => {
      html += `<tr><th>${item.label}</th><td>${item.value ?? '-'}</td></tr>`;
    });
    html += '</table>';

    if (detail.requirements && detail.requirements.length > 0) {
      html += '<h2>요구사항</h2>';
      html += '<table><tr><th>분류</th><th>코드</th><th>항목명</th><th>내용</th></tr>';
      detail.requirements.forEach((req) => {
        html += `<tr><td>${req.category ?? '-'}</td><td>${req.code ?? '-'}</td><td>${req.name ?? '-'}</td><td>${req.detail ?? '-'}</td></tr>`;
      });
      html += '</table>';
    }
  }

  if (riskFactors.length > 0) {
    html += '<h2>독소조항 분석</h2>';
    html += '<table><tr><th>항목</th><th>위험도</th><th>조항 내용</th><th>판단근거</th></tr>';
    riskFactors.forEach((rf) => {
      html += `<tr><td>${rf.category ?? '-'}</td><td>${rf.severity ?? '-'}</td><td>${rf.clause ?? '-'}</td><td>${rf.reason ?? '-'}</td></tr>`;
    });
    html += '</table>';
  }

  return html;
}

export function AnalysisDetailPage({ bid, onBack, aiStatus: aiStatusProp, onRequestAnalysis, onDeleteAnalysis, analysisLogs: analysisLogsProp, outline, outlineStatus = 'none', outlineLogs, onRequestOutline, onRegenerateOutline, onDownloadOutline, onUploadAttachment, bidFlags, onToggleInProgress }: AnalysisDetailPageProps) {
  const { showToast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showInProgressConfirm, setShowInProgressConfirm] = useState<'add' | 'remove' | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('analysis');
  const [uploading, setUploading] = useState(false);
  const [logsExpanded, setLogsExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownload = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${bid.title} - AI 분석 리포트</title>
  <style>
    body { font-family: 'Malgun Gothic', sans-serif; padding: 20px; color: #1e293b; }
    h1 { font-size: 18px; font-weight: 700; margin-bottom: 8px; }
    h2 { font-size: 15px; font-weight: 600; margin: 20px 0 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    h3 { font-size: 13px; font-weight: 600; margin: 12px 0 4px; }
    p, li { font-size: 12px; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    th, td { border: 1px solid #e2e8f0; padding: 6px 10px; font-size: 12px; text-align: left; }
    th { background: #f8fafc; font-weight: 600; }
    .meta { color: #64748b; font-size: 12px; margin-bottom: 16px; }
    @media print { body { padding: 0; } button { display: none; } }
  </style>
</head>
<body>
  <h1>${bid.title}</h1>
  <div class="meta">발주기관: ${bid.agency ?? '-'} | 공고번호: ${bid.number} | 마감일: ${bid.deadline?.slice(0, 10) ?? '-'}</div>
  ${generateReportHTML(bid)}
</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  const aiStatus: AiStatusType = aiStatusProp ?? bid.aiStatus ?? 'none';
  const detail = bid.detail;
  const riskFactors = bid.riskFactors ?? [];
  const SEVERITY_CFG: Record<string, { color: string; label: string }> = {
    danger:  { color: '#EF4444', label: '위험' },
    warning: { color: '#F97316', label: '경고' },
    caution: { color: '#EAB308', label: '주의' },
  };
  const requirements = detail?.requirements ?? [];

  const handleUploadClick = () => fileInputRef.current?.click();
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!onUploadAttachment) {
      showToast('warning', '업로드 기능을 사용할 수 없습니다.');
      return;
    }
    setUploading(true);
    try {
      const ok = await onUploadAttachment(bid.id, file);
      if (ok) {
        showToast('success', `'${file.name}' 업로드 완료 — AI 재분석을 시작합니다.`);
      } else {
        showToast('warning', `업로드 실패: '${file.name}'`);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  /** 분석은 끝났지만 요구사항 0건 — 입력 자료 부족 안내. */
  const requirementsEmpty = aiStatus === 'complete' && requirements.length === 0;
  // 분석 중에는 props로 들어온 실시간 로그를 우선 사용, 완료 후엔 detail에 저장된 로그(있다면).
  const analysisLogs = analysisLogsProp && analysisLogsProp.length > 0
    ? analysisLogsProp
    : (detail?.analysisLogs ?? []);
  const analysisModel = detail?.analysisModel;

  useEffect(() => {
    if (analysisLogs.length > 0 && aiStatus === 'analyzing') {
      setLogsExpanded(true);
    }
    if (aiStatus === 'complete' || aiStatus === 'none') {
      setLogsExpanded(false);
    }
  }, [analysisLogs.length, aiStatus]);
  const daysLeft = getDaysUntilDeadline(bid.deadline);
  const isUrgent = daysLeft <= 3;

  const statusLabel =
    bid.aiStatus === 'complete' ? '완료' :
    bid.aiStatus === 'analyzing' ? '분석중' :
    bid.aiStatus === 'pending' ? '대기' : '-';

  const formatAmt = (amt: number | null): string => {
    if (amt == null) return '-';
    return formatBudget(amt);
  };

  const infoGrid = [
    { label: '수요기관', value: bid.agency },
    { label: '마감일시', value: bid.deadline ? `${bid.deadline} ${isNaN(daysLeft) ? '(기간 미정)' : `(D${daysLeft >= 0 ? `-${daysLeft}` : `+${Math.abs(daysLeft)}`})`}` : '기간 미정', urgent: isUrgent },
    { label: '추정가격', value: formatAmt(bid.presmptPrce) },
    { label: '배정예산', value: formatAmt(bid.asignBdgtAmt) },
    { label: '공고번호', value: bid.number },
    { label: '공고일', value: bid.ntceDate ? bid.ntceDate.replace(/-/g, '.') : '-' },
    { label: '상태', value: statusLabel },
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--dash-bg)', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* 1. 상단 네비게이션 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
        <button
          onClick={handleDownload}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '6px 12px', border: '1px solid var(--dash-border)',
            borderRadius: '8px', background: 'var(--dash-card)',
            color: 'var(--dash-text-3)', fontSize: '13px', cursor: 'pointer',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-3)'; }}
        >
          <Download style={{ width: '14px', height: '14px' }} />
          리포트 다운로드
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

        {/* 첨부파일 다운로드 */}
        {(bid.attachments && bid.attachments.length > 0) && (
          <div style={{ marginTop: '14px', padding: '12px 14px', border: '1px solid var(--dash-border-faint)', borderRadius: '8px', backgroundColor: 'var(--dash-card-deep)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <FileText style={{ width: '14px', height: '14px', color: 'var(--dash-text-3)' }} />
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--dash-text-2)' }}>첨부파일 ({bid.attachments.length}개)</span>
              <span style={{ fontSize: '11px', color: 'var(--dash-text-5)' }}>· 파일명 클릭 시 새 탭에서 다운로드</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {bid.attachments.map((file, i) => {
                const isRfp = /제안요청서|RFP|과업지시서|과업\s*지시서/i.test(file.fileName);
                return (
                  <button
                    key={i}
                    onClick={() => window.open(file.fileUrl, '_blank', 'noopener')}
                    title={file.fileName}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '7px 10px', borderRadius: '6px',
                      border: isRfp ? '1px solid rgba(245,158,11,0.3)' : '1px solid transparent',
                      backgroundColor: isRfp ? 'rgba(245,158,11,0.06)' : 'transparent',
                      color: 'var(--dash-text)', fontSize: '12.5px', textAlign: 'left',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = isRfp ? 'rgba(245,158,11,0.12)' : 'var(--dash-row-hover)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = isRfp ? 'rgba(245,158,11,0.06)' : 'transparent'; }}
                  >
                    <Download style={{ width: '12px', height: '12px', color: isRfp ? '#D97706' : 'var(--dash-text-3)', flexShrink: 0 }} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.fileName}</span>
                    {isRfp && (
                      <span style={{ fontSize: '10px', color: '#D97706', backgroundColor: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '4px', padding: '1px 6px', fontWeight: 500, flexShrink: 0 }}>RFP</span>
                    )}
                    <span style={{ fontSize: '10.5px', color: 'var(--dash-text-5)', flexShrink: 0, textTransform: 'uppercase' }}>{file.fileType}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. 분석 액션 버튼 영역 - 분석 완료 시에만 표시 */}
      {aiStatus === 'complete' && (
        <div style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '12px', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {analysisModel && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 12px', borderRadius: '40px', fontSize: '13px', fontWeight: 400, fontFamily: 'Inter, Noto Sans KR, sans-serif', backgroundColor: 'var(--badge-blue-bg)', color: '#4A7FD4', whiteSpace: 'nowrap', flexShrink: 0, marginRight: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#4A7FD4', flexShrink: 0, display: 'inline-block' }} />
              {analysisModel}
            </span>
          )}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {onToggleInProgress && (() => {
              const flags = bidFlags?.[bid.id] ?? { bookmarked: false, inProgress: false };
              return (
                <button
                  onClick={() => setShowInProgressConfirm(flags.inProgress ? 'remove' : 'add')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: `1px solid ${flags.inProgress ? 'rgba(34,197,94,0.4)' : 'rgba(37,99,235,0.4)'}`, backgroundColor: flags.inProgress ? 'rgba(34,197,94,0.1)' : 'rgba(37,99,235,0.08)', color: flags.inProgress ? '#22C55E' : '#2563EB', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
                >
                  {flags.inProgress ? '진행 프로젝트 등록됨' : '진행 프로젝트로 등록'}
                </button>
              );
            })()}
            <button
              onClick={() => {
                onRequestAnalysis?.(bid.id, { rerun: true });
                showToast('info', 'AI 재분석을 시작합니다');
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--dash-border)', backgroundColor: 'transparent', color: 'var(--dash-text-3)', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
            >
              <RefreshCw style={{ width: '13px', height: '13px' }} />
              AI 재분석
            </button>
            <button
              onClick={async () => {
                const { downloadAnalysisDocx } = await import('../services/api');
                await downloadAnalysisDocx(bid.id);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: '1px solid #2563EB', backgroundColor: 'transparent', color: '#2563EB', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
            >
              <Download style={{ width: '14px', height: '14px' }} />
              AI 분석 결과 다운
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.4)', backgroundColor: 'transparent', color: '#EF4444', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
            >
              <Trash2 style={{ width: '14px', height: '14px' }} />
              분석 결과 삭제
            </button>
          </div>
        </div>
      )}

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
                onClick={async () => {
                  setShowDeleteConfirm(false);
                  if (!onDeleteAnalysis) {
                    showToast('warning', '삭제 기능을 사용할 수 없습니다');
                    return;
                  }
                  const ok = await onDeleteAnalysis(bid.id);
                  if (ok) showToast('success', '분석 결과가 삭제되었습니다');
                  else showToast('warning', '분석 결과 삭제에 실패했습니다');
                }}
                style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', backgroundColor: '#EF4444', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 진행하기 확인 다이얼로그 */}
      {showInProgressConfirm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '12px', padding: '24px', maxWidth: '360px', width: '100%', margin: '0 16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--dash-text)', margin: '0 0 8px' }}>
              {showInProgressConfirm === 'add' ? '진행 프로젝트로 등록하시겠습니까?' : '진행 프로젝트에서 제거하시겠습니까?'}
            </h3>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: showInProgressConfirm === 'remove' ? '20px' : 0 }}>
              <button
                onClick={() => setShowInProgressConfirm(null)}
                style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid var(--dash-border)', backgroundColor: 'transparent', color: 'var(--dash-text-3)', fontSize: '13px', cursor: 'pointer' }}
              >
                취소
              </button>
              <button
                onClick={() => { onToggleInProgress?.(bid.id); setShowInProgressConfirm(null); }}
                style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', backgroundColor: showInProgressConfirm === 'add' ? '#2563EB' : '#EF4444', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
              >
                {showInProgressConfirm === 'add' ? '등록' : '제거'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. 분석 로그 */}
      {analysisLogs.length > 0 && (
        <div style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '12px', padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: logsExpanded ? '16px' : '0' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--dash-text)', margin: 0 }}>
              {logsExpanded ? '분석 로그' : `분석 로그 (${analysisLogs.length}건)`}
            </h2>
            <button
              onClick={() => setLogsExpanded(v => !v)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--dash-text-3)', padding: '2px 0' }}
            >
              {logsExpanded
                ? <><ChevronUp style={{ width: '14px', height: '14px' }} />접기</>
                : <><ChevronDown style={{ width: '14px', height: '14px' }} />펼치기</>
              }
            </button>
          </div>
          {logsExpanded && (
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
          )}
        </div>
      )}

      {/* 5. 분석 결과 영역 - aiStatus에 따라 분기 */}
      {aiStatus === 'no_docs' ? (
        <div style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '12px', padding: '60px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <FileX style={{ width: '40px', height: '40px', color: '#81878F', marginBottom: '4px' }} />
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--dash-text)', margin: 0 }}>분석 가능한 문서가 없습니다</p>
          <p style={{ fontSize: '13px', color: 'var(--dash-text-3)', margin: 0, textAlign: 'center', maxWidth: '520px', lineHeight: 1.55 }}>
            제안요청서(RFP) 또는 첨부파일이 등록되지 않아 AI 분석을 진행할 수 없습니다.
          </p>
        </div>
      ) : aiStatus === 'failed' ? (
        <div style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '12px', padding: '60px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <ScrollText style={{ width: '40px', height: '40px', color: '#EF4444', marginBottom: '4px' }} />
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--dash-text)', margin: 0 }}>AI 분석 실패</p>
          <p style={{ fontSize: '13px', color: 'var(--dash-text-3)', margin: 0, textAlign: 'center', maxWidth: '520px', lineHeight: 1.55 }}>
            {bid.failReason ?? '분석 실행 중 오류가 발생했습니다.'}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--dash-text-4)', margin: '4px 0 0' }}>아래 버튼으로 다시 시도할 수 있습니다.</p>
          <button
            onClick={() => onRequestAnalysis?.(bid.id, { rerun: true })}
            style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 22px', borderRadius: '8px', border: '1px solid #EF4444', backgroundColor: 'transparent', color: '#EF4444', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
          >
            <RefreshCw style={{ width: '14px', height: '14px' }} />
            다시 시도
          </button>
        </div>
      ) : (aiStatus === 'none' || aiStatus === 'pending') ? (
        <div style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '12px', padding: '72px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <Sparkles style={{ width: '44px', height: '44px', color: '#2563EB', marginBottom: '4px' }} />
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--dash-text)', margin: 0 }}>아직 AI 분석이 진행되지 않았습니다</p>
          <p style={{ fontSize: '13px', color: 'var(--dash-text-3)', margin: 0 }}>아래 버튼을 눌러 분석을 시작하세요</p>
          <button
            onClick={() => onRequestAnalysis?.(bid.id)}
            style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 22px', borderRadius: '8px', border: 'none', backgroundColor: '#2563EB', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
          >
            <Sparkles style={{ width: '14px', height: '14px' }} />
            AI 분석 시작
          </button>
        </div>
      ) : aiStatus === 'analyzing' ? (
        <div style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '12px', padding: '72px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <Loader2 className="animate-spin" style={{ width: '44px', height: '44px', color: '#2563EB', marginBottom: '4px' }} />
          <p style={{ fontSize: '15px', color: 'var(--dash-text)', margin: 0 }}>AI 분석을 진행하고 있습니다...</p>
          <p style={{ fontSize: '13px', color: 'var(--dash-text-3)', margin: 0 }}>잠시 후 결과가 표시됩니다</p>
          <button
            disabled
            style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 22px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--dash-border)', color: 'var(--dash-text-4)', fontSize: '13px', fontWeight: 500, cursor: 'not-allowed' }}
          >
            분석 중...
          </button>
        </div>
      ) : (
        /* aiStatus === 'complete' — 탭 분리: [분석 결과] / [독소조항] */
        <>

        {/* 탭 바 */}
        <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--dash-border)', backgroundColor: 'var(--dash-card)', borderRadius: '12px 12px 0 0', padding: '0 8px' }}>
          {([
            { key: 'analysis', label: '분석 결과', count: requirements.length, countColor: '#4A7FD4' },
            { key: 'poison',   label: '독소조항', count: riskFactors.length, countColor: riskFactors.length > 0 ? '#EF4444' : '#22C55E' },
            { key: 'outline',  label: '제안목차', count: outline?.sections ? (((outline.sections as { outline?: unknown[] }).outline?.length) ?? 0) : 0, countColor: outline ? '#2563EB' : 'var(--dash-text-4)' },
          ] as Array<{ key: DetailTab; label: string; count: number; countColor: string }>).map((t) => {
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                style={{
                  padding: '14px 22px',
                  fontSize: '15px',
                  fontWeight: active ? 700 : 500,
                  color: active ? 'var(--dash-text)' : 'var(--dash-text-4)',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: active ? '3px solid #2563EB' : '3px solid transparent',
                  marginBottom: '-1px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {t.label}
                <span style={{ fontSize: '13px', fontWeight: 600, color: t.countColor, backgroundColor: `${t.countColor}1a`, padding: '2px 10px', borderRadius: '40px' }}>
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        {activeTab === 'analysis' && (
        <>

        {/* AI 추출 핵심항목 */}
        {detail && (
          <div style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--dash-border)' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--dash-text)', margin: 0 }}>AI 추출 핵심항목</h2>
            </div>
            <div>
              {[
                { label: '예산규모',  value: detail.budget },
                { label: '수행기간',  value: detail.execPeriod },
                { label: '평가방식',  value: detail.evalMethod },
                { label: '입찰방식',  value: detail.bidMethod },
                { label: '기술요건',  value: detail.techRequirement },
                { label: '보안요건',  value: detail.securityRequirement },
                { label: '발주처',    value: detail.contactPerson },
                { label: '사업목적',  value: detail.purpose },
              ].map((item, i, arr) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '170px 1fr', borderBottom: i < arr.length - 1 ? '1px solid var(--dash-border-faint)' : undefined, alignItems: 'flex-start' }}>
                  <div style={{ padding: '16px 20px', fontSize: '14px', fontWeight: 600, color: 'var(--dash-text-3)', backgroundColor: 'var(--dash-card-deep)' }}>
                    {item.label}
                  </div>
                  <div style={{ padding: '16px 24px', fontSize: '15px', color: 'var(--dash-text)', lineHeight: 1.7, wordBreak: 'keep-all', whiteSpace: 'pre-wrap' }}>
                    {item.value || '미정'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        </>
        )}

        {activeTab === 'poison' && (
        <>
        {/* 위험요소 (독소조항) */}
        <div style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--dash-border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--dash-text)', margin: 0 }}>위험요소 (독소조항)</h2>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 14px', borderRadius: '40px', fontSize: '14px', fontWeight: 600, backgroundColor: riskFactors.length > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)', color: riskFactors.length > 0 ? '#EF4444' : '#22C55E' }}>
              {riskFactors.length > 0 ? `${riskFactors.length}건` : '없음'}
            </span>
          </div>
          {riskFactors.length === 0 ? (
            <div style={{ padding: '48px 28px', textAlign: 'center', color: '#22C55E', fontSize: '15px', fontWeight: 500 }}>
              ✓ 독소조항이 감지되지 않았습니다
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <div style={{ minWidth: '1000px' }}>
                {/* 테이블 헤더 */}
                <div style={{ display: 'grid', gridTemplateColumns: '110px 100px 1fr 1fr 200px', backgroundColor: 'var(--dash-card-deep)', borderBottom: '1px solid var(--dash-border)' }}>
                  {['분류', '심각도', '조항 내용', '판단 근거', '출처'].map((col) => (
                    <div key={col} style={{ padding: '14px 18px', fontSize: '13px', fontWeight: 700, color: 'var(--dash-text-3)', letterSpacing: '0.03em' }}>
                      {col}
                    </div>
                  ))}
                </div>
                {/* 행 */}
                {riskFactors.map((rf, i) => {
                  const cfg = SEVERITY_CFG[rf.severity] ?? SEVERITY_CFG.caution;
                  return (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '110px 100px 1fr 1fr 200px', borderBottom: '1px solid var(--dash-border-faint)', borderLeft: `4px solid ${cfg.color}`, alignItems: 'flex-start' }}>
                      <div style={{ padding: '16px 18px', fontSize: '14px', fontWeight: 700, color: 'var(--dash-text)', fontFamily: 'monospace' }}>
                        {rf.category}
                      </div>
                      <div style={{ padding: '16px 18px' }}>
                        <span style={{ padding: '4px 12px', fontSize: '13px', fontWeight: 700, color: cfg.color, backgroundColor: `${cfg.color}1f`, borderRadius: '6px', whiteSpace: 'nowrap' }}>{cfg.label}</span>
                      </div>
                      <div style={{ padding: '16px 18px', fontSize: '14px', color: 'var(--dash-text)', lineHeight: 1.7, wordBreak: 'keep-all', whiteSpace: 'pre-wrap' }}>
                        {rf.clause || '—'}
                      </div>
                      <div style={{ padding: '16px 18px', fontSize: '13px', color: 'var(--dash-text-2)', lineHeight: 1.7, wordBreak: 'keep-all', whiteSpace: 'pre-wrap' }}>
                        {rf.reason || '—'}
                      </div>
                      <div style={{ padding: '16px 18px', fontSize: '13px', color: 'var(--dash-text-4)', lineHeight: 1.6, wordBreak: 'keep-all', whiteSpace: 'pre-wrap' }}>
                        {rf.source || '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 독소조항 카테고리 정의 (참조) */}
        <div style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--dash-border)' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--dash-text)', margin: '0 0 4px' }}>독소조항 카테고리 정의</h2>
            <p style={{ fontSize: '13px', color: 'var(--dash-text-4)', margin: 0 }}>AI가 RFP를 분석할 때 대조하는 16개 체크리스트 — S1~L4</p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: '900px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '70px 120px 200px 1fr 90px', backgroundColor: 'var(--dash-card-deep)', borderBottom: '1px solid var(--dash-border)' }}>
                {['코드', '분류', '항목명', '판정 기준', '기본 등급'].map((col) => (
                  <div key={col} style={{ padding: '14px 18px', fontSize: '13px', fontWeight: 700, color: 'var(--dash-text-3)', letterSpacing: '0.03em' }}>
                    {col}
                  </div>
                ))}
              </div>
              {POISON_CATEGORIES.map((c, i, arr) => {
                const cfg = SEVERITY_CFG[c.level] ?? SEVERITY_CFG.caution;
                const isFirstInGroup = i === 0 || arr[i - 1].group !== c.group;
                return (
                  <div key={c.code} style={{ display: 'grid', gridTemplateColumns: '70px 120px 200px 1fr 90px', borderBottom: '1px solid var(--dash-border-faint)', borderTop: isFirstInGroup && i > 0 ? '2px solid var(--dash-border)' : undefined, alignItems: 'flex-start' }}>
                    <div style={{ padding: '16px 18px', fontSize: '14px', fontWeight: 700, color: 'var(--dash-text)', fontFamily: 'monospace' }}>
                      {c.code}
                    </div>
                    <div style={{ padding: '16px 18px', fontSize: '13px', fontWeight: isFirstInGroup ? 600 : 400, color: isFirstInGroup ? 'var(--dash-text-2)' : 'transparent' }}>
                      {isFirstInGroup ? c.group : ''}
                    </div>
                    <div style={{ padding: '16px 18px', fontSize: '14px', fontWeight: 600, color: 'var(--dash-text)', lineHeight: 1.55, wordBreak: 'keep-all' }}>
                      {c.name}
                    </div>
                    <div style={{ padding: '16px 18px', fontSize: '13px', color: 'var(--dash-text-2)', lineHeight: 1.7, wordBreak: 'keep-all' }}>
                      {c.criteria}
                    </div>
                    <div style={{ padding: '16px 18px' }}>
                      <span style={{ padding: '4px 12px', fontSize: '12px', fontWeight: 700, color: cfg.color, backgroundColor: `${cfg.color}1f`, borderRadius: '6px', whiteSpace: 'nowrap' }}>{cfg.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        </>
        )}

        {activeTab === 'analysis' && (
        <>
        {/* AI 추출 요구사항 — 카테고리별 카드 리스트 */}
        <div style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--dash-border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--dash-text)', margin: 0 }}>AI 추출 요구사항</h2>
            {requirements.length > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 14px', borderRadius: '40px', fontSize: '14px', fontWeight: 600, backgroundColor: 'var(--badge-blue-bg)', color: '#4A7FD4' }}>
                {requirements.length}건
              </span>
            )}
          </div>
          {requirements.length === 0 ? (
            requirementsEmpty ? (
              <div style={{ padding: '32px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', textAlign: 'center' }}>
                <AlertTriangle style={{ width: '36px', height: '36px', color: '#F59E0B' }} />
                <div>
                  <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--dash-text)', margin: '0 0 6px' }}>
                    입찰공고서만 분석되어 요구사항이 추출되지 않았습니다
                  </p>
                  <p style={{ fontSize: '13px', color: 'var(--dash-text-4)', margin: 0, lineHeight: 1.65 }}>
                    상세 요구사항은 보통 <strong>제안요청서(RFP)</strong> 또는 <strong>과업지시서</strong>에 포함됩니다.<br />
                    e-발주에 자료가 올라오지 않은 공고는 입찰공고서만 분석되어 결과가 제한적일 수 있습니다.
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.hwp,.hwpx,.doc,.docx"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={handleUploadClick}
                  disabled={uploading || !onUploadAttachment}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    padding: '10px 20px',
                    backgroundColor: uploading ? 'var(--dash-card-deep)' : '#2563EB',
                    color: uploading ? 'var(--dash-text-4)' : 'white',
                    border: 'none', borderRadius: '8px',
                    fontSize: '14px', fontWeight: 600,
                    cursor: uploading ? 'wait' : 'pointer',
                  }}
                >
                  {uploading ? <Loader2 className="animate-spin" style={{ width: 16, height: 16 }} /> : <Upload style={{ width: 16, height: 16 }} />}
                  {uploading ? '업로드 중...' : 'RFP / 과업지시서 직접 업로드'}
                </button>
                <p style={{ fontSize: '12px', color: 'var(--dash-text-4)', margin: 0 }}>
                  지원 형식: PDF, HWP, HWPX, DOC, DOCX · 최대 50MB · 업로드 후 자동 재분석
                </p>
              </div>
            ) : (
              <div style={{ padding: '48px 28px', textAlign: 'center', color: 'var(--dash-text-4)', fontSize: '14px' }}>
                AI 분석 완료 후 요구사항이 표시됩니다
              </div>
            )
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <div style={{ minWidth: '900px' }}>
                {/* 테이블 헤더 */}
                <div style={{ display: 'grid', gridTemplateColumns: '170px 130px 260px 1fr', backgroundColor: 'var(--dash-card-deep)', borderBottom: '1px solid var(--dash-border)' }}>
                  {['분류', 'CODE', '요구사항 명칭', '상세 설명'].map((col) => (
                    <div key={col} style={{ padding: '14px 20px', fontSize: '13px', fontWeight: 700, color: 'var(--dash-text-3)', letterSpacing: '0.03em' }}>
                      {col}
                    </div>
                  ))}
                </div>
                {/* 행 */}
                {requirements.map((req, i) => {
                  const bg = getCategoryColor(req.category);
                  const isFirstInGroup = i === 0 || requirements[i - 1].category !== req.category;
                  return (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '170px 130px 260px 1fr', backgroundColor: bg, borderBottom: '1px solid var(--dash-border-faint)', borderTop: isFirstInGroup && i > 0 ? '2px solid var(--dash-border)' : undefined, alignItems: 'flex-start' }}>
                      <div style={{ padding: '18px 20px', fontSize: '14px', fontWeight: isFirstInGroup ? 700 : 400, color: isFirstInGroup ? 'var(--dash-text)' : 'transparent', lineHeight: 1.5, wordBreak: 'keep-all' }}>
                        {isFirstInGroup ? req.category : ''}
                      </div>
                      <div style={{ padding: '18px 20px', fontSize: '14px', fontWeight: 700, color: 'var(--dash-text)', fontFamily: 'monospace' }}>
                        {req.code}
                      </div>
                      <div style={{ padding: '18px 20px', fontSize: '15px', fontWeight: 600, color: 'var(--dash-text)', lineHeight: 1.55, wordBreak: 'keep-all' }}>
                        {req.name}
                      </div>
                      <div style={{ padding: '18px 20px', fontSize: '14px', color: 'var(--dash-text-2)', lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'keep-all' }}>
                        {req.detail || '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        </>
        )}

        {activeTab === 'outline' && (() => {
          const analysisDone = aiStatus === 'complete';
          const supported = bid.type === 'ISP' || bid.type === 'ISMP';
          const generating = outlineStatus === 'generating';
          const sections = outline?.sections as
            | { main?: Record<string, string>; outline?: Array<OutlineNode>; requirements?: Array<unknown> }
            | undefined;

          if (!analysisDone) {
            return (
              <div style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '12px', padding: '60px 28px', textAlign: 'center' }}>
                <Sparkles style={{ width: '40px', height: '40px', color: 'var(--dash-text-4)', margin: '0 auto 12px' }} />
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--dash-text)', margin: '0 0 6px' }}>AI 분석을 먼저 완료하세요</p>
                <p style={{ fontSize: '13px', color: 'var(--dash-text-4)', margin: 0 }}>분석 결과를 바탕으로 제안목차가 생성됩니다.</p>
              </div>
            );
          }
          if (!supported) {
            return (
              <div style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '12px', padding: '60px 28px', textAlign: 'center' }}>
                <ScrollText style={{ width: '40px', height: '40px', color: 'var(--dash-text-4)', margin: '0 auto 12px' }} />
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--dash-text)', margin: '0 0 6px' }}>제안목차 미지원 유형</p>
                <p style={{ fontSize: '13px', color: 'var(--dash-text-4)', margin: 0 }}>현재는 ISP / ISMP 유형만 자동 생성을 지원합니다. (이 공고: {bid.type})</p>
              </div>
            );
          }
          if (generating) {
            return (
              <div style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '12px', padding: '32px 28px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
                  <Loader2 className="animate-spin" style={{ width: '32px', height: '32px', color: '#2563EB', marginBottom: '12px' }} />
                  <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--dash-text)', margin: '0 0 4px' }}>제안목차를 생성하고 있습니다...</p>
                  <p style={{ fontSize: '13px', color: 'var(--dash-text-4)', margin: 0 }}>Gemini가 ISP/ISMP 가이드라인을 기반으로 목차를 구성 중입니다.</p>
                </div>
                {outlineLogs && outlineLogs.length > 0 && (
                  <div style={{ padding: '14px 18px', backgroundColor: 'var(--dash-card-deep)', borderRadius: '10px', border: '1px solid var(--dash-border)', maxHeight: '280px', overflowY: 'auto' }}>
                    {outlineLogs.map((log, i) => (
                      <div key={i} style={{ display: 'flex', gap: '10px', fontSize: '12px', padding: '4px 0', lineHeight: 1.6 }}>
                        <span style={{ color: 'var(--dash-text-5)', fontFamily: 'monospace', flexShrink: 0 }}>{log.time}</span>
                        <span style={{ color: log.status === 'success' ? '#22C55E' : log.status === 'error' ? '#EF4444' : 'var(--dash-text-2)' }}>{log.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          }
          if (!outline) {
            return (
              <div style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '12px', padding: '60px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <Sparkles style={{ width: '40px', height: '40px', color: '#2563EB' }} />
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--dash-text)', margin: 0 }}>아직 제안목차가 생성되지 않았습니다</p>
                <p style={{ fontSize: '13px', color: 'var(--dash-text-3)', margin: 0 }}>아래 버튼을 눌러 자동 생성을 시작하세요</p>
                <button
                  onClick={() => onRequestOutline?.(bid.id)}
                  style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 26px', borderRadius: '10px', border: 'none', backgroundColor: '#2563EB', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                >
                  <Sparkles style={{ width: '16px', height: '16px' }} />
                  제안목차 자동 생성
                </button>
              </div>
            );
          }
          // outline 존재 — 트리 + Excel 다운로드
          return (
            <>
            {/* 사업 개요 (main) */}
            {sections?.main && Object.keys(sections.main).length > 0 && (
              <div style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--dash-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--dash-text)', margin: 0 }}>사업 개요</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {onRegenerateOutline && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('현재 목차를 새 결과로 덮어씁니다. 진행할까요?')) {
                            onRegenerateOutline(bid.id);
                          }
                        }}
                        title="AI에게 목차를 다시 작성하게 합니다 (기존 결과 덮어쓰기)"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--dash-border)', backgroundColor: 'var(--dash-card)', color: 'var(--dash-text)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        <RefreshCw style={{ width: '14px', height: '14px' }} />
                        재생성
                      </button>
                    )}
                    <button
                      onClick={() => onDownloadOutline?.(bid.id)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#2563EB', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      <Download style={{ width: '14px', height: '14px' }} />
                      Excel 다운로드
                    </button>
                  </div>
                </div>
                <div>
                  {Object.entries({
                    project_name: '사업명', client: '고객명', duration: '사업기간',
                    amount: '용역금액', submit_date: '제출일', submit_place: '제출장소', notes: '비고',
                  }).map(([k, label], i, arr) => {
                    const v = sections.main?.[k];
                    if (!v) return null;
                    return (
                      <div key={k} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', borderBottom: i < arr.length - 1 ? '1px solid var(--dash-border-faint)' : undefined }}>
                        <div style={{ padding: '14px 20px', fontSize: '13px', fontWeight: 600, color: 'var(--dash-text-3)', backgroundColor: 'var(--dash-card-deep)' }}>{label}</div>
                        <div style={{ padding: '14px 24px', fontSize: '14px', color: 'var(--dash-text)', lineHeight: 1.65 }}>{v}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 목차 트리 */}
            <div style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--dash-border)' }}>
                <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--dash-text)', margin: '0 0 4px' }}>제안 목차</h2>
                <p style={{ fontSize: '13px', color: 'var(--dash-text-4)', margin: 0 }}>{outline.guidelineBase} 가이드라인 기반 · 모델: {outline.modelUsed ?? '—'}</p>
              </div>
              <div style={{ padding: '20px 28px' }}>
                {(sections?.outline ?? []).map((top, i) => (
                  <OutlineTreeNode key={i} node={top} depth={0} />
                ))}
              </div>
            </div>

            {/* RFP 원문 (요구사항 섹션 verbatim) */}
            {outline.rfpRawText && outline.rfpRawText.trim().length > 0 && (
              <div style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--dash-border)' }}>
                  <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--dash-text)', margin: '0 0 4px' }}>RFP 원문</h2>
                  <p style={{ fontSize: '13px', color: 'var(--dash-text-4)', margin: 0 }}>제안요청서 요구사항 섹션 원문 (가공·요약 없음)</p>
                </div>
                <div style={{ padding: '20px 28px' }}>
                  <pre
                    style={{
                      margin: 0,
                      padding: '16px 18px',
                      maxHeight: '560px',
                      overflowY: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      backgroundColor: 'var(--dash-card-deep)',
                      border: '1px solid var(--dash-border-faint)',
                      borderRadius: '8px',
                      fontSize: '13px',
                      lineHeight: 1.7,
                      color: 'var(--dash-text)',
                      fontFamily: '"SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                    }}
                  >
                    {outline.rfpRawText}
                  </pre>
                </div>
              </div>
            )}
            </>
          );
        })()}

        </>
      )}

    </div>
  );
}
