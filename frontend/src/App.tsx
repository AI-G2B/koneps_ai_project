import { useState, useEffect, useRef } from 'react';
import { Info, Loader2 } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { DashboardHeader } from './components/DashboardHeader';
import { KpiCards } from './components/KpiCards';
import { BidTable } from './components/BidTable';
import { BidDetailPanel } from './components/BidDetailPanel';
import { LoginPage, type User } from './components/LoginPage';
import { SettingsPage } from './components/SettingsPage';
import { BookmarkPage } from './components/BookmarkPage';
import { ProjectPage } from './components/ProjectPage';
import { BidListPage } from './components/BidListPage';
import { BottomWidgets } from './components/BottomWidgets';
import { type Bid, type BidFlags, type AiStatusType } from './components/mockData';
import { useToast } from './components/ToastProvider';
import { AnalysisDetailPage } from './components/AnalysisDetailPage';
import { AnalysisListPage } from './components/AnalysisListPage';
import { StrategyReportPage } from './components/StrategyReportPage';
import { ProposalPage } from './components/ProposalPage';
import {
  fetchBids,
  fetchBidById,
  toggleBookmarkApi,
  toggleInProgressApi,
  requestAnalysisApi,
  fetchDashboardStats,
  fetchTypeStats,
  collectBidsApi,
  loginApi,
  type FetchBidsParams,
  type ApiDashboardStats,
  type ApiTypeStatItem,
} from './services/api';

const FALLBACK_ACCOUNTS = [
  { id: 0, username: 'manager01', password: '1234', name: '홍길동 PM',  role: 'manager' as const },
  { id: 0, username: 'manager02', password: '1234', name: '김철수 PM',  role: 'manager' as const },
  { id: 0, username: 'manager03', password: '1234', name: '이영희 PM',  role: 'manager' as const },
  { id: 0, username: 'ceo01',     password: '1234', name: '대표이사',   role: 'ceo'     as const },
];

const CEO_ALLOWED_PAGES: PageType[] = ['대시보드', '진행 프로젝트', '전략 리포트', '설정', '도움말'];

export type PageType = '대시보드' | '공고 목록' | '관심 공고' | '진행 프로젝트' | 'AI 분석' | '제안목차' | '현황 요약' | '전략 리포트' | '설정' | '도움말';

export interface AgencySettings {
  preferred: string[];
  avoided: string[];
}

export interface NotificationItem {
  id: string;
  bidId: string;
  bidTitle: string;
  message: string;
  type: 'analysis_complete' | 'info' | 'warning';
  createdAt: Date;
  isRead: boolean;
}

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = sessionStorage.getItem('koneps_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loginError, setLoginError] = useState('');

  const handleLogin = async (username: string, password: string) => {
    setLoginError('');
    const apiUser = await loginApi(username, password);
    if (apiUser) {
      const userInfo: User = { id: apiUser.id, username: apiUser.username, name: apiUser.name, role: apiUser.role as User['role'] };
      sessionStorage.setItem('koneps_user', JSON.stringify(userInfo));
      setUser(userInfo);
      return;
    }
    const fallback = FALLBACK_ACCOUNTS.find(a => a.username === username && a.password === password);
    if (fallback) {
      const userInfo: User = { id: fallback.id, username: fallback.username, name: fallback.name, role: fallback.role };
      sessionStorage.setItem('koneps_user', JSON.stringify(userInfo));
      setUser(userInfo);
      return;
    }
    setLoginError('아이디 또는 비밀번호가 올바르지 않습니다.');
  };
  const [bids, setBids] = useState<Bid[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [selectedBid, setSelectedBid] = useState<Bid | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activePage, setActivePage] = useState<PageType>('대시보드');
  const [bidFlags, setBidFlags] = useState<Record<string, BidFlags>>({});
  const [aiStatuses, setAiStatuses] = useState<Record<string, AiStatusType>>({});
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [dashboardStats, setDashboardStats] = useState<ApiDashboardStats | null>(null);
  const [typeStats, setTypeStats] = useState<ApiTypeStatItem[]>([]);
  const { showToast } = useToast();

  const addNotification = (item: Omit<NotificationItem, 'id' | 'createdAt' | 'isRead'>) => {
    setNotifications(prev => [{
      ...item,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      isRead: false,
    }, ...prev]);
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const clearNotifications = () => setNotifications([]);

  const analysisTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const aiStatusesRef = useRef<Record<string, AiStatusType>>({});

  const loadBids = async (params?: FetchBidsParams) => {
    setIsFetching(true);
    try {
      const { bids: fetchedBids, flags } = await fetchBids(params);
      setBids(fetchedBids);
      setBidFlags(prev => {
        const merged = { ...prev };
        Object.entries(flags).forEach(([id, flag]) => {
          merged[id] = { bookmarked: flag.bookmarked, inProgress: flag.inProgress };
        });
        return merged;
      });
    } catch (err) {
      console.error('공고 목록 로딩 실패:', err);
    } finally {
      setIsFetching(false);
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    setIsFetching(true);
    try {
      await collectBidsApi();
      const [{ bids: fetchedBids, flags }, stats, types] = await Promise.all([
        fetchBids(),
        fetchDashboardStats(),
        fetchTypeStats(),
      ]);
      setBids(fetchedBids);
      setBidFlags(prev => {
        const merged = { ...prev };
        Object.entries(flags).forEach(([id, flag]) => {
          merged[id] = { bookmarked: flag.bookmarked, inProgress: flag.inProgress };
        });
        return merged;
      });
      setDashboardStats(stats);
      setTypeStats(types);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    Promise.all([
      loadBids(),
      fetchDashboardStats().then(setDashboardStats),
      fetchTypeStats().then(setTypeStats),
    ]);
  }, []);

  const requestAnalysis = async (bidId: string) => {
    const current = aiStatusesRef.current[bidId] ?? 'none';
    if (current === 'analyzing' || current === 'complete') return;
    if (analysisTimers.current[bidId]) return;

    aiStatusesRef.current = { ...aiStatusesRef.current, [bidId]: 'analyzing' };
    setAiStatuses(prev => ({ ...prev, [bidId]: 'analyzing' }));

    const success = await requestAnalysisApi(bidId);

    delete analysisTimers.current[bidId];

    if (!success) {
      aiStatusesRef.current = { ...aiStatusesRef.current, [bidId]: 'none' };
      setAiStatuses(prev => ({ ...prev, [bidId]: 'none' }));
      showToast('info', 'AI 분석 기능이 아직 준비 중입니다');
      return;
    }

    if ((aiStatusesRef.current[bidId] ?? 'none') !== 'analyzing') return;
    aiStatusesRef.current = { ...aiStatusesRef.current, [bidId]: 'complete' };
    setAiStatuses(prev => ({ ...prev, [bidId]: 'complete' }));
    const bid = bids.find(b => b.id === bidId);
    if (bid) {
      showToast('success', `AI 분석이 완료되었습니다 — ${bid.title}`);
      addNotification({ bidId, bidTitle: bid.title, message: 'AI 분석이 완료되었습니다', type: 'analysis_complete' });
    }
  };

  const resetAnalysis = (bidId: string) => {
    if (analysisTimers.current[bidId]) {
      clearTimeout(analysisTimers.current[bidId]);
      delete analysisTimers.current[bidId];
    }
    aiStatusesRef.current = { ...aiStatusesRef.current, [bidId]: 'none' };
    setAiStatuses(prev => ({ ...prev, [bidId]: 'none' }));
  };

const toggleBookmark = (bidId: string) => {
    const current = bidFlags[bidId] ?? { bookmarked: false, inProgress: false };
    const newBookmarked = !current.bookmarked;
    setBidFlags(prev => ({ ...prev, [bidId]: { ...current, bookmarked: newBookmarked } }));
    toggleBookmarkApi(bidId, newBookmarked).then(success => {
      if (!success) {
        setBidFlags(prev => ({ ...prev, [bidId]: { ...prev[bidId], bookmarked: !newBookmarked } }));
      }
    });
  };

  const toggleInProgress = (bidId: string) => {
    const current = bidFlags[bidId] ?? { bookmarked: false, inProgress: false };
    const newInProgress = !current.inProgress;
    setBidFlags(prev => ({ ...prev, [bidId]: { ...current, inProgress: newInProgress } }));
    toggleInProgressApi(bidId, newInProgress).then(success => {
      if (!success) {
        setBidFlags(prev => ({ ...prev, [bidId]: { ...prev[bidId], inProgress: !newInProgress } }));
      }
    });
    if (newInProgress) {
      requestAnalysis(bidId);
    } else if (!current.bookmarked) {
      resetAnalysis(bidId);
    }
  };

  const [analysisDetailBid, setAnalysisDetailBid] = useState<Bid | null>(null);
  const [showAnalysisDetail, setShowAnalysisDetail] = useState(false);

  const openAnalysisDetail = (bid: Bid) => {
    setAnalysisDetailBid(bid);
    setShowAnalysisDetail(true);
  };

  const [agencySettings, setAgencySettings] = useState<AgencySettings>({
    preferred: ['행정안전부', '국토교통부'],
    avoided: ['금융감독원'],
  });

  useEffect(() => {
    if (!user || user.role !== 'ceo') return;
    if (!CEO_ALLOWED_PAGES.includes(activePage)) setActivePage('대시보드');
  }, [user, activePage]);

  const handleSelectBid = async (bid: Bid) => {
    setSelectedBid(bid);
    if (bid.detail) return;
    setDetailLoading(true);
    try {
      const detailed = await fetchBidById(bid.id);
      setSelectedBid(detailed);
    } finally {
      setDetailLoading(false);
    }
  };

  if (!user) {
    return <LoginPage onLogin={handleLogin} loginError={loginError} />;
  }

  const isCeo = user.role === 'ceo';
  const inProgressBids = bids.filter(b => bidFlags[b.id]?.inProgress ?? false);
  const analysisCompleteCount = Object.values(aiStatuses).filter(s => s === 'complete').length;

  if (isLoading) {
    return (
      <div
        className="flex h-screen items-center justify-center flex-col gap-3"
        style={{ backgroundColor: 'var(--dash-bg)' }}
      >
        <Loader2 className="animate-spin" style={{ width: '32px', height: '32px', color: '#2563EB' }} />
        <span style={{ fontSize: '14px', color: 'var(--dash-text-3)' }}>공고 데이터를 불러오는 중입니다...</span>
      </div>
    );
  }

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{
        backgroundColor: 'var(--dash-bg)',
        fontFamily: "'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif",
        minWidth: '1200px',
      }}
    >
      <Sidebar role={user.role} activePage={activePage} onNavigate={setActivePage} analysisCompleteCount={analysisCompleteCount} totalBidCount={bids.length} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <DashboardHeader
          user={user}
          onLogout={() => { sessionStorage.removeItem('koneps_user'); setUser(null); }}
          notifications={notifications}
          onMarkAllAsRead={markAllAsRead}
          onMarkAsRead={markAsRead}
          onClearNotifications={clearNotifications}
          onSync={handleSync}
          isSyncing={isFetching}
        />
        {isFetching && (
          <div style={{ height: '2px', backgroundColor: 'var(--dash-border)', flexShrink: 0 }}>
            <div
              style={{
                height: '100%',
                backgroundColor: '#2563EB',
                animation: 'fetchProgress 1.2s ease-in-out infinite',
              }}
            />
          </div>
        )}
        <main
          className="flex-1 overflow-y-auto"
          style={{
            padding: '20px',
            gap: '16px',
            display: 'flex',
            flexDirection: 'column',
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--dash-scrollbar) transparent',
          }}
        >
          {activePage === '설정' ? (
            <SettingsPage settings={agencySettings} onSave={setAgencySettings} />
          ) : activePage === '공고 목록' ? (
            <BidListPage
              bids={bids}
              bidFlags={bidFlags}
              aiStatuses={aiStatuses}
              onToggleBookmark={toggleBookmark}
              onToggleInProgress={toggleInProgress}
              onOpenAnalysisDetail={openAnalysisDetail}
              onRequestAnalysis={requestAnalysis}
            />
          ) : activePage === 'AI 분석' ? (
            <AnalysisListPage
              bids={bids}
              aiStatuses={aiStatuses}
              bidFlags={bidFlags}
              onOpenAnalysisDetail={openAnalysisDetail}
              onToggleBookmark={toggleBookmark}
              onToggleInProgress={toggleInProgress}
            />
          ) : activePage === '관심 공고' ? (
            <BookmarkPage
              bids={bids}
              bidFlags={bidFlags}
              onToggleBookmark={toggleBookmark}
              onToggleInProgress={toggleInProgress}
              onSelectBid={handleSelectBid}
              selectedBid={selectedBid}
            />
          ) : activePage === '제안목차' ? (
            <ProposalPage bids={bids} bidFlags={bidFlags} />
          ) : activePage === '전략 리포트' ? (
            <StrategyReportPage bids={bids} bidFlags={bidFlags} aiStatuses={aiStatuses} />
          ) : activePage === '진행 프로젝트' ? (
            <ProjectPage
              bids={bids}
              bidFlags={bidFlags}
              aiStatuses={aiStatuses}
              onSelectBid={handleSelectBid}
              selectedBid={selectedBid}
              onToggleBookmark={toggleBookmark}
              onToggleInProgress={toggleInProgress}
              onOpenAnalysisDetail={openAnalysisDetail}
              onRequestAnalysis={requestAnalysis}
              ceoMode={isCeo}
              currentUser={user}
            />
          ) : isCeo ? (
            <>
              <KpiCards bids={inProgressBids} bidsLoading={isFetching} ceoMode={true} aiStatuses={aiStatuses} dashboardStats={dashboardStats} />
              {inProgressBids.length === 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderRadius: '10px', backgroundColor: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)' }}>
                  <Info style={{ width: '16px', height: '16px', color: '#7C3AED', flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: '#7C3AED' }}>담당자 모드에서 공고에 진행하기를 설정하면 이곳에 표시됩니다</span>
                </div>
              )}
              <div className="flex gap-4" style={{ minHeight: '440px' }}>
                <BidTable
                  bids={inProgressBids}
                  bidsLoading={isFetching}
                  selectedBid={selectedBid}
                  onSelectBid={handleSelectBid}
                  agencySettings={agencySettings}
                  bidFlags={bidFlags}
                  aiStatuses={aiStatuses}
                  ceoMode={true}
                  onRequestAnalysis={requestAnalysis}
                />
                <BidDetailPanel bid={selectedBid} detailLoading={detailLoading} aiStatuses={aiStatuses} onOpenAnalysisDetail={openAnalysisDetail} onRequestAnalysis={requestAnalysis} ceoMode={true} />
              </div>
              <BottomWidgets
                bids={inProgressBids}
                bidFlags={bidFlags}
                aiStatuses={aiStatuses}
                onToggleBookmark={toggleBookmark}
                onToggleInProgress={toggleInProgress}
                onOpenAnalysisDetail={openAnalysisDetail}
                onRequestAnalysis={requestAnalysis}
                ceoMode={true}
                typeStats={typeStats}
              />
            </>
          ) : (
            <>
              <KpiCards bids={bids} bidsLoading={isFetching} ceoMode={false} dashboardStats={dashboardStats} />
              <div style={{ height: '500px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                <BidListPage
                  bids={bids}
                  bidFlags={bidFlags}
                  aiStatuses={aiStatuses}
                  onToggleBookmark={toggleBookmark}
                  onToggleInProgress={toggleInProgress}
                  onOpenAnalysisDetail={openAnalysisDetail}
                  onRequestAnalysis={requestAnalysis}
                  hideTargetList={true}
                />
              </div>
              <BottomWidgets
                bids={bids}
                bidFlags={bidFlags}
                aiStatuses={aiStatuses}
                onToggleBookmark={toggleBookmark}
                onToggleInProgress={toggleInProgress}
                onOpenAnalysisDetail={openAnalysisDetail}
                onRequestAnalysis={requestAnalysis}
                typeStats={typeStats}
              />
            </>
          )}
        </main>
      </div>

      {showAnalysisDetail && analysisDetailBid && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, overflowY: 'auto', backgroundColor: 'var(--dash-bg)' }}>
          <AnalysisDetailPage
            bid={analysisDetailBid}
            onBack={() => setShowAnalysisDetail(false)}
            aiStatus={aiStatuses[analysisDetailBid.id] ?? 'none'}
            onRequestAnalysis={requestAnalysis}
          />
        </div>
      )}
    </div>
  );
}
