import { useState } from 'react';
import { Star, Ban, Plus, X, Building2, Search, Save, Eye, EyeOff, User as UserIcon } from 'lucide-react';
import type { AgencySettings } from '../App';
import type { User } from './LoginPage';
import { updateProfileApi } from '../services/api';

const SAMPLE_AGENCIES = [
  '행정안전부', '국토교통부', '보건복지부', '교육부', '환경부',
  '금융감독원', '중소벤처기업부', '경찰청', '국세청', '산업통상자원부',
  '과학기술정보통신부', '문화체육관광부', '외교부', '국방부', '법무부',
];

interface SettingsPageProps {
  settings: AgencySettings;
  onSave: (settings: AgencySettings) => void;
  agencyList?: string[];
  user?: User;
  onUpdateProfile?: (name: string, currentPw?: string, newPw?: string, position?: string) => Promise<void>;
}

export function SettingsPage({ settings, onSave, agencyList, user, onUpdateProfile }: SettingsPageProps) {
  const agencies = agencyList && agencyList.length > 0 ? agencyList : SAMPLE_AGENCIES;
  const [preferredAgencies, setPreferredAgencies] = useState<string[]>(settings.preferred);
  const [avoidedAgencies, setAvoidedAgencies] = useState<string[]>(settings.avoided);
  const [preferSearch, setPreferSearch] = useState('');
  const [avoidSearch, setAvoidSearch] = useState('');
  const [saved, setSaved] = useState(false);

  // 프로필 섹션 상태
  const [newName, setNewName] = useState(user?.name ?? '');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const POSITIONS = ['CEO', 'PM', '영업담당자', '입찰담당자'] as const;
  const ROLE_TO_POSITION: Record<string, string> = { ceo: 'CEO', pm: 'PM', 영업담당자: '영업담당자', 입찰담당자: '입찰담당자', manager: 'PM' };
  const defaultPosition = ROLE_TO_POSITION[user?.role ?? ''] ?? 'PM';
  const [showPositionSection, setShowPositionSection] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<string>(defaultPosition);
  const [positionSaving, setPositionSaving] = useState(false);
  const [positionMsg, setPositionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handlePositionSave = async () => {
    if (!onUpdateProfile) return;
    setPositionSaving(true);
    setPositionMsg(null);
    try {
      await onUpdateProfile(user?.name ?? '', undefined, undefined, selectedPosition);
      setPositionMsg({ type: 'success', text: `직급이 "${selectedPosition}"(으)로 변경되었습니다.` });
      setTimeout(() => { setPositionMsg(null); setShowPositionSection(false); }, 3000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '직급 변경에 실패했습니다.';
      setPositionMsg({ type: 'error', text: msg });
    } finally {
      setPositionSaving(false);
    }
  };

  const [showPwSection, setShowPwSection] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const ROLE_LABELS: Record<string, string> = { ceo: '대표이사', pm: 'PM', 영업담당자: '영업담당자', 입찰담당자: '입찰담당자', manager: '담당자', admin: '관리자' };
  const roleLabel = ROLE_LABELS[user?.role ?? ''] ?? '담당자';
  const avatarGradient = user?.role === 'ceo'
    ? 'linear-gradient(135deg, #7C3AED, #5B21B6)'
    : 'linear-gradient(135deg, #2563EB, #1D4ED8)';

  const handleNameSave = async () => {
    if (!newName.trim()) { setNameMsg({ type: 'error', text: '이름을 입력해주세요.' }); return; }
    if (!onUpdateProfile) return;
    setNameSaving(true);
    setNameMsg(null);
    try {
      await onUpdateProfile(newName.trim());
      setNameMsg({ type: 'success', text: '이름이 변경되었습니다.' });
      setTimeout(() => setNameMsg(null), 3000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '이름 변경에 실패했습니다.';
      setNameMsg({ type: 'error', text: msg });
    } finally {
      setNameSaving(false);
    }
  };

  const handlePwSave = async () => {
    if (!currentPw) { setPwMsg({ type: 'error', text: '현재 비밀번호를 입력해주세요.' }); return; }
    if (newPw.length < 4) { setPwMsg({ type: 'error', text: '새 비밀번호는 4자 이상이어야 합니다.' }); return; }
    if (newPw !== confirmPw) { setPwMsg({ type: 'error', text: '새 비밀번호가 일치하지 않습니다.' }); return; }
    if (!onUpdateProfile) return;
    setPwSaving(true);
    setPwMsg(null);
    try {
      await onUpdateProfile(user?.name ?? '', currentPw, newPw);
      setPwMsg({ type: 'success', text: '비밀번호가 변경되었습니다.' });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setTimeout(() => { setPwMsg(null); setShowPwSection(false); }, 3000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '비밀번호 변경에 실패했습니다.';
      setPwMsg({ type: 'error', text: msg });
    } finally {
      setPwSaving(false);
    }
  };

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

  const filteredPrefer = agencies.filter(
    (a) => a.includes(preferSearch) && !preferredAgencies.includes(a) && !avoidedAgencies.includes(a)
  );
  const filteredAvoid = agencies.filter(
    (a) => a.includes(avoidSearch) && !avoidedAgencies.includes(a) && !preferredAgencies.includes(a)
  );

  return (
    <div style={{ width: '100%' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--dash-text)', marginBottom: '4px' }}>설정</h1>
        <p style={{ fontSize: '13px', color: 'var(--dash-text-3)' }}>프로필 및 발주기관 설정을 관리하세요.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* 프로필 섹션 */}
        {user && (
          <div className="rounded-xl" style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', overflow: 'hidden' }}>
            <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--dash-border)', backgroundColor: 'rgba(37,99,235,0.03)' }}>
              <div className="rounded-lg flex items-center justify-center" style={{ width: '32px', height: '32px', backgroundColor: 'rgba(37,99,235,0.12)' }}>
                <UserIcon style={{ width: '16px', height: '16px', color: '#2563EB' }} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--dash-text)' }}>프로필</div>
                <div style={{ fontSize: '12px', color: 'var(--dash-text-4)' }}>이름 및 비밀번호를 변경할 수 있습니다</div>
              </div>
            </div>

            <div className="px-5 py-5" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* 계정 정보 요약 */}
              <div className="flex items-center gap-4">
                <div
                  className="rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ width: '52px', height: '52px', background: avatarGradient, fontSize: '20px', color: 'white', fontWeight: 700 }}
                >
                  {user.name[0]}
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--dash-text)' }}>{user.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--dash-text-4)', marginTop: '2px' }}>@{user.username}</div>
                  <span style={{
                    display: 'inline-block',
                    marginTop: '4px',
                    fontSize: '11px',
                    fontWeight: 500,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    backgroundColor: user.role === 'ceo' ? 'rgba(124,58,237,0.12)' : 'rgba(37,99,235,0.12)',
                    color: user.role === 'ceo' ? '#7C3AED' : '#2563EB',
                  }}>
                    {roleLabel}
                  </span>
                </div>
              </div>

              {/* 이름 변경 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--dash-text-2)' }}>이름 변경</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleNameSave(); }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      fontSize: '13px',
                      borderRadius: '8px',
                      border: '1px solid var(--dash-border-med)',
                      backgroundColor: 'var(--dash-input-bg)',
                      color: 'var(--dash-text)',
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={handleNameSave}
                    disabled={nameSaving}
                    className="flex items-center gap-1.5 rounded-lg"
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: 600,
                      backgroundColor: '#2563EB',
                      color: 'white',
                      border: 'none',
                      cursor: nameSaving ? 'not-allowed' : 'pointer',
                      opacity: nameSaving ? 0.7 : 1,
                      flexShrink: 0,
                    }}
                  >
                    <Save style={{ width: '13px', height: '13px' }} />
                    {nameSaving ? '저장 중...' : '저장'}
                  </button>
                </div>
                {nameMsg && (
                  <div style={{
                    fontSize: '12px',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    color: nameMsg.type === 'success' ? '#16A34A' : '#EF4444',
                    backgroundColor: nameMsg.type === 'success' ? 'rgba(22,163,74,0.08)' : 'rgba(239,68,68,0.08)',
                    border: `1px solid ${nameMsg.type === 'success' ? 'rgba(22,163,74,0.2)' : 'rgba(239,68,68,0.2)'}`,
                  }}>
                    {nameMsg.text}
                  </div>
                )}
              </div>

              {/* 직급 변경 토글 */}
              {user.role !== 'admin' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    onClick={() => { setShowPositionSection(!showPositionSection); setPositionMsg(null); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: 'var(--dash-text-2)',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      width: 'fit-content',
                    }}
                  >
                    <span style={{ fontSize: '14px' }}>{showPositionSection ? '▲' : '▼'}</span>
                    직급 변경
                  </button>

                  {showPositionSection && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '4px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {POSITIONS.map((p) => (
                          <button
                            key={p}
                            onClick={() => setSelectedPosition(p)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '9px 12px',
                              borderRadius: '8px',
                              border: selectedPosition === p ? '1.5px solid #2563EB' : '1px solid var(--dash-border-med)',
                              backgroundColor: selectedPosition === p ? 'rgba(37,99,235,0.07)' : 'var(--dash-input-bg)',
                              cursor: 'pointer',
                              textAlign: 'left',
                              transition: 'border-color 0.15s, background-color 0.15s',
                            }}
                          >
                            <span style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              flexShrink: 0,
                              backgroundColor: selectedPosition === p ? '#2563EB' : 'var(--dash-border-med)',
                              border: selectedPosition === p ? 'none' : '1.5px solid var(--dash-border-med)',
                              transition: 'background-color 0.15s',
                            }} />
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: selectedPosition === p ? 600 : 400, color: selectedPosition === p ? '#2563EB' : 'var(--dash-text)' }}>
                                {p}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={handlePositionSave}
                        disabled={positionSaving}
                        style={{
                          alignSelf: 'flex-start',
                          padding: '8px 16px',
                          fontSize: '13px',
                          fontWeight: 600,
                          borderRadius: '8px',
                          backgroundColor: '#2563EB',
                          color: 'white',
                          border: 'none',
                          cursor: positionSaving ? 'not-allowed' : 'pointer',
                          opacity: positionSaving ? 0.7 : 1,
                        }}
                      >
                        {positionSaving ? '변경 중...' : '직급 변경'}
                      </button>
                      {positionMsg && (
                        <div style={{
                          fontSize: '12px',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          color: positionMsg.type === 'success' ? '#16A34A' : '#EF4444',
                          backgroundColor: positionMsg.type === 'success' ? 'rgba(22,163,74,0.08)' : 'rgba(239,68,68,0.08)',
                          border: `1px solid ${positionMsg.type === 'success' ? 'rgba(22,163,74,0.2)' : 'rgba(239,68,68,0.2)'}`,
                        }}>
                          {positionMsg.text}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 비밀번호 변경 토글 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={() => { setShowPwSection(!showPwSection); setPwMsg(null); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--dash-text-2)',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    width: 'fit-content',
                  }}
                >
                  <span style={{ fontSize: '14px' }}>{showPwSection ? '▲' : '▼'}</span>
                  비밀번호 변경
                </button>

                {showPwSection && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '4px' }}>
                    {/* 현재 비밀번호 */}
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showCurrentPw ? 'text' : 'password'}
                        value={currentPw}
                        onChange={(e) => setCurrentPw(e.target.value)}
                        placeholder="현재 비밀번호"
                        style={{ width: '100%', padding: '8px 36px 8px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--dash-border-med)', backgroundColor: 'var(--dash-input-bg)', color: 'var(--dash-text)', outline: 'none', boxSizing: 'border-box' }}
                      />
                      <button onClick={() => setShowCurrentPw(!showCurrentPw)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--dash-text-4)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                        {showCurrentPw ? <EyeOff style={{ width: '14px', height: '14px' }} /> : <Eye style={{ width: '14px', height: '14px' }} />}
                      </button>
                    </div>
                    {/* 새 비밀번호 */}
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showNewPw ? 'text' : 'password'}
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        placeholder="새 비밀번호 (4자 이상)"
                        style={{ width: '100%', padding: '8px 36px 8px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--dash-border-med)', backgroundColor: 'var(--dash-input-bg)', color: 'var(--dash-text)', outline: 'none', boxSizing: 'border-box' }}
                      />
                      <button onClick={() => setShowNewPw(!showNewPw)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--dash-text-4)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                        {showNewPw ? <EyeOff style={{ width: '14px', height: '14px' }} /> : <Eye style={{ width: '14px', height: '14px' }} />}
                      </button>
                    </div>
                    {/* 비밀번호 확인 */}
                    <input
                      type="password"
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handlePwSave(); }}
                      placeholder="새 비밀번호 확인"
                      style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--dash-border-med)', backgroundColor: 'var(--dash-input-bg)', color: 'var(--dash-text)', outline: 'none', boxSizing: 'border-box' }}
                    />
                    <button
                      onClick={handlePwSave}
                      disabled={pwSaving}
                      style={{
                        alignSelf: 'flex-start',
                        padding: '8px 16px',
                        fontSize: '13px',
                        fontWeight: 600,
                        borderRadius: '8px',
                        backgroundColor: '#2563EB',
                        color: 'white',
                        border: 'none',
                        cursor: pwSaving ? 'not-allowed' : 'pointer',
                        opacity: pwSaving ? 0.7 : 1,
                      }}
                    >
                      {pwSaving ? '변경 중...' : '비밀번호 변경'}
                    </button>
                    {pwMsg && (
                      <div style={{
                        fontSize: '12px',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        color: pwMsg.type === 'success' ? '#16A34A' : '#EF4444',
                        backgroundColor: pwMsg.type === 'success' ? 'rgba(22,163,74,0.08)' : 'rgba(239,68,68,0.08)',
                        border: `1px solid ${pwMsg.type === 'success' ? 'rgba(22,163,74,0.2)' : 'rgba(239,68,68,0.2)'}`,
                      }}>
                        {pwMsg.text}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
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
                {preferSearch.trim().length > 0 &&
                  !preferredAgencies.includes(preferSearch.trim()) &&
                  !avoidedAgencies.includes(preferSearch.trim()) &&
                  !agencies.includes(preferSearch.trim()) && (
                  <button
                    onClick={() => { addPreferred(preferSearch.trim()); setPreferSearch(''); }}
                    style={{ padding: '3px 10px', fontSize: '12px', backgroundColor: 'transparent', color: '#2563EB', border: '1px dashed rgba(37,99,235,0.4)', borderRadius: '20px', cursor: 'pointer' }}
                  >
                    + "{preferSearch.trim()}" 직접 추가
                  </button>
                )}
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
                {avoidSearch.trim().length > 0 &&
                  !avoidedAgencies.includes(avoidSearch.trim()) &&
                  !preferredAgencies.includes(avoidSearch.trim()) &&
                  !agencies.includes(avoidSearch.trim()) && (
                  <button
                    onClick={() => { addAvoided(avoidSearch.trim()); setAvoidSearch(''); }}
                    style={{ padding: '3px 10px', fontSize: '12px', backgroundColor: 'transparent', color: '#EF4444', border: '1px dashed rgba(239,68,68,0.4)', borderRadius: '20px', cursor: 'pointer' }}
                  >
                    + "{avoidSearch.trim()}" 직접 추가
                  </button>
                )}
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
