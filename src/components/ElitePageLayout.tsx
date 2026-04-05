import { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

export const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export const fadeLeft = {
  hidden: { opacity: 0, x: -14 },
  show: { opacity: 1, x: 0, transition: { duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export const fadeRight = {
  hidden: { opacity: 0, x: 14 },
  show: { opacity: 1, x: 0, transition: { duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export function ElitePageWrapper({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className={cn("p-6 lg:p-8 pb-24 max-w-[1200px] mx-auto space-y-6", className)}
    >
      {children}
    </motion.div>
  );
}

export function ElitePageHeader({
  icon, title, subtitle, action,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  iconColor?: string;
  action?: ReactNode;
}) {
  return (
    <motion.div variants={fadeUp} className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0"
          style={{
            background: "var(--accent)",
            color: "#F9F9F9",
          }}>
          {icon}
        </div>
        <div>
          <h1 className="font-display text-2xl font-extrabold leading-tight tracking-tight" style={{ color: "var(--text-primary)" }}>{title}</h1>
          {subtitle && <p className="text-[13px] mt-0.5" style={{ color: "var(--text-secondary)" }}>{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </motion.div>
  );
}

export function EliteCard({
  children, className, accentColor, onClick, delay = 0,
}: {
  children: ReactNode;
  className?: string;
  accentColor?: string;
  glowClass?: string;
  onClick?: () => void;
  delay?: number;
}) {
  return (
    <motion.div
      variants={fadeUp}
      transition={{ delay }}
      whileHover={{ y: -2 }}
      whileTap={onClick ? { scale: 0.97 } : {}}
      onClick={onClick}
      className={cn("dashboard-card relative overflow-hidden", onClick && "cursor-pointer", className)}
    >
      {accentColor && (
        <div className="absolute top-0 left-0 right-0 h-[2px] z-10" style={{ background: accentColor }} />
      )}
      {children}
    </motion.div>
  );
}

export function IconBadge({
  icon, color, size = "md",
}: {
  icon: ReactNode;
  color?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = { sm: "w-7 h-7 rounded-[10px]", md: "w-9 h-9 rounded-[10px]", lg: "w-11 h-11 rounded-[10px]" };
  const c = color || "var(--accent)";
  return (
    <div
      className={cn("flex items-center justify-center flex-shrink-0", sizes[size])}
      style={{ background: c, color: "#F9F9F9" }}
    >
      {icon}
    </div>
  );
}

export function EliteSectionTitle({
  icon, title, subtitle, color,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <IconBadge icon={icon} color={color} size="sm" />
      <div>
        <h2 className="font-display text-base font-bold leading-tight" style={{ color: "var(--text-primary)" }}>{title}</h2>
        {subtitle && <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>{subtitle}</p>}
      </div>
    </div>
  );
}

export function EliteStatPill({
  value, label, color,
}: {
  value: string | number;
  label: string;
  color?: string;
}) {
  const c = color || "var(--accent)";
  return (
    <div className="flex flex-col items-center px-3 py-2 rounded-[14px]"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderLeft: `3px solid ${c}`,
      }}
    >
      <span className="font-display text-lg font-bold tabular-nums leading-none" style={{ color: c }}>{value}</span>
      <span className="text-[10px] font-medium uppercase tracking-wide mt-1" style={{ color: "var(--text-tertiary)" }}>{label}</span>
    </div>
  );
}
