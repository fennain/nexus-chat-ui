import { useMediaQuery } from "react-responsive";

/**
 * 自定义 Hook，用于检测屏幕宽度
 * @returns {Object} { isMobile, isIpad }
 */
export function useBasicLayout() {
  const isMobile = useMediaQuery({ query: "(max-width: 640px)" });

  return { isMobile };
}
