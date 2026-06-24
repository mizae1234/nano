import type { Metadata } from "next";
import Providers from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "น้องนาโน — ระบบ Service Ticket อัจฉริยะ",
  description:
    "ระบบ Service Ticket อัจฉริยะสำหรับองค์กรไทย พร้อม LINE Login, AI Bot, ระบบแผนก และรายงานสถิติ",
  keywords: "service ticket, helpdesk, thai, LINE, AI, SaaS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className="font-sarabun antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
