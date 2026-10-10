import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CodeGuardians",
  description: "Autonomous AST Security & Pull Request Auditing Engine",
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

