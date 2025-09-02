'use client';

import { useState } from 'react';
import { useFileProcessing } from './FileProcessingContext';
import AdvancedTextEditor from './AdvancedTextEditor';
import AdvancedImageEditor from './AdvancedImageEditor';
import EditableShapeElement from './EditableShapeElement';
import PropertyEditor from '../PropertyEditor';
import ChevronLeftIcon from './icons/ChevronLeft.svg';
import NoSSRWrapper from './NoSSRWrapper';
import styles from './NewResultScreen.module.css';
import Modal from '../ui/Modal'; // Importar o Modal

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
    isProcessing
  } = useFileProcessing();

  const [activeTab, setActiveTab] = useState('text');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isAdvancedEditorOpen, setIsAdvancedEditorOpen] = useState(false); // Estado para o Modal

  if (!result) return null;

  const { messages, textElements, imageElements, shapeElements, imageUrl } = result;
  const warnings = messages.filter((m) => m.type === 'warning').map((m) => m.message);
  const errors = messages.filter((m) => m.type === 'error').map((m) => m.message);

  const handleRegenerateImage = async () => {
    setIsRegenerating(true);
    try {
      await regenerateImage();
    } catch (error) {
      console.error('Error in handleRegenerateImage:', error);
    } finally {
      setIsRegenerating(false);
    }
  };
  
  const handleDownloadImage = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${currentFile?.name?.replace('.psd', '') || 'image'}_edited.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const TabButton = ({ id, label, count, icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`${styles.tabButton} ${activeTab === id ? styles.active : ''}`}
    >
      <span>{icon}</span>
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span className={styles.tabCount}>{count}</span>
      )}
    </button>
  );

  return (
    <>
      <div className={styles.screenContainer}>
        {/* TOP BAR */}
        <div className={styles.topBar}>
          <button onClick={resetState} className={styles.backButton}>
            <ChevronLeftIcon /> <span>Analisar Novo Arquivo</span>
          </button>
          <div className={styles.infoBadges}>
            <span className={styles.infoBadge}>
              Tempo de processamento: {inferenceTime.toFixed(2)}s
            </span>
            {warnings.length > 0 && (
              <span className={styles.warningBadge}>
                {warnings.length} Aviso{warnings.length > 1 ? 's' : ''}
              </span>
            )}
            {errors.length > 0 && (
              <span className={styles.errorBadge}>
                {errors.length} Erro{errors.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* MAIN CONTENT (2 Columns) */}
        <div className={styles.mainContent}>
          {/* LEFT PANEL */}
          <div className={styles.previewPanel}>
            <div className={styles.previewCard}>
              <h3 className={styles.previewTitle}>Preview da Imagem</h3>
              <div className={styles.imageWrapper}>
                <img src={imageUrl} alt="Resultado Atual" className={styles.previewImage} />
              </div>
              <div className={styles.actionButtons}>
                <button
                  onClick={handleRegenerateImage}
                  disabled={isRegenerating || isProcessing}
                  className={styles.primaryButton}
                >
                  {isRegenerating || isProcessing ? (
                    <><span>⏳</span><span>Gerando...</span></>
                  ) : (
                    <><span>🔄</span><span>Gerar Nova Imagem</span></>
                  )}
                </button>
                <button onClick={handleDownloadImage} className={styles.secondaryButton}>
                  <span>💾</span>
                  <span>Download Imagem</span>
                </button>
              </div>
            </div>
            <div className={styles.infoBox}>
              <strong>💡 Como usar o editor:</strong>
              <ul>
                <li>Navegue pelas abas à direita para editar textos, imagens e formas.</li>
                <li>Clique em "Gerar Nova Imagem" para aplicar suas alterações.</li>
                <li>Use os botões de visibilidade (👁️) para mostrar/ocultar elementos.</li>
              </ul>
            </div>
            {(errors.length > 0 || warnings.filter(w => !w.includes("Could not find a typeface")).length > 0) && (
              <div className={styles.systemMessages}>
                <h3>Mensagens do Sistema</h3>
                {errors.map((error, index) => (
                  <div key={index} className={`${styles.message} ${styles.errorMessage}`}>
                    <strong>Erro:</strong> {error}
                  </div>
                ))}
                {warnings.filter(w => !w.includes("Could not find a typeface")).map((warning, index) => (
                  <div key={index} className={`${styles.message} ${styles.warningMessage}`}>
                    <strong>Aviso:</strong> {warning}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT PANEL */}
          <div className={styles.propertiesPanel}>
            <div className={styles.tabsHeader}>
              <TabButton id="text" label="Textos" count={textElements.length} icon="📝" />
              <TabButton id="images" label="Imagens" count={imageElements.length} icon="🖼️" />
              <TabButton id="shapes" label="Formas" count={shapeElements.length} icon="🎨" />
              {/* Botão Avançado agora abre o Modal */}
              <button onClick={() => setIsAdvancedEditorOpen(true)} className={styles.tabButton}>
                <span>⚙️</span>
                <span>Avançado</span>
              </button>
            </div>
            <div className={styles.tabContent}>
              {activeTab === 'text' && (
                <div>
                  <h3 className={styles.tabTitle}>Elementos de Texto ({textElements.length})</h3>
                  {textElements.length > 0 ? (
                    <NoSSRWrapper>
                      <div>
                        {textElements.map((element) => (
                          <AdvancedTextEditor key={element.id} element={element} onUpdate={updateTextElement} />
                        ))}
                      </div>
                    </NoSSRWrapper>
                  ) : (
                    <div className={styles.emptyState}>
                      <div className={styles.emptyStateIcon}>📝</div>
                      <h3>Nenhum elemento de texto encontrado</h3>
                      <p>Este arquivo PSD não contém elementos de texto editáveis.</p>
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'images' && (
                <div>
                  <h3 className={styles.tabTitle}>Elementos de Imagem ({imageElements.length})</h3>
                  {imageElements.length > 0 ? (
                    <NoSSRWrapper>
                      <div>
                        {imageElements.map((element) => (
                          <AdvancedImageEditor key={element.id} element={element} onUpdate={updateImageElement} />
                        ))}
                      </div>
                    </NoSSRWrapper>
                  ) : (
                    <div className={styles.emptyState}>
                      <div className={styles.emptyStateIcon}>🖼️</div>
                      <h3>Nenhum elemento de imagem encontrado</h3>
                      <p>Este arquivo PSD não contém imagens editáveis.</p>
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'shapes' && (
                <div>
                  <h3 className={styles.tabTitle}>Elementos de Forma ({shapeElements.length})</h3>
                  {shapeElements.length > 0 ? (
                    <NoSSRWrapper>
                      <div>
                        {shapeElements.map((element) => (
                          <EditableShapeElement key={element.id} element={element} onUpdate={updateShapeElement} />
                        ))}
                      </div>
                    </NoSSRWrapper>
                  ) : (
                    <div className={styles.emptyState}>
                      <div className={styles.emptyStateIcon}>🎨</div>
                      <h3>Nenhum elemento de forma encontrado</h3>
                      <p>Este arquivo PSD não contém formas editáveis.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal para o Editor Avançado */}
      <Modal isOpen={isAdvancedEditorOpen} onClose={() => setIsAdvancedEditorOpen(false)}>
        <PropertyEditor
          elements={[...textElements, ...imageElements, ...shapeElements]}
          onElementUpdate={updateElement}
          onGenerateImage={() => {
            handleRegenerateImage();
            setIsAdvancedEditorOpen(false); // Fecha o modal após gerar
          }}
        />
      </Modal>
    </>
  );
}

export default NewResultScreen;
