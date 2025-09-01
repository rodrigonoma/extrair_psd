'use client';

import { useState, useEffect } from 'react';
import { type ImageElement } from './FileProcessingContext';

interface EditableImageElementProps {
  element: ImageElement;
  onUpdate: (id: number, updates: Partial<ImageElement>) => void;
}

const EditableImageElement = ({ element, onUpdate }: EditableImageElementProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div style={{ height: '120px', backgroundColor: '#f5f5f5', borderRadius: '8px' }} />;
  }

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
            Elemento de Imagem
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

      {element.imageUrl && (
        <div style={{
          marginTop: '0.5rem',
          padding: '0.5rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          border: '1px solid #dee2e6'
        }}>
          <strong style={{ fontSize: '0.85rem' }}>Preview da Imagem:</strong>
          <div style={{
            marginTop: '0.5rem',
            maxWidth: '200px',
            maxHeight: '150px',
            overflow: 'hidden',
            borderRadius: '4px',
            border: '1px solid #ddd'
          }}>
            <img 
              src={element.imageUrl} 
              alt={element.name}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block'
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        </div>
      )}

      {!element.imageUrl && (
        <div style={{
          marginTop: '0.5rem',
          padding: '1rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          border: '1px solid #dee2e6',
          textAlign: 'center',
          color: '#666'
        }}>
          📷 Imagem não disponível
        </div>
      )}
    </div>
  );
};

export default EditableImageElement;