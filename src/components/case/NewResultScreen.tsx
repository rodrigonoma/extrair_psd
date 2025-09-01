'use client';

import { useState, useEffect } from 'react';
import { useFileProcessing } from './FileProcessingContext';
import EditableTextElement from './EditableTextElement';
import AdvancedTextEditor from './AdvancedTextEditor';
import EditableImageElement from './EditableImageElement';
import AdvancedImageEditor from './AdvancedImageEditor';
import EditableShapeElement from './EditableShapeElement';
import ChevronLeftIcon from './icons/ChevronLeft.svg';
import NoSSRWrapper from './NoSSRWrapper';

function NewResultScreen() {
  const { 
    result, 
    currentFile, 
    resetState, 
    inferenceTime, 
    updateTextElement,
    updateImageElement,
    updateShapeElement,
    regenerateImage,
    isProcessing
  } = useFileProcessing();

  const [activeTab, setActiveTab] = useState<'preview' | 'text' | 'images' | 'shapes'>('preview');
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
    
    try {
      await regenerateImage();
      console.log('Regenerate image completed');
    } catch (error) {
      console.error('Error in handleRegenerateImage:', error);
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
    id: 'preview' | 'text' | 'images' | 'shapes'; 
    label: string; 
    count?: number; 
    icon: string;
  }) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        padding: '0.75rem 1.5rem',
        border: 'none',
        borderBottom: activeTab === id ? '3px solid #007bff' : '3px solid transparent',
        backgroundColor: activeTab === id ? '#f8f9fa' : 'transparent',
        color: activeTab === id ? '#007bff' : '#666',
        cursor: 'pointer',
        fontSize: '0.9rem',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        transition: 'all 0.2s ease'
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span style={{
          backgroundColor: activeTab === id ? '#007bff' : '#6c757d',
          color: '#fff',
          borderRadius: '50%',
          width: '20px',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.7rem',
          fontWeight: 'bold'
        }}>
          {count}
        </span>
      )}
    </button>
  );

  return (
    <>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '1rem 2rem',
        borderBottom: '1px solid #eee',
        backgroundColor: '#f8f9fa'
      }}>
        <button
          onClick={() => resetState()}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            border: '1px solid #6c757d',
            borderRadius: '6px',
            backgroundColor: '#fff',
            color: '#6c757d',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: '500'
          }}
        >
          <ChevronLeftIcon /> <span>Analisar Novo Arquivo</span>
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
        <div style={{ 
          borderBottom: '1px solid #dee2e6',
          backgroundColor: '#fff',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}>
          <div style={{ 
            display: 'flex', 
            padding: '0 2rem',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex' }}>
              <TabButton 
                id="preview" 
                label="Preview & Regenerar" 
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
                icon="🖼️"
              />
              <TabButton 
                id="shapes" 
                label="Formas" 
                count={result.shapeElements.length}
                icon="🎨"
              />
            </div>
            
            <div style={{ padding: '1rem 0', display: 'flex', gap: '1rem' }}>
              <button
                onClick={handleRegenerateImage}
                disabled={isRegenerating || isProcessing}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: isRegenerating || isProcessing ? '#6c757d' : '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isRegenerating || isProcessing ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {isRegenerating || isProcessing ? (
                  <>
                    <span>⏳</span>
                    <span>Gerando...</span>
                  </>
                ) : (
                  <>
                    <span>🔄</span>
                    <span>Gerar Nova Imagem</span>
                  </>
                )}
              </button>
              
              <button
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
                  backgroundColor: '#007bff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <span>💾</span>
                <span>Download Imagem</span>
              </button>
            </div>
          </div>
        </div>

        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ marginBottom: '2rem', color: '#333', fontSize: '1.8rem' }}>
            Editor PSD: &quot;{currentFile?.name}&quot;
          </h2>

          {activeTab === 'preview' && (
            <div style={{ 
              backgroundColor: '#fff', 
              borderRadius: '12px', 
              padding: '2rem',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e0e0e0'
            }}>
              <h3 style={{ marginBottom: '1.5rem', color: '#333', fontSize: '1.3rem' }}>
                Imagem Atual
              </h3>
              <div style={{ 
                border: '3px dashed #007bff', 
                borderRadius: '12px', 
                overflow: 'hidden',
                backgroundColor: '#f8f9ff',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '400px'
              }}>
                <img
                  src={result.imageUrl}
                  alt="Resultado Atual"
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '600px', 
                    height: 'auto',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                  }}
                />
              </div>
              <div style={{ 
                marginTop: '1.5rem',
                padding: '1rem',
                backgroundColor: '#e3f2fd',
                borderRadius: '8px',
                border: '1px solid #bbdefb'
              }}>
                <strong style={{ color: '#1976d2', fontSize: '1rem' }}>
                  💡 Como usar o editor:
                </strong>
                <ul style={{ 
                  marginTop: '0.5rem',
                  marginLeft: '1rem',
                  color: '#1976d2'
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
            <div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '1.5rem'
              }}>
                <h3 style={{ color: '#333', fontSize: '1.3rem' }}>
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
                  color: '#666', 
                  padding: '3rem',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '12px',
                  border: '2px dashed #dee2e6'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
                  <p style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                    Nenhum elemento de texto encontrado
                  </p>
                  <p>Este arquivo PSD não contém elementos de texto editáveis.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'images' && (
            <div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '1.5rem'
              }}>
                <h3 style={{ color: '#333', fontSize: '1.3rem' }}>
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
                  color: '#666', 
                  padding: '3rem',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '12px',
                  border: '2px dashed #dee2e6'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🖼️</div>
                  <p style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                    Nenhum elemento de imagem encontrado
                  </p>
                  <p>Este arquivo PSD não contém imagens editáveis.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'shapes' && (
            <div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '1.5rem'
              }}>
                <h3 style={{ color: '#333', fontSize: '1.3rem' }}>
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
                  color: '#666', 
                  padding: '3rem',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '12px',
                  border: '2px dashed #dee2e6'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎨</div>
                  <p style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                    Nenhum elemento de forma encontrado
                  </p>
                  <p>Este arquivo PSD não contém formas editáveis.</p>
                </div>
              )}
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