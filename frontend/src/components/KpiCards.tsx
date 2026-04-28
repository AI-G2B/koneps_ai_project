import { FileText, Clock, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { type Bid, isDeadlineUrgent, TODAY } from './mockData';

interface KpiCardsProps {
  bids: Bid[];
  bidsLoading?: boolean;
  ceoMode?: boolean;
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
      className="rounded-xl flex flex-col"
      style={{ backgroundColor: 'var(--dash-card)', border: '1px solid var(--dash-border)', borderLeftWidth: '3px', borderLeftColor: accentColor, padding: '10px 12px' }}
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
        <span style={{ fontSize: '10px', color: 'var(--dash-text-2)' }}>{sub}</span>
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

export function KpiCards({ bids, bidsLoading = false, ceoMode = false }: KpiCardsProps) {
  const todayStr = TODAY.toISOString().slice(0, 10);
  const urgentBids = bids.filter((b) => isDeadlineUrgent(b.deadline));

  // 영업담당자 모드 전용
  const todayBids = bids.filter((b) => b.collectedAt === todayStr);
  const yesterday = new Date(TODAY);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  const yesterdayBids = bids.filter((b) => b.collectedAt === yesterdayStr);
  const todayCount = todayBids.length;
  const yesterdayCount = yesterdayBids.length;
  const diffCount = todayCount - yesterdayCount;
  const diffPct = yesterdayCount > 0 ? ((diffCount / yesterdayCount) * 100).toFixed(1) : '0';

  return (
    <div className="grid grid-cols-2 gap-4">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
        {ceoMode ? (
          <KpiCard
            title="총 추진 공고"
            value={String(bids.length)}
            unit="건"
            sub="추진사업으로 등록된 공고"
            icon={FileText}
            iconBgColor="rgba(124,58,237,0.15)"
            iconColor="#7C3AED"
            accentColor="#7C3AED"
            loading={bidsLoading}
          />
        ) : (
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
        )}
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}>
        <KpiCard
          title={ceoMode ? '마감 임박 추진 공고' : '마감 임박 공고'}
          value={String(urgentBids.length)}
          unit="건"
          sub="3일 이내 마감 예정"
          trend={ceoMode ? undefined : `+${urgentBids.length}건`}
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
