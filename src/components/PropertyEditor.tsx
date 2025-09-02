import React, { useState, useEffect } from 'react';
import { TextElement, ImageElement, ShapeElement, useFileProcessing } from './case/FileProcessingContext';

// NOTE: availableFonts is now generated dynamically from fontDefinitions context

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
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Text Properties</h3>
      
      {/* Basic text properties */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Text Content</label>
          <textarea
            value={element.text}
            onChange={(e) => handlePropertyChange('text', e.target.value)}
            className="w-full p-2 border rounded-md"
            rows={3}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Font Family</label>
          <select
            value={element.fontFamily}
            onChange={(e) => {
              const selectedFont = availableFonts.find(font => font.name === e.target.value);
              if (selectedFont) {
                // Use the identifier that CE.SDK recognizes
                console.log('Font selected:', selectedFont);
                
                // First, ensure the font is loaded in the browser
                const fontFace = new FontFace(selectedFont.family, `url(/fonts/${encodeURIComponent(selectedFont.file)})`);
                fontFace.load().then(() => {
                  document.fonts.add(fontFace);
                  console.log('✅ Font loaded in browser:', selectedFont.family);
                }).catch((err) => {
                  console.warn('❌ Font loading failed:', err);
                });
                
                handlePropertyChange('fontFamily', selectedFont.name); // Use specific font name for CE.SDK registration
                handlePropertyChange('fontFile', selectedFont.file);
                handlePropertyChange('fontName', selectedFont.name); // Store display name separately
                handlePropertyChange('fontIdentifier', selectedFont.identifier); // Store identifier separately
              } else {
                handlePropertyChange('fontFamily', e.target.value);
              }
            }}
            className="w-full p-2 border rounded-md"
          >
            <option value="">Select a font...</option>
            {availableFonts.map((font) => (
              <option key={font.name} value={font.name}>
                {font.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={element.fontFamily}
            onChange={(e) => handlePropertyChange('fontFamily', e.target.value)}
            className="w-full p-2 border rounded-md mt-1"
            placeholder="Or type custom font name..."
          />
          {/* Debug info */}
          <div className="text-xs text-gray-500 mt-1">
            Current: {element.fontFamily}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Font Size</label>
          <input
            type="number"
            value={element.fontSize}
            onChange={(e) => handlePropertyChange('fontSize', parseFloat(e.target.value))}
            className="w-full p-2 border rounded-md"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Color</label>
          <input
            type="color"
            value={element.color.startsWith('#') ? element.color : '#000000'}
            onChange={(e) => handlePropertyChange('color', e.target.value)}
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
    <div className="property-editor flex h-full">
      {/* Element List */}
      <div className="w-1/3 border-r border-gray-200 p-4">
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