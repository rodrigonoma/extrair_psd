import React, { useState, useEffect, useRef } from 'react';
import { TextElement, ImageElement, ShapeElement, useFileProcessing } from './case/FileProcessingContext';

// NOTE: availableFonts is now generated dynamically from fontDefinitions context

interface FontSelectorProps {
  currentFont: string;
  availableFonts: Array<{
    name: string;
    file: string;
    family: string;
    identifier: string;
  }>;
  onFontChange: (fontName: string, fontData?: any) => void;
}

const FontSelector: React.FC<FontSelectorProps> = ({ currentFont, availableFonts, onFontChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customFont, setCustomFont] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen]);

  const filteredFonts = availableFonts.filter(font =>
    font.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFontSelect = (font: any) => {
    onFontChange(font.name, font);
    setIsOpen(false);
    setSearchQuery('');
    setCustomFont('');
  };

  const handleCustomFontSubmit = () => {
    if (customFont.trim()) {
      onFontChange(customFont.trim());
      setIsOpen(false);
      setCustomFont('');
      setSearchQuery('');
    }
  };

  const currentFontData = availableFonts.find(f => f.name === currentFont);

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <label style={{ 
        display: 'block', 
        fontSize: '0.875rem', 
        fontWeight: '500', 
        marginBottom: '4px',
        color: '#374151'
      }}>
        ✨ Família da Fonte
      </label>

      {/* Current Selection */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '12px 16px',
          borderWidth: '2px',
          borderStyle: 'solid',
          borderColor: isOpen ? '#6366f1' : '#e5e7eb',
          borderRadius: '8px',
          backgroundColor: isOpen ? '#f3f4f6' : 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          outline: 'none',
          ...(isOpen && {
            boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.1)'
          })
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          {currentFontData ? (
            <>
              <div style={{
                width: '32px',
                height: '32px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '0.8rem',
                fontWeight: '600'
              }}>
                Aa
              </div>
              <div style={{ textAlign: 'left', flex: 1 }}>
                <div style={{ 
                  fontFamily: currentFontData.name, 
                  fontSize: '1rem', 
                  fontWeight: '600',
                  color: '#111827'
                }}>
                  {currentFontData.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  {currentFontData.file}
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{
                width: '32px',
                height: '32px',
                background: '#f3f4f6',
                border: '2px dashed #d1d5db',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem'
              }}>
                ?
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                  {currentFont || 'Selecionar fonte...'}
                </div>
              </div>
            </>
          )}
        </div>
        <div style={{ 
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
          transition: 'transform 0.2s ease',
          color: '#6b7280'
        }}>
          ▼
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '4px',
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          zIndex: 50,
          maxHeight: '400px',
          overflow: 'hidden'
        }}>
          {/* Search */}
          <div style={{ padding: '12px' }}>
            <input
              ref={searchRef}
              type="text"
              placeholder="🔍 Pesquisar fonte..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: '#d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem',
                outline: 'none',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#6366f1'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
          </div>

          {/* Font List */}
          <div style={{ 
            maxHeight: '280px', 
            overflowY: 'auto',
            borderTop: '1px solid #f3f4f6'
          }}>
            {filteredFonts.map((font, index) => (
              <div
                key={font.name}
                onClick={() => handleFontSelect(font)}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  borderBottom: index < filteredFonts.length - 1 ? '1px solid #f9fafb' : 'none',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.transform = 'translateX(2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.transform = 'translateX(0px)';
                }}
              >
                <div style={{
                  width: '36px',
                  height: '36px',
                  background: `linear-gradient(135deg, hsl(${(index * 47) % 360}, 70%, 60%), hsl(${(index * 47 + 60) % 360}, 70%, 70%))`,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  fontFamily: font.name
                }}>
                  Aa
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: font.name,
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#111827',
                    marginBottom: '2px'
                  }}>
                    {font.name}
                  </div>
                  <div style={{
                    fontFamily: font.name,
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    marginBottom: '4px'
                  }}>
                    The quick brown fox jumps
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    📁 {font.file}
                  </div>
                </div>
                {currentFont === font.name && (
                  <div style={{
                    width: '20px',
                    height: '20px',
                    background: '#10b981',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '0.7rem'
                  }}>
                    ✓
                  </div>
                )}
              </div>
            ))}

            {filteredFonts.length === 0 && searchQuery && (
              <div style={{
                padding: '24px',
                textAlign: 'center',
                color: '#6b7280'
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🔍</div>
                <p>Nenhuma fonte encontrada</p>
              </div>
            )}
          </div>

          {/* Custom Font Input */}
          <div style={{
            borderTop: '1px solid #f3f4f6',
            padding: '12px'
          }}>
            <div style={{ 
              fontSize: '0.75rem', 
              color: '#6b7280', 
              marginBottom: '8px',
              fontWeight: '500'
            }}>
              ✏️ Ou digite um nome personalizado:
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Nome da fonte..."
                value={customFont}
                onChange={(e) => setCustomFont(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCustomFontSubmit()}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: '#d1d5db',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  outline: 'none'
                }}
              />
              <button
                onClick={handleCustomFontSubmit}
                disabled={!customFont.trim()}
                style={{
                  padding: '6px 12px',
                  background: customFont.trim() ? '#6366f1' : '#e5e7eb',
                  color: customFont.trim() ? 'white' : '#9ca3af',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  cursor: customFont.trim() ? 'pointer' : 'not-allowed',
                  fontWeight: '500'
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface PropertyEditorProps {
  elements: (TextElement | ImageElement | ShapeElement)[];
  onElementUpdate: (elementId: number, updates: any) => void;
  onGenerateImage: () => void;
}

export const PropertyEditor: React.FC<PropertyEditorProps> = ({
  elements,
  onElementUpdate,
  onGenerateImage
}) => {
  const { fontDefinitions } = useFileProcessing();
  const [selectedElementId, setSelectedElementId] = useState<number | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  
  const selectedElement = elements.find(el => el.id === selectedElementId);

  // Convert dynamic font definitions to the format expected by this component
  const availableFonts = React.useMemo(() => {
    if (!fontDefinitions) return [];
    
    return Object.entries(fontDefinitions).map(([fontName, fontDef]: [string, any]) => {
      const font = fontDef.fonts?.[0];
      if (!font) return null;
      
      // Extract file name from URI
      const uriParts = font.uri.split('/');
      const fileName = decodeURIComponent(uriParts[uriParts.length - 1]);
      
      return {
        name: fontName,
        file: fileName,
        family: fontDef.name || fontName,
        identifier: fontName.replace(/\s+/g, '')  // Simple identifier generation
      };
    }).filter(Boolean);
  }, [fontDefinitions]);
  
  const filteredElements = elements.filter(element => 
    element.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    element.id.toString().includes(searchFilter)
  );

  const handlePropertyChange = (propertyPath: string, value: any) => {
    if (!selectedElement) return;
    
    const updates: any = {};
    
    // Handle nested property paths like 'textProperties.fontSize'
    const pathParts = propertyPath.split('.');
    if (pathParts.length === 1) {
      updates[propertyPath] = value;
    } else {
      // Create nested object for complex properties
      let current = updates;
      for (let i = 0; i < pathParts.length - 1; i++) {
        current[pathParts[i]] = current[pathParts[i]] || {};
        current = current[pathParts[i]];
      }
      current[pathParts[pathParts.length - 1]] = value;
    }
    
    onElementUpdate(selectedElement.id, updates);
  };

  const renderTextProperties = (element: TextElement) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '0.5rem'
      }}>
        <div style={{
          width: '4px',
          height: '30px',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          borderRadius: '2px'
        }} />
        <h3 style={{
          margin: 0,
          fontSize: '1.2rem',
          fontWeight: '700',
          color: '#1a1a1a'
        }}>Propriedades do Texto</h3>
      </div>
      
      {/* Basic text properties */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '1.5rem',
        padding: '1.5rem',
        background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
        borderRadius: '12px',
        border: '1px solid #bbf7d0'
      }}>
        <div style={{ gridColumn: 'span 2' }}>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '600',
            marginBottom: '0.5rem',
            color: '#065f46'
          }}>📝 Conteúdo do Texto</label>
          <textarea
            value={element.text}
            onChange={(e) => handlePropertyChange('text', e.target.value)}
            rows={3}
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #d1fae5',
              borderRadius: '8px',
              fontSize: '0.875rem',
              outline: 'none',
              transition: 'all 0.2s ease',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#10b981';
              e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#d1fae5';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>
        
        <div style={{ gridColumn: 'span 2' }}>
          <FontSelector
            currentFont={element.fontFamily}
            availableFonts={availableFonts}
            onFontChange={(fontName, fontData) => {
              if (fontData) {
                // Ensure the font is loaded in the browser
                const fontFace = new FontFace(fontData.family, `url(/fonts/${encodeURIComponent(fontData.file)})`);
                fontFace.load().then(() => {
                  document.fonts.add(fontFace);
                  console.log('✅ Font loaded in browser:', fontData.family);
                }).catch((err) => {
                  console.warn('❌ Font loading failed:', err);
                });
                
                handlePropertyChange('fontFamily', fontData.name);
                handlePropertyChange('fontFile', fontData.file);
                handlePropertyChange('fontName', fontData.name);
                handlePropertyChange('fontIdentifier', fontData.identifier);
              } else {
                handlePropertyChange('fontFamily', fontName);
              }
            }}
          />
        </div>
        
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '600',
            marginBottom: '0.5rem',
            color: '#065f46'
          }}>🔤 Tamanho da Fonte</label>
          <input
            type="number"
            value={element.fontSize}
            onChange={(e) => handlePropertyChange('fontSize', parseFloat(e.target.value))}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '2px solid #d1fae5',
              borderRadius: '8px',
              fontSize: '0.875rem',
              outline: 'none',
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#10b981';
              e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#d1fae5';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>
        
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '600',
            marginBottom: '0.5rem',
            color: '#065f46'
          }}>🎨 Cor do Texto</label>
          <div style={{ position: 'relative' }}>
            <input
              type="color"
              value={element.color.startsWith('#') ? element.color : '#000000'}
              onChange={(e) => handlePropertyChange('color', e.target.value)}
              style={{
                width: '100%',
                height: '44px',
                border: '2px solid #d1fae5',
                borderRadius: '8px',
                cursor: 'pointer',
                outline: 'none',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#10b981';
                e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#d1fae5';
                e.target.style.boxShadow = 'none';
              }}
            />
            <div style={{
              position: 'absolute',
              bottom: '4px',
              left: '4px',
              right: '4px',
              textAlign: 'center',
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#065f46',
              pointerEvents: 'none'
            }}>
              {element.color.startsWith('#') ? element.color.toUpperCase() : '#000000'}
            </div>
          </div>
        </div>
      </div>

      {/* Position and dimensions */}
      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">X Position</label>
          <input
            type="number"
            value={element.x}
            onChange={(e) => handlePropertyChange('x', parseFloat(e.target.value))}
            className="w-full p-2 border rounded-md"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Y Position</label>
          <input
            type="number"
            value={element.y}
            onChange={(e) => handlePropertyChange('y', parseFloat(e.target.value))}
            className="w-full p-2 border rounded-md"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Width</label>
          <input
            type="number"
            value={element.width}
            onChange={(e) => handlePropertyChange('width', parseFloat(e.target.value))}
            className="w-full p-2 border rounded-md"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Height</label>
          <input
            type="number"
            value={element.height}
            onChange={(e) => handlePropertyChange('height', parseFloat(e.target.value))}
            className="w-full p-2 border rounded-md"
          />
        </div>
      </div>

      {/* Advanced text properties */}
      {element.textProperties && (
        <div>
          <h4 className="text-md font-semibold mb-2">Advanced Text Properties</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Horizontal Alignment</label>
              <select
                value={element.textProperties.horizontalAlignment || 'left'}
                onChange={(e) => handlePropertyChange('textProperties.horizontalAlignment', e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Vertical Alignment</label>
              <select
                value={element.textProperties.verticalAlignment || 'top'}
                onChange={(e) => handlePropertyChange('textProperties.verticalAlignment', e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="top">Top</option>
                <option value="center">Center</option>
                <option value="bottom">Bottom</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Letter Spacing</label>
              <input
                type="number"
                step="0.1"
                value={element.textProperties.letterSpacing || 0}
                onChange={(e) => handlePropertyChange('textProperties.letterSpacing', parseFloat(e.target.value))}
                className="w-full p-2 border rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Line Height</label>
              <input
                type="number"
                step="0.1"
                value={element.textProperties.lineHeight || 1}
                onChange={(e) => handlePropertyChange('textProperties.lineHeight', parseFloat(e.target.value))}
                className="w-full p-2 border rounded-md"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderImageProperties = (element: ImageElement) => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Image Properties</h3>
      
      {/* Basic image properties */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Image URL</label>
          <input
            type="text"
            value={element.imageUrl || ''}
            onChange={(e) => handlePropertyChange('imageUrl', e.target.value)}
            className="w-full p-2 border rounded-md"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Opacity</label>
          <input
            type="number"
            min="0"
            max="1"
            step="0.1"
            value={element.opacity || 1}
            onChange={(e) => handlePropertyChange('opacity', parseFloat(e.target.value))}
            className="w-full p-2 border rounded-md"
          />
        </div>
      </div>

      {/* Position and dimensions */}
      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">X Position</label>
          <input
            type="number"
            value={element.x}
            onChange={(e) => handlePropertyChange('x', parseFloat(e.target.value))}
            className="w-full p-2 border rounded-md"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Y Position</label>
          <input
            type="number"
            value={element.y}
            onChange={(e) => handlePropertyChange('y', parseFloat(e.target.value))}
            className="w-full p-2 border rounded-md"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Width</label>
          <input
            type="number"
            value={element.width}
            onChange={(e) => handlePropertyChange('width', parseFloat(e.target.value))}
            className="w-full p-2 border rounded-md"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Height</label>
          <input
            type="number"
            value={element.height}
            onChange={(e) => handlePropertyChange('height', parseFloat(e.target.value))}
            className="w-full p-2 border rounded-md"
          />
        </div>
      </div>

      {/* Crop properties */}
      {element.crop && (
        <div>
          <h4 className="text-md font-semibold mb-2">Crop Properties</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Scale X</label>
              <input
                type="number"
                step="0.1"
                value={element.crop.scaleX}
                onChange={(e) => handlePropertyChange('crop.scaleX', parseFloat(e.target.value))}
                className="w-full p-2 border rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Scale Y</label>
              <input
                type="number"
                step="0.1"
                value={element.crop.scaleY}
                onChange={(e) => handlePropertyChange('crop.scaleY', parseFloat(e.target.value))}
                className="w-full p-2 border rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Rotation</label>
              <input
                type="number"
                value={element.crop.rotation}
                onChange={(e) => handlePropertyChange('crop.rotation', parseFloat(e.target.value))}
                className="w-full p-2 border rounded-md"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderAdvancedProperties = (element: any) => {
    if (!element.rawProperties) return null;
    
    const editableProperties = [
      // Layer management
      { key: 'alwaysOnBottom', type: 'boolean', label: 'Always on Bottom' },
      { key: 'alwaysOnTop', type: 'boolean', label: 'Always on Top' },
      { key: 'clipped', type: 'boolean', label: 'Clipped' },
      { key: 'includedInExport', type: 'boolean', label: 'Included in Export' },
      { key: 'highlightEnabled', type: 'boolean', label: 'Highlight Enabled' },
      { key: 'opacity', type: 'number', label: 'Opacity', min: 0, max: 1, step: 0.1 },
      
      // Blend mode
      { key: 'blend/mode', type: 'select', label: 'Blend Mode', options: ['Normal', 'Multiply', 'Screen', 'Overlay', 'SoftLight', 'HardLight', 'ColorDodge', 'ColorBurn', 'Darken', 'Lighten', 'Difference', 'Exclusion'] },
      
      // Content fill mode
      { key: 'contentFill/mode', type: 'select', label: 'Content Fill Mode', options: ['Cover', 'Contain', 'Stretch', 'Crop'] },
      { key: 'height/mode', type: 'select', label: 'Height Mode', options: ['Absolute', 'Auto'] },
      
      // Crop properties
      { key: 'crop/rotation', type: 'number', label: 'Crop Rotation', step: 0.1 },
      { key: 'crop/scaleRatio', type: 'number', label: 'Crop Scale Ratio', min: 0.1, max: 5, step: 0.1 },
      { key: 'crop/scaleX', type: 'number', label: 'Crop Scale X', min: 0.1, max: 5, step: 0.1 },
      { key: 'crop/scaleY', type: 'number', label: 'Crop Scale Y', min: 0.1, max: 5, step: 0.1 },
      { key: 'crop/translationX', type: 'number', label: 'Crop Translation X', step: 0.1 },
      { key: 'crop/translationY', type: 'number', label: 'Crop Translation Y', step: 0.1 },
      
      // Drop shadow
      { key: 'dropShadow/enabled', type: 'boolean', label: 'Drop Shadow Enabled' },
      { key: 'dropShadow/offset/x', type: 'number', label: 'Shadow Offset X', step: 0.1 },
      { key: 'dropShadow/offset/y', type: 'number', label: 'Shadow Offset Y', step: 0.1 },
      { key: 'dropShadow/blurRadius/x', type: 'number', label: 'Shadow Blur X', min: 0, step: 0.1 },
      { key: 'dropShadow/blurRadius/y', type: 'number', label: 'Shadow Blur Y', min: 0, step: 0.1 },
      { key: 'dropShadow/clip', type: 'boolean', label: 'Shadow Clip' },
      
      // Other properties
      { key: 'blur/enabled', type: 'boolean', label: 'Blur Enabled' },
      { key: 'fill/enabled', type: 'boolean', label: 'Fill Enabled' }
    ];
    
    const handleRawPropertyChange = (propertyPath: string, value: any) => {
      const updates: any = {};
      updates[propertyPath] = value;
      onElementUpdate(element.id, updates);
    };
    
    return (
      <div className="mt-6">
        <h4 className="text-md font-semibold mb-4">Advanced Properties</h4>
        
        {/* Editable Advanced Properties */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {editableProperties
            .filter(prop => element.rawProperties.hasOwnProperty(prop.key))
            .map((prop) => {
              const currentValue = element.rawProperties[prop.key];
              
              return (
                <div key={prop.key}>
                  <label className="block text-sm font-medium mb-1">{prop.label}</label>
                  
                  {prop.type === 'boolean' && (
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={currentValue || false}
                        onChange={(e) => handleRawPropertyChange(prop.key, e.target.checked)}
                        className="mr-2"
                      />
                      {currentValue ? 'Enabled' : 'Disabled'}
                    </label>
                  )}
                  
                  {prop.type === 'number' && (
                    <input
                      type="number"
                      value={currentValue || 0}
                      onChange={(e) => handleRawPropertyChange(prop.key, parseFloat(e.target.value))}
                      className="w-full p-2 border rounded-md"
                      min={prop.min}
                      max={prop.max}
                      step={prop.step || 1}
                    />
                  )}
                  
                  {prop.type === 'select' && (
                    <select
                      value={currentValue || prop.options?.[0]}
                      onChange={(e) => handleRawPropertyChange(prop.key, e.target.value)}
                      className="w-full p-2 border rounded-md"
                    >
                      {prop.options?.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })
          }
        </div>
        
        {/* Drop Shadow Color */}
        {element.rawProperties['dropShadow/color'] && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Drop Shadow Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={`#${Math.round(element.rawProperties['dropShadow/color'].r * 255).toString(16).padStart(2, '0')}${Math.round(element.rawProperties['dropShadow/color'].g * 255).toString(16).padStart(2, '0')}${Math.round(element.rawProperties['dropShadow/color'].b * 255).toString(16).padStart(2, '0')}`}
                onChange={(e) => {
                  const r = parseInt(e.target.value.slice(1, 3), 16) / 255;
                  const g = parseInt(e.target.value.slice(3, 5), 16) / 255;
                  const b = parseInt(e.target.value.slice(5, 7), 16) / 255;
                  const a = element.rawProperties['dropShadow/color'].a || 1;
                  handleRawPropertyChange('dropShadow/color', { r, g, b, a });
                }}
                className="w-16 p-1 border rounded-md"
              />
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={element.rawProperties['dropShadow/color'].a || 1}
                onChange={(e) => {
                  const color = element.rawProperties['dropShadow/color'];
                  handleRawPropertyChange('dropShadow/color', { ...color, a: parseFloat(e.target.value) });
                }}
                className="w-20 p-2 border rounded-md"
                placeholder="Alpha"
              />
            </div>
          </div>
        )}
        
        {/* Raw Properties JSON Viewer */}
        <div className="mt-6">
          <h4 className="text-sm font-semibold mb-2">All Raw Properties (Read-only)</h4>
          <div className="bg-gray-50 p-4 rounded-md max-h-96 overflow-y-auto">
            <pre className="text-xs">
              {JSON.stringify(element.rawProperties, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ 
      display: 'flex', 
      height: '100%',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)'
    }}>
      {/* Element List */}
      <div style={{
        width: '35%',
        borderRight: '1px solid #e2e8f0',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div className="mb-4">
          <h2 className="text-xl font-bold mb-2">Elements</h2>
          <input
            type="text"
            placeholder="Search elements..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full p-2 border rounded-md"
          />
        </div>
        
        <div className="space-y-2">
          {filteredElements.map((element) => (
            <div
              key={element.id}
              className={`p-3 border rounded-md cursor-pointer transition-colors ${
                selectedElementId === element.id
                  ? 'bg-blue-100 border-blue-300'
                  : 'bg-white hover:bg-gray-50'
              }`}
              onClick={() => setSelectedElementId(element.id)}
            >
              <div className="font-medium">{element.name}</div>
              <div className="text-sm text-gray-600">
                ID: {element.id} | Type: {element.type || 'Unknown'}
              </div>
              {element.visible !== undefined && (
                <div className="text-xs text-gray-500">
                  {element.visible ? '👁️ Visible' : '🚫 Hidden'}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Property Editor */}
      <div className="flex-1 p-4 overflow-y-auto">
        {selectedElement ? (
          <div>
            <div className="mb-4">
              <h2 className="text-xl font-bold">{selectedElement.name}</h2>
              <p className="text-gray-600">ID: {selectedElement.id}</p>
              
              <div className="mt-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedElement.visible}
                    onChange={(e) => handlePropertyChange('visible', e.target.checked)}
                    className="mr-2"
                  />
                  Visible
                </label>
              </div>
            </div>

            {/* Render specific property editor based on element type */}
            {'text' in selectedElement && renderTextProperties(selectedElement as TextElement)}
            {'imageUrl' in selectedElement && renderImageProperties(selectedElement as ImageElement)}
            
            {/* Advanced properties editor */}
            {renderAdvancedProperties(selectedElement)}

            <div className="mt-8 pt-4 border-t border-gray-200">
              <button
                onClick={onGenerateImage}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-md transition-colors"
              >
                Generate Updated Image
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            Select an element to edit its properties
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyEditor;