'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSuccessToast, useErrorToast, useInfoToast } from '../Toast';

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
  const [isDragOver, setIsDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const showSuccess = useSuccessToast();
  const showError = useErrorToast();
  const showInfo = useInfoToast();

  const uploadFonts = async (files: File[]) => {
    if (files.length === 0) return;
    
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      
      const response = await fetch('/api/fonts/upload', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success) {
        showSuccess(
          '📤 Upload concluído!',
          `${result.uploadedFiles.length} fonte(s) enviada(s)`,
          3000
        );
        
        // Mostrar erros se houver
        if (result.errors.length > 0) {
          showError(
            '⚠️ Alguns arquivos falharam',
            result.errors.join(', '),
            5000
          );
        }
        
        // Escanear automaticamente após upload
        await handleScanFonts();
        
      } else {
        showError(
          '❌ Falha no upload',
          result.error,
          5000
        );
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      showError(
        '❌ Erro de conexão',
        'Falha ao enviar arquivos para o servidor',
        5000
      );
    } finally {
      setIsUploading(false);
    }
  };

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
        
        const fontCount = Object.keys(result.fonts).length;
        const newFontCount = result.newFonts.length;
        
        if (newFontCount > 0) {
          showSuccess(
            '✨ Fontes atualizadas!',
            `${fontCount} fontes encontradas, ${newFontCount} novas adicionadas`,
            4000
          );
        } else {
          showInfo(
            '📚 Scan concluído',
            `${fontCount} fontes encontradas`,
            3000
          );
        }
      }
      
    } catch (error) {
      console.error('Erro ao escanear fontes:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      showError(
        '❌ Erro no scan',
        `Falha ao escanear fontes: ${errorMessage}`,
        5000
      );
      
      setScanResult({
        success: false,
        fonts: {},
        newFonts: [],
        errors: [`Erro de rede: ${errorMessage}`]
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const fontFiles = files.filter(file => 
      /\.(otf|ttf|woff|woff2)$/i.test(file.name)
    );
    
    if (fontFiles.length > 0) {
      showInfo(
        '📤 Enviando fontes...',
        `${fontFiles.length} arquivo(s) detectado(s)`,
        2000
      );
      await uploadFonts(fontFiles);
    } else {
      showError(
        '❌ Arquivos inválidos',
        'Apenas fontes .otf, .ttf, .woff, .woff2 são aceitas',
        3000
      );
    }
  };

  const filteredFonts = scanResult?.fonts ? 
    Object.entries(scanResult.fonts).filter(([name]) => 
      name.toLowerCase().includes(searchQuery.toLowerCase())
    ) : [];

  const weightLabels = {
    thin: 'Thin',
    extraLight: 'Extra Light',
    light: 'Light',
    normal: 'Regular',
    medium: 'Medium',
    semiBold: 'Semi Bold',
    bold: 'Bold',
    extraBold: 'Extra Bold',
    heavy: 'Heavy'
  };

  return (
    <div className={className} style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '16px',
      padding: '24px',
      margin: '24px 0',
      color: 'white',
      boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Pattern */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M20 20c0 6.627-5.373 12-12 12s-12-5.373-12-12 5.373-12 12-12 12 5.373 12 12zm-10-8v16l8-8-8-8z'/%3E%3C/g%3E%3C/svg%3E")`,
        pointerEvents: 'none'
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px'
            }}>
              🎨
            </div>
            <div>
              <h2 style={{ 
                margin: '0', 
                fontSize: '1.5rem', 
                fontWeight: '700',
                background: 'linear-gradient(45deg, #ffffff, #f0f9ff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Gerenciador de Fontes
              </h2>
              <p style={{ 
                margin: '0', 
                fontSize: '0.9rem', 
                opacity: 0.9,
                fontWeight: '400'
              }}>
                Adicione e gerencie suas fontes personalizadas
              </p>
            </div>
          </div>
        </div>

        {/* Drag & Drop Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${
              isUploading ? '#10b981' :
              isDragOver ? '#ffffff' : 
              'rgba(255,255,255,0.4)'
            }`,
            borderRadius: '12px',
            padding: '32px 24px',
            textAlign: 'center',
            cursor: isUploading ? 'wait' : 'pointer',
            background: isUploading ? 'rgba(16, 185, 129, 0.1)' :
                       isDragOver ? 'rgba(255,255,255,0.1)' : 
                       'rgba(255,255,255,0.05)',
            transition: 'all 0.3s ease',
            marginBottom: '24px',
            backdropFilter: 'blur(10px)',
            opacity: isUploading ? 0.8 : 1
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".otf,.ttf,.woff,.woff2"
            style={{ display: 'none' }}
            onChange={async (e) => {
              const files = Array.from(e.target.files || []);
              if (files.length > 0) {
                const fontFiles = files.filter(file => 
                  /\.(otf|ttf|woff|woff2)$/i.test(file.name)
                );
                
                if (fontFiles.length > 0) {
                  await uploadFonts(fontFiles);
                } else {
                  showError(
                    '❌ Arquivos inválidos',
                    'Apenas fontes .otf, .ttf, .woff, .woff2 são aceitas',
                    3000
                  );
                }
              }
              
              // Reset input
              e.target.value = '';
            }}
          />
          
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>
            {isUploading ? (
              <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span>
            ) : isDragOver ? '📁' : '📎'}
          </div>
          
          <p style={{ 
            fontSize: '1.1rem', 
            fontWeight: '600', 
            margin: '0 0 8px 0',
            color: isUploading ? '#10b981' :
                   isDragOver ? '#ffffff' : 'rgba(255,255,255,0.95)'
          }}>
            {isUploading ? 'Enviando arquivos...' :
             isDragOver ? 'Solte seus arquivos aqui!' : 
             'Arraste fontes ou clique para selecionar'}
          </p>
          
          <p style={{ 
            fontSize: '0.9rem', 
            margin: '0', 
            opacity: 0.8 
          }}>
            {isUploading ? 'Por favor, aguarde...' : 'Suporta .otf, .ttf, .woff, .woff2'}
          </p>
          
          <div style={{ marginTop: '16px' }}>
            <span style={{
              background: 'rgba(255,255,255,0.2)',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: '500'
            }}>
              📁 public/fonts/
            </span>
          </div>
        </div>

        {/* Scan Button */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <button
            onClick={handleScanFonts}
            disabled={isScanning || isUploading}
            style={{
              flex: 1,
              padding: '14px 24px',
              background: (isScanning || isUploading) ? 
                'rgba(255,255,255,0.1)' : 
                'linear-gradient(45deg, #4F46E5, #7C3AED)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: (isScanning || isUploading) ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.3s ease',
              boxShadow: (isScanning || isUploading) ? 'none' : '0 4px 12px rgba(79, 70, 229, 0.4)',
              transform: (isScanning || isUploading) ? 'scale(0.98)' : 'scale(1)'
            }}
          >
            <span style={{
              animation: (isScanning || isUploading) ? 'spin 1s linear infinite' : 'none',
              display: 'inline-block'
            }}>
              {isScanning ? '🔄' : isUploading ? '⏳' : '🚀'}
            </span>
            {isScanning ? 'Escaneando...' : isUploading ? 'Enviando...' : 'Escanear Fontes'}
          </button>
        </div>

        {/* Search */}
        {scanResult && scanResult.success && (
          <div style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="🔍 Pesquisar fontes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.15)',
                color: 'white',
                fontSize: '0.95rem',
                backdropFilter: 'blur(10px)',
                outline: 'none'
              }}
            />
          </div>
        )}

        {/* Results */}
        {scanResult && (
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '20px',
            backdropFilter: 'blur(10px)'
          }}>
            {scanResult.success ? (
              <div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  marginBottom: '20px' 
                }}>
                  <span style={{ fontSize: '1.5rem' }}>✨</span>
                  <div>
                    <h3 style={{ 
                      margin: '0', 
                      fontSize: '1.2rem', 
                      fontWeight: '600' 
                    }}>
                      {Object.keys(scanResult.fonts).length} fontes encontradas
                    </h3>
                    {scanResult.newFonts.length > 0 && (
                      <p style={{ 
                        margin: '0', 
                        fontSize: '0.9rem', 
                        opacity: 0.9 
                      }}>
                        {scanResult.newFonts.length} novas fontes adicionadas
                      </p>
                    )}
                  </div>
                </div>

                {/* Font Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '16px',
                  maxHeight: '400px',
                  overflowY: 'auto'
                }}>
                  {filteredFonts.map(([fontName, fontDef]) => (
                    <div
                      key={fontName}
                      style={{
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        padding: '16px',
                        border: scanResult.newFonts.includes(fontName) ? 
                          '2px solid #10B981' : '1px solid rgba(255,255,255,0.2)',
                        transition: 'transform 0.2s ease',
                        cursor: 'default'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                      }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        marginBottom: '12px'
                      }}>
                        <h4 style={{ 
                          margin: '0', 
                          fontSize: '1rem', 
                          fontWeight: '600',
                          fontFamily: fontName,
                          fallback: 'serif'
                        }}>
                          {fontName}
                        </h4>
                        {scanResult.newFonts.includes(fontName) && (
                          <span style={{
                            background: '#10B981',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '0.7rem',
                            fontWeight: '600'
                          }}>
                            NOVA
                          </span>
                        )}
                      </div>
                      
                      <div style={{ 
                        fontSize: '1.4rem', 
                        marginBottom: '12px',
                        fontFamily: fontName,
                        opacity: 0.9
                      }}>
                        Abc 123
                      </div>
                      
                      <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                        {fontDef.fonts.map((font, index) => (
                          <div key={index} style={{ marginBottom: '4px' }}>
                            <span style={{
                              background: 'rgba(255,255,255,0.2)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              marginRight: '6px',
                              fontSize: '0.7rem'
                            }}>
                              {weightLabels[font.weight] || font.weight}
                            </span>
                            {font.fileName}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {filteredFonts.length === 0 && searchQuery && (
                  <div style={{ textAlign: 'center', padding: '32px', opacity: 0.7 }}>
                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔍</div>
                    <p>Nenhuma fonte encontrada para "{searchQuery}"</p>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div style={{ fontSize: '2rem', marginBottom: '12px' }}>❌</div>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem' }}>
                  Erro ao escanear fontes
                </h3>
                {scanResult.errors.map((error, index) => (
                  <p key={index} style={{ 
                    margin: '0', 
                    fontSize: '0.9rem', 
                    opacity: 0.8 
                  }}>
                    {error}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};