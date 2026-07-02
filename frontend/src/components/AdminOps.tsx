import { useEffect, useState } from 'react';
import { Activity, Database, FileText, AlertCircle, CheckCircle2, RefreshCw, Trash2, PlayCircle } from 'lucide-react';
import {
  type AdminOpsStatus,
  type AdminOpsTestLLMResult,
  adminOpsStatus,
  adminOpsTestLLM,
  adminOpsResetStuck,
  adminOpsWipeConvertedMd,
  adminOpsWipePoisonClauses,
  adminOpsReseedPrompts,
} from '../services/api';

export function AdminOps() {
  const [status, setStatus] = useState<AdminOpsStatus | null>(null);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [testText, setTestText] = useState<string>('1+1=?');
  const [testResult, setTestResult] = useState<AdminOpsTestLLMResult | null>(null);

  const reload = async () => {
    try {
      setStatus(await adminOpsStatus());
    } catch (err) {
      console.warn('[ops] status 실패:', err);
    }
  };
  useEffect(() => { reload(); }, []);

  const runAction = async (label: string, key: string, fn: () => Promise<any>) => {
    setBusy(key);
    setMsg(null);
    try {
      const r = await fn();
      if (r && 'error' in r) {
        setMsg({ type: 'err', text: `${label} 실패: ${r.error}` });
      } else {
        const summary = r && typeof r === 'object' ? Object.entries(r).map(([k, v]) => `${k}=${v}`).join(' / ') : '완료';
        setMsg({ type: 'ok', text: `${label}${summary}` });
      }
      await reload();
    } finally {
      setBusy(null);
    }
  };

  const runTest = async () => {
    setBusy('test');
    setMsg(null);
    setTestResult(null);
    try {
      const r = await adminOpsTestLLM(testText);
      setTestResult(r);
    } finally {
      setBusy(null);
    }
  };

  if (!status) return <div style={{ color: 'var(--dash-text-4)', textAlign: 'center', padding: '40px' }}>불러오는 중…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 상태 요약 카드 */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--dash-text)', margin: 0 }}>상태 요약</h2>
          <button onClick={reload} style={ghostBtn(false)}>
            <RefreshCw style={{ width: '13px', height: '13px' }} />
            새로고침
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          <StatusCard icon={Activity} title="자동분석 사용량" main={`${status.analysis.daily_count} / ${status.analysis.daily_cap}`} sub={`동시 ${status.analysis.active_in_flight}건 진행 중 · 한도 ${status.analysis.concurrency_limit}`} accent="#6366F1" />
          <StatusCard icon={AlertCircle} title="stuck 분석" main={String(status.notices.stuck_analyzing)} sub="pipeline_status='analyzing' 잔존" accent={status.notices.stuck_analyzing > 0 ? '#F59E0B' : '#22C55E'} />
          <StatusCard icon={Database} title="첨부 변환 캐시" main={String(status.attachments.converted_total)} sub={`LibreAI ${status.attachments.converted_libreai} · pypdf ${status.attachments.converted_pypdf}`} accent="#06B6D4" />
          <StatusCard icon={FileText} title="시드 상태" main={`프롬프트 ${status.seed.prompts_count} 키`} sub={`LLM 설정: ${status.seed.llm_config_seeded ? '시드됨' : '미시드'}`} accent={status.seed.llm_config_seeded ? '#22C55E' : '#F59E0B'} />
        </div>
      </section>

      {/* 메시지 */}
      {msg && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '10px 14px', borderRadius: '8px', fontSize: '13px',
          border: `1px solid ${msg.type === 'ok' ? '#22C55E' : '#EF4444'}40`,
          backgroundColor: msg.type === 'ok' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
          color: msg.type === 'ok' ? '#22C55E' : '#EF4444',
        }}>
          {msg.type === 'ok' ? <CheckCircle2 style={{ width: '15px', height: '15px' }} /> : <AlertCircle style={{ width: '15px', height: '15px' }} />}
          {msg.text}
        </div>
      )}

      {/* LLM 테스트 호출 */}
      <section style={panelStyle}>
        <h2 style={sectionTitle}>LLM 테스트 호출</h2>
        <p style={hint}>현재 활성 설정으로 가벼운 호출을 보내 모델·키·연결 상태를 점검합니다.</p>
        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
          <input
            value={testText}
            onChange={e => setTestText(e.target.value)}
            placeholder="질문 입력"
            style={{ flex: 1, padding: '8px 10px', backgroundColor: 'var(--dash-card-deep)', border: '1px solid var(--dash-border)', borderRadius: '7px', color: 'var(--dash-text)', fontSize: '13px' }}
          />
          <button onClick={runTest} disabled={busy === 'test' || !testText.trim()} style={primaryBtn(busy === 'test' || !testText.trim())}>
            <PlayCircle style={{ width: '14px', height: '14px' }} />
            {busy === 'test' ? '호출 중…' : '테스트 호출'}
          </button>
        </div>
        {testResult && (
          <div style={{
            marginTop: '12px', padding: '12px 14px', borderRadius: '8px',
            border: `1px solid ${testResult.ok ? '#22C55E' : '#EF4444'}40`,
            backgroundColor: testResult.ok ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
            fontSize: '12.5px',
          }}>
            {testResult.ok ? (
              <>
                <div style={{ color: 'var(--dash-text-3)', marginBottom: '6px' }}>
                  {testResult.provider}/{testResult.model_used} · {testResult.elapsed_sec.toFixed(2)}초 · in/out {testResult.input_tokens ?? '—'}/{testResult.output_tokens ?? '—'}
                </div>
                <pre style={{ margin: 0, fontSize: '13px', color: 'var(--dash-text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: '"SF Mono", Menlo, monospace' }}>{testResult.text}</pre>
              </>
            ) : (
              <span style={{ color: '#EF4444' }}>실패: {testResult.error} (소요 {testResult.elapsed_sec.toFixed(2)}초)</span>
            )}
          </div>
        )}
      </section>

      {/* 유지보수 액션 */}
      <section style={panelStyle}>
        <h2 style={sectionTitle}>유지보수 액션</h2>
        <p style={hint}>모두 즉시 실행됩니다. 일부 액션은 되돌릴 수 없으니 확인 다이얼로그를 잘 읽으세요.</p>
        <div style={{ display: 'grid', gap: '8px', marginTop: '12px' }}>
          <ActionRow
            label="stuck 'analyzing' 분석 리셋"
            hint="서버 강제 종료 등으로 영원히 analyzing에 박힌 공고를 collected로 되돌림. lifespan에서도 자동 실행되지만 수동 트리거."
            busy={busy === 'reset-stuck'}
            onClick={() => {
              if (!window.confirm('stuck 상태의 모든 분석을 collected로 리셋합니다. 진행할까요?')) return;
              runAction('stuck 리셋: ', 'reset-stuck', adminOpsResetStuck);
            }}
          />
          <ActionRow
            label="converted_md 캐시 wipe (전체)"
            hint="모든 PDF/HWP 변환 캐시 삭제. 다음 분석 시 LibreAI/pypdf 재호출 (LibreAI 일 50회 한도 주의)."
            busy={busy === 'wipe-md-all'}
            onClick={() => {
              if (!window.confirm('PDF + HWP 변환 캐시를 전부 삭제합니다. 진행할까요?')) return;
              runAction('converted_md 일괄 wipe: ', 'wipe-md-all', () => adminOpsWipeConvertedMd(null));
            }}
            danger
          />
          <ActionRow
            label="converted_md wipe (LibreAI만)"
            hint="HWP 변환 캐시만 삭제. 변환 로직(HTML 표 정리 등) 변경 시 재변환을 위해 사용."
            busy={busy === 'wipe-md-libreai'}
            onClick={() => {
              if (!window.confirm('LibreAI 변환본만 삭제합니다 (HWP 캐시). 진행할까요?')) return;
              runAction('LibreAI 캐시 wipe: ', 'wipe-md-libreai', () => adminOpsWipeConvertedMd('libreai'));
            }}
          />
          <ActionRow
            label="독소조항 데이터 일괄 삭제"
            hint="모든 분석의 poison_clauses 컬럼을 NULL로. 카테고리 체계 변경 시 사용. 되돌릴 수 없음 (재분석 시 새 체계로 다시 채워짐)."
            busy={busy === 'wipe-poison'}
            onClick={() => {
              if (!window.confirm('모든 분석의 독소조항을 삭제합니다. 진행할까요? (재분석 시 새로 채워짐)')) return;
              runAction('독소조항 wipe: ', 'wipe-poison', adminOpsWipePoisonClauses);
            }}
            danger
          />
          <ActionRow
            label="프롬프트 재시드"
            hint="코드에 새로 추가된 프롬프트 키가 있으면 DB에 INSERT (기존 키는 건드리지 않음)."
            busy={busy === 'reseed'}
            onClick={() => runAction('프롬프트 시드: ', 'reseed', adminOpsReseedPrompts)}
          />
        </div>
      </section>
    </div>
  );
}

function StatusCard({ icon: Icon, title, main, sub, accent }: { icon: typeof Activity; title: string; main: string; sub: string; accent: string }) {
  return (
    <div style={{ padding: '14px 16px', backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderRadius: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--dash-text-3)', fontSize: '11.5px', fontWeight: 500, marginBottom: '6px' }}>
        <Icon style={{ width: '14px', height: '14px', color: accent }} />
        {title}
      </div>
      <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--dash-text)', lineHeight: 1.1 }}>{main}</div>
      <div style={{ fontSize: '11px', color: 'var(--dash-text-4)', marginTop: '4px', lineHeight: 1.4 }}>{sub}</div>
    </div>
  );
}

function ActionRow({ label, hint, onClick, busy, danger }: { label: string; hint: string; onClick: () => void; busy: boolean; danger?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', backgroundColor: 'var(--dash-card-deep)', border: '1px solid var(--dash-border-faint)', borderRadius: '8px' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--dash-text)' }}>{label}</div>
        <div style={{ fontSize: '11.5px', color: 'var(--dash-text-4)', marginTop: '3px', lineHeight: 1.45 }}>{hint}</div>
      </div>
      <button onClick={onClick} disabled={busy} style={danger ? dangerBtn(busy) : primaryBtn(busy)}>
        {busy ? '실행 중…' : danger ? <><Trash2 style={{ width: '13px', height: '13px' }} />삭제</> : '실행'}
      </button>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  padding: '18px 20px',
  backgroundColor: 'var(--dash-card)',
  border: '1px solid var(--dash-border)',
  borderRadius: '12px',
};

const sectionTitle: React.CSSProperties = {
  fontSize: '15px',
  fontWeight: 700,
  color: 'var(--dash-text)',
  margin: '0 0 4px',
};

const hint: React.CSSProperties = {
  fontSize: '12px',
  color: 'var(--dash-text-4)',
  margin: 0,
};

function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '7px 14px', borderRadius: '7px', border: 'none',
    backgroundColor: '#6366F1', color: '#fff', fontSize: '12.5px', fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, flexShrink: 0,
  };
}

function dangerBtn(disabled: boolean): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '7px 14px', borderRadius: '7px',
    border: '1px solid #EF4444', backgroundColor: 'transparent', color: '#EF4444',
    fontSize: '12.5px', fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, flexShrink: 0,
  };
}

function ghostBtn(disabled: boolean): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: '5px',
    padding: '5px 10px', borderRadius: '7px',
    border: '1px solid var(--dash-border)', backgroundColor: 'transparent',
    color: 'var(--dash-text-3)', fontSize: '11.5px',
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
  };
}
