import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, AlertCircle, Save, Plus, X, Lock } from 'lucide-react';
import {
  type AdminLLMConfig as LLMCfg,
  type AdminProvider,
  adminAddProviderModel,
  adminGetLLMConfig,
  adminListProviders,
  adminRemoveProviderModel,
  adminUpdateLLMConfig,
} from '../services/api';

export function AdminLLMConfig() {
  const [providers, setProviders] = useState<AdminProvider[]>([]);
  const [cfg, setCfg] = useState<LLMCfg | null>(null);
  const [draft, setDraft] = useState<LLMCfg | null>(null);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err' | 'warn'; text: string } | null>(null);
  const [newModel, setNewModel] = useState<{ provider: string; model: string; label: string }>({ provider: 'gemini', model: '', label: '' });

  const reload = async () => {
    const [list, current] = await Promise.all([adminListProviders(), adminGetLLMConfig()]);
    setProviders(list);
    setCfg(current);
    setDraft(current);
  };
  useEffect(() => { reload(); }, []);

  const dirty = useMemo(() => {
    if (!cfg || !draft) return false;
    return (
      cfg.provider !== draft.provider ||
      cfg.model !== draft.model ||
      cfg.fallback_provider !== draft.fallback_provider ||
      cfg.fallback_model !== draft.fallback_model ||
      cfg.temperature !== draft.temperature
    );
  }, [cfg, draft]);

  const findProvider = (name: string | null) => providers.find(p => p.provider === name);
  const activeProvider = findProvider(draft?.provider ?? null);
  const fallbackProvider = findProvider(draft?.fallback_provider ?? null);

  const handleSave = async () => {
    if (!draft) return;
    setMsg(null);
    const r = await adminUpdateLLMConfig({
      provider: draft.provider,
      model: draft.model,
      fallback_provider: draft.fallback_provider || null,
      fallback_model: draft.fallback_model || null,
      temperature: draft.temperature,
    });
    if ('error' in r) {
      setMsg({ type: 'err', text: r.error });
      return;
    }
    setCfg(r);
    setDraft(r);
    setMsg({ type: r.warning ? 'warn' : 'ok', text: r.warning ?? `저장 완료 (${r.provider}/${r.model})` });
  };

  const handleAddModel = async () => {
    if (!newModel.model.trim()) return;
    const r = await adminAddProviderModel(newModel.provider, newModel.model.trim(), newModel.label.trim() || undefined);
    if ('error' in r) {
      setMsg({ type: 'err', text: r.error });
      return;
    }
    setNewModel({ provider: newModel.provider, model: '', label: '' });
    await reload();
    setMsg({ type: 'ok', text: `${newModel.provider}/${newModel.model.trim()} 등록 완료` });
  };

  const handleDeleteModel = async (provider: string, model: string) => {
    if (!window.confirm(`${provider}/${model} 을(를) 목록에서 제거할까요?`)) return;
    const r = await adminRemoveProviderModel(provider, model);
    if ('error' in r) {
      setMsg({ type: 'err', text: r.error });
      return;
    }
    await reload();
  };

  if (!draft || !cfg) {
    return <div style={{ color: 'var(--dash-text-4)', textAlign: 'center', padding: '40px' }}>불러오는 중…</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Provider 가용성 카드 */}
      <section>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--dash-text)', margin: '0 0 12px' }}>Provider 가용성</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {providers.map(p => (
            <div
              key={p.provider}
              style={{
                padding: '14px 16px',
                backgroundColor: 'var(--dash-card)',
                border: `1px solid ${p.is_available ? 'rgba(34,197,94,0.4)' : 'var(--dash-border)'}`,
                borderRadius: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                {p.is_available
                  ? <CheckCircle2 style={{ width: '16px', height: '16px', color: '#22C55E' }} />
                  : <Lock style={{ width: '16px', height: '16px', color: 'var(--dash-text-4)' }} />}
                <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--dash-text)' }}>{p.label}</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--dash-text-4)' }}>
                {p.is_available
                  ? `${p.env_var} 감지 — 호출 가능`
                  : `${p.env_var} 미등록 — 호출 불가 (.env에 추가 필요)`}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--dash-text-5)', marginTop: '6px' }}>등록 모델 {p.models.length}개</div>
            </div>
          ))}
        </div>
      </section>

      {/* 활성 설정 폼 */}
      <section
        style={{
          padding: '18px 20px',
          backgroundColor: 'var(--dash-card)',
          border: '1px solid var(--dash-border)',
          borderRadius: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--dash-text)', margin: 0 }}>활성 LLM 설정</h2>
          <button onClick={handleSave} disabled={!dirty} style={primaryBtn(!dirty)}>
            <Save style={{ width: '14px', height: '14px' }} />
            저장
          </button>
        </div>

        {msg && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              marginBottom: '14px',
              border: `1px solid ${msg.type === 'ok' ? '#22C55E' : msg.type === 'warn' ? '#F59E0B' : '#EF4444'}40`,
              backgroundColor: msg.type === 'ok' ? 'rgba(34,197,94,0.08)' : msg.type === 'warn' ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)',
              color: msg.type === 'ok' ? '#22C55E' : msg.type === 'warn' ? '#F59E0B' : '#EF4444',
            }}
          >
            {msg.type === 'ok' ? <CheckCircle2 style={{ width: '15px', height: '15px' }} /> : <AlertCircle style={{ width: '15px', height: '15px' }} />}
            {msg.text}
          </div>
        )}

        {/* Primary */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
          <Field label="Primary Provider">
            <select value={draft.provider} onChange={e => setDraft({ ...draft, provider: e.target.value, model: '' })} style={selectStyle}>
              {providers.map(p => (
                <option key={p.provider} value={p.provider} disabled={!p.is_available}>
                  {p.label}{!p.is_available ? ' — 키 미등록' : ''}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Primary Model">
            <select value={draft.model} onChange={e => setDraft({ ...draft, model: e.target.value })} style={selectStyle}>
              <option value="">모델 선택</option>
              {(activeProvider?.models ?? []).map(m => (
                <option key={m.model} value={m.model}>{m.label || m.model}</option>
              ))}
            </select>
          </Field>
        </div>

        {/* Fallback */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
          <Field label="Fallback Provider">
            <select value={draft.fallback_provider ?? ''} onChange={e => setDraft({ ...draft, fallback_provider: e.target.value || null, fallback_model: null })} style={selectStyle}>
              <option value="">사용 안 함</option>
              {providers.map(p => (
                <option key={p.provider} value={p.provider} disabled={!p.is_available}>
                  {p.label}{!p.is_available ? ' — 키 미등록' : ''}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fallback Model">
            <select value={draft.fallback_model ?? ''} onChange={e => setDraft({ ...draft, fallback_model: e.target.value || null })} style={selectStyle} disabled={!draft.fallback_provider}>
              <option value="">모델 선택</option>
              {(fallbackProvider?.models ?? []).map(m => (
                <option key={m.model} value={m.model}>{m.label || m.model}</option>
              ))}
            </select>
          </Field>
        </div>

        {/* Temperature */}
        <Field label={`Temperature — ${draft.temperature.toFixed(2)}`}>
          <input
            type="range"
            min={0}
            max={2}
            step={0.05}
            value={draft.temperature}
            onChange={e => setDraft({ ...draft, temperature: parseFloat(e.target.value) })}
            style={{ width: '100%' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--dash-text-5)', marginTop: '2px' }}>
            <span>0 (결정적)</span><span>1</span><span>2 (창의적)</span>
          </div>
        </Field>
      </section>

      {/* 모델 레지스트리 */}
      <section style={{ padding: '18px 20px', backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '12px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--dash-text)', margin: '0 0 4px' }}>모델 레지스트리</h2>
        <p style={{ fontSize: '12px', color: 'var(--dash-text-4)', margin: '0 0 14px' }}>새 모델이 출시되면 여기서 추가하세요. 위 설정의 모델 드롭다운에 즉시 반영됩니다.</p>

        {/* 새 모델 추가 */}
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr auto', gap: '8px', marginBottom: '16px', alignItems: 'end' }}>
          <Field label="Provider">
            <select value={newModel.provider} onChange={e => setNewModel({ ...newModel, provider: e.target.value })} style={selectStyle}>
              {providers.map(p => <option key={p.provider} value={p.provider}>{p.label}</option>)}
            </select>
          </Field>
          <Field label="모델 ID">
            <input value={newModel.model} onChange={e => setNewModel({ ...newModel, model: e.target.value })} placeholder="예: gemini-3.2-pro" style={inputStyle} />
          </Field>
          <Field label="표시 이름 (선택)">
            <input value={newModel.label} onChange={e => setNewModel({ ...newModel, label: e.target.value })} placeholder="예: Gemini 3.2 Pro" style={inputStyle} />
          </Field>
          <button onClick={handleAddModel} style={primaryBtn(false)}>
            <Plus style={{ width: '14px', height: '14px' }} />
            추가
          </button>
        </div>

        {/* provider별 목록 */}
        {providers.map(p => (
          <div key={p.provider} style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--dash-text-2)', marginBottom: '6px' }}>{p.label}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {p.models.length === 0
                ? <span style={{ fontSize: '12px', color: 'var(--dash-text-5)' }}>(없음)</span>
                : p.models.map(m => (
                  <span key={m.model} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', backgroundColor: 'var(--dash-card-deep)', border: '1px solid var(--dash-border-faint)', borderRadius: '20px', fontSize: '11.5px', color: 'var(--dash-text-2)' }}>
                    <span style={{ fontFamily: 'monospace' }}>{m.model}</span>
                    {m.label && <span style={{ color: 'var(--dash-text-5)' }}>· {m.label}</span>}
                    <button onClick={() => handleDeleteModel(p.provider, m.model)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, marginLeft: '2px', color: 'var(--dash-text-5)' }} title="삭제">
                      <X style={{ width: '12px', height: '12px' }} />
                    </button>
                  </span>
                ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '11.5px', color: 'var(--dash-text-3)', marginBottom: '5px', fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  backgroundColor: 'var(--dash-card-deep)',
  border: '1px solid var(--dash-border)',
  borderRadius: '7px',
  color: 'var(--dash-text)',
  fontSize: '13px',
  fontFamily: 'monospace',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  fontFamily: 'inherit',
};

function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#6366F1',
    color: '#fff',
    fontSize: '12.5px',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  };
}
