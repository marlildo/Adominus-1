/**
 * ADOMINUS ICON SYSTEM — SF Symbols Style
 * Filled/solid SVG icons inside colored containers.
 * Container: 40x40px, border-radius 10px, icon 20px white.
 */

import React from "react";

interface IconProps {
  size?: number;
  className?: string;
  [key: string]: any;
}

interface ContainerStyle {
  background: string;
  border?: string;
}

function IconContainer({
  size = 40,
  containerStyle,
  className = "",
  children,
}: {
  size: number;
  containerStyle: ContainerStyle;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.25,
        background: containerStyle.background,
        border: containerStyle.border || "none",
      }}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}

const ICON_SIZE_RATIO = 0.5; // 20px icon in 40px container

// ── Dashboard (grid 4 quadrados) ──
export const IconDashboard: React.FC<IconProps> = ({ size = 40, className }) => (
  <IconContainer size={size} containerStyle={{ background: "#E85002" }} className={className}>
    <svg width={size * ICON_SIZE_RATIO} height={size * ICON_SIZE_RATIO} viewBox="0 0 20 20" fill="#F9F9F9">
      <rect x="1" y="1" width="7.5" height="7.5" rx="2" />
      <rect x="11.5" y="1" width="7.5" height="7.5" rx="2" />
      <rect x="1" y="11.5" width="7.5" height="7.5" rx="2" />
      <rect x="11.5" y="11.5" width="7.5" height="7.5" rx="2" />
    </svg>
  </IconContainer>
);

// ── Tarefas (checkmark em círculo) ──
export const IconTasks: React.FC<IconProps> = ({ size = 40, className }) => (
  <IconContainer size={size} containerStyle={{ background: "#E85002" }} className={className}>
    <svg width={size * ICON_SIZE_RATIO} height={size * ICON_SIZE_RATIO} viewBox="0 0 20 20" fill="#F9F9F9">
      <path d="M10 0C4.477 0 0 4.477 0 10s4.477 10 10 10 10-4.477 10-10S15.523 0 10 0zm4.95 7.05l-5.5 5.5a1 1 0 01-1.414 0l-2.5-2.5a1 1 0 111.414-1.414L8.75 10.43l4.793-4.793a1 1 0 011.414 1.414z" />
    </svg>
  </IconContainer>
);

// ── Hábitos (chama/flame) ──
export const IconHabits: React.FC<IconProps> = ({ size = 40, className }) => (
  <IconContainer size={size} containerStyle={{ background: "#C10801" }} className={className}>
    <svg width={size * ICON_SIZE_RATIO} height={size * ICON_SIZE_RATIO} viewBox="0 0 20 20" fill="#F9F9F9">
      <path d="M10 0C10 0 6 4 6 8c0 1.5.5 2.8 1.3 3.8C6.5 11 6 9.5 6 8c-2 2-3 4.5-3 7 0 3.87 3.13 7 7 7s7-3.13 7-7c0-5-4-10-7-15zm0 18c-2.21 0-4-1.79-4-4 0-1.5.8-3.2 2-4.5 0 1.5.5 3 1.5 4C10.5 14.5 11 15 12 15c1 0 2-.5 2-2 .5 1 1 2 1 3 0 2.21-1.79 4-4 4z" />
    </svg>
  </IconContainer>
);

// ── Vícios (escudo com X) ──
export const IconAddictions: React.FC<IconProps> = ({ size = 40, className }) => (
  <IconContainer size={size} containerStyle={{ background: "#C10801" }} className={className}>
    <svg width={size * ICON_SIZE_RATIO} height={size * ICON_SIZE_RATIO} viewBox="0 0 20 20" fill="#F9F9F9">
      <path d="M10 0L1 4v5c0 5.25 3.83 10.15 9 11.25C15.17 19.15 19 14.25 19 9V4L10 0zm3.54 12.54a1 1 0 01-1.414 0L10 10.414 7.874 12.54a1 1 0 01-1.414-1.414L8.586 9 6.46 6.874A1 1 0 017.874 5.46L10 7.586l2.126-2.126a1 1 0 011.414 1.414L11.414 9l2.126 2.126a1 1 0 010 1.414z" />
    </svg>
  </IconContainer>
);

// ── Modo Flow (raio/bolt) ──
export const IconFocusTree: React.FC<IconProps> = ({ size = 40, className }) => (
  <IconContainer size={size} containerStyle={{ background: "linear-gradient(135deg, #C10801, #E85002)" }} className={className}>
    <svg width={size * ICON_SIZE_RATIO} height={size * ICON_SIZE_RATIO} viewBox="0 0 20 20" fill="#F9F9F9">
      <path d="M11.5 0L4 11h5l-1.5 9L16 9h-5L11.5 0z" />
    </svg>
  </IconContainer>
);
export const IconFlowMode = IconFocusTree;

// ── Modo Análise (barras crescentes) ──
export const IconAnalysis: React.FC<IconProps> = ({ size = 40, className }) => (
  <IconContainer size={size} containerStyle={{ background: "var(--bg-card)", border: "1px solid #E85002" }} className={className}>
    <svg width={size * ICON_SIZE_RATIO} height={size * ICON_SIZE_RATIO} viewBox="0 0 20 20" fill="#F9F9F9">
      <rect x="1" y="12" width="4" height="8" rx="1" />
      <rect x="8" y="7" width="4" height="13" rx="1" />
      <rect x="15" y="2" width="4" height="18" rx="1" />
    </svg>
  </IconContainer>
);

// ── Finanças (seta diagonal para cima-direita em círculo) ──
export const IconFinance: React.FC<IconProps> = ({ size = 40, className }) => (
  <IconContainer size={size} containerStyle={{ background: "#E85002" }} className={className}>
    <svg width={size * ICON_SIZE_RATIO} height={size * ICON_SIZE_RATIO} viewBox="0 0 20 20" fill="#F9F9F9">
      <path d="M10 0C4.477 0 0 4.477 0 10s4.477 10 10 10 10-4.477 10-10S15.523 0 10 0zm4 7v4a1 1 0 01-2 0V9.414l-4.293 4.293a1 1 0 01-1.414-1.414L10.586 8H9a1 1 0 010-2h4a1 1 0 011 1z" />
    </svg>
  </IconContainer>
);

// ── Nutrição (folha) ──
export const IconNutrition: React.FC<IconProps> = ({ size = 40, className }) => (
  <IconContainer size={size} containerStyle={{ background: "var(--text-tertiary)" }} className={className}>
    <svg width={size * ICON_SIZE_RATIO} height={size * ICON_SIZE_RATIO} viewBox="0 0 20 20" fill="#F9F9F9">
      <path d="M17 1S7 3 5 10c-1 3.5 0 6 2 8 1-2 2-4 5-6-2 3-3 6-3 8 2 1 5 0 7-3 3-4 3-9 1-16z" />
    </svg>
  </IconContainer>
);

// ── Meditação (lua crescente) ──
export const IconMeditation: React.FC<IconProps> = ({ size = 40, className }) => (
  <IconContainer size={size} containerStyle={{ background: "var(--bg-card)" }} className={className}>
    <svg width={size * ICON_SIZE_RATIO} height={size * ICON_SIZE_RATIO} viewBox="0 0 20 20" fill="#F9F9F9">
      <path d="M7 0a10 10 0 000 20A10 10 0 107 0zm0 18a8 8 0 010-16 10 10 0 000 16z" />
    </svg>
  </IconContainer>
);

// ── Notas (documento com linhas) ──
export const IconNotes: React.FC<IconProps> = ({ size = 40, className }) => (
  <IconContainer size={size} containerStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)" }} className={className}>
    <svg width={size * ICON_SIZE_RATIO} height={size * ICON_SIZE_RATIO} viewBox="0 0 20 20" fill="#F9F9F9">
      <path d="M4 0a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V6l-6-6H4zm7 1.5L17.5 8H13a2 2 0 01-2-2V1.5zM5 10h10a1 1 0 010 2H5a1 1 0 010-2zm0 4h7a1 1 0 010 2H5a1 1 0 010-2z" />
    </svg>
  </IconContainer>
);

// ── Revisão Semanal (calendário com relógio) ──
export const IconWeeklyReview: React.FC<IconProps> = ({ size = 40, className }) => (
  <IconContainer size={size} containerStyle={{ background: "linear-gradient(135deg, #C10801, #E85002)" }} className={className}>
    <svg width={size * ICON_SIZE_RATIO} height={size * ICON_SIZE_RATIO} viewBox="0 0 20 20" fill="#F9F9F9">
      <path d="M3 2a2 2 0 00-2 2v12a2 2 0 002 2h7.07A7 7 0 0117 6.07V4a2 2 0 00-2-2h-1V1a1 1 0 00-2 0v1H8V1a1 1 0 00-2 0v1H3zm0 4h14v.07A7 7 0 005.07 18H3a2 2 0 01-2-2V6h2z" />
      <path d="M14 9a5 5 0 100 10 5 5 0 000-10zm1 5.5h-1.5a.5.5 0 01-.5-.5v-2.5a.5.5 0 011 0V13h1a.5.5 0 010 1z" />
    </svg>
  </IconContainer>
);

// ── Ranking (troféu) ──
export const IconRanking: React.FC<IconProps> = ({ size = 40, className }) => (
  <IconContainer size={size} containerStyle={{ background: "#E85002" }} className={className}>
    <svg width={size * ICON_SIZE_RATIO} height={size * ICON_SIZE_RATIO} viewBox="0 0 20 20" fill="#F9F9F9">
      <path d="M5 2H3a2 2 0 00-2 2v1a4 4 0 004 4h.28A5 5 0 009 12.9V15H7a1 1 0 00-1 1v2a1 1 0 001 1h6a1 1 0 001-1v-2a1 1 0 00-1-1h-2v-2.1A5 5 0 0014.72 9H15a4 4 0 004-4V4a2 2 0 00-2-2h-2V1a1 1 0 00-1-1H6a1 1 0 00-1 1v1zm-2 3V4h2v3.5A2 2 0 013 5zm14 0a2 2 0 01-2 2.5V4h2v1z" />
    </svg>
  </IconContainer>
);

// ── Conquistas (medalha/estrela) ──
export const IconAchievements: React.FC<IconProps> = ({ size = 40, className }) => (
  <IconContainer size={size} containerStyle={{ background: "#E85002" }} className={className}>
    <svg width={size * ICON_SIZE_RATIO} height={size * ICON_SIZE_RATIO} viewBox="0 0 20 20" fill="#F9F9F9">
      <path d="M10 0l2.5 6.5L19 7.5l-5 4.5 1.5 7L10 15.5 4.5 19l1.5-7-5-4.5 6.5-1L10 0z" />
    </svg>
  </IconContainer>
);

// ── Adominus AI (sparkle) ──
export const IconAI: React.FC<IconProps> = ({ size = 40, className }) => (
  <IconContainer size={size} containerStyle={{ background: "linear-gradient(135deg, #000000, #C10801, #E85002)" }} className={className}>
    <svg width={size * ICON_SIZE_RATIO} height={size * ICON_SIZE_RATIO} viewBox="0 0 20 20" fill="#F9F9F9">
      <path d="M10 0l1.5 6.5L18 8l-6.5 1.5L10 16l-1.5-6.5L2 8l6.5-1.5L10 0z" />
      <path d="M16 12l.75 2.25L19 15l-2.25.75L16 18l-.75-2.25L13 15l2.25-.75L16 12z" opacity="0.7" />
    </svg>
  </IconContainer>
);

// ── Leitor IA (livro aberto) ──
export const IconBibleReader: React.FC<IconProps> = ({ size = 40, className }) => (
  <IconContainer size={size} containerStyle={{ background: "var(--bg-card)", border: "1px solid #E85002" }} className={className}>
    <svg width={size * ICON_SIZE_RATIO} height={size * ICON_SIZE_RATIO} viewBox="0 0 20 20" fill="#F9F9F9">
      <path d="M10 3.5C8 2 5 1 2 1v14c3 0 6 1 8 2.5C12 16 15 15 18 15V1c-3 0-6 1-8 2.5z" />
      <path d="M10 3.5V17.5" stroke="var(--bg-card)" strokeWidth="0.5" />
    </svg>
  </IconContainer>
);

// ── Configurações (engrenagem) ──
export const IconSettings: React.FC<IconProps> = ({ size = 40, className }) => (
  <IconContainer size={size} containerStyle={{ background: "var(--text-tertiary)" }} className={className}>
    <svg width={size * ICON_SIZE_RATIO} height={size * ICON_SIZE_RATIO} viewBox="0 0 20 20" fill="#F9F9F9">
      <path d="M11.4 0h-2.8l-.5 2.2a8 8 0 00-2.1 1.2L3.9 2.5l-1.4 2.4 1.6 1.6a8 8 0 000 2.4L2.5 10.5l1.4 2.4 2.1-.9a8 8 0 002.1 1.2L8.6 16h2.8l.5-2.2a8 8 0 002.1-1.2l2.1.9 1.4-2.4-1.6-1.6a8 8 0 000-2.4l1.6-1.6-1.4-2.4-2.1.9a8 8 0 00-2.1-1.2L11.4 0zM10 6a2 2 0 110 4 2 2 0 010-4z" />
    </svg>
  </IconContainer>
);

// ── Logout (seta para fora — utility icon) ──
export const IconLogout: React.FC<IconProps> = ({ size = 24, className, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    {...props}
  >
    <path d="M5 3a2 2 0 00-2 2v14a2 2 0 002 2h5a1 1 0 100-2H5V5h5a1 1 0 100-2H5zm11.293 4.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L18.586 13H9a1 1 0 110-2h9.586l-2.293-2.293a1 1 0 010-1.414z" />
  </svg>
);
