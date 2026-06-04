import { AlertTriangle, FileCode, Info } from 'lucide-react';

const POISON_CATEGORIES = [
  { code: 'S1', group: '과업/산출물', name: '백지수표형 과업 요구',       level: 'danger'  },
  { code: 'S2', group: '과업/산출물', name: '구축(SI) 수준 산출물 요구',   level: 'warning' },
  { code: 'S3', group: '과업/산출물', name: '과도한 인쇄/번역 비용 전가', level: 'caution' },
  { code: 'S4', group: '과업/산출물', name: '종료 후 무상 자문 강제',      level: 'warning' },
  { code: 'P1', group: '인력/환경',   name: '인력 교체 시 인건비 전가',    level: 'danger'  },
  { code: 'P2', group: '인력/환경',   name: '체재비 없는 지방 상주',        level: 'danger'  },
  { code: 'P3', group: '인력/환경',   name: '발주처 일방적 인력 퇴출권',   level: 'warning' },
  { code: 'P4', group: '인력/환경',   name: '과도한 PM 직급 제한',          level: 'caution' },
  { code: 'C1', group: '비용/대가',   name: '인질형 대금 지급',             level: 'danger'  },
  { code: 'C2', group: '비용/대가',   name: '상용 SW/장비 기증 강요',       level: 'warning' },
  { code: 'C3', group: '비용/대가',   name: '선금 지급 차단',               level: 'caution' },
  { code: 'C4', group: '비용/대가',   name: '출장비 실비 정산 불가',        level: 'warning' },
  { code: 'L1', group: '법무/지재권', name: '지식재산권 독점 귀속',         level: 'danger'  },
  { code: 'L2', group: '법무/지재권', name: '물리적 하드디스크 압수',       level: 'danger'  },
  { code: 'L3', group: '법무/지재권', name: '제3자 저작권 무과실 책임',     level: 'warning' },
  { code: 'L4', group: '법무/지재권', name: '징벌적 지연배상금',            level: 'caution' },
] as const;

const LEVEL_CFG = {
  danger:  { label: '위험', color: '#EF4444', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.25)'  },
  warning: { label: '경고', color: '#F97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.25)' },
  caution: { label: '주의', color: '#EAB308', bg: 'rgba(234,179,8,0.1)',  border: 'rgba(234,179,8,0.25)'  },
} as const;

const GROUPS = ['과업/산출물', '인력/환경', '비용/대가', '법무/지재권'] as const;

export function AdminPoisonPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 타이틀 */}
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--dash-text)', margin: '0 0 4px' }}>독소조항 프롬프트 설정</h1>
        <p style={{ fontSize: '13px', color: 'var(--dash-text-3)', margin: 0 }}>독소조항 판정 기준을 확인합니다</p>
      </div>

      {/* 카테고리별 항목 */}
      {GROUPS.map((group) => {
        const items = POISON_CATEGORIES.filter((c) => c.group === group);
        return (
          <div key={group} style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '12px', padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <AlertTriangle style={{ width: '15px', height: '15px', color: '#475569' }} />
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--dash-text)', margin: 0 }}>{group}</h2>
              <span style={{ fontSize: '11px', color: 'var(--dash-text-4)', marginLeft: '4px' }}>{items.length}개 항목</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {items.map((item) => {
                const cfg = LEVEL_CFG[item.level];
                return (
                  <div
                    key={item.code}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'var(--dash-item-bg)', border: '1px solid var(--dash-border)' }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--dash-text-3)', fontFamily: 'monospace', minWidth: '28px' }}>{item.code}</span>
                    <span style={{ fontSize: '13px', color: 'var(--dash-text)', flex: 1 }}>{item.name}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '40px', fontSize: '11px', fontWeight: 500, backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* 프롬프트 수정 안내 */}
      <div style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '12px', padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <FileCode style={{ width: '16px', height: '16px', color: '#475569' }} />
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--dash-text)', margin: 0 }}>프롬프트 수정 안내</h2>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--dash-text-3)', margin: '0 0 10px', lineHeight: 1.7 }}>
          프롬프트 수정은 <code style={{ padding: '1px 6px', borderRadius: '4px', backgroundColor: 'var(--dash-card-deep)', fontSize: '12px', fontFamily: 'monospace' }}>backend/prompts/rfp_analysis.py</code> 파일을 직접 수정해야 합니다.
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 14px', borderRadius: '8px', backgroundColor: 'rgba(71,85,105,0.06)', border: '1px solid rgba(71,85,105,0.2)' }}>
          <Info style={{ width: '14px', height: '14px', color: '#475569', flexShrink: 0, marginTop: '1px' }} />
          <span style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.6 }}>카테고리 구조 유지 및 서비스 품질 보호를 위해 코드 레벨에서 관리합니다</span>
        </div>
      </div>
    </div>
  );
}
