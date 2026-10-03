"use client";

import React from "react";
import "./ShinyText.css";

interface ShinyTextProps {
  text: string;
  disabled?: boolean;
  speed?: number;
  className?: string;
  dark?: boolean;
}

export default function ShinyText({
  text,
  disabled = false,
  speed = 3,
  className = "",
  dark = true,
}: ShinyTextProps) {
  const animationDuration = `${speed}s`;

  return (
    <span
      className={`${dark ? "shiny-text-dark" : "shiny-text"} ${disabled ? "disabled" : ""} ${className}`}
      style={{ animationDuration }}
    >
      {text}
    </span>
  );
}
