import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LabLink — University Laboratory Management System",
  description:
    "LabLink is a smart university lab equipment booking and management portal for students and lab managers. Book chemistry and physics lab equipment, scan QR codes on-site, and manage approvals in real-time.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={outfit.variable}>
      <body>
        <div id="toast-container"></div>
        <div id="modal-overlay"></div>
        <div id="app">{children}</div>
      </body>
    </html>
  );
}
