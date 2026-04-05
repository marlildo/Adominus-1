"use client";

import { useState, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  Home, Mail, Calendar, Camera, Music, Settings,
  FileText, MessageCircle, Globe, Folder,
} from "lucide-react";

interface DockItem {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
}

const dockItems: DockItem[] = [
  { id: "finder", name: "Finder", icon: <Folder className="w-1/2 h-1/2 text-white" />, color: "bg-[#212121]" },
  { id: "home", name: "Home", icon: <Home className="w-1/2 h-1/2 text-white" />, color: "bg-[#333333]" },
  { id: "mail", name: "Mail", icon: <Mail className="w-1/2 h-1/2 text-white" />, color: "bg-[#212121]" },
  { id: "calendar", name: "Calendar", icon: <Calendar className="w-1/2 h-1/2 text-white" />, color: "bg-primary" },
  { id: "camera", name: "Camera", icon: <Camera className="w-1/2 h-1/2 text-white" />, color: "bg-[#333333]" },
  { id: "music", name: "Music", icon: <Music className="w-1/2 h-1/2 text-white" />, color: "bg-primary" },
  { id: "messages", name: "Messages", icon: <MessageCircle className="w-1/2 h-1/2 text-white" />, color: "bg-secondary" },
  { id: "safari", name: "Safari", icon: <Globe className="w-1/2 h-1/2 text-white" />, color: "bg-[#212121]" },
  { id: "notes", name: "Notes", icon: <FileText className="w-1/2 h-1/2 text-white" />, color: "bg-secondary" },
  { id: "settings", name: "Settings", icon: <Settings className="w-1/2 h-1/2 text-white" />, color: "bg-[#333333]" },
];

function DockIcon({ item, mouseX }: { item: DockItem; mouseX: ReturnType<typeof useMotionValue<number>> }) {
  const ref = useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthSync = useTransform(distance, [-150, 0, 150], [50, 80, 50]);
  const width = useSpring(widthSync, { mass: 0.1, stiffness: 150, damping: 12 });

  const heightSync = useTransform(distance, [-150, 0, 150], [50, 80, 50]);
  const height = useSpring(heightSync, { mass: 0.1, stiffness: 150, damping: 12 });

  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      ref={ref}
      style={{ width, height }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="aspect-square cursor-pointer flex items-center justify-center relative group"
      whileTap={{ scale: 0.95 }}
    >
      <motion.div className="w-full h-full rounded-2xl overflow-hidden relative shadow-lg">
        <div className={`w-full h-full ${item.color} flex items-center justify-center`}>
          {item.icon}
        </div>
        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-white/30 pointer-events-none rounded-2xl" />
      </motion.div>

      {/* Tooltip */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? -4 : 4 }}
        transition={{ duration: 0.15 }}
        className="absolute -top-10 px-2.5 py-1 rounded-lg bg-popover border border-border text-popover-foreground text-xs font-medium shadow-lg whitespace-nowrap pointer-events-none"
      >
        {item.name}
      </motion.div>

      {/* Active indicator dot */}
      <div className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-muted-foreground/50" />
    </motion.div>
  );
}

export function DockTabs() {
  const mouseX = useMotionValue(Infinity);

  return (
    <div className="flex items-end justify-center w-full">
      <motion.div
        onMouseMove={(e) => mouseX.set(e.pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        className="mx-auto flex h-20 items-end gap-4 rounded-3xl bg-muted/40 backdrop-blur-md px-4 pb-3.5 border-2 border-border/20 shadow-xl"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
      >
        {dockItems.map((item) => (
          <DockIcon key={item.id} item={item} mouseX={mouseX} />
        ))}
      </motion.div>
    </div>
  );
}
