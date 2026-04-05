import { ReactNode, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";

const ROUTE_ORDER: Record<string, number> = {
  "/": 0,
  "/tarefas": 1,
  "/habitos": 2,
  "/vicios": 3,
  "/foco": 4,
  "/financas": 5,
  "/notas": 6,
  "/revisao-semanal": 7,
  "/ranking": 8,
  "/conquistas": 9,
  "/configuracoes": 10,
};

const pageVariants = {
  enter: (dir: number) => ({
    opacity: 0,
    x: dir > 0 ? 28 : -28,
    scale: 0.985,
    filter: "blur(3px)",
  }),
  center: {
    opacity: 1,
    x: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      opacity: { duration: 0.28, ease: "easeOut" },
      x: { type: "spring", stiffness: 340, damping: 32, mass: 0.8 },
      scale: { type: "spring", stiffness: 340, damping: 32, mass: 0.8 },
      filter: { duration: 0.2, ease: "easeOut" },
    },
  },
  exit: (dir: number) => ({
    opacity: 0,
    x: dir > 0 ? -20 : 20,
    scale: 0.98,
    filter: "blur(2px)",
    transition: {
      opacity: { duration: 0.18, ease: "easeIn" },
      x: { type: "spring", stiffness: 380, damping: 36 },
      scale: { duration: 0.18, ease: "easeIn" },
      filter: { duration: 0.15, ease: "easeIn" },
    },
  }),
};

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const prevPathRef = useRef<string>(location.pathname);

  const prevOrder = ROUTE_ORDER[prevPathRef.current] ?? 0;
  const currOrder = ROUTE_ORDER[location.pathname] ?? 0;
  const direction = currOrder >= prevOrder ? 1 : -1;

  // Update ref after computing direction
  const prevPath = prevPathRef.current;
  if (prevPath !== location.pathname) {
    prevPathRef.current = location.pathname;
  }

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={location.pathname}
        custom={direction}
        variants={pageVariants}
        initial="enter"
        animate="center"
        exit="exit"
        className="h-full w-full"
        style={{ willChange: "transform, opacity" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
