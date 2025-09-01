'use client';

import { useState, useEffect } from 'react';
import { ImageElement } from './FileProcessingContext';

interface AdvancedImageEditorProps {
  element: ImageElement;
  onUpdate: (id: number, updates: Partial<ImageElement>) => void;
}

const AdvancedImageEditor = ({ element, onUpdate }: AdvancedImageEditorProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localElement, setLocalElement] = useState<ImageElement>(element);
  useEffect(() => {
    
    // Initialize localElement with proper structure for fill properties
    const initialElement = {
      ...element,
      // Ensure fill object exists with default values
      fill: element.fill || {
        enabled: true,
        type: '//ly.img.ubq/fill/image',
        imageFileURI: element.imageUrl || '',
        externalReference: '',
        previewFileURI: '',
        sourceSet: '',
        color: ''
      }
    };
    
    console.log('🔧 Initial element setup:', initialElement);
    setLocalElement(initialElement);
  }, [element]);


  const handleSave = () => {
    console.log('=== AdvancedImageEditor: handleSave clicked ===');
    console.log('Element ID:', element.id);
    console.log('Original element:', element);
    console.log('Local element (with changes):', localElement);
    
    // Calculate what actually changed
    const changes: Partial<ImageElement> = {};
    
    // Check each property for changes
    if (localElement.visible !== element.visible) changes.visible = localElement.visible;
    if (localElement.opacity !== element.opacity) changes.opacity = localElement.opacity;
    if (localElement.rotation !== element.rotation) changes.rotation = localElement.rotation;
    if (localElement.clipped !== element.clipped) changes.clipped = localElement.clipped;
    
    // Check fill changes (most important for image replacement)
    if (localElement.fill && JSON.stringify(localElement.fill) !== JSON.stringify(element.fill)) {
      changes.fill = localElement.fill;
      console.log('🖼️ FILL CHANGES DETECTED:', changes.fill);
    }
    
    // Check crop changes
    if (localElement.crop && JSON.stringify(localElement.crop) !== JSON.stringify(element.crop)) {
      changes.crop = localElement.crop;
    }
    
    // Check shadow changes
    if (localElement.dropShadow && JSON.stringify(localElement.dropShadow) !== JSON.stringify(element.dropShadow)) {
      changes.dropShadow = localElement.dropShadow;
    }
    
    // Check stroke changes
    if (localElement.stroke && JSON.stringify(localElement.stroke) !== JSON.stringify(element.stroke)) {
      changes.stroke = localElement.stroke;
    }
    
    // Check blur changes
    if (localElement.blur && JSON.stringify(localElement.blur) !== JSON.stringify(element.blur)) {
      changes.blur = localElement.blur;
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
    console.log('=== AdvancedImageEditor: Save completed ===');
  };

  const handleCancel = () => {
    setLocalElement(element);
    setIsEditing(false);
  };

  const updateLocalProperty = (path: string, value: any) => {
    console.log('🔧 updateLocalProperty called:', path, '=', value);
    console.log('🔧 Current localElement before update:', localElement);
    
    const pathParts = path.split('.');
    const newElement = { ...localElement };
    
    if (pathParts.length === 1) {
      (newElement as any)[pathParts[0]] = value;
      console.log('🔧 Set simple property:', pathParts[0], '=', value);
    } else if (pathParts.length === 2) {
      if (!(newElement as any)[pathParts[0]]) {
        (newElement as any)[pathParts[0]] = {};
        console.log('🔧 Created parent object:', pathParts[0]);
      }
      (newElement as any)[pathParts[0]][pathParts[1]] = value;
      console.log('🔧 Set nested property:', pathParts[0] + '.' + pathParts[1], '=', value);
    } else if (pathParts.length === 3) {
      // Support for deeper nesting like 'fill.image.property'
      if (!(newElement as any)[pathParts[0]]) {
        (newElement as any)[pathParts[0]] = {};
      }
      if (!(newElement as any)[pathParts[0]][pathParts[1]]) {
        (newElement as any)[pathParts[0]][pathParts[1]] = {};
      }
      (newElement as any)[pathParts[0]][pathParts[1]][pathParts[2]] = value;
      console.log('🔧 Set deep nested property:', path, '=', value);
    }
    
    console.log('🔧 newElement after update:', newElement);
    setLocalElement(newElement);
    
    // Verify the update worked
    setTimeout(() => {
      console.log('🔧 Verification - localElement after setState:', localElement);
    }, 50);
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
            🖼️ {element.name || `Elemento de Imagem ${element.id}`}
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

      {/* Image Preview */}
      {(localElement.imageUrl || element.imageUrl) && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <strong style={{ marginBottom: '0.5rem', display: 'block' }}>
            Preview da Imagem:
            {localElement.imageUrl && localElement.imageUrl !== element.imageUrl && (
              <span style={{ 
                marginLeft: '0.5rem', 
                fontSize: '0.8rem', 
                color: '#28a745',
                fontWeight: 'normal'
              }}>
                ✨ Nova imagem selecionada
              </span>
            )}
          </strong>
          <div style={{
            maxWidth: '300px',
            maxHeight: '200px',
            overflow: 'hidden',
            borderRadius: '6px',
            border: '1px solid #ddd',
            margin: '0 auto'
          }}>
            <img 
              src={localElement.imageUrl || element.imageUrl} 
              alt={element.name}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block'
              }}
              onError={(e) => {
                console.log('Image preview error:', e);
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        </div>
      )}

      {!isEditing ? (
        /* View Mode */
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <strong>Opacidade:</strong>
              <div style={{ color: '#6f42c1', fontWeight: '600' }}>
                {((localElement.opacity || 1) * 100).toFixed(0)}%
              </div>
            </div>
            <div>
              <strong>Rotação:</strong>
              <div style={{ color: '#dc3545', fontWeight: '600' }}>
                {((localElement.rotation || 0) * (180 / Math.PI)).toFixed(1)}°
              </div>
            </div>
            {localElement.crop && (
              <>
                <div>
                  <strong>Escala:</strong>
                  <div style={{ color: '#28a745', fontWeight: '600' }}>
                    {(localElement.crop.scaleRatio * 100).toFixed(0)}%
                  </div>
                </div>
                <div>
                  <strong>Escala X/Y:</strong>
                  <div style={{ color: '#28a745', fontWeight: '600' }}>
                    {(localElement.crop.scaleX * 100).toFixed(0)}% / {(localElement.crop.scaleY * 100).toFixed(0)}%
                  </div>
                </div>
              </>
            )}
            {localElement.stroke?.enabled && (
              <div>
                <strong>Borda:</strong>
                <div style={{ color: '#fd7e14', fontWeight: '600' }}>
                  {localElement.stroke.width.toFixed(1)}px - {localElement.stroke.color}
                </div>
              </div>
            )}
            {localElement.dropShadow?.enabled && (
              <div>
                <strong>Sombra:</strong>
                <div style={{ color: '#6c757d', fontWeight: '600' }}>
                  {localElement.dropShadow.offsetX.toFixed(0)}, {localElement.dropShadow.offsetY.toFixed(0)}
                </div>
              </div>
            )}
            {localElement.blur?.enabled && (
              <div>
                <strong>Desfoque:</strong>
                <div style={{ color: '#17a2b8', fontWeight: '600' }}>
                  Ativado
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Edit Mode */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Image Replacement */}
          <div>
            <h4 style={{ color: '#333', marginBottom: '1rem' }}>🖼️ Substituir Imagem</h4>
            <div style={{ 
              padding: '1rem',
              border: '2px dashed #007bff',
              borderRadius: '8px',
              backgroundColor: '#f8f9ff',
              textAlign: 'center'
            }}>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  console.log('🖼️ FILE INPUT CHANGED');
                  const file = e.target.files?.[0];
                  if (file) {
                    console.log('📁 File selected:', file.name, file.type, file.size, 'bytes');
                    
                    // Create both data URL and blob URL for better compatibility
                    const blobUrl = URL.createObjectURL(file);
                    console.log('🔗 Created blob URL:', blobUrl);
                    
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const imageDataUrl = event.target?.result as string;
                      console.log('📝 Created data URL (first 50 chars):', imageDataUrl.substring(0, 50) + '...');
                      
                      console.log('🔧 Before updateLocalProperty - current localElement.fill:', localElement.fill);
                      
                      // Try both blob URL and data URL for CE.SDK compatibility
                      updateLocalProperty('fill.imageFileURI', blobUrl); // Try blob URL first
                      updateLocalProperty('fill.enabled', true);
                      updateLocalProperty('fill.type', '//ly.img.ubq/fill/image');
                      
                      // Update the imageUrl for immediate preview using data URL
                      updateLocalProperty('imageUrl', imageDataUrl);
                      
                      console.log('✅ Image file selected and properties updated');
                      console.log('   - Blob URL for CE.SDK:', blobUrl);
                      console.log('   - Data URL for preview (first 50):', imageDataUrl.substring(0, 50) + '...');
                      
                      // Let's also log the updated localElement after a small delay
                      setTimeout(() => {
                        console.log('🔧 After updateLocalProperty - localElement.fill:', localElement.fill);
                      }, 100);
                    };
                    reader.readAsDataURL(file);
                  } else {
                    console.log('❌ No file selected');
                  }
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #007bff',
                  borderRadius: '6px',
                  backgroundColor: '#fff',
                  cursor: 'pointer'
                }}
              />
              <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#666' }}>
                Selecione uma nova imagem para substituir a atual
              </p>
            </div>
          </div>

          {/* Transform Properties */}
          <div>
            <h4 style={{ color: '#333', marginBottom: '1rem' }}>🔧 Transformações</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
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

          {/* Border/Stroke Properties */}
          <div>
            <h4 style={{ color: '#333', marginBottom: '1rem' }}>🖌️ Borda</h4>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={localElement.stroke?.enabled || false}
                  onChange={(e) => updateLocalProperty('stroke.enabled', e.target.checked)}
                />
                <span style={{ fontWeight: '600', color: '#333' }}>Ativar Borda</span>
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
                    value={localElement.stroke?.color || '#000000'}
                    onChange={(e) => updateLocalProperty('stroke.color', e.target.value)}
                    style={{
                      width: '100%',
                      height: '2.5rem',
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
                    Espessura:
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="0.5"
                    value={localElement.stroke?.width || 1}
                    onChange={(e) => updateLocalProperty('stroke.width', parseFloat(e.target.value))}
                    style={{
                      width: '100%'
                    }}
                  />
                  <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#666' }}>
                    {(localElement.stroke?.width || 1).toFixed(1)}px
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Drop Shadow Properties */}
          <div>
            <h4 style={{ color: '#333', marginBottom: '1rem' }}>🌫️ Sombra</h4>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={localElement.dropShadow?.enabled || false}
                  onChange={(e) => updateLocalProperty('dropShadow.enabled', e.target.checked)}
                />
                <span style={{ fontWeight: '600', color: '#333' }}>Ativar Sombra</span>
              </label>
            </div>
            
            {localElement.dropShadow?.enabled && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
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
                    value={localElement.dropShadow?.color || '#000000'}
                    onChange={(e) => updateLocalProperty('dropShadow.color', e.target.value)}
                    style={{
                      width: '100%',
                      height: '2.5rem',
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
                    Deslocamento X:
                  </label>
                  <input
                    type="range"
                    min="-20"
                    max="20"
                    step="0.5"
                    value={localElement.dropShadow?.offsetX || 0}
                    onChange={(e) => updateLocalProperty('dropShadow.offsetX', parseFloat(e.target.value))}
                    style={{
                      width: '100%'
                    }}
                  />
                  <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#666' }}>
                    {(localElement.dropShadow?.offsetX || 0).toFixed(1)}px
                  </div>
                </div>
                
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                    color: '#333'
                  }}>
                    Deslocamento Y:
                  </label>
                  <input
                    type="range"
                    min="-20"
                    max="20"
                    step="0.5"
                    value={localElement.dropShadow?.offsetY || 0}
                    onChange={(e) => updateLocalProperty('dropShadow.offsetY', parseFloat(e.target.value))}
                    style={{
                      width: '100%'
                    }}
                  />
                  <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#666' }}>
                    {(localElement.dropShadow?.offsetY || 0).toFixed(1)}px
                  </div>
                </div>
                
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                    color: '#333'
                  }}>
                    Desfoque X:
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="0.5"
                    value={localElement.dropShadow?.blurX || 0}
                    onChange={(e) => updateLocalProperty('dropShadow.blurX', parseFloat(e.target.value))}
                    style={{
                      width: '100%'
                    }}
                  />
                  <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#666' }}>
                    {(localElement.dropShadow?.blurX || 0).toFixed(1)}px
                  </div>
                </div>
                
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                    color: '#333'
                  }}>
                    Desfoque Y:
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="0.5"
                    value={localElement.dropShadow?.blurY || 0}
                    onChange={(e) => updateLocalProperty('dropShadow.blurY', parseFloat(e.target.value))}
                    style={{
                      width: '100%'
                    }}
                  />
                  <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#666' }}>
                    {(localElement.dropShadow?.blurY || 0).toFixed(1)}px
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Blur Properties */}
          <div>
            <h4 style={{ color: '#333', marginBottom: '1rem' }}>🔍 Desfoque</h4>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={localElement.blur?.enabled || false}
                  onChange={(e) => updateLocalProperty('blur.enabled', e.target.checked)}
                />
                <span style={{ fontWeight: '600', color: '#333' }}>Ativar Desfoque</span>
              </label>
            </div>
          </div>

          {/* Fill Color Override */}
          <div>
            <h4 style={{ color: '#333', marginBottom: '1rem' }}>🎨 Preenchimento</h4>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={localElement.fill?.enabled !== false}
                  onChange={(e) => updateLocalProperty('fill.enabled', e.target.checked)}
                />
                <span style={{ fontWeight: '600', color: '#333' }}>Ativar Preenchimento</span>
              </label>
            </div>
            
            {localElement.fill?.enabled !== false && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                    color: '#333'
                  }}>
                    Tipo de Preenchimento:
                  </label>
                  <select
                    value={localElement.fill?.type === '//ly.img.ubq/fill/color' ? 'color' : 'image'}
                    onChange={(e) => {
                      const isColor = e.target.value === 'color';
                      updateLocalProperty('fill.type', isColor ? '//ly.img.ubq/fill/color' : '//ly.img.ubq/fill/image');
                      if (isColor && !localElement.fill?.color) {
                        updateLocalProperty('fill.color', '#ffffff');
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '0.9rem'
                    }}
                  >
                    <option value="image">Imagem</option>
                    <option value="color">Cor Sólida</option>
                  </select>
                </div>
                
                {localElement.fill?.type === '//ly.img.ubq/fill/color' && (
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '0.5rem',
                      fontWeight: '600',
                      color: '#333'
                    }}>
                      Cor de Preenchimento:
                    </label>
                    <input
                      type="color"
                      value={localElement.fill?.color || '#ffffff'}
                      onChange={(e) => updateLocalProperty('fill.color', e.target.value)}
                      style={{
                        width: '100%',
                        height: '2.5rem',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Crop Properties */}
          {localElement.crop && (
            <div>
              <h4 style={{ color: '#333', marginBottom: '1rem' }}>✂️ Recorte e Escala</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                    color: '#333'
                  }}>
                    Escala Geral:
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="3"
                    step="0.1"
                    value={localElement.crop.scaleRatio}
                    onChange={(e) => updateLocalProperty('crop.scaleRatio', parseFloat(e.target.value))}
                    style={{
                      width: '100%'
                    }}
                  />
                  <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#666' }}>
                    {(localElement.crop.scaleRatio * 100).toFixed(0)}%
                  </div>
                </div>
                
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                    color: '#333'
                  }}>
                    Escala X:
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="3"
                    step="0.1"
                    value={localElement.crop.scaleX}
                    onChange={(e) => updateLocalProperty('crop.scaleX', parseFloat(e.target.value))}
                    style={{
                      width: '100%'
                    }}
                  />
                  <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#666' }}>
                    {(localElement.crop.scaleX * 100).toFixed(0)}%
                  </div>
                </div>
                
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                    color: '#333'
                  }}>
                    Escala Y:
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="3"
                    step="0.1"
                    value={localElement.crop.scaleY}
                    onChange={(e) => updateLocalProperty('crop.scaleY', parseFloat(e.target.value))}
                    style={{
                      width: '100%'
                    }}
                  />
                  <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#666' }}>
                    {(localElement.crop.scaleY * 100).toFixed(0)}%
                  </div>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                    color: '#333'
                  }}>
                    Posição X:
                  </label>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="1"
                    value={localElement.crop.translationX}
                    onChange={(e) => updateLocalProperty('crop.translationX', parseFloat(e.target.value))}
                    style={{
                      width: '100%'
                    }}
                  />
                  <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#666' }}>
                    {localElement.crop.translationX.toFixed(0)}px
                  </div>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                    color: '#333'
                  }}>
                    Posição Y:
                  </label>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="1"
                    value={localElement.crop.translationY}
                    onChange={(e) => updateLocalProperty('crop.translationY', parseFloat(e.target.value))}
                    style={{
                      width: '100%'
                    }}
                  />
                  <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#666' }}>
                    {localElement.crop.translationY.toFixed(0)}px
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!(localElement.imageUrl || element.imageUrl) && (
        <div style={{
          marginTop: '0.5rem',
          padding: '1.5rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6',
          textAlign: 'center',
          color: '#666'
        }}>
          📷 Imagem não disponível para preview
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#999' }}>
            Selecione uma nova imagem acima para ver o preview
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedImageEditor;