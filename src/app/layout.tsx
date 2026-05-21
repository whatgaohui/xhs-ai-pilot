import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "小红书AI运营助手",
  description: "智能小红书运营管理工具 - 数据分析、内容创作、人设管理一体化平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            {children}
          </TooltipProvider>
          <Toaster
            position="top-right"
            richColors
            toastOptions={{
              style: {
                borderRadius: '12px',
                fontSize: '14px',
              },
              classNames: {
                success: 'border-l-4 border-l-emerald-500',
                error: 'border-l-4 border-l-xhs',
                warning: 'border-l-4 border-l-amber-500',
                info: 'border-l-4 border-l-blue-500',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
