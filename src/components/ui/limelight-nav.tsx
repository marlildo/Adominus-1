import React, { useState, useRef, useLayoutEffect, cloneElement } from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type NavItem = {
  id: string | number;
  icon: React.ReactElement;
  label?: string;
  onClick?: () => void;
};

type LimelightNavProps = {
  items: NavItem[];
  defaultActiveIndex?: number;
  onTabChange?: (index: number) => void;
  className?: string;
  limelightClassName?: string;
  iconContainerClassName?: string;
  iconClassName?: string;
};

export const LimelightNav = ({
  items,
  defaultActiveIndex = 0,
  onTabChange,
  className,
  limelightClassName,
  iconContainerClassName,
  iconClassName,
}: LimelightNavProps) => {
  const [activeIndex, setActiveIndex] = useState(defaultActiveIndex);
  const [isReady, setIsReady] = useState(false);
  const navItemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const limelightRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (items.length === 0) return;

    const limelight = limelightRef.current;
    const activeItem = navItemRefs.current[activeIndex];

    if (limelight && activeItem) {
      const newLeft =
        activeItem.offsetLeft +
        activeItem.offsetWidth / 2 -
        limelight.offsetWidth / 2;
      limelight.style.left = `${newLeft}px`;

      if (!isReady) {
        setTimeout(() => setIsReady(true), 50);
      }
    }
  }, [activeIndex, isReady, items]);

  if (items.length === 0) return null;

  const handleItemClick = (index: number, itemOnClick?: () => void) => {
    setActiveIndex(index);
    onTabChange?.(index);
    itemOnClick?.();
  };

  return (
    <nav
      className={cn(
        "relative flex items-center border border-border bg-card rounded-2xl overflow-hidden",
        className
      )}
    >
      <TooltipProvider delayDuration={200}>
        {items.map(({ id, icon, label, onClick }, index) => (
          <Tooltip key={id}>
            <TooltipTrigger asChild>
              <a
                ref={(el) => (navItemRefs.current[index] = el)}
                className={cn(
                  "relative z-20 flex h-full cursor-pointer items-center justify-center p-5",
                  iconContainerClassName
                )}
                onClick={() => handleItemClick(index, onClick)}
                aria-label={label}
              >
                {cloneElement(icon, {
                  className: cn(
                    "w-6 h-6 transition-opacity duration-100 ease-in-out",
                    activeIndex === index ? "opacity-100" : "opacity-40",
                    icon.props.className,
                    iconClassName
                  ),
                })}
              </a>
            </TooltipTrigger>
            {label && (
              <TooltipContent side="bottom" className="text-xs font-medium">
                {label}
              </TooltipContent>
            )}
          </Tooltip>
        ))}
      </TooltipProvider>

      {/* Limelight highlight */}
      <div
        ref={limelightRef}
        className={cn(
          "absolute z-10 h-10 w-10 rounded-full bg-primary/15",
          isReady ? "transition-all duration-300 ease-in-out" : "",
          limelightClassName
        )}
        style={{ top: "50%", transform: "translateY(-50%)" }}
      />
    </nav>
  );
};
