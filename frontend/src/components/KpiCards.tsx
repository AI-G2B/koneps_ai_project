import { FileText, Clock, BrainCircuit, ShieldAlert, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { type Bid, isDeadlineUrgent, TODAY } from './mockData';

interface KpiCardsProps {
  bids: Bid[];
  bidsLoading?: boolean;
}

interface KpiCardProps {
  title: string;
  value: string;
  unit: string;
  sub: string;
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

function KpiCard({ title, value, unit, sub, trend, trendUp, icon: Icon, iconBgColor, iconColor, accentColor, alert, progress, progressLabel, loading }: KpiCardProps) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col"
      style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderLeftWidth: '3px', borderLeftColor: accentColor }}
    >
      <div className="flex items-start justify-between mb-3">
        <div style={{ fontSize: '12px', color: 'var(--dash-text-3)' }}>{title}</div>
        <div className="rounded-xl flex items-center justify-center flex-shrink-0" style={{ width: '38px', height: '38px', backgroundColor: iconBgColor }}>
          <Icon style={{ width: '18px', height: '18px', color: iconColor }} />
        </div>
      </div>

      <div className="flex items-baseline gap-1.5 mb-2">
        {loading ? (
          <Loader2 className="animate-spin" style={{ width: '24px', height: '24px', color: 'var(--dash-text-4)' }} />
        ) : (
          <>
            <span style={{ fontSize: '32px', fontWeight: 700, color: 'var(--dash-text)', lineHeight: 1 }}>{value}</span>
            <span style={{ fontSize: '13px', color: 'var(--dash-text-3)' }}>{unit}</span>
          </>
        )}
      </div>

      {progress !== undefined && (
        <div className="mb-2">
          <div className="rounded-full overflow-hidden" style={{ height: '4px', backgroundColor: 'var(--dash-border)' }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, backgroundColor: accentColor }} />
          </div>
          {progressLabel && (
            <div className="flex justify-between mt-1">
              <span style={{ fontSize: '10px', color: 'var(--dash-text-4)' }}>{progressLabel}</span>
              <span style={{ fontSize: '10px', color: accentColor }}>{progress}%</span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 mt-auto">
        {alert && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: accentColor, animation: 'pulse 2s infinite' }} />}
        <span style={{ fontSize: '11px', color: 'var(--dash-text-2)' }}>{sub}</span>
        {trend && (
          <span className="flex items-center gap-0.5 ml-auto" style={{ fontSize: '11px', color: trendUp ? '#22C55E' : '#EF4444' }}>
            {trendUp ? <TrendingUp style={{ width: '12px', height: '12px' }} /> : <TrendingDown style={{ width: '12px', height: '12px' }} />}
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

export function KpiCards({ bids, bidsLoading = false }: KpiCardsProps) {
  // 오늘 수집된 공고
  const todayStr = TODAY.toISOString().slice(0, 10);
  const todayBids = bids.filter((b) => b.collectedAt === todayStr);

  // 어제 수집된 공고 (트렌드 계산용)
  const yesterday = new Date(TODAY);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  const yesterdayBids = bids.filter((b) => b.collectedAt === yesterdayStr);
  const todayCount = todayBids.length;
  const yesterdayCount = yesterdayBids.length;
  const diffCount = todayCount - yesterdayCount;
  const diffPct = yesterdayCount > 0 ? ((diffCount / yesterdayCount) * 100).toFixed(1) : '0';

  // 마감 임박 (3일 이내)
  const urgentBids = bids.filter((b) => isDeadlineUrgent(b.deadline));

  // AI 분석 완료
  const completedBids = bids.filter((b) => b.aiStatus === 'complete');
  const analyzingBids = bids.filter((b) => b.aiStatus === 'analyzing');
  const analyzeProgress = Math.round((completedBids.length / bids.length) * 100);

  // 위험 공고
  const dangerBids = bids.filter((b) => b.risk === 'danger');

  return (
    <div className="grid grid-cols-4 gap-4">
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
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
        <KpiCard
          title="AI 분석 완료"
          value={String(completedBids.length)}
          unit={`/ ${bids.length}건`}
          sub={`${analyzingBids.length}건 분석 대기 중`}
          icon={BrainCircuit}
          iconBgColor="rgba(34,197,94,0.12)"
          iconColor="#22C55E"
          accentColor="#22C55E"
          progress={analyzeProgress}
          progressLabel="분석 완료율"
          loading={bidsLoading}
        />
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.21 }}>
        <KpiCard
          title="위험 공고 감지"
          value={String(dangerBids.length)}
          unit="건"
          sub="독소조항 포함 공고"
          trend={`+${dangerBids.length}건`}
          trendUp={false}
          icon={ShieldAlert}
          iconBgColor="rgba(245,158,11,0.12)"
          iconColor="#F59E0B"
          accentColor="#F59E0B"
          alert={dangerBids.length > 0}
          loading={bidsLoading}
        />
      </motion.div>
    </div>
  );
}
