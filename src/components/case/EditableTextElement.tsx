'use client';

import { useState, useEffect } from 'react';
import { type TextElement } from './FileProcessingContext';

interface EditableTextElementProps {
  element: TextElement;
  onUpdate: (id: number, updates: Partial<TextElement>) => void;
}

const EditableTextElement = ({ element, onUpdate }: EditableTextElementProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localText, setLocalText] = useState(element.text);
  const [localFontSize, setLocalFontSize] = useState(element.fontSize);
  const [localColor, setLocalColor] = useState(element.color);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div style={{ height: '200px', backgroundColor: '#f5f5f5', borderRadius: '8px' }} />;
  }

  const handleSave = () => {
    onUpdate(element.id, {
      text: localText,
      fontSize: localFontSize,
      color: localColor
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLocalText(element.text);
    setLocalFontSize(element.fontSize);
    setLocalColor(element.color);
    setIsEditing(false);
  };

  // Convert rgba color to hex for color input
  const rgbaToHex = (rgba: string) => {
    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return '#000000';
    const [, r, g, b] = match;
    return '#' + [r, g, b].map(x => {
      const hex = parseInt(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  };

  // Convert hex color to rgba
  const hexToRgba = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return 'rgba(0, 0, 0, 1)';
    return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, 1)`;
  };

  return (
    <div style={{
      border: '2px solid #e0e0e0',
      borderRadius: '8px',
      padding: '1rem',
      marginBottom: '1rem',
      backgroundColor: element.visible ? '#fff' : '#f5f5f5',
      opacity: element.visible ? 1 : 0.7
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: '1rem'
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ 
            fontSize: '0.85rem', 
            color: '#666', 
            marginBottom: '0.5rem',
            fontWeight: '600'
          }}>
            Elemento de Texto
          </div>
          <div style={{ 
            fontSize: '0.75rem', 
            color: '#888',
            marginBottom: '0.5rem'
          }}>
            ID: {element.id} | Posição: {Math.round(element.x)}, {Math.round(element.y)}
          </div>
          <div style={{ 
            fontSize: '0.75rem', 
            color: '#888'
          }}>
            Dimensões: {Math.round(element.width)} × {Math.round(element.height)}
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => onUpdate(element.id, { visible: !element.visible })}
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
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
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                border: '1px solid #007bff',
                borderRadius: '4px',
                backgroundColor: '#007bff',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              ✏️ Editar
            </button>
          ) : (
            <>
              <button
                onClick={handleSave}
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  border: '1px solid #28a745',
                  borderRadius: '4px',
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
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  border: '1px solid #6c757d',
                  borderRadius: '4px',
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
        <div>
          <div style={{
            marginBottom: '0.5rem',
            padding: '0.75rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '4px',
            border: '1px solid #dee2e6'
          }}>
            <strong>Texto:</strong>
            <div style={{
              marginTop: '0.25rem',
              fontFamily: 'monospace',
              fontSize: `${Math.min(element.fontSize, 16)}px`,
              color: element.color,
              backgroundColor: '#fff',
              padding: '0.5rem',
              borderRadius: '3px',
              border: '1px solid #ddd',
              wordBreak: 'break-word'
            }}>
              &quot;{element.text}&quot;
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div>
              <strong style={{ fontSize: '0.85rem' }}>Fonte:</strong>
              <div style={{ 
                color: '#6f42c1',
                fontWeight: '600',
                fontSize: '0.9rem'
              }}>
                {element.fontFamily}
              </div>
            </div>
            <div>
              <strong style={{ fontSize: '0.85rem' }}>Tamanho:</strong>
              <div style={{ 
                color: '#28a745',
                fontWeight: '600',
                fontSize: '0.9rem'
              }}>
                {element.fontSize}px
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem',
              fontWeight: '600',
              fontSize: '0.9rem'
            }}>
              Texto:
            </label>
            <textarea
              value={localText}
              onChange={(e) => setLocalText(e.target.value)}
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.9rem',
                fontFamily: 'monospace',
                resize: 'vertical'
              }}
            />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem',
                fontWeight: '600',
                fontSize: '0.9rem'
              }}>
                Tamanho da Fonte:
              </label>
              <input
                type="number"
                value={localFontSize}
                onChange={(e) => setLocalFontSize(parseInt(e.target.value) || 16)}
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
                fontSize: '0.9rem'
              }}>
                Cor:
              </label>
              <input
                type="color"
                value={rgbaToHex(localColor)}
                onChange={(e) => setLocalColor(hexToRgba(e.target.value))}
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
                fontSize: '0.9rem'
              }}>
                Fonte:
              </label>
              <div style={{
                padding: '0.5rem',
                backgroundColor: '#f8f9fa',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.85rem',
                color: '#666'
              }}>
                {element.fontFamily}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditableTextElement;