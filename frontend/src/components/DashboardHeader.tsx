import { Search, Bell, ChevronDown, RefreshCw, Filter, Sun, Moon, LogOut } from 'lucide-react';
import { useTheme } from 'next-themes';
import type { User } from './LoginPage';

interface DashboardHeaderProps {
  user: User;
  onLogout: () => void;
}

export function DashboardHeader({ user, onLogout }: DashboardHeaderProps) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  const roleLabel = user.role === 'ceo' ? '대표이사' : '담당자';
  const avatarGradient = user.role === 'ceo'
    ? 'linear-gradient(135deg, #7C3AED, #5B21B6)'
    : 'linear-gradient(135deg, #2563EB, #1D4ED8)';

  return (
    <div
      className="h-14 flex items-center px-6 gap-4 flex-shrink-0"
      style={{ backgroundColor: 'var(--dash-surface)', borderBottom: '1px solid var(--dash-border)' }}
    >
      {/* Page title */}
      <div className="flex-shrink-0">
        <div className="flex items-center gap-2" style={{ fontSize: '11px', color: 'var(--dash-text-4)' }}>
          <span>나라장터 AI</span>
          <span>/</span>
          <span style={{ color: 'var(--dash-text-2)' }}>대시보드</span>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--dash-text-5)', marginTop: '1px' }}>
          2026년 4월 4일 토요일 · 오전 09:24
        </div>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-md relative mx-4">
        <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: 'var(--dash-text-4)' }} />
        <input
          type="text"
          placeholder="공고명, 기관명, 공고번호로 검색..."
          style={{
            width: '100%',
            paddingLeft: '36px',
            paddingRight: '16px',
            paddingTop: '7px',
            paddingBottom: '7px',
            fontSize: '13px',
            color: 'var(--dash-text-2)',
            backgroundColor: 'var(--dash-input-bg)',
            border: '1px solid var(--dash-border-btn)',
            borderRadius: '8px',
            outline: 'none',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'rgba(37,99,235,0.5)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--dash-border-btn)')}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 ml-auto">
        <button
          className="flex items-center gap-1.5 rounded-lg transition-colors"
          style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--dash-text-2)', backgroundColor: 'var(--dash-input-bg)', border: '1px solid var(--dash-border-btn)' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-2)')}
        >
          <Filter style={{ width: '13px', height: '13px' }} />
          <span>필터</span>
        </button>

        <button
          className="flex items-center gap-1.5 rounded-lg transition-colors"
          style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--dash-text-2)', backgroundColor: 'var(--dash-input-bg)', border: '1px solid var(--dash-border-btn)' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-2)')}
        >
          <RefreshCw style={{ width: '13px', height: '13px' }} />
          <span>동기화</span>
        </button>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="relative rounded-lg flex items-center justify-center transition-colors"
          title={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
          style={{ width: '36px', height: '36px', color: 'var(--dash-text-2)', backgroundColor: 'var(--dash-input-bg)', border: '1px solid var(--dash-border-btn)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text)'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--dash-hover)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-2)'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--dash-input-bg)'; }}
        >
          {isDark ? <Sun style={{ width: '16px', height: '16px' }} /> : <Moon style={{ width: '16px', height: '16px' }} />}
        </button>

        {/* Notification */}
        <button
          className="relative rounded-lg flex items-center justify-center transition-colors"
          style={{ width: '36px', height: '36px', color: 'var(--dash-text-2)', backgroundColor: 'var(--dash-input-bg)', border: '1px solid var(--dash-border-btn)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text)'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--dash-hover)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-2)'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--dash-input-bg)'; }}
        >
          <Bell style={{ width: '16px', height: '16px' }} />
          <span className="absolute rounded-full" style={{ top: '7px', right: '7px', width: '7px', height: '7px', backgroundColor: '#EF4444', border: '1.5px solid var(--dash-surface)' }} />
        </button>

        <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--dash-border-btn)' }} />

        {/* User */}
        <div className="flex items-center gap-2.5 rounded-lg" style={{ padding: '5px 10px' }}>
          <div
            className="rounded-full flex items-center justify-center flex-shrink-0"
            style={{ width: '30px', height: '30px', background: avatarGradient, fontSize: '12px', color: 'white', fontWeight: 600 }}
          >
            {user.name[0]}
          </div>
          <div className="text-left">
            <div style={{ fontSize: '12px', color: 'var(--dash-text)', lineHeight: 1.2 }}>{user.name}</div>
            <div style={{ fontSize: '10px', color: 'var(--dash-text-4)', lineHeight: 1.2 }}>{roleLabel}</div>
          </div>
          <ChevronDown style={{ width: '13px', height: '13px', color: 'var(--dash-text-4)' }} />
        </div>

        {/* 로그아웃 */}
        <button
          onClick={onLogout}
          title="로그아웃"
          className="rounded-lg flex items-center justify-center transition-colors"
          style={{ width: '36px', height: '36px', color: 'var(--dash-text-3)', backgroundColor: 'transparent', border: '1px solid var(--dash-border-btn)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#EF4444'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.3)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-3)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--dash-border-btn)'; }}
        >
          <LogOut style={{ width: '15px', height: '15px' }} />
        </button>
      </div>
    </div>
  );
}
