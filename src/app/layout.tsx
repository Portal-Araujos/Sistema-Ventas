import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// 1. Descargamos tu Tipografía Corporativa en los pesos exactos
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"], // Regular, Medium, SemiBold, Bold
});

export const metadata: Metadata = {
  title: "Dashboard | Sistema Comercial",
  description: "Sistema de gestión y ventas corporativas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} h-full antialiased`}
    >
      {/* 2. Inyectamos la fuente, el fondo corporativo y el texto a 15px por defecto */}
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground text-[15px]">
        {children}
      </body>
    </html>
  );
}