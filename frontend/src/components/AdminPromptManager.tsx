import { useEffect, useMemo, useState } from 'react';
import { RefreshCcw, Save, History, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  type AdminPromptDetail,
  type AdminPromptHistoryItem,
  type AdminPromptSummary,
  adminGetPrompt,
  adminGetPromptHistory,
  adminListPrompts,
  adminResetPrompt,
  adminRollbackPrompt,
  adminUpdatePrompt,
} from '../services/api';

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

export function AdminPromptManager() {
  const [items, setItems] = useState<AdminPromptSummary[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminPromptDetail | null>(null);
  const [draft, setDraft] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [savingMsg, setSavingMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);
  const [history, setHistory] = useState<AdminPromptHistoryItem[]>([]);
  const [showDefault, setShowDefault] = useState<boolean>(false);

  // 초기 로드
  useEffect(() => {
    (async () => {
      try {
        const list = await adminListPrompts();
        setItems(list);
        if (list.length > 0) setSelectedKey(list[0].key);
      } catch (err) {
        console.warn('[admin] list 실패:', err);
      }
    })();
  }, []);

  // 키 변경 시 상세 로드
  useEffect(() => {
    if (!selectedKey) return;
    setLoading(true);
    setSavingMsg(null);
    setHistoryOpen(false);
    (async () => {
      try {
        const d = await adminGetPrompt(selectedKey);
        setDetail(d);
        setDraft(d.content);
      } catch (err) {
        console.warn('[admin] detail 실패:', err);
        setDetail(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedKey]);

  const dirty = useMemo(() => detail !== null && draft !== detail.content, [detail, draft]);
  const isDefault = useMemo(() => detail !== null && detail.content === detail.default_content, [detail]);

  const handleSave = async () => {
    if (!selectedKey || !detail) return;
    setSavingMsg(null);
    const r = await adminUpdatePrompt(selectedKey, draft);
    if ('error' in r) {
      setSavingMsg({ type: 'err', text: r.error });
      return;
    }
    setSavingMsg({ type: 'ok', text: `저장 완료 (v${r.version})` });
    const refreshed = await adminGetPrompt(selectedKey);
    setDetail(refreshed);
    setDraft(refreshed.content);
    setItems(prev => prev.map(it => (it.key === selectedKey ? { ...it, version: r.version, updated_at: new Date().toISOString() } : it)));
  };

  const handleReset = async () => {
    if (!selectedKey || !detail) return;
    if (!window.confirm('기본값으로 복원합니다. 진행할까요?')) return;
    setSavingMsg(null);
    const r = await adminResetPrompt(selectedKey);
    if ('error' in r) {
      setSavingMsg({ type: 'err', text: r.error });
      return;
    }
    const refreshed = await adminGetPrompt(selectedKey);
    setDetail(refreshed);
    setDraft(refreshed.content);
    setSavingMsg({ type: 'ok', text: `기본값으로 복원 (v${r.version})` });
    setItems(prev => prev.map(it => (it.key === selectedKey ? { ...it, version: r.version, updated_at: new Date().toISOString() } : it)));
  };

  const handleOpenHistory = async () => {
    if (!selectedKey) return;
    setHistoryOpen(true);
    try {
      const h = await adminGetPromptHistory(selectedKey);
      setHistory(h);
    } catch (err) {
      console.warn('[admin] history 실패:', err);
      setHistory([]);
    }
  };

  const handleRollback = async (version: number) => {
    if (!selectedKey) return;
    if (!window.confirm(`v${version}로 롤백합니다. 진행할까요?`)) return;
    const r = await adminRollbackPrompt(selectedKey, version);
    if ('error' in r) {
      setSavingMsg({ type: 'err', text: r.error });
      return;
    }
    const refreshed = await adminGetPrompt(selectedKey);
    setDetail(refreshed);
    setDraft(refreshed.content);
    setSavingMsg({ type: 'ok', text: `v${version}로 롤백 (현재 v${r.version})` });
    setHistoryOpen(false);
    setItems(prev => prev.map(it => (it.key === selectedKey ? { ...it, version: r.version, updated_at: new Date().toISOString() } : it)));
  };

  return (
    <div style={{ display: 'flex', gap: '20px', height: '100%' }}>
      {/* 좌측 — 키 목록 */}
      <aside
        style={{
          width: '280px',
          backgroundColor: 'var(--dash-card)',
          border: '1px solid var(--dash-border)',
          borderRadius: '12px',
          padding: '12px',
          overflowY: 'auto',
        }}
      >
        <div style={{ padding: '6px 10px 10px', fontSize: '11px', color: 'var(--dash-text-4)', borderBottom: '1px solid var(--dash-border-faint)', marginBottom: '6px' }}>
          {items.length}개의 프롬프트
        </div>
        {items.map(it => {
          const active = it.key === selectedKey;
          return (
            <button
              key={it.key}
              onClick={() => setSelectedKey(it.key)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '10px 12px',
                marginBottom: '4px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: active ? 'rgba(99,102,241,0.12)' : 'transparent',
                color: active ? '#6366F1' : 'var(--dash-text-2)',
              }}
            >
              <div style={{ fontSize: '12.5px', fontWeight: 600, fontFamily: 'monospace' }}>{it.key}</div>
              <div style={{ fontSize: '11px', color: 'var(--dash-text-4)', marginTop: '2px', lineHeight: 1.4 }}>
                {it.description || '—'}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--dash-text-5)', marginTop: '4px' }}>v{it.version} · {fmtDate(it.updated_at)}</div>
            </button>
          );
        })}
      </aside>

      {/* 우측 — 편집기 */}
      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {!selectedKey || loading ? (
          <div style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '12px', padding: '60px 24px', textAlign: 'center', color: 'var(--dash-text-4)' }}>
            {loading ? '불러오는 중…' : '좌측에서 프롬프트를 선택하세요'}
          </div>
        ) : detail === null ? (
          <div style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '12px', padding: '60px 24px', textAlign: 'center', color: '#EF4444' }}>
            로드 실패
          </div>
        ) : (
          <>
            {/* 헤더 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '14px 18px',
                backgroundColor: 'var(--dash-card)',
                border: '1px solid var(--dash-border)',
                borderRadius: '12px',
                marginBottom: '12px',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--dash-text)', fontFamily: 'monospace' }}>{detail.key}</div>
                <div style={{ fontSize: '12px', color: 'var(--dash-text-4)', marginTop: '2px' }}>{detail.description}</div>
                {detail.placeholders.length > 0 && (
                  <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    <span style={{ fontSize: '10.5px', color: 'var(--dash-text-4)' }}>필수 placeholder:</span>
                    {detail.placeholders.map(p => (
                      <span key={p} style={{ fontSize: '10.5px', color: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.1)', padding: '1px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>
                        {p}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button
                  onClick={handleOpenHistory}
                  style={btnStyle('outline')}
                >
                  <History style={{ width: '14px', height: '14px' }} />
                  버전 히스토리
                </button>
                <button
                  onClick={() => setShowDefault(v => !v)}
                  style={btnStyle('outline')}
                >
                  <FileText style={{ width: '14px', height: '14px' }} />
                  {showDefault ? '기본값 닫기' : '기본값 보기'}
                </button>
                <button onClick={handleReset} disabled={isDefault} style={btnStyle('warn', isDefault)}>
                  <RefreshCcw style={{ width: '14px', height: '14px' }} />
                  기본값 복원
                </button>
                <button onClick={handleSave} disabled={!dirty} style={btnStyle('primary', !dirty)}>
                  <Save style={{ width: '14px', height: '14px' }} />
                  저장
                </button>
              </div>
            </div>

            {/* 메시지 */}
            {savingMsg && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '10px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  border: `1px solid ${savingMsg.type === 'ok' ? '#22C55E' : '#EF4444'}40`,
                  backgroundColor: savingMsg.type === 'ok' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                  color: savingMsg.type === 'ok' ? '#22C55E' : '#EF4444',
                }}
              >
                {savingMsg.type === 'ok' ? <CheckCircle2 style={{ width: '15px', height: '15px' }} /> : <AlertCircle style={{ width: '15px', height: '15px' }} />}
                {savingMsg.text}
              </div>
            )}

            {/* 편집기 + (옵션) 기본값 비교 */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: showDefault ? '1fr 1fr' : '1fr', gap: '12px', minHeight: 0 }}>
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                spellCheck={false}
                style={{
                  width: '100%',
                  height: '100%',
                  minHeight: '500px',
                  padding: '16px',
                  backgroundColor: 'var(--dash-card)',
                  border: `1px solid ${dirty ? '#F59E0B' : 'var(--dash-border)'}`,
                  borderRadius: '12px',
                  color: 'var(--dash-text)',
                  fontSize: '13px',
                  lineHeight: 1.6,
                  fontFamily: '"SF Mono", Menlo, Consolas, monospace',
                  resize: 'none',
                }}
              />
              {showDefault && (
                <pre
                  style={{
                    margin: 0,
                    padding: '16px',
                    backgroundColor: 'var(--dash-card-deep)',
                    border: '1px solid var(--dash-border-faint)',
                    borderRadius: '12px',
                    color: 'var(--dash-text-3)',
                    fontSize: '12.5px',
                    lineHeight: 1.6,
                    fontFamily: '"SF Mono", Menlo, Consolas, monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    overflowY: 'auto',
                  }}
                >
                  {detail.default_content ?? '(기본값 없음)'}
                </pre>
              )}
            </div>
          </>
        )}
      </section>

      {/* 히스토리 drawer */}
      {historyOpen && (
        <div
          onClick={() => setHistoryOpen(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 90, display: 'flex', justifyContent: 'flex-end' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: '560px', backgroundColor: 'var(--dash-bg)', borderLeft: '1px solid var(--dash-border)', padding: '20px 24px', overflowY: 'auto' }}
          >
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--dash-text)', margin: '0 0 4px' }}>버전 히스토리</h3>
            <p style={{ fontSize: '12px', color: 'var(--dash-text-4)', margin: '0 0 16px' }}>{selectedKey} — {history.length}개 버전</p>
            {history.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--dash-text-4)', textAlign: 'center', padding: '40px 0' }}>변경 이력이 없습니다.</p>
            ) : (
              history.map(h => (
                <div key={h.version} style={{ padding: '14px', marginBottom: '10px', backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--dash-text)' }}>v{h.version}</span>
                    <button onClick={() => handleRollback(h.version)} style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid var(--dash-border)', backgroundColor: 'transparent', color: 'var(--dash-text-2)', fontSize: '12px', cursor: 'pointer' }}>
                      이 버전으로 롤백
                    </button>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--dash-text-4)', marginBottom: '8px' }}>{fmtDate(h.saved_at)}</div>
                  <pre style={{ margin: 0, padding: '10px', backgroundColor: 'var(--dash-card-deep)', borderRadius: '6px', fontSize: '11.5px', color: 'var(--dash-text-3)', maxHeight: '180px', overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: '"SF Mono", Menlo, Consolas, monospace' }}>
                    {h.content}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function btnStyle(kind: 'primary' | 'outline' | 'warn', disabled?: boolean): React.CSSProperties {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 12px',
    borderRadius: '8px',
    fontSize: '12.5px',
    fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    border: '1px solid transparent',
  };
  if (kind === 'primary') return { ...base, backgroundColor: '#6366F1', color: '#fff' };
  if (kind === 'warn') return { ...base, backgroundColor: 'transparent', color: '#F59E0B', borderColor: '#F59E0B' };
  return { ...base, backgroundColor: 'transparent', color: 'var(--dash-text-2)', borderColor: 'var(--dash-border)' };
}
