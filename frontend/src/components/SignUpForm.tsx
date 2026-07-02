import { useState } from 'react';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { registerApi } from '../services/api';

const POSITIONS = ['CEO', 'PM', '영업담당자', '입찰담당자'] as const;

const POSITION_DISPLAY_NAMES: Record<string, string> = {
  CEO: '경영진',
  PM: '제안 PM',
  영업담당자: '영업대표',
  입찰담당자: '제안 PM',
};

const POSITION_LABELS: Record<string, string> = {
  CEO: '경영진 — 전략 리포트·KPI 확인',
  PM: '제안 PM — 입찰 전략 수립 총괄',
  영업담당자: '영업대표 — 신규 입찰 기회 발굴',
  입찰담당자: '제안 PM — 공고 분석·서류 작성',
};

interface SignUpFormProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function SignUpForm({ onBack, onSuccess }: SignUpFormProps) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [position, setPosition] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!name.trim()) { setError('이름을 입력해주세요.'); return; }
    if (username.length < 3) { setError('아이디는 3자 이상이어야 합니다.'); return; }
    if (password.length < 4) { setError('비밀번호는 4자 이상이어야 합니다.'); return; }
    if (password !== confirmPw) { setError('비밀번호가 일치하지 않습니다.'); return; }
    if (!position) { setError('직급을 선택해주세요.'); return; }

    setLoading(true);
    const result = await registerApi(username.trim(), password, name.trim(), position);
    setLoading(false);

    if (result === 'timeout') {
      setError('서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <div
        className="rounded-2xl flex flex-col items-center justify-center"
        style={{
          width: '380px',
          flexShrink: 0,
          padding: '48px 36px',
          backgroundColor: 'var(--dash-card)',
          border: '1px solid var(--dash-border)',
          gap: '16px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '32px' }}>✅</div>
        <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--dash-text)' }}>가입이 완료되었습니다!</div>
        <div style={{ fontSize: '13px', color: 'var(--dash-text-3)' }}>
          <strong style={{ color: 'var(--dash-text-2)' }}>{username}</strong> 계정으로 로그인해주세요.
        </div>
        <button
          onClick={onSuccess}
          style={{
            marginTop: '8px',
            padding: '10px 24px',
            fontSize: '14px',
            fontWeight: 600,
            borderRadius: '8px',
            backgroundColor: '#2563EB',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          로그인 하러 가기
        </button>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl flex flex-col"
      style={{
        width: '380px',
        flexShrink: 0,
        padding: '36px',
        backgroundColor: 'var(--dash-card)',
        border: '1px solid var(--dash-border)',
        gap: '16px',
      }}
    >
      <div>
        <button
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            color: 'var(--dash-text-3)',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            marginBottom: '8px',
          }}
        >
          <ArrowLeft style={{ width: '14px', height: '14px' }} />
          로그인으로 돌아가기
        </button>
        <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--dash-text)', marginBottom: '2px' }}>회원가입</div>
        <div style={{ fontSize: '13px', color: 'var(--dash-text-3)' }}>정보를 입력하고 직급을 선택해주세요</div>
      </div>

      {/* 이름 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--dash-text-2)' }}>이름</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="실명을 입력하세요"
          style={inputStyle}
        />
      </div>

      {/* 아이디 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--dash-text-2)' }}>아이디</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="3자 이상 영문·숫자"
          style={inputStyle}
        />
      </div>

      {/* 비밀번호 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--dash-text-2)' }}>비밀번호</label>
        <div style={{ position: 'relative' }}>
          <input
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="4자 이상"
            style={{ ...inputStyle, paddingRight: '40px', width: '100%', boxSizing: 'border-box' }}
          />
          <button
            onClick={() => setShowPw(!showPw)}
            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--dash-text-4)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {showPw ? <EyeOff style={{ width: '16px', height: '16px' }} /> : <Eye style={{ width: '16px', height: '16px' }} />}
          </button>
        </div>
      </div>

      {/* 비밀번호 확인 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--dash-text-2)' }}>비밀번호 확인</label>
        <div style={{ position: 'relative' }}>
          <input
            type={showConfirm ? 'text' : 'password'}
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !loading) handleSubmit(); }}
            placeholder="비밀번호 재입력"
            style={{ ...inputStyle, paddingRight: '40px', width: '100%', boxSizing: 'border-box' }}
          />
          <button
            onClick={() => setShowConfirm(!showConfirm)}
            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--dash-text-4)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {showConfirm ? <EyeOff style={{ width: '16px', height: '16px' }} /> : <Eye style={{ width: '16px', height: '16px' }} />}
          </button>
        </div>
      </div>

      {/* 직급 선택 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--dash-text-2)' }}>직급</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {POSITIONS.map((p) => (
            <button
              key={p}
              onClick={() => setPosition(p)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '10px 14px',
                borderRadius: '8px',
                border: position === p ? '1.5px solid #2563EB' : '1px solid var(--dash-border-med)',
                backgroundColor: position === p ? 'rgba(37,99,235,0.07)' : 'var(--dash-input-bg)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'border-color 0.15s, background-color 0.15s',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: position === p ? 600 : 400, color: position === p ? '#2563EB' : 'var(--dash-text)' }}>
                {POSITION_DISPLAY_NAMES[p] ?? p}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--dash-text-3)', marginTop: '2px' }}>
                {POSITION_LABELS[p]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div style={{ fontSize: '12px', color: '#EF4444', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '8px 12px' }}>
          {error}
        </div>
      )}

      {/* 가입 버튼 */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          padding: '11px',
          fontSize: '14px',
          fontWeight: 600,
          borderRadius: '8px',
          backgroundColor: '#2563EB',
          color: 'white',
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
          transition: 'opacity 0.15s',
        }}
      >
        {loading ? '가입 중...' : '회원가입'}
      </button>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '10px 14px',
  fontSize: '13px',
  borderRadius: '8px',
  border: '1px solid var(--dash-border-med)',
  backgroundColor: 'var(--dash-input-bg)',
  color: 'var(--dash-text)',
  outline: 'none',
};
