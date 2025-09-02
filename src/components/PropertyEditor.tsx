import React, { useState } from 'react';
import { TextElement, ImageElement, ShapeElement } from './case/FileProcessingContext';
import styles from './PropertyEditor.module.css';

// A lista de fontes permanece a mesma
const availableFonts = [
  { name: 'Aviano Sans Bold', file: 'Aviano Sans Bold.otf', family: 'Aviano Sans', identifier: 'AvianoSansBold' },
  { name: 'Aviano Sans Black', file: 'Avianos Sans Black.otf', family: 'Aviano Sans', identifier: 'AvianoSansBlack' },
  { name: 'Aviano Sans Light', file: 'Avianos Sans Light.otf', family: 'Aviano Sans', identifier: 'AvianoSansLight' },
  { name: 'Aviano Sans Thin', file: 'Avianos Sans Thin.otf', family: 'Aviano Sans', identifier: 'AvianoSansThin' },
  { name: 'Bebas Neue Bold', file: 'BebasNeue Bold.otf', family: 'Bebas Neue', identifier: 'BebasNeueBold' },
  { name: 'Bebas Neue Book', file: 'BebasNeue Book.otf', family: 'Bebas Neue', identifier: 'BebasNeueBook' },
  { name: 'Bebas Neue Light', file: 'BebasNeue Light.otf', family: 'Bebas Neue', identifier: 'BebasNeueLight' },
  { name: 'Bebas Neue Regular', file: 'BebasNeue Regular.otf', family: 'Bebas Neue', identifier: 'BebasNeueRegular' },
  { name: 'Bebas Neue Thin', file: 'BebasNeue Thin.otf', family: 'Bebas Neue', identifier: 'BebasNeueThin' },
  { name: 'Inter 28pt', file: 'Inter 28pt.ttf', family: 'Inter', identifier: 'Inter28pt' },
  { name: 'Inter 24pt Bold', file: 'Inter_24pt-Bold.ttf', family: 'Inter', identifier: 'Inter24ptBold' },
  { name: 'Inter 24pt Light', file: 'Inter_24pt-Light.ttf', family: 'Inter', identifier: 'Inter24ptLight' },
  { name: 'Inter 24pt Regular', file: 'Inter_24pt-Regular.ttf', family: 'Inter', identifier: 'Inter24pt' },
  { name: 'Inter 28pt Bold', file: 'Inter_28pt-Bold.ttf', family: 'Inter', identifier: 'Inter28ptBold' },
  { name: 'Montserrat Bold', file: 'Montserrat-Bold.ttf', family: 'Montserrat', identifier: 'MontserratBold' },
  { name: 'Montserrat Light', file: 'Montserrat-Light.ttf', family: 'Montserrat', identifier: 'MontserratLight' },
  { name: 'Montserrat Regular', file: 'Montserrat-Regular.ttf', family: 'Montserrat', identifier: 'MontserratRegular' }
];

interface PropertyEditorProps {
  elements: (TextElement | ImageElement | ShapeElement)[];
  onElementUpdate: (elementId: number, updates: any) => void;
  onGenerateImage: () => void;
}

const PropertyEditor: React.FC<PropertyEditorProps> = ({
  elements,
  onElementUpdate,
  onGenerateImage
}) => {
  const [selectedElementId, setSelectedElementId] = useState<number | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  const selectedElement = elements.find(el => el.id === selectedElementId);

  const filteredElements = elements.filter(element =>
    element.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    element.id.toString().includes(searchFilter)
  );

  const handlePropertyChange = (propertyPath: string, value: any) => {
    if (!selectedElement) return;
    const updates = { [propertyPath]: value };
    onElementUpdate(selectedElement.id, updates);
  };

  const renderTextProperties = (element: TextElement) => (
    <>
      <div className={styles.propertyGroup}>
        <h4 className={styles.groupTitle}>Conteúdo e Fonte</h4>
        <div className={styles.groupContent}>
          <div className={`${styles.formControl} ${styles.fullWidth}`}>
            <label className={styles.label}>Texto</label>
            <textarea
              value={element.text}
              onChange={(e) => handlePropertyChange('text', e.target.value)}
              className={styles.textarea}
              rows={3}
            />
          </div>
          <div className={styles.formControl}>
            <label className={styles.label}>Fonte</label>
            <select
              value={element.fontFamily}
              onChange={(e) => handlePropertyChange('fontFamily', e.target.value)}
              className={styles.select}
            >
              <option value="">Selecione uma fonte...</option>
              {availableFonts.map((font) => (
                <option key={font.name} value={font.identifier}>
                  {font.name}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.formControl}>
            <label className={styles.label}>Tamanho da Fonte</label>
            <input
              type="number"
              value={element.fontSize}
              onChange={(e) => handlePropertyChange('fontSize', parseFloat(e.target.value))}
              className={styles.input}
            />
          </div>
          <div className={styles.formControl}>
            <label className={styles.label}>Cor</label>
            <input
              type="color"
              value={element.color.startsWith('#') ? element.color : '#000000'}
              onChange={(e) => handlePropertyChange('color', e.target.value)}
              className={`${styles.input} ${styles.colorInput}`}
            />
          </div>
        </div>
      </div>
      {renderPositionAndDimension(element)}
    </>
  );

  const renderImageProperties = (element: ImageElement) => (
    <>
      <div className={styles.propertyGroup}>
        <h4 className={styles.groupTitle}>Propriedades da Imagem</h4>
        <div className={styles.groupContent}>
          <div className={`${styles.formControl} ${styles.fullWidth}`}>
            <label className={styles.label}>URL da Imagem</label>
            <input
              type="text"
              value={element.imageUrl || ''}
              onChange={(e) => handlePropertyChange('imageUrl', e.target.value)}
              className={styles.input}
            />
          </div>
          <div className={styles.formControl}>
            <label className={styles.label}>Opacidade</label>
            <input
              type="number"
              min="0" max="1" step="0.1"
              value={element.opacity || 1}
              onChange={(e) => handlePropertyChange('opacity', parseFloat(e.target.value))}
              className={styles.input}
            />
          </div>
        </div>
      </div>
      {renderPositionAndDimension(element)}
    </>
  );

  const renderPositionAndDimension = (element: TextElement | ImageElement | ShapeElement) => (
    <div className={styles.propertyGroup}>
      <h4 className={styles.groupTitle}>Posição e Dimensão</h4>
      <div className={styles.groupContent}>
        <div className={styles.formControl}>
          <label className={styles.label}>Posição X</label>
          <input type="number" value={element.x} onChange={(e) => handlePropertyChange('x', parseFloat(e.target.value))} className={styles.input} />
        </div>
        <div className={styles.formControl}>
          <label className={styles.label}>Posição Y</label>
          <input type="number" value={element.y} onChange={(e) => handlePropertyChange('y', parseFloat(e.target.value))} className={styles.input} />
        </div>
        <div className={styles.formControl}>
          <label className={styles.label}>Largura</label>
          <input type="number" value={element.width} onChange={(e) => handlePropertyChange('width', parseFloat(e.target.value))} className={styles.input} />
        </div>
        <div className={styles.formControl}>
          <label className={styles.label}>Altura</label>
          <input type="number" value={element.height} onChange={(e) => handlePropertyChange('height', parseFloat(e.target.value))} className={styles.input} />
        </div>
      </div>
    </div>
  );

  return (
    <div className={styles.wrapper}>
      <div className={styles.elementListPanel}>
        <div className={styles.listHeader}>
          <h3 className={styles.listTitle}>Elementos</h3>
          <input
            type="text"
            placeholder="Buscar por nome ou ID..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.elementList}>
          {filteredElements.map((element) => (
            <div
              key={element.id}
              className={`${styles.elementCard} ${selectedElementId === element.id ? styles.selected : ''}`}
              onClick={() => setSelectedElementId(element.id)}
            >
              <div className={styles.elementName}>{element.name}</div>
              <div className={styles.elementDetails}>ID: {element.id} | Tipo: {element.type || 'Desconhecido'}</div>
              {element.visible !== undefined && (
                <div className={styles.elementVisibility}>
                  {element.visible ? '👁️ Visível' : '🚫 Oculto'}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.editorPanel}>
        {selectedElement ? (
          <div>
            <div className={styles.editorHeader}>
              <h2 className={styles.editorTitle}>{selectedElement.name}</h2>
              <p className={styles.editorSubTitle}>ID: {selectedElement.id}</p>
            </div>

            <div className={styles.propertyGroup}>
              <h4 className={styles.groupTitle}>Geral</h4>
              <div className={styles.groupContent}>
                <div className={styles.formControl}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={selectedElement.visible}
                      onChange={(e) => handlePropertyChange('visible', e.target.checked)}
                      className={styles.checkbox}
                    />
                    Visível
                  </label>
                </div>
              </div>
            </div>

            {'text' in selectedElement && renderTextProperties(selectedElement as TextElement)}
            {'imageUrl' in selectedElement && renderImageProperties(selectedElement as ImageElement)}

            <div className="mt-8 pt-4">
              <button onClick={onGenerateImage} className={styles.generateButton}>
                Gerar Imagem Atualizada
              </button>
            </div>

            <div className={styles.propertyGroup} style={{marginTop: '2rem'}}>
              <h4 className={styles.groupTitle}>Dados Brutos (Read-only)</h4>
              <div className={styles.groupContent}>
                <pre className={styles.rawViewer}>
                  {JSON.stringify(selectedElement, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p>Selecione um elemento na lista para editar suas propriedades.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyEditor;
