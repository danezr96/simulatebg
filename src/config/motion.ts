// src/config/motion.ts
import { UI } from "./ui";

/**
 * Motion presets for Framer Motion.
 * Japandi vibe: calm, subtle, premium.
 *
 * Usage:
 *  - import { MOTION } from "@/config/motion"
 *  - <motion.div variants={MOTION.page.variants} initial="initial" animate="animate" exit="exit" />
 */

export const MOTION = {
  ease: UI.motion.easing,

  duration: UI.motion.durations,

  // Page-level transitions (route changes)
  page: {
    variants: {
      initial: UI.motion.transitions.page.initial,
      animate: {
        ...UI.motion.transitions.page.animate,
        transition: {
          duration: UI.motion.durations.normal,
          ease: UI.motion.easing.smooth,
        },
      },
      exit: {
        ...UI.motion.transitions.page.exit,
        transition: {
          duration: UI.motion.durations.fast,
          ease: UI.motion.easing.smooth,
        },
      },
    },
  },

  // Panel / card entrance transitions
  panel: {
    variants: {
      initial: UI.motion.transitions.panel.initial,
      animate: {
        ...UI.motion.transitions.panel.animate,
        transition: {
          duration: UI.motion.durations.normal,
          ease: UI.motion.easing.smooth,
        },
      },
      exit: {
        ...UI.motion.transitions.panel.exit,
        transition: {
          duration: UI.motion.durations.fast,
          ease: UI.motion.easing.smooth,
        },
      },
    },
  },

  // Stagger lists (tables, cards, rows)
  list: {
    container: {
      initial: { opacity: 0 },
      animate: {
        opacity: 1,
        transition: { staggerChildren: 0.06, delayChildren: 0.04 },
      },
    },
    item: {
      initial: { opacity: 0, y: 6, filter: "blur(6px)" },
      animate: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: { duration: UI.motion.durations.normal, ease: UI.motion.easing.smooth },
      },
    },
  },

  // Micro-interactions
  button: {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 },
    transition: { duration: UI.motion.durations.fast, ease: UI.motion.easing.snappy },
  },

  // Modal dialog
  modal: {
    overlay: {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: UI.motion.durations.fast } },
      exit: { opacity: 0, transition: { duration: UI.motion.durations.fast } },
    },
    content: {
      initial: { opacity: 0, y: 10, scale: 0.98, filter: "blur(8px)" },
      animate: {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
        transition: { duration: UI.motion.durations.normal, ease: UI.motion.easing.smooth },
      },
      exit: {
        opacity: 0,
        y: 8,
        scale: 0.98,
        filter: "blur(8px)",
        transition: { duration: UI.motion.durations.fast, ease: UI.motion.easing.smooth },
      },
    },
  },

  // Skeleton shimmer (optional, for loading states)
  skeleton: {
    shimmer: {
      initial: { backgroundPositionX: "0%" },
      animate: {
        backgroundPositionX: "200%",
        transition: { duration: 1.2, ease: "linear", repeat: Infinity },
      },
    },
  },
} as const;

export type MotionConfig = {
  reducedMotion?: "user" | "always" | "never";
  transition?: { duration?: number; ease?: any };
};

export const motionConfig: MotionConfig = {
  reducedMotion: "user",
  transition: { duration: 0.2 },
};

