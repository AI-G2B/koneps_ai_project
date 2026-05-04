import {
  LayoutDashboard, FileText, Sparkles, BookOpen,
  Settings, Building2, ChevronRight, HelpCircle, TrendingUp,
  Bookmark, Briefcase,
} from 'lucide-react';
import type { UserRole } from './LoginPage';
import type { PageType } from '../App';

type NavItem = { icon: React.ElementType; label: PageType; badge?: string };
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
      { icon: BookOpen, label: '제안목차' },
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
      { icon: BookOpen, label: '제안목차' },
      { icon: Sparkles, label: 'AI 분석' },
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
  analysisCompleteCount?: number;
  totalBidCount?: number;
}

export function Sidebar({ role, activePage, onNavigate, analysisCompleteCount = 0, totalBidCount = 0 }: SidebarProps) {
  const sections = role === 'ceo' ? CEO_SECTIONS : role === 'proposal' ? PROPOSAL_SECTIONS : MANAGER_SECTIONS;
  const accentColor = role === 'ceo' ? '#7C3AED' : role === 'proposal' ? '#0891B2' : '#2563EB';
  const accentBg = role === 'ceo' ? 'rgba(124,58,237,0.15)' : role === 'proposal' ? 'rgba(8,145,178,0.15)' : 'rgba(37,99,235,0.15)';
  const badgeBg = role === 'ceo' ? 'rgba(124,58,237,0.2)' : role === 'proposal' ? 'rgba(8,145,178,0.2)' : 'rgba(37,99,235,0.2)';
  const logoGradient = role === 'ceo'
    ? 'linear-gradient(135deg, #7C3AED, #5B21B6)'
    : role === 'proposal'
    ? 'linear-gradient(135deg, #0891B2, #0E7490)'
    : 'linear-gradient(135deg, #2563EB, #1D4ED8)';
  const roleLabel = role === 'ceo' ? 'CEO 모드' : role === 'proposal' ? '제안팀 모드' : '담당자 모드';
  const roleBadgeBg = role === 'ceo' ? 'rgba(124,58,237,0.12)' : role === 'proposal' ? 'rgba(8,145,178,0.12)' : 'rgba(37,99,235,0.12)';
  const roleBadgeBorder = role === 'ceo' ? 'rgba(124,58,237,0.25)' : role === 'proposal' ? 'rgba(8,145,178,0.25)' : 'rgba(37,99,235,0.25)';

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
        <span style={{ flex: 1, fontSize: '13px' }}>{item.label}</span>
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
      {/* Logo */}
      <div className="h-14 flex items-center px-4 gap-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--dash-border)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: logoGradient }}>
          <Building2 style={{ width: '16px', height: '16px', color: 'white' }} />
        </div>
        <div className="min-w-0">
          <div style={{ fontSize: '10px', color: 'var(--dash-text-4)', lineHeight: 1 }}>나라장터</div>
          <div style={{ fontSize: '13px', color: 'var(--dash-text)', fontWeight: 600, lineHeight: 1.3 }}>AI 입찰 분석</div>
        </div>
      </div>

      {/* Role badge */}
      <div style={{ padding: '10px 12px 4px' }}>
        <span className="inline-flex items-center rounded-md" style={{ fontSize: '10px', padding: '3px 8px', backgroundColor: roleBadgeBg, color: accentColor, border: `1px solid ${roleBadgeBorder}`, fontWeight: 500 }}>
          {roleLabel}
        </span>
      </div>

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

        <SectionLabel label="시스템" />
        <div className="space-y-0.5">
          {SYSTEM_ITEMS.map((item) => <NavButton key={item.label} item={item} />)}
        </div>
      </nav>

      {/* Status Footer */}
      <div className="flex-shrink-0 px-4 py-3" style={{ borderTop: '1px solid var(--dash-border)' }}>
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#22C55E', boxShadow: '0 0 6px #22C55E' }} />
          <span style={{ fontSize: '11px', color: '#22C55E' }}>실시간 연동 중</span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--dash-text-5)' }}>나라장터 G2B · v2.4.1</div>
        <div style={{ fontSize: '10px', color: 'var(--dash-text-6)', marginTop: '2px' }}>최종 동기화: 09:20 AM</div>
      </div>
    </div>
  );
}
