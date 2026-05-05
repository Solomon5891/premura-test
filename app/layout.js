import "./globals.css";

export const metadata = {
  title: "Premura Waitlist",
  description: "Join the private beta",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
