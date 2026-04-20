import { useState } from 'react';
import { Building2, Eye, EyeOff, ShieldCheck, BarChart3 } from 'lucide-react';

export type UserRole = 'manager' | 'ceo';

export interface User {
  role: UserRole;
  name: string;
}

const MOCK_USERS = [
  { id: 'manager01', password: '1234', role: 'manager' as UserRole, name: '김영철 PM' },
  { id: 'ceo01', password: '1234', role: 'ceo' as UserRole, name: '이대표 대표' },
];

interface LoginPageProps {
  onLogin: (user: User) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setError('');
    setLoading(true);
    setTimeout(() => {
      const user = MOCK_USERS.find((u) => u.id === id && u.password === password);
      if (user) {
        onLogin({ role: user.role, name: user.name });
      } else {
        setError('아이디 또는 비밀번호가 올바르지 않습니다.');
      }
      setLoading(false);
    }, 600);
  };

  const handleQuickLogin = (role: UserRole) => {
    const user = MOCK_USERS.find((u) => u.role === role);
    if (user) onLogin({ role: user.role, name: user.name });
  };

  return (
    <div
      className="flex h-screen w-screen items-center justify-center"
      style={{ backgroundColor: 'var(--dash-bg)', fontFamily: "'Noto Sans KR', -apple-system, sans-serif" }}
    >
      <div className="flex w-full max-w-4xl" style={{ gap: '48px', alignItems: 'center', padding: '0 24px' }}>

        {/* 왼쪽: 브랜드 */}
        <div className="flex-1 hidden md:flex flex-col" style={{ gap: '24px' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)' }}
            >
              <Building2 style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--dash-text-4)' }}>나라장터</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--dash-text)' }}>AI 입찰 분석 플랫폼</div>
            </div>
          </div>

          <div style={{ fontSize: '14px', color: 'var(--dash-text-3)', lineHeight: 1.8 }}>
            공공 조달 입찰공고를 AI로 자동 분석하여<br />
            최적의 입찰 전략을 수립하세요.
          </div>

          {/* 역할 설명 카드 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { icon: ShieldCheck, color: '#2563EB', bg: 'rgba(37,99,235,0.1)', title: '담당자', desc: '공고 수집·분석·위험도 검토 및 제안목차 생성' },
              { icon: BarChart3, color: '#7C3AED', bg: 'rgba(124,58,237,0.1)', title: 'CEO', desc: '입찰 현황 요약·KPI·전략 리포트 확인' },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-center gap-3 rounded-xl"
                style={{ padding: '14px 16px', backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)' }}
              >
                <div className="rounded-lg flex items-center justify-center flex-shrink-0" style={{ width: '36px', height: '36px', backgroundColor: item.bg }}>
                  <item.icon style={{ width: '18px', height: '18px', color: item.color }} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--dash-text)' }}>{item.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--dash-text-3)' }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 오른쪽: 로그인 폼 */}
        <div
          className="rounded-2xl flex flex-col"
          style={{
            width: '380px',
            flexShrink: 0,
            padding: '36px',
            backgroundColor: 'var(--dash-card)',
            border: '1px solid var(--dash-border)',
            gap: '20px',
          }}
        >
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--dash-text)', marginBottom: '4px' }}>로그인</div>
            <div style={{ fontSize: '13px', color: 'var(--dash-text-3)' }}>계정 정보를 입력해주세요</div>
          </div>

          {/* 아이디 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--dash-text-2)' }}>아이디</label>
            <input
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="아이디를 입력하세요"
              style={{
                padding: '10px 14px',
                fontSize: '13px',
                borderRadius: '8px',
                border: '1px solid var(--dash-border-med)',
                backgroundColor: 'var(--dash-input-bg)',
                color: 'var(--dash-text)',
                outline: 'none',
              }}
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
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="비밀번호를 입력하세요"
                style={{
                  width: '100%',
                  padding: '10px 40px 10px 14px',
                  fontSize: '13px',
                  borderRadius: '8px',
                  border: '1px solid var(--dash-border-med)',
                  backgroundColor: 'var(--dash-input-bg)',
                  color: 'var(--dash-text)',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <button
                onClick={() => setShowPw(!showPw)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--dash-text-4)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                {showPw ? <EyeOff style={{ width: '16px', height: '16px' }} /> : <Eye style={{ width: '16px', height: '16px' }} />}
              </button>
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div style={{ fontSize: '12px', color: '#EF4444', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '8px 12px' }}>
              {error}
            </div>
          )}

          {/* 로그인 버튼 */}
          <button
            onClick={handleLogin}
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
            {loading ? '로그인 중...' : '로그인'}
          </button>

          {/* 구분선 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--dash-border)' }} />
            <span style={{ fontSize: '11px', color: 'var(--dash-text-4)' }}>빠른 로그인 (데모)</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--dash-border)' }} />
          </div>

          {/* 빠른 로그인 */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { role: 'manager' as UserRole, label: '담당자로 입장', color: '#2563EB', bg: 'rgba(37,99,235,0.08)', border: 'rgba(37,99,235,0.2)' },
              { role: 'ceo' as UserRole, label: 'CEO로 입장', color: '#7C3AED', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.2)' },
            ].map((item) => (
              <button
                key={item.role}
                onClick={() => handleQuickLogin(item.role)}
                style={{
                  flex: 1,
                  padding: '9px',
                  fontSize: '12px',
                  fontWeight: 500,
                  borderRadius: '8px',
                  backgroundColor: item.bg,
                  color: item.color,
                  border: `1px solid ${item.border}`,
                  cursor: 'pointer',
                  transition: 'opacity 0.15s',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div style={{ fontSize: '11px', color: 'var(--dash-text-5)', textAlign: 'center' }}>
            데모 계정: manager01 / ceo01 (비밀번호: 1234)
          </div>
        </div>
      </div>
    </div>
  );
}
