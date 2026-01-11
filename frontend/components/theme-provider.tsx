export type ThemeProviderProps = {
  children: React.ReactNode;
};

/**
 * Vite build of this project does not depend on `next-themes`.
 * This is a lightweight no-op provider that keeps shadcn-style imports compiling.
 *
 * If you later want full theme switching, we can implement it without Next.js deps.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  return <>{children}</>;
}
