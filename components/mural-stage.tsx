"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** A projector can show the whole cloth; normal browsing keeps artwork full size. */
export function MuralStage({ fit, children }: { fit: boolean; children: ReactNode }) {
  const stage = useRef<HTMLElement>(null);
  const cloth = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState<{ scale: number; height?: number }>({ scale: 1 });
  useEffect(() => {
    const host = stage.current;
    const content = cloth.current;
    if (!host || !content) return;
    const measure = () => {
      if (!fit || innerWidth < 900) { setFrame({ scale: 1 }); return; }
      const available = Math.max(230, innerHeight - (host.getBoundingClientRect().top + scrollY) - 35);
      const natural = content.offsetHeight;
      const scale = natural ? Math.min(1, available / natural) : 1;
      const next = { scale, height: natural * scale };
      setFrame(previous => previous.scale === next.scale && previous.height === next.height ? previous : next);
    };
    const resize = new ResizeObserver(measure);
    resize.observe(host); resize.observe(content);
    window.addEventListener("resize", measure);
    measure();
    return () => { resize.disconnect(); window.removeEventListener("resize", measure); };
  }, [fit]);
  return <section ref={stage} id="mural-stage" className="mural-stage" aria-label="Our shared kopitiam artwork" style={{ height: frame.height }}><div ref={cloth} className="mural-stage-contents" style={{ transform: `scale(${frame.scale})` }}>{children}</div></section>;
}
