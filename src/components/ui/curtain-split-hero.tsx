"use client";

import {
  motion,
  useTransform,
  useReducedMotion,
  useMotionValue,
  useSpring,
  useMotionValueEvent,
  type MotionValue,
} from "framer-motion";
import { Sparkles } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/utils/cn";

export interface CurtainImageItem {
  src: string;
  alt: string;
}

export const EVENTRA_HERO_IMAGES: CurtainImageItem[] = [
  {
    src: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=900&q=80",
    alt: "College Hackathon Collaboration",
  },
  {
    src: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=900&q=80",
    alt: "Tech Conference Keynote Stage",
  },
  {
    src: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=900&q=80",
    alt: "Campus Cultural Music Festival",
  },
  {
    src: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=900&q=80",
    alt: "Interactive Engineering Workshop",
  },
  {
    src: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=900&q=80",
    alt: "Annual Entrepreneurship Summit",
  },
  {
    src: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=900&q=80",
    alt: "Student Cultural Night Crowd",
  },
  {
    src: "https://images.unsplash.com/photo-1560439514-0fc9d2cd5e1b?auto=format&fit=crop&w=900&q=80",
    alt: "Startup Pitch & Demo Day",
  },
  {
    src: "https://images.unsplash.com/photo-1571008887538-b36bb32f4571?auto=format&fit=crop&w=900&q=80",
    alt: "Inter-College Athletics Meet",
  },
];

const SPRING_CONFIG = { stiffness: 150, damping: 18, mass: 0.65 };
const POINTER_SPRING_CONFIG = { stiffness: 140, damping: 24, mass: 0.45 };

interface StageDimensions {
  width: number;
  height: number;
  isMobile: boolean;
}

interface CurtainCardProps {
  item: CurtainImageItem;
  index: number;
  total: number;
  progress: MotionValue<number>;
  pointer: { x: MotionValue<number>; y: MotionValue<number> };
  isSpreadActive: boolean;
  stage: StageDimensions;
}

function CurtainCard({
  item,
  index,
  total,
  progress,
  pointer,
  isSpreadActive,
  stage,
}: CurtainCardProps) {
  const half = total / 2;
  const isLeft = index % 2 === 0;
  const wingIndex = Math.floor(index / 2);
  const norm = half > 1 ? wingIndex / (half - 1) - 0.5 : 0;
  const sideMult = isLeft ? -1 : 1;

  const cardWidth = stage.isMobile ? 74 : 110;
  const cardHeight = stage.isMobile ? 102 : 148;

  const archCurve = Math.cos(norm * Math.PI) * (stage.width * 0.025);
  const targetX =
    sideMult * (stage.width * (stage.isMobile ? 0.36 : 0.37) + archCurve);
  const targetY = norm * (stage.height * 0.56);
  const targetRotate = sideMult * (norm * 16);

  const initialX = sideMult * (wingIndex * 6);
  const initialY = norm * 12;
  const initialRotate = sideMult * (wingIndex * 3.2);
  const stagger = wingIndex * 0.05;

  // Store latest layout metrics in a ref so GPU transform callbacks stay fresh on resize.
  const layoutRef = useRef({
    cardWidth,
    cardHeight,
    targetX,
    targetY,
    initialX,
    initialY,
    stagger,
    burstLiftY: stage.isMobile ? 54 : 88,
    maxParallaxX: stage.isMobile ? 6 : 16,
    maxParallaxY: stage.isMobile ? 5 : 14,
  });
  layoutRef.current = {
    cardWidth,
    cardHeight,
    targetX,
    targetY,
    initialX,
    initialY,
    stagger,
    burstLiftY: stage.isMobile ? 54 : 88,
    maxParallaxX: stage.isMobile ? 6 : 16,
    maxParallaxY: stage.isMobile ? 5 : 14,
  };

  const x = useTransform([progress, pointer.x], ([p, px]: number[]) => {
    const m = layoutRef.current;
    const clamped = Math.min(1, Math.max(0, p));
    const localP = Math.min(1, Math.max(0, (clamped - m.stagger) / (1 - m.stagger)));
    const easeP = 1 - Math.pow(1 - localP, 3.5);
    const tx = m.initialX + (m.targetX - m.initialX) * easeP;
    const dx = tx + px * (isLeft ? -m.maxParallaxX : m.maxParallaxX) * easeP;
    return -m.cardWidth / 2 + dx;
  });

  const y = useTransform([progress, pointer.y], ([p, py]: number[]) => {
    const m = layoutRef.current;
    const clamped = Math.min(1, Math.max(0, p));
    const localP = Math.min(1, Math.max(0, (clamped - m.stagger) / (1 - m.stagger)));
    const easeP = 1 - Math.pow(1 - localP, 3.5);
    const burstArc = Math.sin(Math.min(1, localP * 1.15) * Math.PI);
    const ty = m.initialY + (m.targetY - m.initialY) * easeP - burstArc * m.burstLiftY;
    const dy = ty + py * m.maxParallaxY * easeP;
    return -m.cardHeight / 2 + dy;
  });

  const rotate = useTransform(
    progress,
    [0, 0.45, 1],
    [initialRotate, isLeft ? -14 : 14, targetRotate],
  );

  const scale = useTransform(progress, [0, 0.25, 0.55, 1], [1, 1.12, 1.02, 0.92]);

  return (
    <motion.div
      className="pointer-events-auto absolute left-1/2 top-1/2 cursor-pointer select-none will-change-transform"
      style={{
        width: cardWidth,
        height: cardHeight,
        zIndex: isLeft ? index + 1 : total - index,
        x,
        y,
        rotate,
        scale,
      }}
    >
      <motion.div
        whileHover={
          isSpreadActive
            ? {
                scale: 1.09,
                rotate: isLeft ? 2 : -2,
                transition: { type: "spring", stiffness: 260, damping: 22 },
              }
            : { scale: 0.98 }
        }
        whileTap={{ scale: 1.03 }}
        className="group relative h-full w-full overflow-hidden rounded-xl bg-[#141419] shadow-xl shadow-black/50 ring-1 ring-white/15 transition-shadow duration-300 hover:shadow-2xl hover:ring-[#A78BFA]/60"
      >
        <img
          src={item.src}
          alt={item.alt}
          draggable={false}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
      </motion.div>
    </motion.div>
  );
}

export interface CurtainSplitHeroProps {
  images?: CurtainImageItem[];
  eyebrow?: string;
  title?: ReactNode;
  description?: string;
  actions?: ReactNode;
  defaultOpen?: boolean;
  introDelayMs?: number;
  onBurst?: () => void;
  className?: string;
  stageClassName?: string;
  showEditorialSerif?: boolean;
}

export default function CurtainSplitHero({
  images = EVENTRA_HERO_IMAGES,
  eyebrow = "Eventra • Campus & Beyond",
  title = (
    <>
      Find Your Next
      <br />
      Experience.
    </>
  ),
  description = "Discover college events, workshops, hackathons, competitions, and experiences happening around you.",
  actions,
  defaultOpen = false,
  introDelayMs = 0,
  onBurst,
  className,
  stageClassName,
  showEditorialSerif = false,
}: CurtainSplitHeroProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const hasIntro = introDelayMs > 0;
  const onBurstRef = useRef(onBurst);
  onBurstRef.current = onBurst;

  const [hasBurst, setHasBurst] = useState(!hasIntro || defaultOpen || Boolean(reduce));
  const hasBurstRef = useRef(hasBurst);
  hasBurstRef.current = hasBurst;

  const [stage, setStage] = useState<StageDimensions>({
    width: 1000,
    height: 600,
    isMobile: false,
  });

  const springConfig = reduce
    ? { stiffness: 600, damping: 60, mass: 0.4 }
    : SPRING_CONFIG;
  const pointerSpringConfig = reduce
    ? { stiffness: 600, damping: 60, mass: 0.3 }
    : POINTER_SPRING_CONFIG;

  const rawProgress = useMotionValue(
    defaultOpen ? (reduce ? 1 : 0.72) : hasIntro && reduce ? 1 : 0,
  );
  const progress = useSpring(rawProgress, springConfig);

  const [isSpreadActive, setIsSpreadActive] = useState(
    defaultOpen || (hasIntro && Boolean(reduce)),
  );
  useMotionValueEvent(progress, "change", (p) => setIsSpreadActive(p > 0.55));

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const pointerX = useSpring(rawX, pointerSpringConfig);
  const pointerY = useSpring(rawY, pointerSpringConfig);

  const triggerBurst = () => {
    if (!hasBurstRef.current) {
      hasBurstRef.current = true;
      setHasBurst(true);
      onBurstRef.current?.();
    }
    rawProgress.set(1);
  };

  useEffect(() => {
    if (defaultOpen) {
      const raf = window.requestAnimationFrame(() => {
        rawProgress.set(1);
      });
      return () => window.cancelAnimationFrame(raf);
    }
    if (hasIntro) {
      if (reduce) {
        hasBurstRef.current = true;
        setHasBurst(true);
        rawProgress.set(1);
        onBurstRef.current?.();
        return;
      }
      const timer = window.setTimeout(() => {
        if (!hasBurstRef.current) {
          hasBurstRef.current = true;
          setHasBurst(true);
          rawProgress.set(1);
          onBurstRef.current?.();
        }
      }, introDelayMs);
      return () => window.clearTimeout(timer);
    }
  }, [defaultOpen, hasIntro, introDelayMs, rawProgress, reduce]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const updateDimensions = () => {
      const rect = el.getBoundingClientRect();
      setStage({
        width: rect.width,
        height: rect.height,
        isMobile: rect.width < 768,
      });
    };

    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (hasIntro && !hasBurstRef.current) {
        e.preventDefault();
        if (Math.abs(e.deltaY) > 4) {
          triggerBurst();
        }
        return;
      }
      const current = rawProgress.get();
      const delta = e.deltaY * 0.0016;
      const next = Math.min(1, Math.max(0, current + delta));
      const atPageTop = typeof window === "undefined" || window.scrollY <= 12;

      if (
        (e.deltaY > 0 && current < 0.995) ||
        (e.deltaY < 0 && current > 0.005 && atPageTop)
      ) {
        e.preventDefault();
        rawProgress.set(next);
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [hasIntro, rawProgress]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduce) return;
    const rect = e.currentTarget.getBoundingClientRect();
    rawX.set(((e.clientX - rect.left) / rect.width - 0.5) * 2);
    rawY.set(((e.clientY - rect.top) / rect.height - 0.5) * 2);
  };

  const handlePointerLeave = () => {
    rawX.set(0);
    rawY.set(0);
  };

  const toggleCurtain = () => {
    if (hasIntro && !hasBurstRef.current) {
      triggerBurst();
      return;
    }
    rawProgress.set(rawProgress.get() > 0.5 ? 0 : 1);
  };

  const textY = useTransform(progress, [0.15, 0.78], [22, 0]);
  const textOpacity = useTransform(progress, [0.15, 0.55], [0, 1]);
  const textScale = useTransform(progress, [0.15, 0.78], [0.97, 1]);
  const lineScale = useTransform(progress, [0.22, 0.78], [0, 1]);

  return (
    <section
      className={cn(
        "relative flex w-full flex-col items-center justify-center overflow-x-clip",
        className,
      )}
    >
      <div
        ref={stageRef}
        onClick={toggleCurtain}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className={cn(
          "relative flex h-[480px] w-full cursor-pointer items-center justify-center bg-transparent text-white select-none sm:h-[520px] md:h-[560px]",
          stageClassName,
        )}
      >
        {/* Center Headline & Actions */}
        <motion.div
          className="pointer-events-none relative z-[15] flex max-w-md flex-col items-center px-6 text-center sm:max-w-lg"
          style={{ y: textY, opacity: textOpacity, scale: textScale }}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#A78BFA]/25 bg-[#A78BFA]/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-[#A78BFA]">
            <Sparkles className="h-3 w-3" />
            {eyebrow}
          </span>
          <h1
            className={cn(
              "mt-4 text-3xl font-bold tracking-tight leading-[1.02] text-white sm:text-4xl md:text-5xl",
              showEditorialSerif && "font-serif font-normal",
            )}
          >
            {title}
          </h1>
          <motion.div
            style={{ scaleX: lineScale }}
            className="my-4 h-px w-16 origin-center bg-[#A78BFA]/50 sm:w-20"
          />
          <p className="max-w-[44ch] text-xs leading-relaxed text-[#A1A1AA] sm:text-sm">
            {description}
          </p>

          {actions && (
            <div
              className={cn(
                "mt-6 flex flex-wrap items-center justify-center gap-3",
                isSpreadActive ? "pointer-events-auto" : "pointer-events-none",
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {actions}
            </div>
          )}
        </motion.div>

        {/* Bilateral Curtain Cards */}
        <motion.div
          className="pointer-events-none absolute inset-0 z-10"
          animate={
            hasIntro && !hasBurst && !reduce
              ? { y: [0, -7, 0] }
              : { y: 0 }
          }
          transition={
            hasIntro && !hasBurst && !reduce
              ? { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.4 }
          }
        >
          {images.map((item, i) => (
            <CurtainCard
              key={`${item.alt}-${i}`}
              item={item}
              index={i}
              total={images.length}
              progress={progress}
              pointer={{ x: pointerX, y: pointerY }}
              isSpreadActive={isSpreadActive}
              stage={stage}
            />
          ))}
        </motion.div>

        {/* Bottom Status Pill Indicator */}
        <div className="pointer-events-none absolute bottom-4 z-30 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-[10px] font-medium tracking-wide text-[#A1A1AA] backdrop-blur-sm transition-colors duration-300">
          <span
            className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${
              isSpreadActive ? "bg-[#A78BFA]" : "bg-amber-400"
            }`}
          />
          <span>
            {hasIntro && !hasBurst
              ? "Click or scroll to unveil Eventra"
              : isSpreadActive
                ? "Scroll up or click backdrop to fold cards"
                : "Scroll down or click to unveil Eventra"}
          </span>
        </div>
      </div>
    </section>
  );
}

