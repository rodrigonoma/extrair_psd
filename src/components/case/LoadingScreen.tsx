import { useEffect, useState } from 'react';
import SpinnerIcon from './icons/Spinner.svg';

interface LoadingScreenProps {
  text: string;
  lastInferenceTime?: number;
}

function LoadingScreen({ text, lastInferenceTime }: LoadingScreenProps) {
  const [stopwatch, setStopwatch] = useState(0);

  useEffect(() => {
    let timerInstance: any;
    let startTime = Date.now();

    timerInstance = setInterval(() => {
      setStopwatch(() => (Date.now() - startTime) / 1000);
    }, 10);

    return () => clearInterval(timerInstance);
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        textAlign: 'center',
        padding: '2rem',
        backgroundColor: '#fff',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        border: '1px solid #e0e0e0'
      }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <SpinnerIcon />
        </div>
        
        <h3 style={{ 
          fontSize: '1.2rem', 
          marginBottom: '1rem', 
          color: '#333',
          fontWeight: '600'
        }}>
          Analisando Seu Arquivo PSD
        </h3>
        
        <p style={{ 
          fontSize: '1rem', 
          marginBottom: '1.5rem', 
          color: '#666'
        }}>
          {text}
        </p>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            backgroundColor: '#007bff',
            borderRadius: '50%',
            animation: 'pulse 1.5s ease-in-out infinite'
          }} />
          <span style={{ 
            fontSize: '0.9rem', 
            color: '#007bff',
            fontWeight: '500'
          }}>
            {stopwatch.toFixed(1)}s
            {lastInferenceTime && ` / ${lastInferenceTime.toFixed(1)}s`}
          </span>
        </div>
        
        <p style={{ 
          fontSize: '0.85rem', 
          color: '#888', 
          marginTop: '1rem',
          fontStyle: 'italic'
        }}>
          Aguarde enquanto extraímos as informações de texto e fontes...
        </p>
      </div>
      
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default LoadingScreen;
