import { useState } from 'react';
import CreativeEditor from './CreativeEditor';
import { useFileProcessing } from './FileProcessingContext';
import classes from './ResultScreen.module.css';
import ChevronLeftIcon from './icons/ChevronLeft.svg';
import DownloadIcon from './icons/Download.svg';
import EditIcon from './icons/Edit.svg';

function ResultScreen() {
  const { result, currentFile, resetState, inferenceTime } = useFileProcessing();

  const [editorOpen, setEditorOpen] = useState(false);

  if (!result) return null;

  const { messages } = result;
  const warnings = messages
    .filter((m) => m.type === 'warning')
    .map((m) => m.message);
  const errors = messages
    .filter((m) => m.type === 'error')
    .map((m) => m.message);

  // Extract text and font information from warnings
  const textAnalysis = warnings
    .filter(warning => warning.includes("Could not find a typeface"))
    .map(warning => {
      const fontMatch = warning.match(/font family '([^']+)'/);
      const textMatch = warning.match(/text: '([^']+)'/);
      return {
        font: fontMatch ? fontMatch[1] : 'Unknown',
        text: textMatch ? textMatch[1] : 'Unknown',
        issue: 'Fonte não encontrada'
      };
    });

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
          className={'button button--secondary-plain button--small'}
          onClick={() => resetState()}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
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

      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h2 style={{ marginBottom: '2rem', color: '#333', fontSize: '1.8rem' }}>
          Resultados da Análise para "{currentFile?.name}"
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
          {/* Generated Image */}
          <div style={{ 
            backgroundColor: '#fff', 
            borderRadius: '8px', 
            padding: '1.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ marginBottom: '1rem', color: '#333' }}>Imagem Gerada</h3>
            <div style={{ 
              border: '2px dashed #ddd', 
              borderRadius: '8px', 
              overflow: 'hidden',
              backgroundColor: '#f9f9f9'
            }}>
              <img
                src={result.imageUrl}
                alt="Resultado Gerado"
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </div>
          </div>

          {/* Text Analysis */}
          <div style={{ 
            backgroundColor: '#fff', 
            borderRadius: '8px', 
            padding: '1.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ marginBottom: '1rem', color: '#333' }}>Análise de Texto e Fontes</h3>
            {textAnalysis.length > 0 ? (
              <div>
                <div style={{ 
                  backgroundColor: '#e3f2fd', 
                  padding: '1rem', 
                  borderRadius: '6px', 
                  marginBottom: '1rem',
                  border: '1px solid #bbdefb'
                }}>
                  <strong style={{ color: '#1976d2' }}>
                    {textAnalysis.length} elemento{textAnalysis.length > 1 ? 's' : ''} de texto encontrado{textAnalysis.length > 1 ? 's' : ''}
                  </strong>
                </div>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {textAnalysis.map((item, index) => (
                    <div key={index} style={{ 
                      marginBottom: '1rem', 
                      padding: '1rem',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '6px',
                      border: '1px solid #dee2e6'
                    }}>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <strong style={{ color: '#495057' }}>Texto:</strong>
                        <span style={{ 
                          marginLeft: '0.5rem',
                          fontFamily: 'monospace',
                          backgroundColor: '#fff',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '3px',
                          border: '1px solid #ddd'
                        }}>
                          "{item.text}"
                        </span>
                      </div>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <strong style={{ color: '#495057' }}>Família da Fonte:</strong>
                        <span style={{ 
                          marginLeft: '0.5rem',
                          color: '#6f42c1',
                          fontWeight: '600'
                        }}>
                          {item.font}
                        </span>
                      </div>
                      <div>
                        <span style={{ 
                          fontSize: '0.85rem',
                          color: '#dc3545',
                          backgroundColor: '#fff5f5',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '3px',
                          border: '1px solid #fed7d7'
                        }}>
                          ⚠ {item.issue}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                color: '#666', 
                padding: '2rem',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px',
                border: '1px solid #dee2e6'
              }}>
                <p>Nenhum elemento de texto encontrado neste arquivo PSD.</p>
              </div>
            )}
          </div>
        </div>

        {/* Additional Information */}
        {(errors.length > 0 || warnings.filter(w => !w.includes("Could not find a typeface")).length > 0) && (
          <div style={{ 
            backgroundColor: '#fff', 
            borderRadius: '8px', 
            padding: '1.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '2rem'
          }}>
            <h3 style={{ marginBottom: '1rem', color: '#333' }}>Mensagens Adicionais</h3>
            {errors.map((error, index) => (
              <div key={index} style={{ 
                marginBottom: '0.5rem',
                padding: '0.75rem',
                backgroundColor: '#f8d7da',
                color: '#721c24',
                borderRadius: '4px',
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
                borderRadius: '4px',
                border: '1px solid #ffeaa7'
              }}>
                <strong>Aviso:</strong> {warning}
              </div>
            ))}
          </div>
        )}
      </div>

      {editorOpen && (
        <CreativeEditor
          sceneArchiveUrl={result.sceneArchiveUrl}
          closeEditor={() => {
            setEditorOpen(false);
          }}
        />
      )}
    </>
  );
}

export default ResultScreen;
