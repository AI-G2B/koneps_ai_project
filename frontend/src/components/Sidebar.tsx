import {
  LayoutDashboard, FileText, BrainCircuit, BookOpen,
  Settings, Building2, ChevronRight, HelpCircle, BarChart3, TrendingUp,
} from 'lucide-react';
import type { UserRole } from './LoginPage';
import type { PageType } from '../App';

const MANAGER_NAV: { icon: React.ElementType; label: PageType; badge?: string }[] = [
  { icon: LayoutDashboard, label: '대시보드' },
  { icon: FileText, label: '공고 목록', badge: '47' },
  { icon: BrainCircuit, label: 'AI 분석', badge: '3' },
  { icon: BookOpen, label: '제안목차' },
];

const CEO_NAV: { icon: React.ElementType; label: PageType }[] = [
  { icon: LayoutDashboard, label: '대시보드' },
  { icon: BarChart3, label: '현황 요약' },
  { icon: TrendingUp, label: '전략 리포트' },
];

const BOTTOM_NAV: { icon: React.ElementType; label: PageType }[] = [
  { icon: Settings, label: '설정' },
  { icon: HelpCircle, label: '도움말' },
];

interface SidebarProps {
  role: UserRole;
  activePage: PageType;
  onNavigate: (page: PageType) => void;
}

export function Sidebar({ role, activePage, onNavigate }: SidebarProps) {
  const navItems = role === 'ceo' ? CEO_NAV : MANAGER_NAV;
  const accentColor = role === 'ceo' ? '#7C3AED' : '#2563EB';
  const accentBg = role === 'ceo' ? 'rgba(124,58,237,0.15)' : 'rgba(37,99,235,0.15)';
  const badgeBg = role === 'ceo' ? 'rgba(124,58,237,0.2)' : 'rgba(37,99,235,0.2)';
  const logoGradient = role === 'ceo'
    ? 'linear-gradient(135deg, #7C3AED, #5B21B6)'
    : 'linear-gradient(135deg, #2563EB, #1D4ED8)';

  const NavButton = ({ item }: { item: { icon: React.ElementType; label: PageType; badge?: string } }) => {
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
        {item.badge && (
          <span className="flex-shrink-0 flex items-center justify-center rounded-full" style={{ fontSize: '10px', padding: '1px 6px', backgroundColor: isActive ? accentColor : badgeBg, color: isActive ? 'white' : accentColor, minWidth: '20px' }}>
            {item.badge}
          </span>
        )}
        {isActive && <ChevronRight style={{ width: '12px', height: '12px', color: accentColor, flexShrink: 0 }} />}
      </button>
    );
  };

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
        <span className="inline-flex items-center rounded-md" style={{ fontSize: '10px', padding: '3px 8px', backgroundColor: role === 'ceo' ? 'rgba(124,58,237,0.12)' : 'rgba(37,99,235,0.12)', color: accentColor, border: `1px solid ${role === 'ceo' ? 'rgba(124,58,237,0.25)' : 'rgba(37,99,235,0.25)'}`, fontWeight: 500 }}>
          {role === 'ceo' ? 'CEO 모드' : '담당자 모드'}
        </span>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-3 pt-2 overflow-y-auto">
        <div style={{ fontSize: '10px', color: 'var(--dash-text-5)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 8px', marginBottom: '8px' }}>메인 메뉴</div>
        <div className="space-y-0.5">
          {navItems.map((item) => <NavButton key={item.label} item={item} />)}
        </div>

        <div style={{ fontSize: '10px', color: 'var(--dash-text-5)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 8px', margin: '20px 0 8px' }}>시스템</div>
        <div className="space-y-0.5">
          {BOTTOM_NAV.map((item) => <NavButton key={item.label} item={item} />)}
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
