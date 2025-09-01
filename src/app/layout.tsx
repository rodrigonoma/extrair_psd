import type { Metadata } from 'next';
import './root.css';

export const metadata: Metadata = {
  title: 'Analisador de Texto e Fontes PSD',
  description: 'Analise elementos de texto e identifique fontes em seus arquivos do Photoshop usando CE.SDK'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning={true}>{children}</body>
    </html>
  );
}
