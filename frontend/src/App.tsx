import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { DashboardHeader } from './components/DashboardHeader';
import { KpiCards } from './components/KpiCards';
import { BidTable } from './components/BidTable';
import { BidDetailPanel } from './components/BidDetailPanel';
import { BottomWidgets } from './components/BottomWidgets';
import { LoginPage, type User } from './components/LoginPage';
import { SettingsPage } from './components/SettingsPage';
import { type Bid } from './components/mockData';
import { fetchBids, fetchBidById } from './services/api';

export type PageType = '대시보드' | '공고 목록' | 'AI 분석' | '제안목차' | '현황 요약' | '전략 리포트' | '설정' | '도움말';

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
          ) : (
            <>
              <KpiCards bids={bids} bidsLoading={bidsLoading} />
              <div className="flex gap-4" style={{ minHeight: '440px' }}>
                <BidTable
                  bids={bids}
                  bidsLoading={bidsLoading}
                  selectedBid={selectedBid}
                  onSelectBid={handleSelectBid}
                  agencySettings={agencySettings}
                />
                <BidDetailPanel bid={selectedBid} detailLoading={detailLoading} />
              </div>
              <BottomWidgets />
              <div style={{ height: '4px' }} />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
