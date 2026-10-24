import type { Metadata } from "next";
import "./globals.css";
import FloatingActions from "./floating-actions";
import { MobileBottomNav } from "./site-chrome";
export const metadata: Metadata = { title: "Abdul ICT & Electrical Solutions | Reliable Tech. Smarter Solutions.", description: "Computer and phone repair, accessories, electrical installation, CCTV security and practical computer training in Kampala, Uganda.", icons: { icon: "/icon.svg", shortcut: "/icon.svg" } };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}<MobileBottomNav/><FloatingActions/></body></html>; }