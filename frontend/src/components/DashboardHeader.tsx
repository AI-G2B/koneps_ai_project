import { useEffect, useRef, useState } from 'react';
import { Search, Bell, ChevronDown, RefreshCw, Sun, Moon, LogOut, Sparkles, Bookmark, Play, Trash2, CheckCheck, Loader2 } from 'lucide-react';
import { searchBids, type SearchBidsResult } from '../services/api';
import { useToast } from './ToastProvider';
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
  onSync?: () => Promise<void>;
  isSyncing?: boolean;
}

const getTimeAgo = (date: Date): string => {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
};

const formatDate = (date: Date): string => {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayName = days[date.getDay()];
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours < 12 ? '오전' : '오후';
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${year}년 ${month}월 ${day}일 ${dayName}요일 · ${ampm} ${displayHours}:${minutes}`;
};

const NOTIF_ICON: Record<NotificationItem['type'], { icon: React.ElementType; color: string; bg: string }> = {
  sync:              { icon: RefreshCw, color: '#2563EB', bg: 'rgba(37,99,235,0.12)' },
  analysis_complete: { icon: Sparkles,  color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
  analysis_fail:     { icon: Sparkles,  color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  bookmark:          { icon: Bookmark,  color: '#2563EB', bg: 'rgba(37,99,235,0.12)' },
  inprogress:        { icon: Play,      color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
};

export function DashboardHeader({ user, onLogout, notifications, onMarkAllAsRead, onMarkAsRead, onClearNotifications, onSync, isSyncing = false }: DashboardHeaderProps) {
  const { showToast, dismissToast } = useToast();
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';
  const [isOpen, setIsOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const syncToastId = useRef<string | null>(null);

  const handleSync = async () => {
    if (isSyncing || !onSync) return;
    syncToastId.current = showToast('info', '나라장터에서 공고를 수집하고 있습니다', 0);
    try {
      await onSync();
      if (syncToastId.current) {
        dismissToast(syncToastId.current);
        syncToastId.current = null;
      }
      showToast('success', '공고 데이터가 업데이트되었습니다');
    } catch {
      if (syncToastId.current) {
        dismissToast(syncToastId.current);
        syncToastId.current = null;
      }
      showToast('warning', '동기화에 실패했습니다. 잠시 후 다시 시도해주세요');
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<SearchBidsResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDrop, setShowSearchDrop] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = searchQuery.trim();
    if (!q) {
      setSearchResult(null);
      setShowSearchDrop(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      setShowSearchDrop(true);
      const result = await searchBids(q);
      setSearchResult(result);
      setIsSearching(false);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchDrop(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
          {formatDate(now)}
        </div>
      </div>

      {/* Search */}
      <div ref={searchContainerRef} className="flex-1 max-w-md relative mx-4">
        {isSearching
          ? <Loader2 className="animate-spin" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#2563EB' }} />
          : <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: 'var(--dash-text-4)' }} />
        }
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => { if (searchQuery.trim()) setShowSearchDrop(true); }}
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
            border: `1px solid ${showSearchDrop ? 'rgba(37,99,235,0.5)' : 'var(--dash-border-btn)'}`,
            borderRadius: showSearchDrop ? '8px 8px 0 0' : '8px',
            outline: 'none',
          }}
        />

        {/* 검색 결과 드롭다운 */}
        {showSearchDrop && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'var(--dash-card)',
            border: '1px solid rgba(37,99,235,0.35)',
            borderTop: 'none',
            borderRadius: '0 0 8px 8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            zIndex: 200,
            maxHeight: '360px',
            overflowY: 'auto',
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--dash-scrollbar) transparent',
          }}>
            {isSearching ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 16px', color: 'var(--dash-text-4)', fontSize: '13px' }}>
                <Loader2 className="animate-spin" style={{ width: '14px', height: '14px' }} />
                검색 중...
              </div>
            ) : !searchResult || searchResult.results.length === 0 ? (
              <div style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--dash-text-5)' }}>
                나라장터에서도 검색 결과가 없습니다
              </div>
            ) : (
              <>
                <div style={{ padding: '8px 12px 4px', fontSize: '11px', color: 'var(--dash-text-5)', borderBottom: '1px solid var(--dash-border-faint)' }}>
                  {searchResult.source === 'naramarket' && '나라장터에서 가져온 결과'}
                  {searchResult.source === 'db' && '수집된 공고에서 찾은 결과'}
                  {searchResult.source === 'local' && '로컬 데이터에서 찾은 결과'}
                  {' '}· {searchResult.results.length}건
                </div>
                {searchResult.results.map((bid) => (
                  <div
                    key={bid.id}
                    onClick={() => setShowSearchDrop(false)}
                    style={{
                      padding: '10px 12px',
                      borderBottom: '1px solid var(--dash-border-faint)',
                      cursor: 'pointer',
                      transition: 'background-color 0.12s',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--dash-row-hover)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                      {searchResult.source === 'naramarket' && (
                        <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '4px', backgroundColor: 'rgba(37,99,235,0.12)', color: '#2563EB', fontWeight: 600, flexShrink: 0 }}>
                          나라장터
                        </span>
                      )}
                      <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--dash-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {bid.title}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--dash-text-4)' }}>
                      <span>{bid.agency}</span>
                      <span>·</span>
                      <span>{bid.deadline.substring(0, 7)}</span>
                      <span>·</span>
                      <span>{bid.type}</span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="flex items-center gap-1.5 rounded-lg transition-colors"
          style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--dash-text-2)', backgroundColor: 'var(--dash-input-bg)', border: '1px solid var(--dash-border-btn)', opacity: isSyncing ? 0.6 : 1, cursor: isSyncing ? 'not-allowed' : 'pointer' }}
          onMouseEnter={(e) => { if (!isSyncing) (e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text)'; }}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-2)')}
        >
          <RefreshCw style={{ width: '13px', height: '13px', animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
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
                          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--dash-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>
                            {n.title}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--dash-text-3)', marginBottom: '3px' }}>{n.message}</div>
                          <div style={{ fontSize: '11px', color: 'var(--dash-text-4)' }}>{getTimeAgo(n.createdAt)}</div>
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
