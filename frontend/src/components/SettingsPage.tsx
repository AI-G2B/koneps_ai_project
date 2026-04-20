import { useState } from 'react';
import { Star, Ban, Plus, X, Building2, Search, Save } from 'lucide-react';
import type { AgencySettings } from '../App';

const SAMPLE_AGENCIES = [
  '행정안전부', '국토교통부', '보건복지부', '교육부', '환경부',
  '금융감독원', '중소벤처기업부', '경찰청', '국세청', '산업통상자원부',
  '과학기술정보통신부', '문화체육관광부', '외교부', '국방부', '법무부',
];

interface SettingsPageProps {
  settings: AgencySettings;
  onSave: (settings: AgencySettings) => void;
}

export function SettingsPage({ settings, onSave }: SettingsPageProps) {
  const [preferredAgencies, setPreferredAgencies] = useState<string[]>(settings.preferred);
  const [avoidedAgencies, setAvoidedAgencies] = useState<string[]>(settings.avoided);
  const [preferSearch, setPreferSearch] = useState('');
  const [avoidSearch, setAvoidSearch] = useState('');
  const [saved, setSaved] = useState(false);

  const addPreferred = (agency: string) => {
    if (!preferredAgencies.includes(agency) && !avoidedAgencies.includes(agency))
      setPreferredAgencies([...preferredAgencies, agency]);
  };
  const removePreferred = (agency: string) => setPreferredAgencies(preferredAgencies.filter((a) => a !== agency));

  const addAvoided = (agency: string) => {
    if (!avoidedAgencies.includes(agency) && !preferredAgencies.includes(agency))
      setAvoidedAgencies([...avoidedAgencies, agency]);
  };
  const removeAvoided = (agency: string) => setAvoidedAgencies(avoidedAgencies.filter((a) => a !== agency));

  const handleSave = () => {
    onSave({ preferred: preferredAgencies, avoided: avoidedAgencies });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const filteredPrefer = SAMPLE_AGENCIES.filter(
    (a) => a.includes(preferSearch) && !preferredAgencies.includes(a) && !avoidedAgencies.includes(a)
  );
  const filteredAvoid = SAMPLE_AGENCIES.filter(
    (a) => a.includes(avoidSearch) && !avoidedAgencies.includes(a) && !preferredAgencies.includes(a)
  );

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--dash-text)', marginBottom: '4px' }}>설정</h1>
        <p style={{ fontSize: '13px', color: 'var(--dash-text-3)' }}>선호 및 기피 발주기관을 설정하여 공고 목록에서 빠르게 파악하세요.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* 선호기업 */}
        <div className="rounded-xl" style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', overflow: 'hidden' }}>
          <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--dash-border)', backgroundColor: 'rgba(37,99,235,0.03)' }}>
            <div className="rounded-lg flex items-center justify-center" style={{ width: '32px', height: '32px', backgroundColor: 'rgba(37,99,235,0.12)' }}>
              <Star style={{ width: '16px', height: '16px', color: '#2563EB' }} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--dash-text)' }}>선호 발주기관</div>
              <div style={{ fontSize: '12px', color: 'var(--dash-text-4)' }}>공고 목록에서 ★ 배지로 표시됩니다</div>
            </div>
            <span className="ml-auto rounded-full" style={{ fontSize: '11px', padding: '2px 8px', backgroundColor: 'rgba(37,99,235,0.12)', color: '#2563EB' }}>{preferredAgencies.length}개 설정됨</span>
          </div>
          <div className="px-5 py-4" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="flex flex-wrap gap-2">
              {preferredAgencies.length === 0 && <span style={{ fontSize: '12px', color: 'var(--dash-text-4)' }}>선호 기관을 추가해주세요</span>}
              {preferredAgencies.map((agency) => (
                <span key={agency} className="flex items-center gap-1.5 rounded-full" style={{ padding: '4px 10px', fontSize: '12px', backgroundColor: 'rgba(37,99,235,0.1)', color: '#2563EB', border: '1px solid rgba(37,99,235,0.25)' }}>
                  <Star style={{ width: '11px', height: '11px' }} />
                  {agency}
                  <button onClick={() => removePreferred(agency)} style={{ color: '#2563EB', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                    <X style={{ width: '12px', height: '12px' }} />
                  </button>
                </span>
              ))}
            </div>
            <div>
              <div className="relative mb-2">
                <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '13px', height: '13px', color: 'var(--dash-text-4)' }} />
                <input type="text" value={preferSearch} onChange={(e) => setPreferSearch(e.target.value)} placeholder="기관명 검색..." style={{ width: '100%', paddingLeft: '30px', paddingRight: '12px', paddingTop: '7px', paddingBottom: '7px', fontSize: '12px', borderRadius: '8px', border: '1px solid var(--dash-border-med)', backgroundColor: 'var(--dash-input-bg)', color: 'var(--dash-text)', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {filteredPrefer.slice(0, 8).map((agency) => (
                  <button key={agency} onClick={() => addPreferred(agency)} className="flex items-center gap-1 rounded-full" style={{ padding: '3px 10px', fontSize: '12px', backgroundColor: 'var(--dash-item-bg)', color: 'var(--dash-text-2)', border: '1px solid var(--dash-border-btn)', cursor: 'pointer' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(37,99,235,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = '#2563EB'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--dash-item-bg)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-2)'; }}
                  >
                    <Plus style={{ width: '11px', height: '11px' }} />{agency}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 기피기업 */}
        <div className="rounded-xl" style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', overflow: 'hidden' }}>
          <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--dash-border)', backgroundColor: 'rgba(239,68,68,0.03)' }}>
            <div className="rounded-lg flex items-center justify-center" style={{ width: '32px', height: '32px', backgroundColor: 'rgba(239,68,68,0.12)' }}>
              <Ban style={{ width: '16px', height: '16px', color: '#EF4444' }} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--dash-text)' }}>기피 발주기관</div>
              <div style={{ fontSize: '12px', color: 'var(--dash-text-4)' }}>공고 목록에서 ⚠ 배지로 알림이 표시됩니다</div>
            </div>
            <span className="ml-auto rounded-full" style={{ fontSize: '11px', padding: '2px 8px', backgroundColor: 'rgba(239,68,68,0.12)', color: '#EF4444' }}>{avoidedAgencies.length}개 설정됨</span>
          </div>
          <div className="px-5 py-4" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="flex flex-wrap gap-2">
              {avoidedAgencies.length === 0 && <span style={{ fontSize: '12px', color: 'var(--dash-text-4)' }}>기피 기관을 추가해주세요</span>}
              {avoidedAgencies.map((agency) => (
                <span key={agency} className="flex items-center gap-1.5 rounded-full" style={{ padding: '4px 10px', fontSize: '12px', backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <Ban style={{ width: '11px', height: '11px' }} />
                  {agency}
                  <button onClick={() => removeAvoided(agency)} style={{ color: '#EF4444', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                    <X style={{ width: '12px', height: '12px' }} />
                  </button>
                </span>
              ))}
            </div>
            <div>
              <div className="relative mb-2">
                <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '13px', height: '13px', color: 'var(--dash-text-4)' }} />
                <input type="text" value={avoidSearch} onChange={(e) => setAvoidSearch(e.target.value)} placeholder="기관명 검색..." style={{ width: '100%', paddingLeft: '30px', paddingRight: '12px', paddingTop: '7px', paddingBottom: '7px', fontSize: '12px', borderRadius: '8px', border: '1px solid var(--dash-border-med)', backgroundColor: 'var(--dash-input-bg)', color: 'var(--dash-text)', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {filteredAvoid.slice(0, 8).map((agency) => (
                  <button key={agency} onClick={() => addAvoided(agency)} className="flex items-center gap-1 rounded-full" style={{ padding: '3px 10px', fontSize: '12px', backgroundColor: 'var(--dash-item-bg)', color: 'var(--dash-text-2)', border: '1px solid var(--dash-border-btn)', cursor: 'pointer' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(239,68,68,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = '#EF4444'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--dash-item-bg)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-2)'; }}
                  >
                    <Plus style={{ width: '11px', height: '11px' }} />{agency}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 안내 */}
        <div className="rounded-xl flex items-start gap-3 px-5 py-4" style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)' }}>
          <Building2 style={{ width: '16px', height: '16px', color: 'var(--dash-text-4)', flexShrink: 0, marginTop: '1px' }} />
          <div style={{ fontSize: '12px', color: 'var(--dash-text-3)', lineHeight: 1.7 }}>
            선호 기관의 공고는 공고명 옆에 ★ 배지가 표시됩니다.<br />
            기피 기관의 공고는 공고명 옆에 ⚠ 배지가 표시됩니다.
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={handleSave} className="flex items-center gap-2 rounded-xl" style={{ padding: '10px 24px', fontSize: '14px', fontWeight: 600, color: 'white', backgroundColor: saved ? '#22C55E' : '#2563EB', border: 'none', cursor: 'pointer' }}>
            <Save style={{ width: '15px', height: '15px' }} />
            {saved ? '저장됐습니다!' : '설정 저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
