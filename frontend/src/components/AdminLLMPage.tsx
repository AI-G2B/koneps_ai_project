import { Sparkles, Info, FileCode } from 'lucide-react';

export function AdminLLMPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 타이틀 */}
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--dash-text)', margin: '0 0 4px' }}>LLM 모델 설정</h1>
        <p style={{ fontSize: '13px', color: 'var(--dash-text-3)', margin: 0 }}>AI 분석에 사용할 모델을 설정합니다</p>
      </div>

      {/* 현재 모델 카드 */}
      <div style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '12px', padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Sparkles style={{ width: '16px', height: '16px', color: '#475569' }} />
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--dash-text)', margin: 0 }}>현재 사용 모델</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { label: '기본 모델 (Primary)', value: 'gemini-2.5-pro-preview-06-05' },
            { label: '폴백 모델 (Fallback)', value: 'gemini-2.5-flash' },
          ].map((item) => (
            <div
              key={item.label}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: 'var(--dash-item-bg)', borderRadius: '8px', border: '1px solid var(--dash-border)' }}
            >
              <div>
                <div style={{ fontSize: '11px', color: 'var(--dash-text-4)', marginBottom: '2px' }}>{item.label}</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--dash-text)', fontFamily: 'monospace' }}>{item.value}</div>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '40px', fontSize: '11px', backgroundColor: 'rgba(34,197,94,0.12)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.25)', whiteSpace: 'nowrap' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#22C55E', display: 'inline-block' }} />
                현재 사용 중
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 변경 방법 안내 */}
      <div style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '12px', padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <FileCode style={{ width: '16px', height: '16px', color: '#475569' }} />
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--dash-text)', margin: 0 }}>모델 변경 방법</h2>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--dash-text-3)', margin: '0 0 12px', lineHeight: 1.7 }}>
          모델 변경은 백엔드 <code style={{ padding: '1px 6px', borderRadius: '4px', backgroundColor: 'var(--dash-card-deep)', fontSize: '12px', fontFamily: 'monospace' }}>config.py</code> 수정이 필요합니다.
        </p>
        <div style={{ backgroundColor: '#0f172a', borderRadius: '8px', padding: '14px 16px', fontFamily: 'monospace', fontSize: '12px', color: '#94a3b8', lineHeight: 1.8 }}>
          <div style={{ color: '#64748b', marginBottom: '4px' }}># backend/config.py</div>
          <div><span style={{ color: '#7dd3fc' }}>gemini_model</span><span style={{ color: '#94a3b8' }}>: str = </span><span style={{ color: '#86efac' }}>"모델명"</span></div>
          <div><span style={{ color: '#7dd3fc' }}>gemini_fallback_model</span><span style={{ color: '#94a3b8' }}>: str = </span><span style={{ color: '#86efac' }}>"폴백모델명"</span></div>
        </div>
      </div>

      {/* 고도화 예정 배너 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderRadius: '10px', backgroundColor: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.2)' }}>
        <Info style={{ width: '15px', height: '15px', color: '#2563EB', flexShrink: 0 }} />
        <span style={{ fontSize: '13px', color: '#2563EB' }}>UI를 통한 직접 변경 기능은 고도화 예정입니다</span>
      </div>
    </div>
  );
}
