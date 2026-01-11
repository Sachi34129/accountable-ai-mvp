import React from 'react';

/**
 * Minimal, dependency-free shim for a small subset of framer-motion used by our landing page.
 *
 * It preserves the JSX structure and styles so the design renders, but it does not animate.
 * If you later add `framer-motion` as a dependency, we can switch the landing page imports back.
 */

export type MotionValue<T = any> = {
  get: () => T;
  set: (next: T) => void;
};

export function useMotionValue<T>(initial: T): MotionValue<T> {
  const ref = React.useRef<T>(initial);
  return React.useMemo(
    () => ({
      get: () => ref.current,
      set: (next: T) => {
        ref.current = next;
      },
    }),
    []
  );
}

export function useSpring<T>(value: any, _options?: Record<string, any>): T {
  // No-op: just return the value (or its current value).
  if (value && typeof value === 'object' && typeof value.get === 'function') return value.get();
  return value as T;
}

export function useScroll(): { scrollYProgress: MotionValue<number> } {
  // We keep this constant; the landing page still renders fine without the progress animation.
  return { scrollYProgress: useMotionValue(0) };
}

export function useTransform<T>(value: any): T {
  // No-op: return the value as-is.
  if (value && typeof value === 'object' && typeof value.get === 'function') return value.get();
  return value as T;
}

export function useMotionTemplate(strings: TemplateStringsArray, ...values: any[]) {
  // Compute a plain string once. Not reactive, but good enough for static visuals.
  let out = '';
  for (let i = 0; i < strings.length; i++) {
    out += strings[i];
    if (i < values.length) {
      const v = values[i];
      if (v && typeof v === 'object' && typeof v.get === 'function') out += String(v.get());
      else out += String(v);
    }
  }
  return out;
}

type AnyProps = Record<string, any>;

export const motion: Record<string, React.ForwardRefExoticComponent<any>> = new Proxy(
  {},
  {
    get: (_target, tag: string) => {
      const Comp = React.forwardRef<any, AnyProps>(({ children, ...props }, ref) =>
        React.createElement(tag, { ...props, ref }, children)
      );
      Comp.displayName = `motion.${tag}`;
      return Comp;
    },
  }
) as any;


