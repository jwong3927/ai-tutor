import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { AgentProvider } from "@/contexts/AgentContext";
import Auth from '@/components/Auth';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Tutor",
  description: "Learn AI with an interactive tutor",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <AgentProvider>
            <div className="min-h-screen flex flex-col">
              <nav className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex justify-between h-16">
                    <div className="flex items-center">
                      <span className="text-xl font-bold text-indigo-600">AI Tutor</span>
                    </div>
                    <div className="flex items-center">
                      <Auth />
                    </div>
                  </div>
                </div>
              </nav>

              <main className="flex-grow">
                {children}
              </main>

              <footer className="bg-white border-t">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                  <div className="text-center text-sm text-gray-500">
                    <p>© {new Date().getFullYear()} AI Tutor. All rights reserved.</p>
                    <p className="mt-2">Built with Next.js, FastAPI, and LangChain</p>
                  </div>
                </div>
              </footer>
            </div>
          </AgentProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
