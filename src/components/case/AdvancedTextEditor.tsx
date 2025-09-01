'use client';

import { useState, useEffect } from 'react';
import { TextElement } from './FileProcessingContext';

interface AdvancedTextEditorProps {
  element: TextElement;
  onUpdate: (id: number, updates: Partial<TextElement>) => void;
}

const AdvancedTextEditor = ({ element, onUpdate }: AdvancedTextEditorProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localElement, setLocalElement] = useState<TextElement>(element);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setLocalElement(element);
  }, [element]);

  if (!mounted) {
    return <div style={{ height: '300px', backgroundColor: '#f5f5f5', borderRadius: '8px' }} />;
  }

  const handleSave = () => {
    console.log('=== AdvancedTextEditor: handleSave clicked ===');
    console.log('Element ID:', element.id);
    console.log('Original element:', element);
    console.log('Local element (with changes):', localElement);
    
    // Calculate what actually changed
    const changes: Partial<TextElement> = {};
    
    // Check each property for changes
    if (localElement.text !== element.text) changes.text = localElement.text;
    if (localElement.fontSize !== element.fontSize) changes.fontSize = localElement.fontSize;
    if (localElement.color !== element.color) changes.color = localElement.color;
    if (localElement.visible !== element.visible) changes.visible = localElement.visible;
    if (localElement.opacity !== element.opacity) changes.opacity = localElement.opacity;
    if (localElement.rotation !== element.rotation) changes.rotation = localElement.rotation;
    
    // Check complex properties
    if (localElement.stroke && JSON.stringify(localElement.stroke) !== JSON.stringify(element.stroke)) {
      changes.stroke = localElement.stroke;
      console.log('📝 STROKE CHANGES DETECTED:', changes.stroke);
    }
    
    if (localElement.dropShadow && JSON.stringify(localElement.dropShadow) !== JSON.stringify(element.dropShadow)) {
      changes.dropShadow = localElement.dropShadow;
      console.log('🌥️ DROP SHADOW CHANGES DETECTED:', changes.dropShadow);
    }
    
    if (localElement.backgroundColor && JSON.stringify(localElement.backgroundColor) !== JSON.stringify(element.backgroundColor)) {
      changes.backgroundColor = localElement.backgroundColor;
      console.log('🎨 BACKGROUND CHANGES DETECTED:', changes.backgroundColor);
    }
    
    console.log('📝 Changes to send:', changes);
    console.log('📝 Number of changes:', Object.keys(changes).length);
    
    if (Object.keys(changes).length > 0) {
      onUpdate(element.id, changes);
      console.log('✓ onUpdate called with changes');
    } else {
      console.log('⚠️ No changes detected, skipping update');
    }
    
    setIsEditing(false);
    console.log('=== AdvancedTextEditor: Save completed ===');
  };

  const handleCancel = () => {
    setLocalElement(element);
    setIsEditing(false);
  };

  const rgbaToHex = (rgba: string) => {
    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return '#000000';
    const [, r, g, b] = match;
    return '#' + [r, g, b].map(x => {
      const hex = parseInt(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  };

  const hexToRgba = (hex: string) => {
    console.log('🎨 Converting hex to rgba:', hex);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) {
      console.log('❌ Failed to parse hex color:', hex);
      return 'rgba(0, 0, 0, 1)';
    }
    const rgba = `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, 1)`;
    console.log('✅ Converted to rgba:', rgba);
    return rgba;
  };

  const updateLocalProperty = (path: string, value: any) => {
    const pathParts = path.split('.');
    const newElement = { ...localElement };
    
    if (pathParts.length === 1) {
      (newElement as any)[pathParts[0]] = value;
    } else if (pathParts.length === 2) {
      if (!(newElement as any)[pathParts[0]]) {
        (newElement as any)[pathParts[0]] = {};
      }
      (newElement as any)[pathParts[0]][pathParts[1]] = value;
    }
    
    setLocalElement(newElement);
  };

  return (
    <div style={{
      border: '2px solid #e0e0e0',
      borderRadius: '12px',
      padding: '1.5rem',
      marginBottom: '1.5rem',
      backgroundColor: element.visible ? '#fff' : '#f5f5f5',
      opacity: element.visible ? 1 : 0.7,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: '1.5rem'
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ 
            fontSize: '1rem', 
            color: '#333', 
            marginBottom: '0.5rem',
            fontWeight: '700'
          }}>
            📝 {element.name || `Elemento de Texto ${element.id}`}
          </div>
          <div style={{ 
            fontSize: '0.8rem', 
            color: '#666',
            marginBottom: '0.5rem'
          }}>
            ID: {element.id} | Posição: {Math.round(element.x)}, {Math.round(element.y)}
          </div>
          <div style={{ 
            fontSize: '0.8rem', 
            color: '#666'
          }}>
            Dimensões: {Math.round(element.width)} × {Math.round(element.height)}
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => onUpdate(element.id, { visible: !element.visible })}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.8rem',
              border: '1px solid #ddd',
              borderRadius: '6px',
              backgroundColor: element.visible ? '#e8f5e8' : '#f5f5f5',
              color: element.visible ? '#2e7d2e' : '#666',
              cursor: 'pointer'
            }}
          >
            {element.visible ? '👁️ Visível' : '🙈 Oculto'}
          </button>
          
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.8rem',
                border: '1px solid #007bff',
                borderRadius: '6px',
                backgroundColor: '#007bff',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              ✏️ Editar Propriedades
            </button>
          ) : (
            <>
              <button
                onClick={handleSave}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.8rem',
                  border: '1px solid #28a745',
                  borderRadius: '6px',
                  backgroundColor: '#28a745',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                ✅ Salvar
              </button>
              <button
                onClick={handleCancel}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.8rem',
                  border: '1px solid #6c757d',
                  borderRadius: '6px',
                  backgroundColor: '#6c757d',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                ❌ Cancelar
              </button>
            </>
          )}
        </div>
      </div>

      {!isEditing ? (
        /* View Mode */
        <div>
          <div style={{
            marginBottom: '1rem',
            padding: '1rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #dee2e6'
          }}>
            <strong>Texto:</strong>
            <div style={{
              marginTop: '0.5rem',
              fontFamily: localElement.fontFamily,
              fontSize: `${Math.min(localElement.fontSize, 16)}px`,
              color: localElement.color,
              backgroundColor: '#fff',
              padding: '0.75rem',
              borderRadius: '6px',
              border: '1px solid #ddd',
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap'
            }}>
              "{localElement.text}"
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <strong>Fonte:</strong>
              <div style={{ color: '#6f42c1', fontWeight: '600' }}>
                {localElement.fontFamily}
              </div>
            </div>
            <div>
              <strong>Tamanho:</strong>
              <div style={{ color: '#28a745', fontWeight: '600' }}>
                {localElement.fontSize}px
              </div>
            </div>
            <div>
              <strong>Cor:</strong>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem' 
              }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  backgroundColor: localElement.color,
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }} />
                <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                  {localElement.color}
                </span>
              </div>
            </div>
            <div>
              <strong>Opacidade:</strong>
              <div style={{ color: '#6f42c1', fontWeight: '600' }}>
                {((localElement.opacity || 1) * 100).toFixed(0)}%
              </div>
            </div>
            <div>
              <strong>Rotação:</strong>
              <div style={{ color: '#dc3545', fontWeight: '600' }}>
                {(localElement.rotation || 0).toFixed(1)}°
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Edit Mode */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Text Content */}
          <div>
            <h4 style={{ color: '#333', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📝 Conteúdo do Texto
            </h4>
            <textarea
              value={localElement.text}
              onChange={(e) => updateLocalProperty('text', e.target.value)}
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '0.9rem',
                fontFamily: 'monospace',
                resize: 'vertical'
              }}
            />
          </div>
          
          {/* Basic Text Properties */}
          <div>
            <h4 style={{ color: '#333', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🎨 Propriedades Básicas
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem',
                  fontWeight: '600',
                  color: '#333'
                }}>
                  Tamanho da Fonte:
                </label>
                <input
                  type="number"
                  value={localElement.fontSize}
                  onChange={(e) => updateLocalProperty('fontSize', parseInt(e.target.value) || 16)}
                  min="8"
                  max="200"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '0.9rem'
                  }}
                />
              </div>
              
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem',
                  fontWeight: '600',
                  color: '#333'
                }}>
                  Cor do Texto:
                </label>
                <input
                  type="color"
                  value={rgbaToHex(localElement.color)}
                  onChange={(e) => updateLocalProperty('color', hexToRgba(e.target.value))}
                  style={{
                    width: '100%',
                    height: '40px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                />
              </div>
              
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem',
                  fontWeight: '600',
                  color: '#333'
                }}>
                  Opacidade:
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={localElement.opacity || 1}
                  onChange={(e) => updateLocalProperty('opacity', parseFloat(e.target.value))}
                  style={{
                    width: '100%'
                  }}
                />
                <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#666' }}>
                  {((localElement.opacity || 1) * 100).toFixed(0)}%
                </div>
              </div>
              
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem',
                  fontWeight: '600',
                  color: '#333'
                }}>
                  Rotação (°):
                </label>
                <input
                  type="number"
                  value={(localElement.rotation || 0) * (180 / Math.PI)}
                  onChange={(e) => updateLocalProperty('rotation', (parseFloat(e.target.value) || 0) * (Math.PI / 180))}
                  min="-360"
                  max="360"
                  step="1"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '0.9rem'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Stroke/Border Properties */}
          <div>
            <h4 style={{ color: '#333', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🖼️ Borda do Texto
            </h4>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={localElement.stroke?.enabled || false}
                  onChange={(e) => {
                    const newStroke = {
                      enabled: e.target.checked,
                      color: localElement.stroke?.color || 'rgba(0, 0, 0, 1)',
                      width: localElement.stroke?.width || 1
                    };
                    updateLocalProperty('stroke', newStroke);
                  }}
                />
                <strong>Habilitar Borda</strong>
              </label>
            </div>
            
            {localElement.stroke?.enabled && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                    color: '#333'
                  }}>
                    Cor da Borda:
                  </label>
                  <input
                    type="color"
                    value={rgbaToHex(localElement.stroke.color)}
                    onChange={(e) => {
                      const newStroke = { ...localElement.stroke, color: hexToRgba(e.target.value) };
                      updateLocalProperty('stroke', newStroke);
                    }}
                    style={{
                      width: '100%',
                      height: '40px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                    color: '#333'
                  }}>
                    Espessura da Borda:
                  </label>
                  <input
                    type="number"
                    value={localElement.stroke.width}
                    onChange={(e) => {
                      const newStroke = { ...localElement.stroke, width: parseFloat(e.target.value) || 1 };
                      updateLocalProperty('stroke', newStroke);
                    }}
                    min="0"
                    max="50"
                    step="0.5"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Drop Shadow Properties */}
          <div>
            <h4 style={{ color: '#333', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🌫️ Sombra
            </h4>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={localElement.dropShadow?.enabled || false}
                  onChange={(e) => {
                    const newShadow = {
                      enabled: e.target.checked,
                      color: localElement.dropShadow?.color || 'rgba(0, 0, 0, 0.25)',
                      offsetX: localElement.dropShadow?.offsetX || 2,
                      offsetY: localElement.dropShadow?.offsetY || 2,
                      blurX: localElement.dropShadow?.blurX || 4,
                      blurY: localElement.dropShadow?.blurY || 4
                    };
                    updateLocalProperty('dropShadow', newShadow);
                  }}
                />
                <strong>Habilitar Sombra</strong>
              </label>
            </div>
            
            {localElement.dropShadow?.enabled && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                    color: '#333'
                  }}>
                    Cor da Sombra:
                  </label>
                  <input
                    type="color"
                    value={rgbaToHex(localElement.dropShadow.color)}
                    onChange={(e) => {
                      const newShadow = { ...localElement.dropShadow, color: hexToRgba(e.target.value) };
                      updateLocalProperty('dropShadow', newShadow);
                    }}
                    style={{
                      width: '100%',
                      height: '40px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                    color: '#333'
                  }}>
                    Offset X:
                  </label>
                  <input
                    type="number"
                    value={localElement.dropShadow.offsetX}
                    onChange={(e) => {
                      const newShadow = { ...localElement.dropShadow, offsetX: parseFloat(e.target.value) || 0 };
                      updateLocalProperty('dropShadow', newShadow);
                    }}
                    min="-50"
                    max="50"
                    step="0.5"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                    color: '#333'
                  }}>
                    Offset Y:
                  </label>
                  <input
                    type="number"
                    value={localElement.dropShadow.offsetY}
                    onChange={(e) => {
                      const newShadow = { ...localElement.dropShadow, offsetY: parseFloat(e.target.value) || 0 };
                      updateLocalProperty('dropShadow', newShadow);
                    }}
                    min="-50"
                    max="50"
                    step="0.5"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                    color: '#333'
                  }}>
                    Blur:
                  </label>
                  <input
                    type="number"
                    value={localElement.dropShadow.blurX}
                    onChange={(e) => {
                      const blur = parseFloat(e.target.value) || 0;
                      const newShadow = { ...localElement.dropShadow, blurX: blur, blurY: blur };
                      updateLocalProperty('dropShadow', newShadow);
                    }}
                    min="0"
                    max="50"
                    step="0.5"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Background Properties */}
          <div>
            <h4 style={{ color: '#333', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🎯 Fundo do Texto
            </h4>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={localElement.backgroundColor?.enabled || false}
                  onChange={(e) => {
                    const newBg = {
                      enabled: e.target.checked,
                      color: localElement.backgroundColor?.color || 'rgba(255, 255, 255, 1)',
                      cornerRadius: localElement.backgroundColor?.cornerRadius || 0,
                      paddingTop: localElement.backgroundColor?.paddingTop || 0,
                      paddingBottom: localElement.backgroundColor?.paddingBottom || 0,
                      paddingLeft: localElement.backgroundColor?.paddingLeft || 0,
                      paddingRight: localElement.backgroundColor?.paddingRight || 0
                    };
                    updateLocalProperty('backgroundColor', newBg);
                  }}
                />
                <strong>Habilitar Fundo</strong>
              </label>
            </div>
            
            {localElement.backgroundColor?.enabled && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                    color: '#333'
                  }}>
                    Cor do Fundo:
                  </label>
                  <input
                    type="color"
                    value={rgbaToHex(localElement.backgroundColor.color)}
                    onChange={(e) => {
                      const newBg = { ...localElement.backgroundColor, color: hexToRgba(e.target.value) };
                      updateLocalProperty('backgroundColor', newBg);
                    }}
                    style={{
                      width: '100%',
                      height: '40px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                    color: '#333'
                  }}>
                    Borda Arredondada:
                  </label>
                  <input
                    type="number"
                    value={localElement.backgroundColor.cornerRadius}
                    onChange={(e) => {
                      const newBg = { ...localElement.backgroundColor, cornerRadius: parseFloat(e.target.value) || 0 };
                      updateLocalProperty('backgroundColor', newBg);
                    }}
                    min="0"
                    max="50"
                    step="1"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                    color: '#333'
                  }}>
                    Padding (px):
                  </label>
                  <input
                    type="number"
                    value={localElement.backgroundColor.paddingTop}
                    onChange={(e) => {
                      const padding = parseFloat(e.target.value) || 0;
                      const newBg = { 
                        ...localElement.backgroundColor, 
                        paddingTop: padding,
                        paddingBottom: padding,
                        paddingLeft: padding,
                        paddingRight: padding
                      };
                      updateLocalProperty('backgroundColor', newBg);
                    }}
                    min="0"
                    max="50"
                    step="1"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedTextEditor;