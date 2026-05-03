import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight, RefreshCw, Download, Building2, Calendar, AlertTriangle, FileText } from 'lucide-react';
import { type Bid, type BidFlags, getDaysUntilDeadline } from './mockData';
import { useToast } from './ToastProvider';

interface ProposalPageProps {
  bids: Bid[];
  bidFlags: Record<string, BidFlags>;
}

type OutlineNode = {
  level: number;
  no: string;
  title: string;
  pages: number;
  children?: OutlineNode[];
};

const ISP_OUTLINE: OutlineNode[] = [
  { level: 1, no: '1', title: '사업 개요', pages: 10, children: [
    { level: 2, no: '1.1', title: '사업 배경 및 목적', pages: 3 },
    { level: 2, no: '1.2', title: '사업 범위', pages: 4 },
    { level: 2, no: '1.3', title: '추진 전략', pages: 3 },
  ]},
  { level: 1, no: '2', title: '현황 분석', pages: 25, children: [
    { level: 2, no: '2.1', title: '현행 시스템 분석', pages: 8, children: [
      { level: 3, no: '2.1.1', title: '시스템 구성 현황', pages: 4 },
      { level: 3, no: '2.1.2', title: '데이터 흐름 분석', pages: 4 },
    ]},
    { level: 2, no: '2.2', title: '업무 프로세스 분석', pages: 10 },
    { level: 2, no: '2.3', title: '기술 환경 분석', pages: 7 },
  ]},
  { level: 1, no: '3', title: '목표 모델 정의', pages: 20, children: [
    { level: 2, no: '3.1', title: '미래 서비스 모델', pages: 10 },
    { level: 2, no: '3.2', title: '정보화 전략 방향', pages: 10 },
  ]},
  { level: 1, no: '4', title: '이행 계획', pages: 15, children: [
    { level: 2, no: '4.1', title: '단계별 추진 로드맵', pages: 6 },
    { level: 2, no: '4.2', title: '소요 예산 계획', pages: 5 },
    { level: 2, no: '4.3', title: '위험 관리 방안', pages: 4 },
  ]},
];

const ISMP_OUTLINE: OutlineNode[] = [
  { level: 1, no: '1', title: '사업 개요', pages: 8, children: [
    { level: 2, no: '1.1', title: '사업 배경 및 목적', pages: 4 },
    { level: 2, no: '1.2', title: '마스터플랜 수립 방향', pages: 4 },
  ]},
  { level: 1, no: '2', title: '현황 진단', pages: 20, children: [
    { level: 2, no: '2.1', title: '정보화 현황 분석', pages: 10 },
    { level: 2, no: '2.2', title: '문제점 및 개선 과제 도출', pages: 10 },
  ]},
  { level: 1, no: '3', title: '정보화 전략 수립', pages: 20, children: [
    { level: 2, no: '3.1', title: '정보화 비전 및 목표', pages: 8 },
    { level: 2, no: '3.2', title: '전략 과제 도출', pages: 12 },
  ]},
  { level: 1, no: '4', title: '중장기 로드맵', pages: 15, children: [
    { level: 2, no: '4.1', title: '단계별 추진 계획', pages: 8 },
    { level: 2, no: '4.2', title: '투자 계획', pages: 7 },
  ]},
];

function sumPages(nodes: OutlineNode[]): number {
  return nodes.reduce((sum, n) => sum + n.pages, 0);
}

function OutlineTree({ nodes, openSections, onToggle }: {
  nodes: OutlineNode[];
  openSections: Set<string>;
  onToggle: (no: string) => void;
}) {
  return (
    <>
      {nodes.map((node) => (
        <OutlineRow key={node.no} node={node} openSections={openSections} onToggle={onToggle} />
      ))}
    </>
  );
}

function OutlineRow({ node, openSections, onToggle }: {
  node: OutlineNode;
  openSections: Set<string>;
  onToggle: (no: string) => void;
}) {
  const isOpen = openSections.has(node.no);
  const hasChildren = !!node.children?.length;

  const paddingLeft = node.level === 1 ? '16px' : node.level === 2 ? '36px' : '56px';
  const fontSize = node.level === 1 ? '14px' : node.level === 2 ? '13px' : '12px';
  const fontWeight = node.level === 1 ? 600 : 400;
  const color = node.level === 3 ? 'var(--dash-text-2)' : 'var(--dash-text)';
  const bg = node.level === 1 ? 'var(--dash-card-deep)' : 'transparent';
  const paddingY = node.level === 1 ? '12px' : node.level === 2 ? '8px' : '6px';

  return (
    <>
      <div
        onClick={() => hasChildren && onToggle(node.no)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: paddingY,
          paddingBottom: paddingY,
          paddingLeft,
          paddingRight: '16px',
          fontSize,
          fontWeight,
          color,
          backgroundColor: bg,
          borderBottom: '1px solid var(--dash-border-faint)',
          cursor: hasChildren ? 'pointer' : 'default',
          transition: 'background-color 0.15s',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--dash-row-hover)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = bg; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          {hasChildren ? (
            isOpen
              ? <ChevronDown style={{ width: '14px', height: '14px', flexShrink: 0, color: 'var(--dash-text-4)' }} />
              : <ChevronRight style={{ width: '14px', height: '14px', flexShrink: 0, color: 'var(--dash-text-4)' }} />
          ) : (
            <span style={{ width: '14px', flexShrink: 0 }} />
          )}
          <span style={{ color: 'var(--dash-text-4)', marginRight: '4px', flexShrink: 0 }}>{node.no}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.title}</span>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--dash-text-4)', flexShrink: 0, marginLeft: '12px' }}>
          약 {node.pages}p
        </span>
      </div>
      {hasChildren && isOpen && (
        <OutlineTree nodes={node.children!} openSections={openSections} onToggle={onToggle} />
      )}
    </>
  );
}

export function ProposalPage({ bids, bidFlags }: ProposalPageProps) {
  const { showToast } = useToast();
  const inProgressBids = bids.filter((b) => bidFlags[b.id]?.inProgress ?? false);

  const [selectedBidId, setSelectedBidId] = useState<string>(inProgressBids[0]?.id ?? '');
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['1', '2', '3', '4']));

  const selectedBid = inProgressBids.find((b) => b.id === selectedBidId) ?? null;
  const isSupportedType = selectedBid?.type === 'ISP' || selectedBid?.type === 'ISMP';
  const outline = selectedBid?.type === 'ISMP' ? ISMP_OUTLINE : ISP_OUTLINE;
  const totalPages = sumPages(outline);

  const toggleSection = (no: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(no) ? next.delete(no) : next.add(no);
      return next;
    });
  };

  if (inProgressBids.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <PageHeader />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.15)' }}>
            <BookOpen style={{ width: '28px', height: '28px', color: '#2563EB' }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--dash-text-2)', marginBottom: '6px' }}>진행하기로 설정된 공고가 없습니다</div>
            <div style={{ fontSize: '13px', color: 'var(--dash-text-5)' }}>공고 목록에서 진행하기를 눌러 추가하세요</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader />

      {/* 사업 선택 */}
      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--dash-text-3)', marginBottom: '8px' }}>
          사업 선택
        </label>
        <select
          value={selectedBidId}
          onChange={(e) => setSelectedBidId(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid var(--dash-border-med)',
            backgroundColor: 'var(--dash-input-bg)',
            color: 'var(--dash-text)',
            fontSize: '13px',
            width: '100%',
            maxWidth: '480px',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          {inProgressBids.map((b) => (
            <option key={b.id} value={b.id}>{b.title}</option>
          ))}
        </select>
      </div>

      {/* 공고 기본 정보 카드 */}
      {selectedBid && (
        <div style={{ borderRadius: '12px', backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', padding: '16px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <InfoCell label="공고명" value={selectedBid.title} truncate />
            <InfoCell label="발주기관" value={selectedBid.agency} icon={<Building2 style={{ width: '12px', height: '12px', color: 'var(--dash-icon-off)' }} />} />
            <InfoCell label="사업 유형" value={selectedBid.type} highlight={isSupportedType} />
            <InfoCell label="마감일" value={selectedBid.deadline.substring(5)} icon={<Calendar style={{ width: '12px', height: '12px', color: 'var(--dash-icon-off)' }} />} dday={getDaysUntilDeadline(selectedBid.deadline)} />
          </div>

          {!isSupportedType && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '14px', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)' }}>
              <AlertTriangle style={{ width: '15px', height: '15px', color: '#F97316', flexShrink: 0 }} />
              <span style={{ fontSize: '13px', color: '#F97316' }}>해당 사업 유형은 아직 학습된 제안목차 템플릿이 없습니다</span>
            </div>
          )}
        </div>
      )}

      {/* 목차 트리 */}
      {selectedBid && isSupportedType && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRadius: '12px', backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', overflow: 'hidden' }}>
          {/* 트리 헤더 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderBottom: '1px solid var(--dash-border)', flexShrink: 0, backgroundColor: 'var(--dash-card-deep)' }}>
            <FileText style={{ width: '14px', height: '14px', color: '#2563EB' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--dash-text)' }}>
              {selectedBid.type} 제안목차
            </span>
            <span style={{ fontSize: '11px', padding: '1px 8px', borderRadius: '9999px', backgroundColor: 'rgba(37,99,235,0.12)', color: '#2563EB' }}>
              {outline.length}개 장
            </span>
          </div>

          {/* 트리 본문 */}
          <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'var(--dash-scrollbar) transparent' }}>
            <OutlineTree nodes={outline} openSections={openSections} onToggle={toggleSection} />
          </div>

          {/* 하단 액션 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--dash-border)', flexShrink: 0 }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--dash-text-2)' }}>
              총 약 <span style={{ color: '#2563EB' }}>{totalPages}p</span>
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => showToast('info', '목차 재생성', '목차 재생성 기능은 백엔드 연동 후 사용 가능합니다')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', fontSize: '13px', color: 'var(--dash-text-2)', backgroundColor: 'var(--dash-input-bg)', border: '1px solid var(--dash-border-btn)', cursor: 'pointer', transition: 'background-color 0.15s' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--dash-hover)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--dash-input-bg)'; }}
              >
                <RefreshCw style={{ width: '13px', height: '13px' }} />
                목차 재생성
              </button>
              <button
                onClick={() => showToast('info', '다운로드', '다운로드 기능은 백엔드 연동 후 사용 가능합니다')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', fontSize: '13px', color: 'var(--dash-text-2)', backgroundColor: 'var(--dash-input-bg)', border: '1px solid var(--dash-border-btn)', cursor: 'pointer', transition: 'background-color 0.15s' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--dash-hover)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--dash-input-bg)'; }}
              >
                <Download style={{ width: '13px', height: '13px' }} />
                엑셀 다운로드
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PageHeader() {
  return (
    <div>
      <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--dash-text)', marginBottom: '4px' }}>제안목차</h1>
      <p style={{ fontSize: '13px', color: 'var(--dash-text-3)' }}>진행 중인 사업의 제안목차를 자동 생성합니다</p>
    </div>
  );
}

function InfoCell({ label, value, icon, truncate, highlight, dday }: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  truncate?: boolean;
  highlight?: boolean;
  dday?: number;
}) {
  return (
    <div>
      <div style={{ fontSize: '11px', color: 'var(--dash-text-5)', marginBottom: '4px' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {icon}
        <span style={{
          fontSize: '13px',
          fontWeight: 500,
          color: highlight ? '#2563EB' : 'var(--dash-text)',
          overflow: truncate ? 'hidden' : undefined,
          textOverflow: truncate ? 'ellipsis' : undefined,
          whiteSpace: truncate ? 'nowrap' : undefined,
        }}>
          {value}
        </span>
        {dday !== undefined && (
          <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '9999px', backgroundColor: dday <= 3 ? 'rgba(239,68,68,0.15)' : 'rgba(37,99,235,0.1)', color: dday <= 3 ? '#EF4444' : '#60A5FA' }}>
            {dday >= 0 ? `D-${dday}` : `D+${Math.abs(dday)}`}
          </span>
        )}
      </div>
    </div>
  );
}
