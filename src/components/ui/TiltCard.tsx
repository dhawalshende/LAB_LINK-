"use client";

import React, { useRef, ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
}

export default function TiltCard({ children, className = "", style, delay = 0 }: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const card = cardRef.current;
    if (!card) return;

    // Entrance animation (replaces CSS fadeUp)
    gsap.fromTo(
      card, 
      { opacity: 0, y: 16 }, 
      { opacity: 1, y: 0, duration: 0.4, delay, ease: "power2.out" }
    );

    // Initial 3D setup
    gsap.set(card, { transformPerspective: 1000, transformStyle: "preserve-3d" });

    // Interactive 3D tilt
    const xTo = gsap.quickTo(card, "rotationY", { ease: "power2.out", duration: 0.4 });
    const yTo = gsap.quickTo(card, "rotationX", { ease: "power2.out", duration: 0.4 });

    const onMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left; 
      const y = e.clientY - rect.top;  
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      // Calculate rotation (-10 to 10 degrees)
      const rotX = ((y - centerY) / centerY) * -10; 
      const rotY = ((x - centerX) / centerX) * 10;

      yTo(rotX);
      xTo(rotY);
    };

    const onMouseLeave = () => {
      gsap.to(card, {
        rotationX: 0,
        rotationY: 0,
        ease: "elastic.out(1, 0.3)",
        duration: 1
      });
    };

    card.addEventListener("mousemove", onMouseMove);
    card.addEventListener("mouseleave", onMouseLeave);

    return () => {
      card.removeEventListener("mousemove", onMouseMove);
      card.removeEventListener("mouseleave", onMouseLeave);
    };
  }, { scope: cardRef, dependencies: [delay] });

  return (
    <div
      ref={cardRef}
      className={className}
      style={{ ...style, opacity: 0 }} // Start invisible, GSAP will handle it
    >
      {children}
    </div>
  );
}
