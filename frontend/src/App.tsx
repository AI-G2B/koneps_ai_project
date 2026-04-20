import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { DashboardHeader } from './components/DashboardHeader';
import { KpiCards } from './components/KpiCards';
import { BidTable } from './components/BidTable';
import { BidDetailPanel } from './components/BidDetailPanel';
import { BottomWidgets } from './components/BottomWidgets';
import { LoginPage, type User } from './components/LoginPage';
import { bids, type Bid } from './components/mockData';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedBid, setSelectedBid] = useState<Bid>(bids[0]);

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
      <Sidebar role={user.role} />
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
          <KpiCards />
          <div className="flex gap-4" style={{ minHeight: '440px' }}>
            <BidTable selectedBid={selectedBid} onSelectBid={setSelectedBid} />
            <BidDetailPanel bid={selectedBid} />
          </div>
          <BottomWidgets />
          <div style={{ height: '4px' }} />
        </main>
      </div>
    </div>
  );
}
