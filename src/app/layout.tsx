import type { Metadata } from "next";
import "./globals.css";
import { restaurant } from "@/lib/config";
export const metadata: Metadata = { title: restaurant.name, description: restaurant.tagline };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }