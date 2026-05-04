import { BookOpen, Clock } from 'lucide-react';
import { type Bid, type BidFlags } from './mockData';

interface ProposalPageProps {
  bids: Bid[];
  bidFlags: Record<string, BidFlags>;
}

const PLANNED_FEATURES = [
  '사업 유형별 (ISP/ISMP) 제안목차 템플릿 자동 생성',
  '행안부 가이드라인 기반 Level 1~4 목차 구조',
  'AI 분석 결과 연동 맞춤형 목차 도출',
  '제안 전략 자동 도출',
];

export function ProposalPage(_props: ProposalPageProps) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
      <div
        style={{
          maxWidth: '480px',
          width: '100%',
          margin: '0 auto',
          padding: '80px 24px',
          backgroundColor: 'var(--dash-card)',
          border: '1px solid var(--dash-border)',
          borderRadius: '16px',
          marginTop: '40px',
          textAlign: 'center',
        }}
      >
        {/* 아이콘 */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <BookOpen style={{ width: '64px', height: '64px', color: '#2563EB' }} />
        </div>

        {/* 타이틀 */}
        <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--dash-text)', marginBottom: '8px' }}>
          제안목차 자동 생성
        </div>

        {/* 서브 타이틀 */}
        <div style={{ fontSize: '14px', color: '#2563EB', fontWeight: 500, marginBottom: '16px' }}>
          추후 구현 예정
        </div>

        {/* 설명 */}
        <div style={{ fontSize: '13px', color: 'var(--dash-text-3)', lineHeight: 1.8, marginBottom: '28px' }}>
          AI 분석 결과를 기반으로 ISP/ISMP 사업별 제안목차를 자동 생성하는 기능입니다.
        </div>

        {/* 구분선 */}
        <div style={{ borderTop: '1px solid var(--dash-border)', marginBottom: '24px' }} />

        {/* 예정 기능 목록 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
          {PLANNED_FEATURES.map((feature) => (
            <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock style={{ width: '14px', height: '14px', color: 'var(--dash-text-4)', flexShrink: 0 }} />
              <span style={{ fontSize: '13px', color: 'var(--dash-text-2)' }}>{feature}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
