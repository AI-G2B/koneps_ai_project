import { useEffect, useRef, useState } from 'react';
import { Search, Bell, ChevronDown, RefreshCw, Filter, Sun, Moon, LogOut, BrainCircuit, Info, AlertTriangle, Trash2, CheckCheck } from 'lucide-react';
import { useTheme } from 'next-themes';
import type { User } from './LoginPage';
import type { NotificationItem } from '../App';

interface DashboardHeaderProps {
  user: User;
  onLogout: () => void;
  notifications: NotificationItem[];
  onMarkAllAsRead: () => void;
  onMarkAsRead: (id: string) => void;
  onClearNotifications: () => void;
}

const getTimeAgo = (date: Date): string => {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
};

const NOTIF_ICON: Record<NotificationItem['type'], { icon: React.ElementType; color: string; bg: string }> = {
  analysis_complete: { icon: BrainCircuit, color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
  info:              { icon: Info,          color: '#2563EB', bg: 'rgba(37,99,235,0.12)' },
  warning:           { icon: AlertTriangle, color: '#F97316', bg: 'rgba(249,115,22,0.12)' },
};

export function DashboardHeader({ user, onLogout, notifications, onMarkAllAsRead, onMarkAsRead, onClearNotifications }: DashboardHeaderProps) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unread = notifications.filter(n => !n.isRead).length;
  const roleLabel = user.role === 'ceo' ? '대표이사' : '담당자';
  const avatarGradient = user.role === 'ceo'
    ? 'linear-gradient(135deg, #7C3AED, #5B21B6)'
    : 'linear-gradient(135deg, #2563EB, #1D4ED8)';

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

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
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setIsOpen(v => !v)}
            className="relative rounded-lg flex items-center justify-center transition-colors"
            style={{ width: '36px', height: '36px', color: isOpen ? 'var(--dash-text)' : 'var(--dash-text-2)', backgroundColor: isOpen ? 'var(--dash-hover)' : 'var(--dash-input-bg)', border: `1px solid ${isOpen ? 'rgba(37,99,235,0.3)' : 'var(--dash-border-btn)'}` }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text)'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--dash-hover)'; }}
            onMouseLeave={(e) => { if (!isOpen) { (e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-2)'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--dash-input-bg)'; } }}
          >
            <Bell style={{ width: '16px', height: '16px' }} />
            {unread > 0 && (
              <span
                className="absolute flex items-center justify-center rounded-full"
                style={{
                  top: '5px', right: '5px',
                  minWidth: unread > 9 ? '14px' : '8px',
                  height: unread > 9 ? '14px' : '8px',
                  padding: unread > 9 ? '0 3px' : '0',
                  backgroundColor: '#EF4444',
                  border: '1.5px solid var(--dash-surface)',
                  fontSize: '9px',
                  fontWeight: 700,
                  color: 'white',
                  lineHeight: 1,
                }}
              >
                {unread > 9 ? '9+' : ''}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {isOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '360px',
                maxHeight: '480px',
                backgroundColor: 'var(--dash-card)',
                border: '1px solid var(--dash-border)',
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* 드롭다운 헤더 */}
              <div className="flex items-center" style={{ padding: '12px 16px', borderBottom: '1px solid var(--dash-border)', flexShrink: 0 }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--dash-text)' }}>알림</span>
                {unread > 0 && (
                  <span className="rounded-full" style={{ marginLeft: '6px', fontSize: '10px', padding: '1px 6px', backgroundColor: 'rgba(37,99,235,0.15)', color: '#2563EB', fontWeight: 600 }}>
                    {unread}건 미읽음
                  </span>
                )}
                <div className="flex items-center gap-1 ml-auto">
                  {notifications.length > 0 && unread > 0 && (
                    <button
                      onClick={onMarkAllAsRead}
                      className="flex items-center gap-1 rounded-md"
                      style={{ padding: '4px 8px', fontSize: '11px', color: '#2563EB', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(37,99,235,0.08)')}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent')}
                    >
                      <CheckCheck style={{ width: '12px', height: '12px' }} />
                      모두 읽음
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={onClearNotifications}
                      className="flex items-center gap-1 rounded-md"
                      style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--dash-text-4)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(239,68,68,0.08)')}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent')}
                    >
                      <Trash2 style={{ width: '12px', height: '12px' }} />
                      전체 삭제
                    </button>
                  )}
                </div>
              </div>

              {/* 알림 목록 */}
              <div style={{ overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'var(--dash-scrollbar) transparent' }}>
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center" style={{ padding: '40px 20px', gap: '10px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'var(--dash-item-bg)', border: '1px solid var(--dash-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Bell style={{ width: '18px', height: '18px', color: 'var(--dash-text-4)' }} />
                    </div>
                    <span style={{ fontSize: '13px', color: 'var(--dash-text-4)' }}>새로운 알림이 없습니다</span>
                  </div>
                ) : (
                  notifications.map(n => {
                    const cfg = NOTIF_ICON[n.type];
                    const Icon = cfg.icon;
                    return (
                      <div
                        key={n.id}
                        onClick={() => onMarkAsRead(n.id)}
                        className="flex items-start gap-3"
                        style={{
                          padding: '12px 16px',
                          backgroundColor: n.isRead ? 'transparent' : 'rgba(37,99,235,0.05)',
                          borderBottom: '1px solid var(--dash-border-faint)',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s',
                        }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--dash-row-hover)')}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.backgroundColor = n.isRead ? 'transparent' : 'rgba(37,99,235,0.05)')}
                      >
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon style={{ width: '15px', height: '15px', color: cfg.color }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--dash-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>
                            {n.bidTitle}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--dash-text-3)', marginBottom: '3px' }}>{n.message}</div>
                          <div style={{ fontSize: '11px', color: 'var(--dash-text-5)' }}>{getTimeAgo(n.createdAt)}</div>
                        </div>
                        {!n.isRead && (
                          <span style={{ width: '7px', height: '7px', borderRadius: '9999px', backgroundColor: '#2563EB', flexShrink: 0, marginTop: '5px' }} />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

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
