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
        fontWeight: '600', 
        marginBottom: '0.5rem',
        color: '#065f46'
      }}>
        ✨ Família da Fonte
      </label>

      {/* Current Selection */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '12px 16px',
          border: `2px solid ${isOpen ? '#10b981' : '#d1fae5'}`,
          borderRadius: '8px',
          backgroundColor: isOpen ? '#f0fdf4' : 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          outline: 'none',
          ...(isOpen && {
            boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.1)'
          })
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          {currentFontData ? (
            <>
              <div style={{
                width: '32px',
                height: '32px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
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
          border: '1px solid #d1fae5',
          borderRadius: '12px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
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
                border: '2px solid #d1fae5',
                borderRadius: '6px',
                fontSize: '0.875rem',
                outline: 'none',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#10b981'}
              onBlur={(e) => e.target.style.borderColor = '#d1fae5'}
            />
          </div>

          {/* Font List */}
          <div style={{ 
            maxHeight: '280px', 
            overflowY: 'auto',
            borderTop: '1px solid #f0fdf4'
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
                  e.currentTarget.style.backgroundColor = '#f0fdf4';
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
            borderTop: '1px solid #f0fdf4',
            padding: '12px'
          }}>
            <div style={{ 
              fontSize: '0.75rem', 
              color: '#065f46', 
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
                  border: '1px solid #d1fae5',
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
                  background: customFont.trim() ? '#10b981' : '#e5e7eb',
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

  const handleGenerateImage = async () => {
    try {
      await onGenerateImage();
    } catch (error) {
      console.error('Error generating image:', error);
    }
  };

  const renderTextProperties = (element: TextElement) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
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
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1rem',
        padding: '1.5rem',
        background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
        borderRadius: '12px',
        border: '1px solid #93c5fd'
      }}>
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '600',
            marginBottom: '0.5rem',
            color: '#1e3a8a'
          }}>➡️ Posição X</label>
          <input
            type="number"
            value={element.x}
            onChange={(e) => handlePropertyChange('x', parseFloat(e.target.value))}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '2px solid #bfdbfe',
              borderRadius: '8px',
              fontSize: '0.875rem',
              outline: 'none',
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#3b82f6';
              e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#bfdbfe';
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
            color: '#1e3a8a'
          }}>⬇️ Posição Y</label>
          <input
            type="number"
            value={element.y}
            onChange={(e) => handlePropertyChange('y', parseFloat(e.target.value))}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '2px solid #bfdbfe',
              borderRadius: '8px',
              fontSize: '0.875rem',
              outline: 'none',
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#3b82f6';
              e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#bfdbfe';
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
            color: '#1e3a8a'
          }}>↔️ Largura</label>
          <input
            type="number"
            value={element.width}
            onChange={(e) => handlePropertyChange('width', parseFloat(e.target.value))}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '2px solid #bfdbfe',
              borderRadius: '8px',
              fontSize: '0.875rem',
              outline: 'none',
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#3b82f6';
              e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#bfdbfe';
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
            color: '#1e3a8a'
          }}>↕️ Altura</label>
          <input
            type="number"
            value={element.height}
            onChange={(e) => handlePropertyChange('height', parseFloat(e.target.value))}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '2px solid #bfdbfe',
              borderRadius: '8px',
              fontSize: '0.875rem',
              outline: 'none',
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#3b82f6';
              e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#bfdbfe';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>
      </div>
    </div>
  );

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
        <div style={{ 
          padding: '1.5rem',
          borderBottom: '1px solid #f1f5f9'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1rem'
          }}>
            <div style={{
              width: '4px',
              height: '30px',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              borderRadius: '2px'
            }} />
            <h2 style={{
              margin: 0,
              fontSize: '1.3rem',
              fontWeight: '700',
              color: '#1a1a1a'
            }}>Elementos</h2>
          </div>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="🔍 Pesquisar elementos..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '0.875rem',
                outline: 'none',
                transition: 'all 0.2s ease',
                background: '#fafbfc'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#6366f1';
                e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                e.target.style.background = '#ffffff';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.boxShadow = 'none';
                e.target.style.background = '#fafbfc';
              }}
            />
          </div>
        </div>
        
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          {filteredElements.map((element) => (
            <div
              key={element.id}
              onClick={() => setSelectedElementId(element.id)}
              style={{
                padding: '1rem',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: '2px solid transparent',
                background: selectedElementId === element.id 
                  ? 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)'
                  : '#ffffff',
                ...(selectedElementId === element.id && {
                  border: '2px solid #3b82f6',
                  boxShadow: '0 4px 16px rgba(59, 130, 246, 0.2)',
                  transform: 'translateY(-1px)'
                })
              }}
              onMouseEnter={(e) => {
                if (selectedElementId !== element.id) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedElementId !== element.id) {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '0.5rem'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  background: element.type === 'text' 
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : element.type === 'image'
                    ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                    : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '1.1rem',
                  fontWeight: '600'
                }}>
                  {element.type === 'text' ? '📝' : element.type === 'image' ? '🖼️' : '🎨'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontWeight: '600',
                    fontSize: '0.95rem',
                    color: '#1f2937',
                    marginBottom: '2px'
                  }}>
                    {element.name}
                  </div>
                  <div style={{ 
                    fontSize: '0.8rem',
                    color: '#6b7280'
                  }}>
                    ID: {element.id} • {element.type || 'Desconhecido'}
                  </div>
                </div>
              </div>
              {element.visible !== undefined && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.75rem',
                  color: element.visible ? '#059669' : '#dc2626',
                  fontWeight: '600'
                }}>
                  {element.visible ? '👁️ Visível' : '🙈 Oculto'}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Property Editor */}
      <div style={{ 
        flex: 1, 
        padding: '2rem',
        overflowY: 'auto',
        background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)'
      }}>
        {selectedElement ? (
          <div>
            <div style={{ marginBottom: '2rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1rem',
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '12px',
                color: '#fff',
                boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)'
              }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem'
                }}>
                  {selectedElement.type === 'text' ? '📝' : selectedElement.type === 'image' ? '🖼️' : '🎨'}
                </div>
                <div>
                  <h2 style={{ 
                    margin: 0, 
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}>
                    {selectedElement.name}
                  </h2>
                  <p style={{
                    margin: '0.25rem 0 0 0',
                    fontSize: '0.9rem',
                    opacity: 0.9
                  }}>
                    ID: {selectedElement.id} • Tipo: {selectedElement.type || 'Desconhecido'}
                  </p>
                </div>
              </div>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem',
                background: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}>
                <input
                  type="checkbox"
                  checked={selectedElement.visible}
                  onChange={(e) => handlePropertyChange('visible', e.target.checked)}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer'
                  }}
                />
                <label style={{ 
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: selectedElement.visible ? '#059669' : '#dc2626',
                  cursor: 'pointer'
                }}>
                  {selectedElement.visible ? '👁️ Elemento Visível' : '🙈 Elemento Oculto'}
                </label>
              </div>
            </div>

            {/* Render specific property editor based on element type */}
            {'text' in selectedElement && renderTextProperties(selectedElement as TextElement)}
            
            <div style={{ 
              marginTop: '2rem',
              padding: '1.5rem',
              borderTop: '1px solid #e2e8f0',
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              borderRadius: '12px'
            }}>
              <button
                onClick={handleGenerateImage}
                style={{
                  width: '100%',
                  padding: '16px 24px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 16px rgba(59, 130, 246, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(59, 130, 246, 0.4)';
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>🚀</span>
                <span>Gerar Imagem Atualizada</span>
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            textAlign: 'center',
            color: '#6b7280',
            padding: '3rem'
          }}>
            <div style={{
              fontSize: '5rem',
              marginBottom: '1.5rem',
              opacity: 0.6,
              animation: 'float 3s ease-in-out infinite'
            }}>
              🎯
            </div>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#374151',
              marginBottom: '0.75rem'
            }}>
              Selecione um elemento para editar
            </h3>
            <p style={{
              fontSize: '1rem',
              lineHeight: '1.6',
              maxWidth: '400px',
              margin: 0
            }}>
              Escolha um elemento da lista à esquerda para visualizar e editar suas propriedades.
            </p>
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
};

export default PropertyEditor;