"use client";

import React, { useRef, useEffect, ReactNode } from "react";
import gsap from "gsap";

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  title?: string;
}

export default function MagneticButton({ 
  children, 
  className = "", 
  onClick, 
  disabled = false,
  type = "button",
  title
}: MagneticButtonProps) {
  const magneticRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const element = magneticRef.current;
    if (!element || disabled) return;

    const xTo = gsap.quickTo(element, "x", { duration: 1, ease: "elastic.out(1, 0.3)" });
    const yTo = gsap.quickTo(element, "y", { duration: 1, ease: "elastic.out(1, 0.3)" });

    const mouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      // move element towards mouse by a fraction
      xTo(x * 0.4);
      yTo(y * 0.4);
    };

    const mouseLeave = () => {
      xTo(0);
      yTo(0);
    };

    element.addEventListener("mousemove", mouseMove);
    element.addEventListener("mouseleave", mouseLeave);

    return () => {
      element.removeEventListener("mousemove", mouseMove);
      element.removeEventListener("mouseleave", mouseLeave);
    };
  }, [disabled]);

  return (
    <button
      ref={magneticRef}
      className={className}
      onClick={onClick}
      disabled={disabled}
      type={type}
      title={title}
    >
      {children}
    </button>
  );
}
