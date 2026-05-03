import { useState, useEffect, useRef } from 'react';
import { Info } from 'lucide-react';
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
import { fetchBids, fetchBidById } from './services/api';

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
  const [user, setUser] = useState<User | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [bidsLoading, setBidsLoading] = useState(true);
  const [selectedBid, setSelectedBid] = useState<Bid | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activePage, setActivePage] = useState<PageType>('대시보드');
  const [bidFlags, setBidFlags] = useState<Record<string, BidFlags>>({});
  const [aiStatuses, setAiStatuses] = useState<Record<string, AiStatusType>>({});
  const [pursuedBids, setPursuedBids] = useState<Set<string>>(new Set());
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
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
  // analysisTimers: 진행 중인 타이머 추적 (중복 방지)
  const analysisTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // aiStatusesRef: setState 외부에서 동기적으로 상태 확인하기 위한 미러 ref
  const aiStatusesRef = useRef<Record<string, AiStatusType>>({});

  const requestAnalysis = (bidId: string) => {
    const current = aiStatusesRef.current[bidId] ?? 'none';
    if (current === 'analyzing' || current === 'complete') return;
    if (analysisTimers.current[bidId]) return;

    aiStatusesRef.current = { ...aiStatusesRef.current, [bidId]: 'analyzing' };
    setAiStatuses(prev => ({ ...prev, [bidId]: 'analyzing' }));

    analysisTimers.current[bidId] = setTimeout(() => {
      delete analysisTimers.current[bidId];
      // ref로 동기 확인 후 setState와 showToast를 완전히 분리
      if ((aiStatusesRef.current[bidId] ?? 'none') !== 'analyzing') return;
      aiStatusesRef.current = { ...aiStatusesRef.current, [bidId]: 'complete' };
      setAiStatuses(prev => ({ ...prev, [bidId]: 'complete' }));
      const bid = bids.find(b => b.id === bidId);
      if (bid) {
        showToast('success', `AI 분석이 완료되었습니다 — ${bid.title}`);
        addNotification({ bidId, bidTitle: bid.title, message: 'AI 분석이 완료되었습니다', type: 'analysis_complete' });
      }
    }, 3000);
  };

  const resetAnalysis = (bidId: string) => {
    if (analysisTimers.current[bidId]) {
      clearTimeout(analysisTimers.current[bidId]);
      delete analysisTimers.current[bidId];
    }
    aiStatusesRef.current = { ...aiStatusesRef.current, [bidId]: 'none' };
    setAiStatuses(prev => ({ ...prev, [bidId]: 'none' }));
  };

  const togglePursued = (bidId: string) => {
    setPursuedBids(prev => {
      const next = new Set(prev);
      if (next.has(bidId)) next.delete(bidId);
      else next.add(bidId);
      return next;
    });
  };

  const toggleBookmark = (bidId: string) => {
    const current = bidFlags[bidId] ?? { bookmarked: false, inProgress: false };
    const newBookmarked = !current.bookmarked;
    setBidFlags(prev => ({ ...prev, [bidId]: { ...current, bookmarked: newBookmarked } }));
    if (newBookmarked) {
      requestAnalysis(bidId);
    } else if (!current.inProgress) {
      resetAnalysis(bidId);
    }
  };

  const toggleInProgress = (bidId: string) => {
    const current = bidFlags[bidId] ?? { bookmarked: false, inProgress: false };
    const newInProgress = !current.inProgress;
    setBidFlags(prev => ({ ...prev, [bidId]: { ...current, inProgress: newInProgress } }));
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

  useEffect(() => {
    setBidsLoading(true);
    fetchBids()
      .then((data) => {
        setBids(data);
        setBidFlags(Object.fromEntries(data.map(b => [b.id, { bookmarked: false, inProgress: false }])));
      })
      .finally(() => setBidsLoading(false));
  }, []);

  const handleSelectBid = async (bid: Bid) => {
    // 기본 정보 즉시 표시
    setSelectedBid(bid);
    // 이미 상세 데이터가 있으면 재조회 불필요
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
    return <LoginPage onLogin={setUser} />;
  }

  const isCeo = user.role === 'ceo';
  const inProgressBids = bids.filter(b => bidFlags[b.id]?.inProgress ?? false);
  const analysisCompleteCount = Object.values(aiStatuses).filter(s => s === 'complete').length;

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{
        backgroundColor: 'var(--dash-bg)',
        fontFamily: "'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif",
        minWidth: '1200px',
      }}
    >
      <Sidebar role={user.role} activePage={activePage} onNavigate={setActivePage} analysisCompleteCount={analysisCompleteCount} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <DashboardHeader
          user={user}
          onLogout={() => setUser(null)}
          notifications={notifications}
          onMarkAllAsRead={markAllAsRead}
          onMarkAsRead={markAsRead}
          onClearNotifications={clearNotifications}
        />
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
              onSelectBid={handleSelectBid}
              selectedBid={selectedBid}
              onToggleBookmark={toggleBookmark}
              onToggleInProgress={toggleInProgress}
              onOpenAnalysisDetail={openAnalysisDetail}
            />
          ) : isCeo ? (
            <>
              <KpiCards bids={inProgressBids} bidsLoading={bidsLoading} ceoMode={true} />
              {inProgressBids.length === 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderRadius: '10px', backgroundColor: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)' }}>
                  <Info style={{ width: '16px', height: '16px', color: '#7C3AED', flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: '#7C3AED' }}>담당자 모드에서 공고에 진행하기를 설정하면 이곳에 표시됩니다</span>
                </div>
              )}
              <div className="flex gap-4" style={{ minHeight: '440px' }}>
                <BidTable
                  bids={inProgressBids}
                  bidsLoading={bidsLoading}
                  selectedBid={selectedBid}
                  onSelectBid={handleSelectBid}
                  agencySettings={agencySettings}
                  bidFlags={bidFlags}
                  aiStatuses={aiStatuses}
                  ceoMode={true}
                />
                <BidDetailPanel bid={selectedBid} detailLoading={detailLoading} onNavigateToProposal={() => setActivePage('제안목차')} aiStatuses={aiStatuses} onOpenAnalysisDetail={openAnalysisDetail} />
              </div>
              <BottomWidgets
                bids={inProgressBids}
                bidFlags={bidFlags}
                onToggleBookmark={toggleBookmark}
                onToggleInProgress={toggleInProgress}
                onOpenAnalysisDetail={openAnalysisDetail}
              />
            </>
          ) : (
            <>
              <KpiCards bids={bids} bidsLoading={bidsLoading} ceoMode={false} />
              <div className="flex gap-4" style={{ minHeight: '440px' }}>
                <BidTable
                  bids={bids}
                  bidsLoading={bidsLoading}
                  selectedBid={selectedBid}
                  onSelectBid={handleSelectBid}
                  agencySettings={agencySettings}
                  bidFlags={bidFlags}
                  aiStatuses={aiStatuses}
                  onToggleBookmark={toggleBookmark}
                  onToggleInProgress={toggleInProgress}
                  pursuedBids={pursuedBids}
                  onTogglePursued={togglePursued}
                />
                <BidDetailPanel bid={selectedBid} detailLoading={detailLoading} onNavigateToProposal={() => setActivePage('제안목차')} aiStatuses={aiStatuses} onOpenAnalysisDetail={openAnalysisDetail} />
              </div>
              <BottomWidgets
                bids={bids}
                bidFlags={bidFlags}
                onToggleBookmark={toggleBookmark}
                onToggleInProgress={toggleInProgress}
                onOpenAnalysisDetail={openAnalysisDetail}
              />
            </>
          )}
        </main>
      </div>

      {showAnalysisDetail && analysisDetailBid && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, overflowY: 'auto', backgroundColor: 'var(--dash-bg)' }}>
          <AnalysisDetailPage bid={analysisDetailBid} onBack={() => setShowAnalysisDetail(false)} />
        </div>
      )}
    </div>
  );
}
