import {
  LayoutDashboard, FileText, Bookmark, Briefcase, Sparkles,
  ClipboardList, Settings, RefreshCw, Download, BookOpen,
  FolderOpen,
} from 'lucide-react';

const SECTION_CARD: React.CSSProperties = {
  backgroundColor: 'var(--dash-card)',
  border: '1px solid var(--dash-border)',
  borderRadius: '12px',
  padding: '20px',
  marginBottom: '16px',
};

const SECTION_TITLE: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: 'var(--dash-text)',
  borderBottom: '1px solid var(--dash-border)',
  paddingBottom: '10px',
  marginBottom: '14px',
  margin: '0 0 14px',
};

function Row({ children, last = false }: { children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '12px',
      padding: '8px 0',
      borderBottom: last ? 'none' : '1px solid var(--dash-border-faint)',
    }}>
      {children}
    </div>
  );
}

function IconBox({ icon: Icon, color, bg }: { icon: React.ElementType; color: string; bg: string }) {
  return (
    <div style={{ width: '28px', height: '28px', borderRadius: '7px', backgroundColor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon style={{ width: '14px', height: '14px', color }} />
    </div>
  );
}

function Badge({ label, color, bg, border }: { label: string; color: string; bg: string; border?: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '40px', fontSize: '12px', backgroundColor: bg, color, border: border ? `1px solid ${border}` : undefined, whiteSpace: 'nowrap', flexShrink: 0 }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: color, display: 'inline-block', flexShrink: 0 }} />
      {label}
    </span>
  );
}

export function HelpPage() {
  const MENUS = [
    { icon: LayoutDashboard, color: '#2563EB', bg: 'rgba(37,99,235,0.1)',   label: '대시보드',          desc: '수집된 공고 현황 및 마감일 캘린더 확인' },
    { icon: FileText,        color: '#2563EB', bg: 'rgba(37,99,235,0.1)',   label: '공고 목록',          desc: '나라장터에서 수집된 전체 ISP/ISMP 공고 목록' },
    { icon: Bookmark,        color: '#2563EB', bg: 'rgba(37,99,235,0.1)',   label: '관심 공고',          desc: '관심공고로 등록한 공고 목록' },
    { icon: FolderOpen,      color: '#22C55E', bg: 'rgba(34,197,94,0.1)',   label: '진행 프로젝트',      desc: '진행 등록한 공고 및 제안 준비 현황' },
    { icon: Sparkles,        color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  label: 'AI 분석',            desc: '공고별 AI 분석 결과 및 독소조항 확인' },
    { icon: ClipboardList,   color: '#F97316', bg: 'rgba(249,115,22,0.1)',  label: '진행 프로젝트 현황', desc: '진행 중인 공고의 체크리스트 관리 (고도화 예정)' },
    { icon: Settings,        color: '#475569', bg: 'rgba(71,85,105,0.1)',   label: '설정',               desc: '선호/기피 발주기관 설정' },
  ];

  const BUTTONS = [
    { icon: RefreshCw,    color: '#2563EB', bg: 'rgba(37,99,235,0.1)',  label: '동기화',          desc: '나라장터에서 최신 공고를 수집합니다' },
    { icon: Sparkles,     color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', label: 'AI 분석 시작',    desc: '공고 문서를 AI로 분석하여 핵심 항목과 독소조항을 추출합니다' },
    { icon: BookOpen,     color: '#7C3AED', bg: 'rgba(124,58,237,0.1)', label: '제안목차 생성',   desc: 'AI 분석 결과를 바탕으로 ISP/ISMP 제안목차 초안을 생성합니다' },
    { icon: Download,     color: '#2563EB', bg: 'rgba(37,99,235,0.1)',  label: '리포트 다운로드', desc: 'AI 분석 결과 전체를 PDF로 저장합니다' },
    { icon: Bookmark,     color: '#2563EB', bg: 'rgba(37,99,235,0.1)',  label: '관심공고 추가',   desc: '공고를 관심목록에 등록합니다' },
    { icon: FolderOpen,   color: '#22C55E', bg: 'rgba(34,197,94,0.1)',  label: '진행 등록',       desc: '공고를 진행 프로젝트로 등록하고 AI 분석을 시작합니다' },
  ];

  const AI_ITEMS = [
    { label: '예산규모',   desc: 'AI가 공고 문서에서 추출한 사업 예산' },
    { label: '수행기간',   desc: '사업 수행 기간' },
    { label: '평가방식',   desc: '기술/가격 평가 비율' },
    { label: '사업목적',   desc: '사업의 주요 목적 및 범위' },
    { label: '납품방식',   desc: '결과물 납품 방법' },
    { label: '기술요건',   desc: '주요 기술 요구사항' },
    { label: '입찰방식',   desc: '입찰 자격 및 방식' },
    { label: '보안요건',   desc: '보안 관련 요구사항' },
  ];

  const POISON_CATS = [
    { code: 'S', label: '과업 범위', desc: '백지수표형 과업, 과도한 산출물 요구 등' },
    { code: 'P', label: '대가/지급', desc: '부당한 지급 조건, 과도한 지체상금 등' },
    { code: 'C', label: '계약 조건', desc: '불합리한 계약 변경 조건 등' },
    { code: 'L', label: '법률/지재권', desc: '지식재산권 독점 귀속, 물리적 하드디스크 압수 등' },
  ];

  return (
    <div style={{ width: '100%' }}>
      {/* 헤더 */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--dash-text)', margin: '0 0 4px' }}>도움말</h1>
        <p style={{ fontSize: '13px', color: 'var(--dash-text-3)', margin: 0 }}>플랫폼 사용 방법 및 주요 기능 안내</p>
      </div>

      {/* 섹션 1: 메뉴 안내 */}
      <div style={SECTION_CARD}>
        <h2 style={SECTION_TITLE}>메뉴 안내</h2>
        {MENUS.map((item, i) => (
          <Row key={item.label} last={i === MENUS.length - 1}>
            <IconBox icon={item.icon} color={item.color} bg={item.bg} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--dash-text)', marginBottom: '2px' }}>{item.label}</div>
              <div style={{ fontSize: '12px', color: 'var(--dash-text-3)' }}>{item.desc}</div>
            </div>
          </Row>
        ))}
      </div>

      {/* 섹션 2: 배지 설명 */}
      <div style={SECTION_CARD}>
        <h2 style={SECTION_TITLE}>배지 및 상태 표시</h2>

        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--dash-text-3)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>공고 유형</div>
        <Row>
          <Badge label="ISP" color="#60A5FA" bg="rgba(37,99,235,0.12)" />
          <span style={{ fontSize: '12px', color: 'var(--dash-text-3)', paddingTop: '4px' }}>정보화전략계획 공고</span>
        </Row>
        <Row>
          <Badge label="ISMP" color="#A78BFA" bg="rgba(124,58,237,0.12)" />
          <span style={{ fontSize: '12px', color: 'var(--dash-text-3)', paddingTop: '4px' }}>정보시스템마스터플랜 공고</span>
        </Row>

        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--dash-text-3)', margin: '14px 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>마감일 배지</div>
        <Row><Badge label="D-3 이내" color="#F27A75" bg="var(--badge-red-bg)" /><span style={{ fontSize: '12px', color: 'var(--dash-text-3)', paddingTop: '4px' }}>마감 임박</span></Row>
        <Row><Badge label="D-7 이내" color="#FFC379" bg="var(--badge-orange-bg)" /><span style={{ fontSize: '12px', color: 'var(--dash-text-3)', paddingTop: '4px' }}>마감 주의</span></Row>
        <Row><Badge label="D-7 초과" color="#60A5FA" bg="rgba(37,99,235,0.1)" /><span style={{ fontSize: '12px', color: 'var(--dash-text-3)', paddingTop: '4px' }}>여유 있음</span></Row>
        <Row><Badge label="마감" color="#81878F" bg="var(--badge-gray-bg)" /><span style={{ fontSize: '12px', color: 'var(--dash-text-3)', paddingTop: '4px' }}>마감일 경과</span></Row>

        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--dash-text-3)', margin: '14px 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>상태 아이콘 (공고명 옆)</div>
        <Row>
          <span style={{ fontSize: '12px', color: '#2563EB', fontWeight: 700, paddingTop: '2px' }}>★ (Bookmark)</span>
          <span style={{ fontSize: '12px', color: 'var(--dash-text-3)', paddingTop: '2px' }}>파란색 — 관심공고 등록됨</span>
        </Row>
        <Row last>
          <span style={{ fontSize: '12px', color: '#22C55E', fontWeight: 700, paddingTop: '2px' }}>▶ (Play)</span>
          <span style={{ fontSize: '12px', color: 'var(--dash-text-3)', paddingTop: '2px' }}>초록색 — 진행 프로젝트 등록됨</span>
        </Row>

        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--dash-text-3)', margin: '14px 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>위험도 배지</div>
        <Row><Badge label="위험" color="#F27A75" bg="var(--badge-red-bg)" /><span style={{ fontSize: '12px', color: 'var(--dash-text-3)', paddingTop: '4px' }}>즉시 검토 필요한 독소조항 존재</span></Row>
        <Row><Badge label="주의" color="#FFC379" bg="var(--badge-orange-bg)" /><span style={{ fontSize: '12px', color: 'var(--dash-text-3)', paddingTop: '4px' }}>검토 권장 항목 존재</span></Row>
        <Row last><Badge label="양호" color="#5BC37E" bg="var(--badge-green-bg)" /><span style={{ fontSize: '12px', color: 'var(--dash-text-3)', paddingTop: '4px' }}>독소조항 없음</span></Row>
      </div>

      {/* 섹션 3: 주요 버튼 */}
      <div style={SECTION_CARD}>
        <h2 style={SECTION_TITLE}>주요 버튼 설명</h2>
        {BUTTONS.map((btn, i) => (
          <Row key={btn.label} last={i === BUTTONS.length - 1}>
            <IconBox icon={btn.icon} color={btn.color} bg={btn.bg} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--dash-text)', marginBottom: '2px' }}>{btn.label}</div>
              <div style={{ fontSize: '12px', color: 'var(--dash-text-3)' }}>{btn.desc}</div>
            </div>
          </Row>
        ))}
      </div>

      {/* 섹션 4: AI 분석 결과 */}
      <div style={SECTION_CARD}>
        <h2 style={SECTION_TITLE}>AI 분석 결과 항목</h2>

        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--dash-text-3)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>핵심 항목</div>
        {AI_ITEMS.map((item, i) => (
          <Row key={item.label} last={i === AI_ITEMS.length - 1}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--dash-text)', minWidth: '72px', flexShrink: 0, paddingTop: '1px' }}>{item.label}</span>
            <span style={{ fontSize: '12px', color: 'var(--dash-text-3)' }}>{item.desc}</span>
          </Row>
        ))}

        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--dash-text-3)', margin: '14px 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>독소조항 카테고리</div>
        {POISON_CATS.map((cat, i) => (
          <Row key={cat.code} last={i === POISON_CATS.length - 1}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#EF4444', backgroundColor: 'rgba(239,68,68,0.1)', padding: '1px 7px', borderRadius: '5px', flexShrink: 0 }}>{cat.code}</span>
            <div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--dash-text)', marginRight: '8px' }}>{cat.label}</span>
              <span style={{ fontSize: '12px', color: 'var(--dash-text-3)' }}>{cat.desc}</span>
            </div>
          </Row>
        ))}
      </div>
    </div>
  );
}
