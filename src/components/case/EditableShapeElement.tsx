'use client';

import { useState, useEffect } from 'react';
import { type ShapeElement } from './FileProcessingContext';

interface EditableShapeElementProps {
  element: ShapeElement;
  onUpdate: (id: number, updates: Partial<ShapeElement>) => void;
}

const EditableShapeElement = ({ element, onUpdate }: EditableShapeElementProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localFillColor, setLocalFillColor] = useState(element.fillColor || '#ff0000');
  const [localStrokeColor, setLocalStrokeColor] = useState(element.strokeColor || '#000000');
  const [localStrokeWidth, setLocalStrokeWidth] = useState(element.strokeWidth || 1);

  const handleSave = () => {
    onUpdate(element.id, {
      fillColor: localFillColor,
      strokeColor: localStrokeColor,
      strokeWidth: localStrokeWidth
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLocalFillColor(element.fillColor || '#ff0000');
    setLocalStrokeColor(element.strokeColor || '#000000');
    setLocalStrokeWidth(element.strokeWidth || 1);
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
            Elemento de Forma - {element.type}
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
              🎨 Editar
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

      <div style={{
        marginBottom: '0.5rem',
        padding: '0.75rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
        border: '1px solid #dee2e6'
      }}>
        <strong>Nome:</strong>
        <div style={{
          marginTop: '0.25rem',
          fontSize: '0.9rem',
          color: '#495057'
        }}>
          {element.name || 'Sem nome'}
        </div>
      </div>

      {!isEditing ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
          {element.fillColor && (
            <div>
              <strong style={{ fontSize: '0.85rem' }}>Cor de Preenchimento:</strong>
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginTop: '0.25rem'
              }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  backgroundColor: element.fillColor,
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }} />
                <span style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>
                  {element.fillColor}
                </span>
              </div>
            </div>
          )}
          
          {element.strokeColor && (
            <div>
              <strong style={{ fontSize: '0.85rem' }}>Cor da Borda:</strong>
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginTop: '0.25rem'
              }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  backgroundColor: element.strokeColor,
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }} />
                <span style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>
                  {element.strokeColor}
                </span>
              </div>
            </div>
          )}
          
          {element.strokeWidth !== undefined && (
            <div>
              <strong style={{ fontSize: '0.85rem' }}>Espessura da Borda:</strong>
              <div style={{ 
                color: '#28a745',
                fontWeight: '600',
                fontSize: '0.9rem',
                marginTop: '0.25rem'
              }}>
                {element.strokeWidth}px
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem',
                fontWeight: '600',
                fontSize: '0.9rem'
              }}>
                Cor de Preenchimento:
              </label>
              <input
                type="color"
                value={rgbaToHex(localFillColor)}
                onChange={(e) => setLocalFillColor(hexToRgba(e.target.value))}
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
                Cor da Borda:
              </label>
              <input
                type="color"
                value={rgbaToHex(localStrokeColor)}
                onChange={(e) => setLocalStrokeColor(hexToRgba(e.target.value))}
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
                Espessura da Borda:
              </label>
              <input
                type="number"
                value={localStrokeWidth}
                onChange={(e) => setLocalStrokeWidth(parseFloat(e.target.value) || 0)}
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
        </div>
      )}
    </div>
  );
};

export default EditableShapeElement;