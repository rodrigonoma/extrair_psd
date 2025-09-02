'use client';

import { useState, useEffect } from 'react';
import { useFileProcessing } from './FileProcessingContext';
import EditableTextElement from './EditableTextElement';
import AdvancedTextEditor from './AdvancedTextEditor';
import EditableImageElement from './EditableImageElement';
import AdvancedImageEditor from './AdvancedImageEditor';
import EditableShapeElement from './EditableShapeElement';
import PropertyEditor from '../PropertyEditor';
import ChevronLeftIcon from './icons/ChevronLeft.svg';
import NoSSRWrapper from './NoSSRWrapper';
import { useToast } from '../Toast';

function NewResultScreen() {
  const { 
    result, 
    currentFile, 
    resetState, 
    inferenceTime, 
    updateTextElement,
    updateImageElement,
    updateShapeElement,
    updateElement,
    regenerateImage,
    generateBatchImages,
    isProcessing
  } = useFileProcessing();

  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'preview' | 'text' | 'images' | 'shapes' | 'properties'>('preview');
  const [isRegenerating, setIsRegenerating] = useState(false);
  if (!result) return null;

  const { messages } = result;
  const warnings = messages
    .filter((m) => m.type === 'warning')
    .map((m) => m.message);
  const errors = messages
    .filter((m) => m.type === 'error')
    .map((m) => m.message);

  const handleRegenerateImage = async () => {
    console.log('Handle regenerate image clicked');
    setIsRegenerating(true);
    
    // Toast de início
    showToast({ type: 'info', title: '🚀 Iniciando geração da nova imagem...' });
    
    try {
      await regenerateImage();
      console.log('Regenerate image completed');
      
      // Toast de sucesso
      showToast({ type: 'success', title: '✅ Imagem gerada com sucesso!' });
    } catch (error) {
      console.error('Error in handleRegenerateImage:', error);
      
      // Toast de erro
      showToast({ type: 'error', title: '❌ Erro ao gerar imagem. Tente novamente.' });
    } finally {
      setIsRegenerating(false);
    }
  };

  const TabButton = ({ 
    id, 
    label, 
    count, 
    icon 
  }: { 
    id: 'preview' | 'text' | 'images' | 'shapes' | 'properties'; 
    label: string; 
    count?: number; 
    icon: string;
  }) => {
    const isActive = activeTab === id;
    
    return (
      <button
        className="tab-button"
        onClick={() => setActiveTab(id)}
        style={{
          padding: '12px 16px',
          margin: '0 2px',
          border: 'none',
          borderRadius: '12px 12px 0 0',
          backgroundColor: isActive ? '#ffffff' : 'transparent',
          color: isActive ? '#1f2937' : '#6b7280',
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: isActive ? '700' : '500',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          minWidth: '80px',
          position: 'relative',
          boxShadow: isActive ? '0 -2px 8px rgba(0,0,0,0.1)' : 'none',
          transform: isActive ? 'translateY(-2px)' : 'translateY(0)',
          scrollSnapAlign: 'start',
          flexShrink: 0,
          ...(isActive && {
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          })
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.8)';
            e.currentTarget.style.transform = 'translateY(-1px) scale(1.02)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
            // Icon animation
            const icon = e.currentTarget.querySelector('.tab-icon');
            if (icon) icon.style.transform = 'scale(1.15)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = 'none';
            // Icon animation reset
            const icon = e.currentTarget.querySelector('.tab-icon');
            if (icon) icon.style.transform = 'scale(1)';
          }
        }}
      >
        {/* Icon with animation */}
        <div className="tab-icon" style={{
          fontSize: '1.2rem',
          transition: 'transform 0.2s ease',
          transform: isActive ? 'scale(1.1)' : 'scale(1)'
        }}>
          {icon}
        </div>
        
        {/* Label - responsive */}
        <div className="tab-label" style={{
          fontSize: '0.75rem',
          fontWeight: isActive ? '600' : '500',
          textAlign: 'center',
          lineHeight: '1.2',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '100px'
        }}>
          {label}
        </div>
        
        {/* Count badge */}
        {count !== undefined && count > 0 && (
          <div className="tab-count-badge" style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            backgroundColor: isActive ? '#ef4444' : '#6b7280',
            color: '#fff',
            borderRadius: '10px',
            width: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.65rem',
            fontWeight: '700',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            animation: isActive ? 'pulse 2s infinite' : 'none',
            transition: 'all 0.2s ease'
          }}>
            {count > 99 ? '99+' : count}
          </div>
        )}
        
        {/* Active indicator */}
        {isActive && (
          <div style={{
            position: 'absolute',
            bottom: '0',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '40px',
            height: '3px',
            background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
            borderRadius: '2px 2px 0 0'
          }} />
        )}
      </button>
    );
  };

  return (
    <>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '1.5rem 2rem',
        borderBottom: '1px solid #e2e8f0',
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <button
          onClick={() => resetState()}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem',
            padding: '12px 20px',
            border: 'none',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            color: '#ffffff',
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: '600',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(239, 68, 68, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.4)';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(0.98)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
          }}
        >
          <div style={{
            width: '20px',
            height: '20px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem'
          }}>
            ←
          </div>
          <span>Analisar Novo Arquivo</span>
          <div style={{
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
            transition: 'left 0.6s ease',
            pointerEvents: 'none'
          }} 
          onAnimationEnd={() => {
            // Reset shine effect
          }}
          />
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.9rem', color: '#666' }}>
            Tempo de processamento: {inferenceTime.toFixed(2)}s
          </span>
          {warnings.length > 0 && (
            <span style={{ 
              backgroundColor: '#fff3cd', 
              color: '#856404', 
              padding: '0.25rem 0.5rem', 
              borderRadius: '4px',
              fontSize: '0.85rem'
            }}>
              {warnings.length} Aviso{warnings.length > 1 ? 's' : ''}
            </span>
          )}
          {errors.length > 0 && (
            <span style={{ 
              backgroundColor: '#f8d7da', 
              color: '#721c24', 
              padding: '0.25rem 0.5rem', 
              borderRadius: '4px',
              fontSize: '0.85rem'
            }}>
              {errors.length} Erro{errors.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: '0' }}>
        {/* Modern Tab Navigation */}
        <div style={{ 
          background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
          borderBottom: '1px solid #cbd5e1',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <style>
            {`
              @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
              }
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
              @keyframes float {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-10px); }
              }
              @media (max-width: 768px) {
                .tab-container {
                  justify-content: flex-start !important;
                  padding-bottom: 4px !important;
                }
                .tab-button {
                  min-width: 60px !important;
                  padding: 8px 12px !important;
                }
                .tab-icon {
                  font-size: 1rem !important;
                }
                .tab-label {
                  font-size: 0.65rem !important;
                  max-width: 80px !important;
                }
                .action-buttons {
                  flex-direction: column !important;
                  gap: 4px !important;
                  align-items: stretch !important;
                }
                .action-button {
                  padding: 8px 12px !important;
                  font-size: 0.75rem !important;
                }
              }
              @media (max-width: 480px) {
                .tab-button {
                  min-width: 50px !important;
                  padding: 6px 8px !important;
                }
                .tab-label {
                  display: none !important;
                }
                .tab-count-badge {
                  top: -2px !important;
                  right: -2px !important;
                  width: 16px !important;
                  height: 16px !important;
                  font-size: 0.6rem !important;
                }
              }
            `}
          </style>
          <div style={{ 
            display: 'flex', 
            padding: '0 1.5rem',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            minHeight: '60px'
          }}>
            {/* Tab Container with responsive overflow */}
            <div className="tab-container" style={{ 
              display: 'flex',
              flex: 1,
              overflowX: 'auto',
              overflowY: 'hidden',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              gap: '4px',
              paddingBottom: '0',
              scrollSnapType: 'x mandatory'
            }} 
            onScroll={(e) => {
              const container = e.target as HTMLDivElement;
              const scrollIndicator = container.nextElementSibling as HTMLDivElement;
              if (scrollIndicator) {
                const scrollPercentage = container.scrollLeft / (container.scrollWidth - container.clientWidth);
                scrollIndicator.style.opacity = container.scrollWidth > container.clientWidth ? '1' : '0';
              }
            }}
            >
              <TabButton 
                id="preview" 
                label="Preview" 
                icon="🖼️"
              />
              <TabButton 
                id="text" 
                label="Textos" 
                count={result.textElements.length}
                icon="📝"
              />
              <TabButton 
                id="images" 
                label="Imagens" 
                count={result.imageElements.length}
                icon="🎞️"
              />
              <TabButton 
                id="shapes" 
                label="Formas" 
                count={result.shapeElements.length}
                icon="🎨"
              />
              <TabButton 
                id="properties" 
                label="Editor" 
                icon="⚙️"
              />
            </div>
            
            {/* Scroll indicator */}
            <div style={{
              width: '20px',
              height: '2px',
              background: 'linear-gradient(90deg, #3b82f6, transparent)',
              opacity: 0,
              transition: 'opacity 0.3s ease',
              alignSelf: 'flex-end',
              marginBottom: '8px',
              borderRadius: '1px'
            }} />
            
            {/* Action Buttons */}
            <div className="action-buttons" style={{ 
              display: 'flex', 
              gap: '8px',
              alignItems: 'center',
              paddingBottom: '8px'
            }}>
              <button
                className="action-button"
                onClick={handleRegenerateImage}
                disabled={isRegenerating || isProcessing}
                style={{
                  padding: '10px 20px',
                  background: isRegenerating || isProcessing 
                    ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: isRegenerating || isProcessing ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: isRegenerating || isProcessing 
                    ? 'none' 
                    : '0 4px 12px rgba(16, 185, 129, 0.4)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: isRegenerating || isProcessing ? 'scale(0.95)' : 'scale(1)',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  if (!(isRegenerating || isProcessing)) {
                    e.currentTarget.style.transform = 'scale(1.02) translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!(isRegenerating || isProcessing)) {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
                  }
                }}
              >
                <span style={{
                  fontSize: '1rem',
                  animation: isRegenerating || isProcessing ? 'spin 1s linear infinite' : 'none'
                }}>
                  {isRegenerating || isProcessing ? '⏳' : '🚀'}
                </span>
                <span>
                  {isRegenerating || isProcessing ? 'Gerando...' : 'Gerar PNG'}
                </span>
              </button>
              
              <button
                className="action-button"
                onClick={() => {
                  console.log('Download button clicked, imageUrl:', result.imageUrl);
                  // Create a temporary link element to trigger download
                  const link = document.createElement('a');
                  link.href = result.imageUrl;
                  link.download = `${currentFile?.name?.replace('.psd', '') || 'image'}_edited.png`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  console.log('Download initiated for:', link.download);
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(0, 123, 255, 0.4)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02) translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 123, 255, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 123, 255, 0.4)';
                }}
              >
                <span>💾</span>
                <span>Download Imagem</span>
              </button>
            </div>
          </div>
        </div>

        <div style={{ 
          padding: '2rem 1rem', 
          maxWidth: '1400px', 
          margin: '0 auto',
          minHeight: 'calc(100vh - 200px)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '2rem',
            padding: '1.5rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '16px',
            color: '#fff',
            boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)'
          }}>
            <div style={{ fontSize: '2rem' }}>📄</div>
            <div>
              <h2 style={{ 
                margin: 0, 
                fontSize: '1.8rem',
                fontWeight: '700',
                textShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}>
                Editor PSD: &quot;{currentFile?.name}&quot;
              </h2>
              <p style={{
                margin: '0.5rem 0 0 0',
                fontSize: '1rem',
                opacity: 0.9,
                fontWeight: '400'
              }}>
                Explore e edite os elementos encontrados no arquivo PSD
              </p>
            </div>
          </div>

          {activeTab === 'preview' && (
            <div style={{ 
              backgroundColor: '#fff', 
              borderRadius: '20px', 
              padding: '2.5rem',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
              border: '1px solid #f0f0f0',
              background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '2rem'
              }}>
                <div style={{
                  width: '4px',
                  height: '40px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '2px'
                }} />
                <h3 style={{ 
                  margin: 0, 
                  color: '#1a1a1a', 
                  fontSize: '1.5rem',
                  fontWeight: '700'
                }}>
                  Preview da Imagem
                </h3>
              </div>
              <div style={{ 
                border: '2px dashed #e2e8f0', 
                borderRadius: '16px', 
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '500px',
                position: 'relative',
                transition: 'all 0.3s ease'
              }}>
                <img
                  src={result.imageUrl}
                  alt="Resultado Atual"
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '700px', 
                    height: 'auto',
                    borderRadius: '12px',
                    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.12)',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    cursor: 'zoom-in'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.12)';
                  }}
                />
              </div>
              <div style={{ 
                marginTop: '2rem',
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%)',
                borderRadius: '12px',
                border: '1px solid #bfdbfe',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.1)'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem',
                  marginBottom: '1rem'
                }}>
                  <div style={{
                    backgroundColor: '#3b82f6',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem'
                  }}>
                    💡
                  </div>
                  <strong style={{ color: '#1e40af', fontSize: '1.1rem' }}>
                    Como usar o editor
                  </strong>
                </div>
                <ul style={{ 
                  margin: 0,
                  paddingLeft: '1.5rem',
                  color: '#1e40af',
                  lineHeight: '1.6'
                }}>
                  <li>Clique nas abas para editar diferentes elementos</li>
                  <li>Faça suas alterações nos textos, cores e propriedades</li>
                  <li>Clique em "Gerar Nova Imagem" para ver o resultado</li>
                  <li>Use os botões de visibilidade para mostrar/ocultar elementos</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'text' && (
            <div style={{
              backgroundColor: '#fff',
              borderRadius: '20px',
              padding: '2rem',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
              border: '1px solid #f0f0f0'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '2rem'
              }}>
                <div style={{
                  width: '4px',
                  height: '40px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  borderRadius: '2px'
                }} />
                <h3 style={{ 
                  margin: 0, 
                  color: '#1a1a1a', 
                  fontSize: '1.5rem',
                  fontWeight: '700'
                }}>
                  Elementos de Texto ({result.textElements.length})
                </h3>
              </div>
              
              {result.textElements.length > 0 ? (
                <NoSSRWrapper>
                  <div>
                    {result.textElements.map((element) => (
                      <AdvancedTextEditor
                        key={element.id}
                        element={element}
                        onUpdate={updateTextElement}
                      />
                    ))}
                  </div>
                </NoSSRWrapper>
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  color: '#6b7280', 
                  padding: '4rem 2rem',
                  background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                  borderRadius: '20px',
                  border: '2px dashed #d1d5db',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    fontSize: '4rem', 
                    marginBottom: '1.5rem',
                    opacity: 0.8,
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                    animation: 'float 3s ease-in-out infinite'
                  }}>📝</div>
                  <p style={{ 
                    fontSize: '1.4rem', 
                    fontWeight: '700',
                    marginBottom: '0.75rem',
                    color: '#374151'
                  }}>
                    Nenhum elemento de texto encontrado
                  </p>
                  <p style={{ 
                    fontSize: '1rem',
                    color: '#6b7280',
                    lineHeight: '1.6',
                    maxWidth: '400px',
                    margin: '0 auto'
                  }}>
                    Este arquivo PSD não contém elementos de texto editáveis. Tente usar um arquivo com camadas de texto.
                  </p>
                  <div style={{
                    position: 'absolute',
                    top: '-50px',
                    left: '-50px',
                    width: '100px',
                    height: '100px',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    borderRadius: '50%',
                    opacity: 0.1,
                    animation: 'pulse 4s infinite'
                  }} />
                  <div style={{
                    position: 'absolute',
                    bottom: '-30px',
                    right: '-30px',
                    width: '60px',
                    height: '60px',
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    borderRadius: '50%',
                    opacity: 0.1,
                    animation: 'pulse 3s infinite 1s'
                  }} />
                </div>
              )}
            </div>
          )}

          {activeTab === 'images' && (
            <div style={{
              backgroundColor: '#fff',
              borderRadius: '20px',
              padding: '2rem',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
              border: '1px solid #f0f0f0'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '2rem'
              }}>
                <div style={{
                  width: '4px',
                  height: '40px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  borderRadius: '2px'
                }} />
                <h3 style={{ 
                  margin: 0, 
                  color: '#1a1a1a', 
                  fontSize: '1.5rem',
                  fontWeight: '700'
                }}>
                  Elementos de Imagem ({result.imageElements.length})
                </h3>
              </div>
              
              {result.imageElements.length > 0 ? (
                <NoSSRWrapper>
                  <div>
                    {result.imageElements.map((element) => (
                      <AdvancedImageEditor
                        key={element.id}
                        element={element}
                        onUpdate={updateImageElement}
                      />
                    ))}
                  </div>
                </NoSSRWrapper>
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  color: '#6b7280', 
                  padding: '4rem 2rem',
                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                  borderRadius: '20px',
                  border: '2px dashed #f59e0b',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    fontSize: '4rem', 
                    marginBottom: '1.5rem',
                    opacity: 0.8,
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                    animation: 'float 3s ease-in-out infinite'
                  }}>🖼️</div>
                  <p style={{ 
                    fontSize: '1.4rem', 
                    fontWeight: '700',
                    marginBottom: '0.75rem',
                    color: '#92400e'
                  }}>
                    Nenhum elemento de imagem encontrado
                  </p>
                  <p style={{ 
                    fontSize: '1rem',
                    color: '#a16207',
                    lineHeight: '1.6',
                    maxWidth: '400px',
                    margin: '0 auto'
                  }}>
                    Este arquivo PSD não contém imagens editáveis. Tente usar um arquivo com camadas de imagem.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'shapes' && (
            <div style={{
              backgroundColor: '#fff',
              borderRadius: '20px',
              padding: '2rem',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
              border: '1px solid #f0f0f0'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '2rem'
              }}>
                <div style={{
                  width: '4px',
                  height: '40px',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  borderRadius: '2px'
                }} />
                <h3 style={{ 
                  margin: 0, 
                  color: '#1a1a1a', 
                  fontSize: '1.5rem',
                  fontWeight: '700'
                }}>
                  Elementos de Forma ({result.shapeElements.length})
                </h3>
              </div>
              
              {result.shapeElements.length > 0 ? (
                <NoSSRWrapper>
                  <div>
                    {result.shapeElements.map((element) => (
                      <EditableShapeElement
                        key={element.id}
                        element={element}
                        onUpdate={updateShapeElement}
                      />
                    ))}
                  </div>
                </NoSSRWrapper>
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  color: '#6b7280', 
                  padding: '4rem 2rem',
                  background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
                  borderRadius: '20px',
                  border: '2px dashed #8b5cf6',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    fontSize: '4rem', 
                    marginBottom: '1.5rem',
                    opacity: 0.8,
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                    animation: 'float 3s ease-in-out infinite'
                  }}>🎨</div>
                  <p style={{ 
                    fontSize: '1.4rem', 
                    fontWeight: '700',
                    marginBottom: '0.75rem',
                    color: '#6b21a8'
                  }}>
                    Nenhum elemento de forma encontrado
                  </p>
                  <p style={{ 
                    fontSize: '1rem',
                    color: '#7c3aed',
                    lineHeight: '1.6',
                    maxWidth: '400px',
                    margin: '0 auto'
                  }}>
                    Este arquivo PSD não contém formas editáveis. Tente usar um arquivo com elementos de forma.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'properties' && (
            <div style={{ 
              backgroundColor: '#fff', 
              borderRadius: '20px', 
              padding: '2.5rem',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
              border: '1px solid #f0f0f0',
              minHeight: '700px',
              background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '2rem'
              }}>
                <div style={{
                  width: '4px',
                  height: '40px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  borderRadius: '2px'
                }} />
                <h3 style={{ 
                  margin: 0, 
                  color: '#1a1a1a', 
                  fontSize: '1.5rem',
                  fontWeight: '700'
                }}>
                  Editor Avançado de Propriedades
                </h3>
              </div>
              <NoSSRWrapper>
                <PropertyEditor
                  elements={[...result.textElements, ...result.imageElements, ...result.shapeElements]}
                  onElementUpdate={updateElement}
                  onGenerateImage={handleRegenerateImage}
                />
              </NoSSRWrapper>
            </div>
          )}

          {/* Additional Information */}
          {(errors.length > 0 || warnings.filter(w => !w.includes("Could not find a typeface")).length > 0) && (
            <div style={{ 
              backgroundColor: '#fff', 
              borderRadius: '12px', 
              padding: '1.5rem',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              marginTop: '2rem'
            }}>
              <h3 style={{ marginBottom: '1rem', color: '#333' }}>Mensagens do Sistema</h3>
              {errors.map((error, index) => (
                <div key={index} style={{ 
                  marginBottom: '0.5rem',
                  padding: '0.75rem',
                  backgroundColor: '#f8d7da',
                  color: '#721c24',
                  borderRadius: '6px',
                  border: '1px solid #f5c6cb'
                }}>
                  <strong>Erro:</strong> {error}
                </div>
              ))}
              {warnings.filter(w => !w.includes("Could not find a typeface")).map((warning, index) => (
                <div key={index} style={{ 
                  marginBottom: '0.5rem',
                  padding: '0.75rem',
                  backgroundColor: '#fff3cd',
                  color: '#856404',
                  borderRadius: '6px',
                  border: '1px solid #ffeaa7'
                }}>
                  <strong>Aviso:</strong> {warning}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default NewResultScreen;