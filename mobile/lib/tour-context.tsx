import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type { View } from "react-native";
import * as SecureStore from "expo-secure-store";

export const TOUR_KEY = "warranty-vault.tour";

export interface TourStep {
  /** Matches a useTourTarget(id) on screen; omit for a centred info card. */
  target?: string;
  title: string;
  body: string;
}

/**
 * Every step points at something visible on Home (the tab bar included), so
 * the tour never has to drive navigation mid-flight — which is what makes
 * coach-mark tours fragile.
 */
export const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to your vault",
    body: "A 60-second tour of how to log a product, get warned before cover ends, and claim when something breaks.",
  },
  {
    target: "home-summary",
    title: "Your household at a glance",
    body: "How many products you're currently protecting. Tap your avatar any time for profile and settings.",
  },
  {
    target: "home-categories",
    title: "Jump by category",
    body: "Appliances, electronics, tools — tap a tile to see just those items.",
  },
  {
    target: "home-expiring",
    title: "Expiring soon",
    body: "Products closest to losing cover, with a day countdown. This is the list to act on.",
  },
  {
    target: "home-add",
    title: "Add in seconds",
    body: "Snap the receipt and serial sticker, or import an order email — the details fill themselves in.",
  },
  {
    target: "tab-items",
    title: "Everything you own",
    body: "The full vault, with search and filters for warranty status, category and archived items.",
  },
  {
    target: "tab-claims",
    title: "Claims live here",
    body: "Open an item and build a claim package: your proof bundled into one PDF, ready to email the manufacturer.",
  },
  {
    title: "That's the tour",
    body: "Replay it any time from Profile → Settings → Take the tour.",
  },
];

export interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TourContextValue {
  active: boolean;
  stepIndex: number;
  step: TourStep | null;
  rect: TargetRect | null;
  start: () => void;
  next: () => void;
  stop: () => void;
  /** Registers a measurable element under an id used by TOUR_STEPS. */
  register: (id: string, node: View | null) => void;
  /** True once the tour has been completed or skipped on this device. */
  seen: () => boolean;
}

const TourContext = createContext<TourContextValue | null>(null);

export function ThemeAgnosticTourProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<TargetRect | null>(null);
  const targets = useRef(new Map<string, View>());

  const register = useCallback((id: string, node: View | null) => {
    if (node) targets.current.set(id, node);
    else targets.current.delete(id);
  }, []);

  const measure = useCallback((index: number) => {
    const step = TOUR_STEPS[index];
    if (!step?.target) {
      setRect(null);
      return;
    }
    const node = targets.current.get(step.target);
    if (!node) {
      setRect(null);
      return;
    }
    // measureInWindow gives screen coords, which is what the overlay uses.
    node.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) setRect({ x, y, width, height });
      else setRect(null);
    });
  }, []);

  const start = useCallback(() => {
    setStepIndex(0);
    setActive(true);
    // Let the overlay mount before the first measure.
    setTimeout(() => measure(0), 50);
  }, [measure]);

  const finish = useCallback(() => {
    setActive(false);
    setRect(null);
    try {
      SecureStore.setItem(TOUR_KEY, "done");
    } catch {}
  }, []);

  const next = useCallback(() => {
    setStepIndex((i) => {
      const n = i + 1;
      if (n >= TOUR_STEPS.length) {
        finish();
        return i;
      }
      setTimeout(() => measure(n), 0);
      return n;
    });
  }, [finish, measure]);

  const seen = useCallback(() => {
    try {
      return SecureStore.getItem(TOUR_KEY) === "done";
    } catch {
      return false;
    }
  }, []);

  const value = useMemo<TourContextValue>(
    () => ({
      active,
      stepIndex,
      step: active ? (TOUR_STEPS[stepIndex] ?? null) : null,
      rect,
      start,
      next,
      stop: finish,
      register,
      seen,
    }),
    [active, stepIndex, rect, start, next, finish, register, seen]
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export const TourProvider = ThemeAgnosticTourProvider;

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour outside TourProvider");
  return ctx;
}

/** Attach to a View's ref so the tour can spotlight it: ref={useTourTarget("home-add")} */
export function useTourTarget(id: string) {
  const { register } = useTour();
  return useCallback((node: View | null) => register(id, node), [id, register]);
}
