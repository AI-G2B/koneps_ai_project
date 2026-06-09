import { useState } from 'react';
import { ShieldCheck, LogOut, Settings, FileText, Wrench } from 'lucide-react';
import type { User } from './LoginPage';
import { AdminPromptManager } from './AdminPromptManager';
import { AdminLLMConfig } from './AdminLLMConfig';
import { AdminOps } from './AdminOps';

type AdminTab = 'llm' | 'prompts' | 'ops';

interface AdminConsoleProps {
  user: User;
  onLogout: () => void;
}

const TABS: Array<{ key: AdminTab; label: string; icon: typeof Settings }> = [
  { key: 'llm', label: 'LLM 설정', icon: Settings },
  { key: 'prompts', label: '프롬프트 관리', icon: FileText },
  { key: 'ops', label: '운영', icon: Wrench },
];

export function AdminConsole({ user, onLogout }: AdminConsoleProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('llm');

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--dash-bg)', color: 'var(--dash-text)' }}>
      {/* 상단 헤더 */}
      <header
        style={{
          height: '64px',
          padding: '0 28px',
          borderBottom: '1px solid var(--dash-border)',
          backgroundColor: 'var(--dash-card)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck style={{ width: '20px', height: '20px', color: '#fff' }} />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--dash-text)' }}>koneps 관리자 콘솔</div>
            <div style={{ fontSize: '11px', color: 'var(--dash-text-3)' }}>
              {user.name} ({user.username}) · 관리자
            </div>
          </div>
        </div>
        <button
          onClick={onLogout}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid var(--dash-border)',
            backgroundColor: 'transparent',
            color: 'var(--dash-text-3)',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          <LogOut style={{ width: '14px', height: '14px' }} />
          로그아웃
        </button>
      </header>

      {/* 탭 + 컨텐츠 */}
      <div style={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
        {/* 좌측 탭 */}
        <nav
          style={{
            width: '240px',
            borderRight: '1px solid var(--dash-border)',
            backgroundColor: 'var(--dash-card)',
            padding: '20px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  backgroundColor: active ? 'rgba(99,102,241,0.12)' : 'transparent',
                  color: active ? '#6366F1' : 'var(--dash-text-2)',
                  transition: 'background-color 0.12s',
                }}
              >
                <Icon style={{ width: '18px', height: '18px', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{label}</span>
              </button>
            );
          })}
        </nav>

        {/* 컨텐츠 영역 */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
          {activeTab === 'llm' && <AdminLLMConfig />}
          {activeTab === 'prompts' && <AdminPromptManager />}
          {activeTab === 'ops' && <AdminOps />}
        </main>
      </div>
    </div>
  );
}

