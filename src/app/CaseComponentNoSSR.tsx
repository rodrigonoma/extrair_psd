'use client';

import dynamic from 'next/dynamic';

export const CaseComponentNoSSR = dynamic(
  () => import('../components/case/CaseComponent'),
  {
    ssr: false,
    loading: () => <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontSize: '1.2rem',
      color: '#666'
    }}>Carregando...</div>
  }
);
