"use client";
import React, { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

interface FadeContentProps {
  children: React.ReactNode;
  blur?: boolean;
  duration?: number;
  easing?: string;
  initialOpacity?: number;
  className?: string;
  delay?: number;
}

export default function FadeContent({
  children,
  blur = false,
  duration = 1000,
  easing = "power2.out",
  initialOpacity = 0,
  className = "",
  delay = 0,
}: FadeContentProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!ref.current) return;
    gsap.fromTo(
      ref.current,
      { opacity: initialOpacity, filter: blur ? "blur(10px)" : "none", y: 10 },
      { opacity: 1, filter: "blur(0px)", y: 0, duration: duration / 1000, ease: easing, delay: delay / 1000 }
    );
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
