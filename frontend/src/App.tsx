import { useState, useEffect, useRef } from 'react';
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
import { type Bid, type BidStatus, type AiStatusType } from './components/mockData';
import { useToast } from './components/ToastProvider';
import { fetchBids, fetchBidById } from './services/api';

export type PageType = '대시보드' | '공고 목록' | '관심 공고' | '진행 프로젝트' | 'AI 분석' | '제안목차' | '현황 요약' | '전략 리포트' | '설정' | '도움말';

export interface AgencySettings {
  preferred: string[];
  avoided: string[];
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [bidsLoading, setBidsLoading] = useState(true);
  const [selectedBid, setSelectedBid] = useState<Bid | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activePage, setActivePage] = useState<PageType>('대시보드');
  const [bidStatuses, setBidStatuses] = useState<Map<string, BidStatus>>(new Map());
  const [aiStatuses, setAiStatuses] = useState<Record<string, AiStatusType>>({});
  const [pursuedBids, setPursuedBids] = useState<Set<string>>(new Set());
  const { showToast } = useToast();
  const analysisTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const requestAnalysis = (bidId: string) => {
    if (analysisTimers.current[bidId]) return;
    setAiStatuses(prev => {
      const current = prev[bidId] ?? 'none';
      if (current === 'analyzing' || current === 'complete') return prev;
      return { ...prev, [bidId]: 'analyzing' };
    });
    analysisTimers.current[bidId] = setTimeout(() => {
      delete analysisTimers.current[bidId];
      setAiStatuses(prev => {
        if ((prev[bidId] ?? 'none') !== 'analyzing') return prev;
        const bid = bids.find(b => b.id === bidId);
        if (bid) showToast('success', `AI 분석이 완료되었습니다 — ${bid.title}`);
        return { ...prev, [bidId]: 'complete' };
      });
    }, 3000);
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
    const newStatus = bidStatuses.get(bidId) === 'bookmarked' ? 'none' : 'bookmarked';
    setBidStatuses(prev => {
      const next = new Map(prev);
      next.set(bidId, newStatus);
      return next;
    });
    if (newStatus === 'bookmarked') requestAnalysis(bidId);
  };

  const setInProgress = (bidId: string) => {
    setBidStatuses(prev => {
      const next = new Map(prev);
      next.set(bidId, 'inProgress');
      return next;
    });
    requestAnalysis(bidId);
  };

  const [agencySettings, setAgencySettings] = useState<AgencySettings>({
    preferred: ['행정안전부', '국토교통부'],
    avoided: ['금융감독원'],
  });

  useEffect(() => {
    setBidsLoading(true);
    fetchBids()
      .then((data) => {
        setBids(data);
        if (data.length > 0) setSelectedBid(data[0]);
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
  const displayBids = isCeo ? bids.filter((b) => pursuedBids.has(b.id)) : bids;

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{
        backgroundColor: 'var(--dash-bg)',
        fontFamily: "'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif",
        minWidth: '1200px',
      }}
    >
      <Sidebar role={user.role} activePage={activePage} onNavigate={setActivePage} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <DashboardHeader user={user} onLogout={() => setUser(null)} />
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
              bidStatuses={bidStatuses}
              aiStatuses={aiStatuses}
              onToggleBookmark={toggleBookmark}
              onSetInProgress={setInProgress}
            />
          ) : activePage === '관심 공고' ? (
            <BookmarkPage
              bids={bids}
              bidStatuses={bidStatuses}
              onToggleBookmark={toggleBookmark}
              onSetInProgress={setInProgress}
              onSelectBid={handleSelectBid}
              selectedBid={selectedBid}
            />
          ) : activePage === '진행 프로젝트' ? (
            <ProjectPage
              bids={bids}
              bidStatuses={bidStatuses}
              onSelectBid={handleSelectBid}
              selectedBid={selectedBid}
              onToggleBookmark={toggleBookmark}
              onSetInProgress={setInProgress}
            />
          ) : (
            <>
              <KpiCards bids={displayBids} bidsLoading={bidsLoading} ceoMode={isCeo} />
              <div className="flex gap-4" style={{ minHeight: '440px' }}>
                <BidTable
                  bids={displayBids}
                  bidsLoading={bidsLoading}
                  selectedBid={selectedBid}
                  onSelectBid={handleSelectBid}
                  agencySettings={agencySettings}
                  bidStatuses={bidStatuses}
                  aiStatuses={aiStatuses}
                  onToggleBookmark={toggleBookmark}
                  onSetInProgress={setInProgress}
                  pursuedBids={pursuedBids}
                  onTogglePursued={togglePursued}
                  hideFilters={isCeo}
                />
                <BidDetailPanel bid={selectedBid} detailLoading={detailLoading} onNavigateToProposal={() => setActivePage('제안목차')} aiStatuses={aiStatuses} />
              </div>
              <BottomWidgets
                bids={displayBids}
                bidStatuses={bidStatuses}
                onToggleBookmark={toggleBookmark}
                onSetInProgress={setInProgress}
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
