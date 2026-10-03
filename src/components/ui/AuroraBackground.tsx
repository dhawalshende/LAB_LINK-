"use client";

import React, { ReactNode } from "react";
import "./AuroraBackground.css";

interface AuroraBackgroundProps {
  children?: ReactNode;
  className?: string;
}

export default function AuroraBackground({ children, className = "" }: AuroraBackgroundProps) {
  return (
    <div className={`aurora-wrapper ${className}`}>
      <div className="aurora-bg">
        <div className="aurora-blob aurora-blob-1"></div>
        <div className="aurora-blob aurora-blob-2"></div>
        <div className="aurora-blob aurora-blob-3"></div>
        <div className="aurora-blob aurora-blob-4"></div>
      </div>
      <div className="aurora-content">
        {children}
      </div>
    </div>
  );
}
