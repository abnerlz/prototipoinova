import { motion } from "framer-motion";

import { RISK_LABEL, riskLevelFromScore } from "@/lib/ai";
import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/types";

const CLASSES: Record<RiskLevel, string> = {
  baixo: "bg-risk-low/15 text-risk-low border-risk-low/40",
  moderado: "bg-risk-medium/15 text-risk-medium border-risk-medium/40",
  alto: "bg-risk-high/15 text-risk-high border-risk-high/40",
  critico: "bg-risk-critical/20 text-risk-critical border-risk-critical/50",
};

const STROKE: Record<RiskLevel, string> = {
  baixo: "var(--risk-low)",
  moderado: "var(--risk-medium)",
  alto: "var(--risk-high)",
  critico: "var(--risk-critical)",
};

export function RiskBadge({ level, className }: { level: RiskLevel; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
        CLASSES[level],
        className,
      )}
    >
      <span className={cn("relative h-1.5 w-1.5 rounded-full bg-current", level === "critico" && "pulse-dot")} />
      {RISK_LABEL[level]}
    </span>
  );
}

/** Medidor radial do índice de risco (0-100). */
export function RiskGauge({
  score,
  size = 168,
  label = "Índice de Risco",
  sublabel,
}: {
  score: number;
  size?: number;
  label?: string;
  sublabel?: string;
}) {
  const level = riskLevelFromScore(score);
  const radius = size / 2 - 12;
  const circumference = Math.PI * radius * 1.5;
  const offset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;

  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size * 0.78} viewBox={`0 0 ${size} ${size * 0.78}`}>
        <g transform={`rotate(135 ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${Math.PI * 2 * radius}`}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={STROKE[level]}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${Math.PI * 2 * radius}`}
            initial={false}
            animate={{ strokeDashoffset: offset }}
            transition={{ type: "spring", stiffness: 60, damping: 18 }}
            style={{ filter: `drop-shadow(0 0 8px ${STROKE[level]})` }}
          />
        </g>
        <text
          x="50%"
          y="58%"
          textAnchor="middle"
          className="font-display fill-foreground"
          style={{ fontSize: size * 0.26, fontWeight: 700 }}
        >
          {Math.round(score)}
        </text>
        <text
          x="50%"
          y="76%"
          textAnchor="middle"
          className="fill-muted-foreground"
          style={{ fontSize: size * 0.075, textTransform: "uppercase", letterSpacing: 1.5 }}
        >
          {label}
        </text>
      </svg>
      <RiskBadge level={level} />
      {sublabel ? <p className="mt-2 text-center text-xs text-muted-foreground">{sublabel}</p> : null}
    </div>
  );
}
