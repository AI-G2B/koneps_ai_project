import { useState } from 'react';
import { Building2, Eye, EyeOff, ShieldCheck, BarChart3 } from 'lucide-react';
import { SignUpForm } from './SignUpForm';

export type UserRole = 'manager' | 'ceo' | 'proposal' | 'admin';

export interface User {
  id: number;
  username: string;
  name: string;
  role: UserRole;
}

const TEST_ACCOUNTS = [
  { label: "담당자", username: "manager01", password: "1234" },
  { label: "담당자", username: "manager02", password: "1234" },
  { label: "담당자", username: "manager03", password: "1234" },
  { label: "CEO", username: "ceo01", password: "1234" },
  { label: "관리자", username: "admin01", password: "1234" },
];

interface LoginPageProps {
  onLogin: (username: string, password: string) => Promise<void>;
  loginError?: string;
}

export function LoginPage({ onLogin, loginError }: LoginPageProps) {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    await onLogin(id, password);
    setLoading(false);
  };

  const quickLogin = async (username: string, pw: string) => {
    if (loading) return;
    setId(username);
    setPassword(pw);
    setLoading(true);
    await onLogin(username, pw);
    setLoading(false);
  };

  const roleCards = [
    {
      icon: ShieldCheck,
      color: '#2563EB',
      bg: 'rgba(37,99,235,0.1)',
      title: '담당자',
      desc: '공고 수집·분석·위험도 검토 및 제안목차 생성',
      username: 'manager01',
      password: '1234',
    },
    {
      icon: BarChart3,
      color: '#7C3AED',
      bg: 'rgba(124,58,237,0.1)',
      title: 'CEO',
      desc: '입찰 현황 요약·KPI·전략 리포트 확인',
      username: 'ceo01',
      password: '1234',
    },
  ];

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

          {/* 역할 설명 카드 — 클릭 시 해당 테스트 계정으로 로그인 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {roleCards.map((item) => (
              <div
                key={item.title}
                className="flex items-center gap-3 rounded-xl"
                style={{
                  padding: '14px 16px',
                  backgroundColor: 'var(--dash-card)',
                  border: '1px solid var(--dash-border)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  transition: 'opacity 0.15s',
                }}
                onClick={() => quickLogin(item.username, item.password)}
                onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLDivElement).style.opacity = '0.75'; }}
                onMouseLeave={(e) => { if (!loading) (e.currentTarget as HTMLDivElement).style.opacity = '1'; }}
              >
                <div className="rounded-lg flex items-center justify-center flex-shrink-0" style={{ width: '36px', height: '36px', backgroundColor: item.bg }}>
                  <item.icon style={{ width: '18px', height: '18px', color: item.color }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--dash-text)' }}>{item.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--dash-text-3)' }}>{item.desc}</div>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--dash-text-4)', whiteSpace: 'nowrap' }}>테스트 로그인</div>
              </div>
            ))}

            {/* 어드민 카드 */}
            <div
              className="flex items-center gap-3 rounded-xl"
              style={{
                padding: '14px 16px',
                backgroundColor: 'rgba(71,85,105,0.08)',
                border: '1px solid rgba(71,85,105,0.25)',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                transition: 'opacity 0.15s',
              }}
              onClick={() => quickLogin('admin01', '1234')}
              onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLDivElement).style.opacity = '0.75'; }}
              onMouseLeave={(e) => { if (!loading) (e.currentTarget as HTMLDivElement).style.opacity = '1'; }}
            >
              <div className="rounded-lg flex items-center justify-center flex-shrink-0" style={{ width: '36px', height: '36px', backgroundColor: 'rgba(71,85,105,0.15)' }}>
                <ShieldCheck style={{ width: '18px', height: '18px', color: '#475569' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>어드민</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>시스템 설정 및 관리</div>
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8', whiteSpace: 'nowrap' }}>테스트 로그인</div>
            </div>
          </div>
        </div>

        {/* 오른쪽: 로그인 폼 또는 회원가입 폼 */}
        {showSignup ? (
          <SignUpForm
            onBack={() => setShowSignup(false)}
            onSuccess={() => setShowSignup(false)}
          />
        ) : (
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
                onKeyDown={(e) => { if (e.key === 'Enter' && !loading) handleLogin(); }}
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
                  onKeyDown={(e) => { if (e.key === 'Enter' && !loading) handleLogin(); }}
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
            {loginError && (
              <div style={{ fontSize: '12px', color: '#EF4444', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '8px 12px' }}>
                {loginError}
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

            {/* 회원가입 링크 */}
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--dash-text-3)' }}>계정이 없으신가요? </span>
              <button
                onClick={() => setShowSignup(true)}
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#2563EB',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                회원가입
              </button>
            </div>

            {/* 테스트 계정 */}
            <div style={{ backgroundColor: 'var(--dash-card-deep)', border: '1px solid var(--dash-border)', borderRadius: '8px', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--dash-text-3)', marginBottom: '2px' }}>테스트 계정</div>
              {TEST_ACCOUNTS.map((acc) => (
                <div
                  key={acc.username}
                  onClick={() => { setId(acc.username); setPassword(acc.password); }}
                  style={{ fontSize: '11px', color: 'var(--dash-text-3)', cursor: 'pointer', display: 'flex', gap: '8px' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.color = 'var(--dash-text)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.color = 'var(--dash-text-3)'; }}
                >
                  <span style={{ width: '36px', flexShrink: 0 }}>{acc.label}</span>
                  <span>{acc.username} / {acc.password}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
