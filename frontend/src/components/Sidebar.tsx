import { useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  BrainCircuit,
  BookOpen,
  Settings,
  Building2,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: '대시보드', badge: null, active: true },
  { icon: FileText, label: '공고 목록', badge: '47', active: false },
  { icon: BrainCircuit, label: 'AI 분석', badge: '3', active: false },
  { icon: BookOpen, label: '제안목차', badge: null, active: false },
];

const bottomNavItems = [
  { icon: Settings, label: '설정', active: false },
  { icon: HelpCircle, label: '도움말', active: false },
];

export function Sidebar() {
  const [activeItem, setActiveItem] = useState('대시보드');

  return (
    <div
      className="w-[220px] flex-shrink-0 flex flex-col h-full"
      style={{
        backgroundColor: 'var(--dash-surface)',
        borderRight: '1px solid var(--dash-border)',
      }}
    >
      {/* Logo */}
      <div
        className="h-14 flex items-center px-4 gap-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--dash-border)' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)' }}
        >
          <Building2 style={{ width: '16px', height: '16px', color: 'white' }} />
        </div>
        <div className="min-w-0">
          <div style={{ fontSize: '10px', color: 'var(--dash-text-4)', lineHeight: 1 }}>나라장터</div>
          <div style={{ fontSize: '13px', color: 'var(--dash-text)', fontWeight: 600, lineHeight: 1.3 }}>AI 입찰 분석</div>
        </div>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-3 pt-4 overflow-y-auto">
        <div
          style={{ fontSize: '10px', color: 'var(--dash-text-5)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 8px', marginBottom: '8px' }}
        >
          메인 메뉴
        </div>
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = activeItem === item.label;
            return (
              <button
                key={item.label}
                onClick={() => setActiveItem(item.label)}
                className="w-full flex items-center gap-3 rounded-lg text-left transition-all"
                style={{
                  padding: '9px 10px',
                  backgroundColor: isActive ? 'rgba(37,99,235,0.15)' : 'transparent',
                  color: isActive ? 'var(--dash-text)' : 'var(--dash-text-2)',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--dash-item-bg-alt)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                }}
              >
                <item.icon
                  style={{
                    width: '16px',
                    height: '16px',
                    flexShrink: 0,
                    color: isActive ? '#2563EB' : 'var(--dash-icon-off)',
                  }}
                />
                <span style={{ flex: 1, fontSize: '13px' }}>{item.label}</span>
                {item.badge && (
                  <span
                    className="flex-shrink-0 flex items-center justify-center rounded-full"
                    style={{
                      fontSize: '10px',
                      padding: '1px 6px',
                      backgroundColor: isActive ? '#2563EB' : 'rgba(37,99,235,0.2)',
                      color: isActive ? 'white' : '#2563EB',
                      minWidth: '20px',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <ChevronRight style={{ width: '12px', height: '12px', color: '#2563EB', flexShrink: 0 }} />
                )}
              </button>
            );
          })}
        </div>

        <div
          style={{
            fontSize: '10px',
            color: 'var(--dash-text-5)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            padding: '0 8px',
            margin: '20px 0 8px',
          }}
        >
          시스템
        </div>
        <div className="space-y-0.5">
          {bottomNavItems.map((item) => {
            const isActive = activeItem === item.label;
            return (
              <button
                key={item.label}
                onClick={() => setActiveItem(item.label)}
                className="w-full flex items-center gap-3 rounded-lg text-left transition-all"
                style={{
                  padding: '9px 10px',
                  backgroundColor: isActive ? 'rgba(37,99,235,0.15)' : 'transparent',
                  color: isActive ? 'var(--dash-text)' : 'var(--dash-text-2)',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--dash-item-bg-alt)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                }}
              >
                <item.icon
                  style={{
                    width: '16px',
                    height: '16px',
                    flexShrink: 0,
                    color: isActive ? '#2563EB' : 'var(--dash-icon-off)',
                  }}
                />
                <span style={{ flex: 1, fontSize: '13px' }}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Status Footer */}
      <div
        className="flex-shrink-0 px-4 py-3"
        style={{ borderTop: '1px solid var(--dash-border)' }}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: '#22C55E', boxShadow: '0 0 6px #22C55E' }}
          />
          <span style={{ fontSize: '11px', color: '#22C55E' }}>실시간 연동 중</span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--dash-text-5)' }}>나라장터 G2B · v2.4.1</div>
        <div style={{ fontSize: '10px', color: 'var(--dash-text-6)', marginTop: '2px' }}>최종 동기화: 09:20 AM</div>
      </div>
    </div>
  );
}
