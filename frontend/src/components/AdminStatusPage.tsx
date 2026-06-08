import { Activity, Clock } from 'lucide-react';
import type { ApiDashboardStats } from '../services/api';

interface AdminStatusPageProps {
  dashboardStats: ApiDashboardStats | null;
  totalBidCount: number;
}

export function AdminStatusPage({ dashboardStats, totalBidCount }: AdminStatusPageProps) {
  const cards = [
    { label: '전체 수집 공고', value: totalBidCount, unit: '건', color: '#2563EB', bg: 'rgba(37,99,235,0.08)' },
    { label: '오늘 신규 공고', value: dashboardStats?.today_new ?? '-', unit: '건', color: '#22C55E', bg: 'rgba(34,197,94,0.08)' },
    { label: 'AI 분석 완료', value: dashboardStats?.analysis_done ?? '-', unit: '건', color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
    { label: '제안목차 생성', value: dashboardStats?.proposal_count ?? '-', unit: '건', color: '#7C3AED', bg: 'rgba(124,58,237,0.08)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 타이틀 */}
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--dash-text)', margin: '0 0 4px' }}>시스템 현황</h1>
        <p style={{ fontSize: '13px', color: 'var(--dash-text-3)', margin: 0 }}>플랫폼 운영 현황을 확인합니다</p>
      </div>

      {/* 현황 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        {cards.map((card) => (
          <div
            key={card.label}
            style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}
          >
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity style={{ width: '16px', height: '16px', color: card.color }} />
            </div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: card.color, lineHeight: 1 }}>
              {card.value}<span style={{ fontSize: '14px', fontWeight: 500, marginLeft: '3px' }}>{card.unit}</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--dash-text-3)' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* 수집 스케줄 */}
      <div style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '12px', padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Clock style={{ width: '16px', height: '16px', color: '#475569' }} />
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--dash-text)', margin: 0 }}>공고 수집 스케줄</h2>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {['10:00', '13:00', '16:00', '20:00'].map((time) => (
            <div
              key={time}
              style={{ padding: '8px 18px', borderRadius: '8px', backgroundColor: 'var(--dash-item-bg)', border: '1px solid var(--dash-border)', fontSize: '14px', fontWeight: 600, color: 'var(--dash-text)', fontFamily: 'monospace' }}
            >
              {time}
            </div>
          ))}
        </div>
        <p style={{ fontSize: '12px', color: 'var(--dash-text-4)', margin: '10px 0 0', lineHeight: 1.6 }}>
          매일 10:00 / 13:00 / 16:00 / 20:00 자동 수집
        </p>
      </div>
    </div>
  );
}
