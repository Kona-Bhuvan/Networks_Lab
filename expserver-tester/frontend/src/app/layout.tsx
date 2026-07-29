import type { Metadata } from "next";
import "./globals.css";
import ContextWrapper from "@/components/ContextWrapper";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { jetbrainsMono } from "@/fonts";

export const metadata: Metadata = {
  title: "eXpServer Testbench",
  description: "Automated testing platform for eXpServer. Validate low-level C socket programming through dockerized isolation, real-time resource monitoring, and stage-wise blackbox verification.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html>
      <body>
        <ContextWrapper>
          <Navbar />
          <div className={`h-[calc(100vh-50px)] flex w-screen z-2 absolute top-[50px] ${jetbrainsMono.variable}`}>
            <Sidebar />
            {children}
          </div>
        </ContextWrapper>
      </body>
    </html>
  )
}
