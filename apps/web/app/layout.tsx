import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Football Platform',
  description: 'Explora y administra torneos de fútbol.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
