import { useEffect, useState } from "react";

export const DESKTOP_MQ = "(min-width: 1024px)";

export function useDesktop(): boolean {
  const [desktop, setDesktop] = useState(() => window.matchMedia(DESKTOP_MQ).matches);
  useEffect(() => {
    const media = window.matchMedia(DESKTOP_MQ);
    const onChange = () => setDesktop(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return desktop;
}
