import { FileText, Clock, BrainCircuit, ShieldAlert, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'motion/react';

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
}

function KpiCard({
  title,
  value,
  unit,
  sub,
  trend,
  trendUp,
  icon: Icon,
  iconBgColor,
  iconColor,
  accentColor,
  alert,
  progress,
  progressLabel,
}: KpiCardProps) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col"
      style={{
        backgroundColor: 'var(--dash-card)',
        border: '1px solid var(--dash-border)',
        borderLeftWidth: '3px',
        borderLeftColor: accentColor,
      }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <div style={{ fontSize: '12px', color: 'var(--dash-text-3)' }}>{title}</div>
        <div
          className="rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ width: '38px', height: '38px', backgroundColor: iconBgColor }}
        >
          <Icon style={{ width: '18px', height: '18px', color: iconColor }} />
        </div>
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-1.5 mb-2">
        <span style={{ fontSize: '32px', fontWeight: 700, color: 'var(--dash-text)', lineHeight: 1 }}>{value}</span>
        <span style={{ fontSize: '13px', color: 'var(--dash-text-3)' }}>{unit}</span>
      </div>

      {/* Progress bar if needed */}
      {progress !== undefined && (
        <div className="mb-2">
          <div
            className="rounded-full overflow-hidden"
            style={{ height: '4px', backgroundColor: 'var(--dash-border)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progress}%`, backgroundColor: accentColor }}
            />
          </div>
          {progressLabel && (
            <div className="flex justify-between mt-1">
              <span style={{ fontSize: '10px', color: 'var(--dash-text-4)' }}>{progressLabel}</span>
              <span style={{ fontSize: '10px', color: accentColor }}>{progress}%</span>
            </div>
          )}
        </div>
      )}

      {/* Sub info */}
      <div className="flex items-center gap-2 mt-auto">
        {alert && (
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: accentColor, animation: 'pulse 2s infinite' }}
          />
        )}
        <span style={{ fontSize: '11px', color: 'var(--dash-text-2)' }}>{sub}</span>
        {trend && (
          <span
            className="flex items-center gap-0.5 ml-auto"
            style={{ fontSize: '11px', color: trendUp ? '#22C55E' : '#EF4444' }}
          >
            {trendUp ? (
              <TrendingUp style={{ width: '12px', height: '12px' }} />
            ) : (
              <TrendingDown style={{ width: '12px', height: '12px' }} />
            )}
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

export function KpiCards() {
  return (
    <div className="grid grid-cols-4 gap-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0 }}
      >
        <KpiCard
          title="오늘 신규 공고"
          value="47"
          unit="건"
          sub="어제 대비 +12건 증가"
          trend="+25.5%"
          trendUp={true}
          icon={FileText}
          iconBgColor="rgba(37,99,235,0.15)"
          iconColor="#2563EB"
          accentColor="#2563EB"
        />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.07 }}
      >
        <KpiCard
          title="마감 임박 공고"
          value="8"
          unit="건"
          sub="3일 이내 마감 예정"
          trend="+3건"
          trendUp={false}
          icon={Clock}
          iconBgColor="rgba(239,68,68,0.12)"
          iconColor="#EF4444"
          accentColor="#EF4444"
          alert={true}
        />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14 }}
      >
        <KpiCard
          title="AI 분석 완료"
          value="34"
          unit="/ 47건"
          sub="13건 분석 대기 중"
          icon={BrainCircuit}
          iconBgColor="rgba(34,197,94,0.12)"
          iconColor="#22C55E"
          accentColor="#22C55E"
          progress={72}
          progressLabel="분석 완료율"
        />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.21 }}
      >
        <KpiCard
          title="위험 공고 감지"
          value="5"
          unit="건"
          sub="독소조항 포함 공고"
          trend="+2건"
          trendUp={false}
          icon={ShieldAlert}
          iconBgColor="rgba(245,158,11,0.12)"
          iconColor="#F59E0B"
          accentColor="#F59E0B"
          alert={true}
        />
      </motion.div>
    </div>
  );
}
