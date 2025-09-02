'use client';

import React, { useState } from 'react';

interface FontMetadata {
  name: string;
  fileName: string;
  uri: string;
  style: 'normal' | 'italic';
  weight: 'thin' | 'extraLight' | 'light' | 'normal' | 'medium' | 'semiBold' | 'bold' | 'extraBold' | 'heavy';
  subFamily: string;
}

interface FontDefinition {
  name: string;
  fonts: FontMetadata[];
}

interface FontScanResult {
  success: boolean;
  fonts: Record<string, FontDefinition>;
  newFonts: string[];
  errors: string[];
}

interface FontManagerProps {
  onFontsUpdated?: (fonts: Record<string, FontDefinition>) => void;
  className?: string;
}

export const FontManager: React.FC<FontManagerProps> = ({ onFontsUpdated, className }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<FontScanResult | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleScanFonts = async () => {
    setIsScanning(true);
    setScanResult(null);
    
    try {
      const response = await fetch('/api/fonts/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const result: FontScanResult = await response.json();
      setScanResult(result);
      
      if (result.success && onFontsUpdated) {
        onFontsUpdated(result.fonts);
      }
      
    } catch (error) {
      console.error('Erro ao escanear fontes:', error);
      setScanResult({
        success: false,
        fonts: {},
        newFonts: [],
        errors: [`Erro de rede: ${error.message}`]
      });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className={`font-manager ${className || ''}`} style={{
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '16px',
      margin: '16px 0',
      backgroundColor: '#f9f9f9'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: isExpanded ? '16px' : '0'
      }}>
        <h3 style={{ margin: '0', fontSize: '1.1rem', fontWeight: '600' }}>
          🔤 Gerenciador de Fontes
        </h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={handleScanFonts}
            disabled={isScanning}
            style={{
              padding: '8px 16px',
              backgroundColor: isScanning ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isScanning ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500'
            }}
          >
            {isScanning ? '🔄 Escaneando...' : '🔄 Atualizar Fontes'}
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              padding: '4px 8px',
              backgroundColor: 'transparent',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.8rem'
            }}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div style={{ fontSize: '0.9rem', color: '#666' }}>
          <p style={{ margin: '0 0 8px 0' }}>
            <strong>Como usar:</strong> Copie arquivos de fonte (.otf, .ttf, .woff, .woff2) para a pasta 
            <code style={{ backgroundColor: '#e9ecef', padding: '2px 4px', borderRadius: '2px', margin: '0 4px' }}>
              public/fonts
            </code> 
            e clique em "Atualizar Fontes".
          </p>
        </div>
      )}

      {scanResult && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          backgroundColor: 'white'
        }}>
          {scanResult.success ? (
            <div>
              <div style={{ 
                color: '#28a745', 
                fontWeight: '600',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                ✅ Scan concluído com sucesso!
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <strong>Fontes encontradas:</strong> {Object.keys(scanResult.fonts).length}
              </div>
              
              {scanResult.newFonts.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <strong>Novas fontes detectadas:</strong>
                  <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                    {scanResult.newFonts.map(fontName => (
                      <li key={fontName} style={{ color: '#007bff' }}>
                        {fontName}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {isExpanded && Object.keys(scanResult.fonts).length > 0 && (
                <div>
                  <strong>Detalhes das fontes:</strong>
                  <div style={{ 
                    maxHeight: '200px', 
                    overflowY: 'auto', 
                    marginTop: '8px',
                    border: '1px solid #eee',
                    borderRadius: '4px',
                    padding: '8px'
                  }}>
                    {Object.entries(scanResult.fonts).map(([fontName, fontDef]) => (
                      <div key={fontName} style={{ marginBottom: '8px' }}>
                        <div style={{ fontWeight: '600', color: '#495057' }}>
                          {fontName}
                        </div>
                        {fontDef.fonts.map((font, index) => (
                          <div key={index} style={{ 
                            marginLeft: '16px', 
                            fontSize: '0.8rem',
                            color: '#6c757d'
                          }}>
                            • {font.fileName} ({font.weight}, {font.style})
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ 
                color: '#dc3545', 
                fontWeight: '600',
                marginBottom: '8px'
              }}>
                ❌ Erro no scan
              </div>
              {scanResult.errors.length > 0 && (
                <ul style={{ margin: '0', paddingLeft: '20px', color: '#dc3545' }}>
                  {scanResult.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};