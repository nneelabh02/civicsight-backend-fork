import "./globals.css";

export const metadata = {
  title: "CivicSight",
  description: "Smart City Infrastructure Triage",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}