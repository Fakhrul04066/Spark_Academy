import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Spark Academy — Smart Learning Platform",
    template: "%s | Spark Academy",
  },
  description:
    "Structured lessons, chapter exams, anonymous recorded Q&A and smart revision for better learning.",
  applicationName: "Spark Academy",
  icons: { icon: "/spark-mark.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
