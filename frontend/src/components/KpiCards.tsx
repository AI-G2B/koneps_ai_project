import { FileText, Clock, TrendingUp, TrendingDown, Loader2, Inbox, Briefcase, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';
import { type Bid, type AiStatusType, isDeadlineUrgent, TODAY } from './mockData';

interface KpiCardsProps {
  bids: Bid[];
  bidsLoading?: boolean;
  ceoMode?: boolean;
  aiStatuses?: Record<string, AiStatusType>;
}

interface KpiCardProps {
  title: string;
  value: string;
  unit: string;
  sub: string;
  subColor?: string;
  trend?: string;
  trendUp?: boolean;
  icon: React.ElementType;
  iconBgColor: string;
  iconColor: string;
  accentColor: string;
  alert?: boolean;
  progress?: number;
  progressLabel?: string;
  loading?: boolean;
}

function KpiCard({ title, value, unit, sub, subColor, trend, trendUp, icon: Icon, iconBgColor, iconColor, accentColor, alert, progress, progressLabel, loading }: KpiCardProps) {
  return (
    <div
      className="rounded-xl flex flex-col"
      style={{
        backgroundColor: 'var(--dash-card)',
        border: '1px solid var(--dash-border)',
        borderLeftWidth: '3px',
        borderLeftColor: accentColor,
        padding: '10px 12px',
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <div style={{ fontSize: '11px', color: 'var(--dash-text-3)' }}>{title}</div>
        <div className="rounded-xl flex items-center justify-center flex-shrink-0" style={{ width: '30px', height: '30px', backgroundColor: iconBgColor }}>
          <Icon style={{ width: '14px', height: '14px', color: iconColor }} />
        </div>
      </div>

      <div className="flex items-baseline gap-1 mb-1.5">
        {loading ? (
          <Loader2 className="animate-spin" style={{ width: '20px', height: '20px', color: 'var(--dash-text-4)' }} />
        ) : (
          <>
            <span style={{ fontSize: '26px', fontWeight: 700, color: 'var(--dash-text)', lineHeight: 1 }}>{value}</span>
            <span style={{ fontSize: '11px', color: 'var(--dash-text-3)' }}>{unit}</span>
          </>
        )}
      </div>

      {progress !== undefined && (
        <div className="mb-1.5">
          <div className="rounded-full overflow-hidden" style={{ height: '3px', backgroundColor: 'var(--dash-border)' }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, backgroundColor: accentColor }} />
          </div>
          {progressLabel && (
            <div className="flex justify-between mt-0.5">
              <span style={{ fontSize: '9px', color: 'var(--dash-text-4)' }}>{progressLabel}</span>
              <span style={{ fontSize: '9px', color: accentColor }}>{progress}%</span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-1.5 mt-auto">
        {alert && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: accentColor, animation: 'pulse 2s infinite' }} />}
        <span style={{ fontSize: '10px', color: subColor || 'var(--dash-text-2)' }}>{sub}</span>
        {trend && (
          <span className="flex items-center gap-0.5 ml-auto" style={{ fontSize: '10px', color: trendUp ? '#22C55E' : '#EF4444' }}>
            {trendUp ? <TrendingUp style={{ width: '10px', height: '10px' }} /> : <TrendingDown style={{ width: '10px', height: '10px' }} />}
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

export function KpiCards({ bids, bidsLoading = false, ceoMode = false, aiStatuses: _aiStatuses }: KpiCardsProps) {
  const todayStr = TODAY.toISOString().slice(0, 10);

  // 영업담당자 모드 전용
  const urgentBids = bids.filter((b) => isDeadlineUrgent(b.deadline));
  const todayBids = bids.filter((b) => b.collectedAt === todayStr);
  const yesterday = new Date(TODAY);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  const yesterdayBids = bids.filter((b) => b.collectedAt === yesterdayStr);
  const todayCount = todayBids.length;
  const yesterdayCount = yesterdayBids.length;
  const diffCount = todayCount - yesterdayCount;
  const diffPct = yesterdayCount > 0 ? ((diffCount / yesterdayCount) * 100).toFixed(1) : '0';

  // CEO 모드 전용
  const dangerBids = bids.filter((b) => b.risk === 'danger');

  if (ceoMode) {
    if (bids.length === 0) {
      return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <div
            className="flex flex-col items-center justify-center text-center"
            style={{
              backgroundColor: 'rgba(124,58,237,0.04)',
              border: '1px solid rgba(124,58,237,0.12)',
              borderRadius: '12px',
              padding: '32px',
            }}
          >
            <Inbox style={{ width: '36px', height: '36px', color: '#7C3AED', marginBottom: '12px' }} />
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--dash-text)', marginBottom: '6px' }}>
              진행중인 사업이 없습니다
            </div>
            <div style={{ fontSize: '12px', color: 'var(--dash-text-4)' }}>
              담당자가 공고에 진행하기를 설정하면 여기에 표시됩니다
            </div>
          </div>
        </motion.div>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <KpiCard
            title="진행중 사업"
            value={String(bids.length)}
            unit="건"
            sub="현재 추진 중인 사업"
            icon={Briefcase}
            iconBgColor="rgba(124,58,237,0.12)"
            iconColor="#7C3AED"
            accentColor="#7C3AED"
            loading={bidsLoading}
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}>
          <KpiCard
            title="위험 사업"
            value={String(dangerBids.length)}
            unit="건"
            sub={dangerBids.length === 0 ? '위험 사업 없음 ✓' : '독소조항 포함 사업 확인 필요'}
            subColor={dangerBids.length === 0 ? '#22C55E' : undefined}
            icon={ShieldAlert}
            iconBgColor={dangerBids.length === 0 ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)'}
            iconColor={dangerBids.length === 0 ? '#22C55E' : '#F59E0B'}
            accentColor={dangerBids.length === 0 ? '#22C55E' : '#F59E0B'}
            alert={dangerBids.length > 0}
            loading={bidsLoading}
          />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
        <KpiCard
          title="오늘 신규 공고"
          value={String(todayCount)}
          unit="건"
          sub={diffCount >= 0 ? `어제 대비 +${diffCount}건 증가` : `어제 대비 ${diffCount}건 감소`}
          trend={`${diffCount >= 0 ? '+' : ''}${diffPct}%`}
          trendUp={diffCount >= 0}
          icon={FileText}
          iconBgColor="rgba(37,99,235,0.15)"
          iconColor="#2563EB"
          accentColor="#2563EB"
          loading={bidsLoading}
        />
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}>
        <KpiCard
          title="마감 임박 공고"
          value={String(urgentBids.length)}
          unit="건"
          sub="3일 이내 마감 예정"
          trend={`+${urgentBids.length}건`}
          trendUp={false}
          icon={Clock}
          iconBgColor="rgba(239,68,68,0.12)"
          iconColor="#EF4444"
          accentColor="#EF4444"
          alert={urgentBids.length > 0}
          loading={bidsLoading}
        />
      </motion.div>
    </div>
  );
}
