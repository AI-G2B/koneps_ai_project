import {
  LayoutDashboard, FileText, Sparkles, BarChart2,
  Settings, HelpCircle, ChevronRight, TrendingUp,
  Bookmark, Briefcase, ShieldCheck, AlertTriangle, Activity, PanelLeftClose,
} from 'lucide-react';
import type { UserRole } from './LoginPage';
import type { PageType } from '../App';

type NavItem = { icon: React.ElementType; label: PageType; badge?: string; upcomingBadge?: true };
type NavSection = { label?: string; items: NavItem[] };

const MANAGER_SECTIONS: NavSection[] = [
  {
    items: [{ icon: LayoutDashboard, label: '대시보드' }],
  },
  {
    label: '공고 관리',
    items: [
      { icon: FileText, label: '공고 목록', badge: '47' },
      { icon: Bookmark, label: '관심 공고' },
      { icon: Briefcase, label: '진행 프로젝트' },
    ],
  },
  {
    label: '분석',
    items: [
      { icon: Sparkles, label: 'AI 분석', badge: '3' },
      { icon: BarChart2, label: '진행 프로젝트 현황', upcomingBadge: true },
    ],
  },
];

const CEO_SECTIONS: NavSection[] = [
  {
    items: [
      { icon: LayoutDashboard, label: '대시보드' },
      { icon: Briefcase, label: '진행 프로젝트' },
      { icon: TrendingUp, label: '전략 리포트' },
    ],
  },
];

const PROPOSAL_SECTIONS: NavSection[] = [
  {
    label: '공고 관리',
    items: [{ icon: Briefcase, label: '진행 프로젝트' }],
  },
  {
    label: '분석',
    items: [
      { icon: BarChart2, label: '진행 프로젝트 현황', upcomingBadge: true },
      { icon: Sparkles, label: 'AI 분석' },
    ],
  },
];

const ADMIN_SECTIONS: NavSection[] = [
  {
    items: [{ icon: LayoutDashboard, label: '대시보드' }],
  },
  {
    label: '시스템 관리자 설정',
    items: [
      { icon: ShieldCheck, label: 'LLM 설정' },
      { icon: AlertTriangle, label: '독소조항 설정' },
      { icon: Activity, label: '시스템 현황' },
    ],
  },
];

const SYSTEM_ITEMS: NavItem[] = [
  { icon: Settings, label: '설정' },
  { icon: HelpCircle, label: '도움말' },
];

interface SidebarProps {
  role: UserRole;
  activePage: PageType;
  onNavigate: (page: PageType) => void;
  onToggle?: () => void;
  analysisCompleteCount?: number;
  totalBidCount?: number;
  lastSyncTime?: Date | null;
}

export function Sidebar({ role, activePage, onNavigate, onToggle, analysisCompleteCount = 0, totalBidCount = 0, lastSyncTime }: SidebarProps) {
  const sections = role === 'admin' ? ADMIN_SECTIONS : role === 'ceo' ? CEO_SECTIONS : role === 'proposal' ? PROPOSAL_SECTIONS : MANAGER_SECTIONS;
  const accentColor = role === 'admin' ? '#475569' : role === 'ceo' ? '#7C3AED' : role === 'proposal' ? '#0891B2' : '#2563EB';
  const accentBg = role === 'admin' ? 'rgba(71,85,105,0.15)' : role === 'ceo' ? 'rgba(124,58,237,0.15)' : role === 'proposal' ? 'rgba(8,145,178,0.15)' : 'rgba(37,99,235,0.15)';
  const badgeBg = role === 'admin' ? 'rgba(71,85,105,0.2)' : role === 'ceo' ? 'rgba(124,58,237,0.2)' : role === 'proposal' ? 'rgba(8,145,178,0.2)' : 'rgba(37,99,235,0.2)';
  const logoGradient = role === 'admin'
    ? 'linear-gradient(135deg, #475569, #334155)'
    : role === 'ceo'
    ? 'linear-gradient(135deg, #7C3AED, #5B21B6)'
    : role === 'proposal'
    ? 'linear-gradient(135deg, #0891B2, #0E7490)'
    : 'linear-gradient(135deg, #2563EB, #1D4ED8)';
  const roleLabel = role === 'admin' ? '시스템 관리자' : role === 'ceo' ? '경영진 모드' : role === '영업담당자' ? '영업대표 모드' : role === 'proposal' ? '제안 PM 모드' : '제안 PM 모드';
  const roleBadgeBg = role === 'admin' ? 'rgba(71,85,105,0.12)' : role === 'ceo' ? 'rgba(124,58,237,0.12)' : role === 'proposal' ? 'rgba(8,145,178,0.12)' : 'rgba(37,99,235,0.12)';
  const roleBadgeBorder = role === 'admin' ? 'rgba(71,85,105,0.25)' : role === 'ceo' ? 'rgba(124,58,237,0.25)' : role === 'proposal' ? 'rgba(8,145,178,0.25)' : 'rgba(37,99,235,0.25)';

  const NavButton = ({ item }: { item: NavItem }) => {
    const isActive = activePage === item.label;
    return (
      <button
        onClick={() => onNavigate(item.label)}
        className="w-full flex items-center gap-3 rounded-lg text-left transition-all"
        style={{ padding: '9px 10px', backgroundColor: isActive ? accentBg : 'transparent', color: isActive ? 'var(--dash-text)' : 'var(--dash-text-2)' }}
        onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--dash-item-bg-alt)'; }}
        onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
      >
        <item.icon style={{ width: '16px', height: '16px', flexShrink: 0, color: isActive ? accentColor : 'var(--dash-icon-off)' }} />
        <span style={{ flex: 1, fontSize: '13px', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
        {(item.badge || item.label === 'AI 분석' || item.label === '공고 목록') && (
          <span className="flex-shrink-0 flex items-center justify-center rounded-full" style={{ fontSize: '10px', padding: '1px 6px', backgroundColor: isActive ? accentColor : badgeBg, color: isActive ? 'white' : accentColor, minWidth: '20px' }}>
            {item.label === 'AI 분석' ? analysisCompleteCount : item.label === '공고 목록' ? totalBidCount : item.badge}
          </span>
        )}
        {isActive && <ChevronRight style={{ width: '12px', height: '12px', color: accentColor, flexShrink: 0 }} />}
      </button>
    );
  };

  const SectionLabel = ({ label }: { label: string }) => (
    <div style={{ fontSize: '10px', color: 'var(--dash-text-5)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 8px', margin: '20px 0 8px' }}>
      {label}
    </div>
  );

  return (
    <div className="w-[220px] flex-shrink-0 flex flex-col h-full" style={{ backgroundColor: 'var(--dash-surface)', borderRight: '1px solid var(--dash-border)' }}>
      {/* Logo / 사이드바 토글 */}
      <button
        onClick={() => onToggle?.()}
        className="h-14 flex items-center px-4 gap-3 flex-shrink-0 w-full text-left"
        style={{ borderBottom: '1px solid var(--dash-border)', cursor: 'pointer', background: 'none', transition: 'background-color 0.15s' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--dash-item-bg-alt)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
        title="사이드바 숨기기"
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden p-0.6" style={{ background: logoGradient }}>
          <img src="/logo.png" alt="로고" className="w-full h-full object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <div style={{ fontSize: '10px', color: 'var(--dash-text-4)', lineHeight: 1 }}>나라장터</div>
          <div style={{ fontSize: '13px', color: 'var(--dash-text)', fontWeight: 600, lineHeight: 1.3 }}>AI 입찰 분석</div>
        </div>
        <PanelLeftClose style={{ width: '15px', height: '15px', color: 'var(--dash-text-5)', flexShrink: 0 }} />
      </button>


      {/* Main Nav */}
      <nav className="flex-1 px-3 pt-2 overflow-y-auto">
        {sections.map((section, idx) => (
          <div key={idx}>
            {section.label
              ? <SectionLabel label={section.label} />
              : idx > 0 && <div style={{ marginTop: '20px' }} />}
            <div className="space-y-0.5">
              {section.items.map((item) => <NavButton key={item.label} item={item} />)}
            </div>
          </div>
        ))}

        {role !== 'admin' && (
          <>
            <SectionLabel label="시스템" />
            <div className="space-y-0.5">
              {SYSTEM_ITEMS.map((item) => <NavButton key={item.label} item={item} />)}
            </div>
          </>
        )}
      </nav>

      {/* Status Footer */}
      <div className="flex-shrink-0 px-4 py-3" style={{ borderTop: '1px solid var(--dash-border)' }}>
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#22C55E', boxShadow: '0 0 6px #22C55E' }} />
          <span style={{ fontSize: '11px', color: '#22C55E' }}>실시간 연동 중</span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--dash-text-5)' }}>나라장터 G2B · v2.4.1</div>
        <div style={{ fontSize: '10px', color: 'var(--dash-text-6)', marginTop: '2px' }}>
          최종 동기화: {lastSyncTime ? lastSyncTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '—'}
        </div>
      </div>
    </div>
  );
}
