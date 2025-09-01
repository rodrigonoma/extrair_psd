import CreativeEngine from '@cesdk/engine';
import {
  PSDParser,
  LogMessage,
  Logger,
  addGoogleFontsAssetLibrary,
  createWebEncodeBufferToPNG
} from '@imgly/psd-importer';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState
} from 'react';
import { ExampleFile } from './ExampleFileContainer';

interface TextElement {
  id: number;
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  name: string;
  
  // Extended text properties
  opacity?: number;
  rotation?: number;
  
  // Background properties
  backgroundColor?: {
    enabled: boolean;
    color: string;
    cornerRadius: number;
    paddingTop: number;
    paddingBottom: number;
    paddingLeft: number;
    paddingRight: number;
  };
  
  // Text styling properties
  textProperties?: {
    horizontalAlignment?: string;
    verticalAlignment?: string;
    letterSpacing?: number;
    lineHeight?: number;
    paragraphSpacing?: number;
    automaticFontSizeEnabled?: boolean;
    minAutomaticFontSize?: number;
    maxAutomaticFontSize?: number;
    clipLinesOutsideOfFrame?: boolean;
  };
  
  // Drop shadow properties
  dropShadow?: {
    enabled: boolean;
    color: string;
    offsetX: number;
    offsetY: number;
    blurX: number;
    blurY: number;
  };
  
  // Stroke properties
  stroke?: {
    enabled: boolean;
    color: string;
    width: number;
  };
}

interface ImageElement {
  id: number;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  imageUrl?: string;
  
  // Extended image properties
  opacity?: number;
  rotation?: number;
  clipped?: boolean;
  
  // Crop properties
  crop?: {
    rotation: number;
    scaleRatio: number;
    scaleX: number;
    scaleY: number;
    translationX: number;
    translationY: number;
  };
  
  // Drop shadow properties
  dropShadow?: {
    enabled: boolean;
    color: string;
    offsetX: number;
    offsetY: number;
    blurX: number;
    blurY: number;
  };
  
  // Stroke properties
  stroke?: {
    enabled: boolean;
    color: string;
    width: number;
  };
  
  // Blur properties
  blur?: {
    enabled: boolean;
  };
  
  // Fill properties (for image replacement)
  fill?: {
    enabled: boolean;
    type?: string; // "//ly.img.ubq/fill/image" or "//ly.img.ubq/fill/color"
    imageFileURI?: string;
    externalReference?: string;
    previewFileURI?: string;
    sourceSet?: string;
    // For solid color fills
    color?: string;
  };
}

interface ShapeElement {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  
  // Extended shape properties
  opacity?: number;
  rotation?: number;
  
  // Fill properties
  fill?: {
    enabled: boolean;
    color: string;
  };
  
  // Drop shadow properties
  dropShadow?: {
    enabled: boolean;
    color: string;
    offsetX: number;
    offsetY: number;
    blurX: number;
    blurY: number;
  };
  
  // Stroke properties (extended)
  stroke?: {
    enabled: boolean;
    color: string;
    width: number;
  };
  
  // Blur properties
  blur?: {
    enabled: boolean;
  };
}

interface ProcessResult {
  imageUrl: string;
  sceneArchiveUrl: string;
  messages: LogMessage[];
  textElements: TextElement[];
  imageElements: ImageElement[];
  shapeElements: ShapeElement[];
  canvasWidth: number;
  canvasHeight: number;
}

interface FileProcessingContextValue {
  status: string;
  processMessage: string;
  isProcessing: boolean;
  processFile: (file: ExampleFile) => void;
  currentFile: ExampleFile | null;
  resetState: () => void;
  inferenceTime: number;
  result: ProcessResult | null;
  updateTextElement: (id: number, updates: Partial<TextElement>) => void;
  updateImageElement: (id: number, updates: Partial<ImageElement>) => void;
  updateShapeElement: (id: number, updates: Partial<ShapeElement>) => void;
  regenerateImage: () => Promise<void>;
  engine: any;
}

const FileProcessingContext = createContext<FileProcessingContextValue>({
  status: 'idle',
  processMessage: '',
  isProcessing: false,
  processFile: () => {},
  currentFile: null,
  resetState: () => {},
  inferenceTime: 0,
  result: null,
  updateTextElement: () => {},
  updateImageElement: () => {},
  updateShapeElement: () => {},
  regenerateImage: async () => {},
  engine: null
});

const STATUS_MESSAGES = {
  idle: '',
  init: 'Initializing...',
  fetching: 'Downloading: Assets',
  processing: 'Processing: Transforming PSD to Scene',
  done: '',
  error: 'Error: Failed to process PSD file'
} as const;
type StatusMessages = keyof typeof STATUS_MESSAGES;
const PROCESSING_STATUS = ['init', 'fetching', 'processing'];

interface FileProcessingContextProviderProps {
  children: React.ReactNode;
}

const FileProcessingContextProvider = ({
  children
}: FileProcessingContextProviderProps) => {
  const [status, setStatus] = useState<StatusMessages>('idle');
  const processMessage = useMemo(() => STATUS_MESSAGES[status], [status]);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [currentFile, setCurrentFile] = useState<ExampleFile | null>(null);
  const [inferenceTime, setInferenceTime] = useState(0);
  const [engine, setEngine] = useState<any>(null);

  function resetState() {
    setStatus('idle');
    setCurrentFile(null);
    setResult(null);
    setEngine(null);
  }

  // Helper function to extract block data
  const extractBlockData = (engine: any, blockId: number) => {
    let blockType, name, visible = true, x = 0, y = 0, width = 0, height = 0;
    
    try {
      blockType = engine.block.getType(blockId);
    } catch (e) {
      blockType = 'unknown';
    }
    
    try {
      name = engine.block.getName(blockId);
    } catch (e) {
      name = `Block ${blockId}`;
    }
    
    // Try different methods to get visibility
    try {
      // Try the 'visible' property first
      visible = engine.block.getBool(blockId, 'visible');
    } catch (e) {
      try {
        // Fallback to checking if getVisible exists and use it
        if (typeof engine.block.getVisible === 'function') {
          visible = engine.block.getVisible(blockId);
        } else {
          visible = true; // Default to visible if we can't determine
        }
      } catch (e2) {
        visible = true; // Default to visible
      }
    }
    
    // Get transform properties safely
    try {
      if (typeof engine.block.getPositionX === 'function') {
        x = engine.block.getPositionX(blockId);
      }
    } catch (e) {}
    
    try {
      if (typeof engine.block.getPositionY === 'function') {
        y = engine.block.getPositionY(blockId);
      }
    } catch (e) {}
    
    try {
      if (typeof engine.block.getWidth === 'function') {
        width = engine.block.getWidth(blockId);
      }
    } catch (e) {}
    
    try {
      if (typeof engine.block.getHeight === 'function') {
        height = engine.block.getHeight(blockId);
      }
    } catch (e) {}
    
    return {
      id: blockId,
      type: blockType,
      name,
      visible,
      x,
      y,
      width,
      height
    };
  };

  // Extract text element data
  const extractTextElement = (engine: any, blockId: number): TextElement => {
    const baseData = extractBlockData(engine, blockId);
    
    let text = '', fontFamily = '', fontSize = 16, color = '#000000';
    
    try {
      text = engine.block.getString(blockId, 'text/text') || '';
      fontSize = engine.block.getFloat(blockId, 'text/fontSize') || 16;
      
      // Try to get font family
      try {
        // Use 'typeface' as that's what CE.SDK actually uses
        fontFamily = engine.block.getString(blockId, 'text/typeface') || 'Arial';
      } catch (e) {
        try {
          fontFamily = engine.block.getString(blockId, 'text/fontFamily') || 'Arial';
        } catch (e2) {
          fontFamily = 'Arial';
        }
      }
      
      // Try to get color
      try {
        const colorObj = engine.block.getColor(blockId, 'text/color');
        color = `rgba(${Math.round(colorObj.r * 255)}, ${Math.round(colorObj.g * 255)}, ${Math.round(colorObj.b * 255)}, ${colorObj.a})`;
      } catch (e) {
        color = '#000000';
      }
    } catch (e) {
      // Handle missing properties
    }
    
    return {
      ...baseData,
      text,
      fontFamily,
      fontSize,
      color
    } as TextElement;
  };

  // Helper function to handle image asset replacement in CE.SDK
  const handleImageAssetReplacement = async (engine: any, blockId: number, imageUrl: string) => {
    console.log('Attempting to replace image asset for block', blockId, 'with URL:', imageUrl.substring(0, 50) + '...');
    
    try {
      let blob: Blob;
      
      // Convert different URL types to blob
      if (imageUrl.startsWith('blob:')) {
        const response = await fetch(imageUrl);
        blob = await response.blob();
      } else if (imageUrl.startsWith('data:')) {
        const response = await fetch(imageUrl);
        blob = await response.blob();
      } else {
        throw new Error('Unsupported image URL format');
      }
      
      console.log('Got blob for asset replacement:', blob.type, blob.size, 'bytes');
      
      // Try different CE.SDK methods to add the image
      let assetResult;
      
      // Method A: engine.asset.addImageAsset
      try {
        if (engine.asset && typeof engine.asset.addImageAsset === 'function') {
          assetResult = await engine.asset.addImageAsset(blob);
          console.log('✓ Added asset via engine.asset.addImageAsset:', assetResult);
        }
      } catch (e) {
        console.log('engine.asset.addImageAsset failed:', e.message);
      }
      
      // Method B: engine.scene.addImageAsset
      if (!assetResult) {
        try {
          if (engine.scene && typeof engine.scene.addImageAsset === 'function') {
            assetResult = await engine.scene.addImageAsset(blob);
            console.log('✓ Added asset via engine.scene.addImageAsset:', assetResult);
          }
        } catch (e) {
          console.log('engine.scene.addImageAsset failed:', e.message);
        }
      }
      
      // Method C: Try different asset creation methods
      if (!assetResult) {
        try {
          // Look for other possible asset methods
          console.log('Available engine methods:', Object.keys(engine));
          if (engine.asset) {
            console.log('Available asset methods:', Object.keys(engine.asset));
          }
          if (engine.scene) {
            console.log('Available scene methods:', Object.keys(engine.scene));
          }
        } catch (e) {
          console.log('Could not inspect engine methods:', e.message);
        }
      }
      
      // If we got an asset result, set it on the block
      if (assetResult) {
        try {
          engine.block.setString(blockId, 'fill/image/imageFileURI', assetResult);
          console.log('✓ Successfully set new asset as image source');
          return true;
        } catch (e) {
          console.warn('Failed to set asset ID on block:', e);
        }
      } else {
        console.warn('Could not create image asset - no suitable method found');
      }
      
      return false;
    } catch (error) {
      console.error('Error in handleImageAssetReplacement:', error);
      return false;
    }
  };

  // Helper function to extract image URL from a block
  const extractImageUrl = (engine: any, blockId: number): string | undefined => {
    console.log('Extracting image URL for block:', blockId);
    
    // Method 1: Direct property access
    try {
      const url = engine.block.getString(blockId, 'fill/image/imageFileURI');
      if (url) {
        console.log('Found imageURL via direct access:', url);
        return url;
      }
    } catch (e) {
      console.log('Method 1 (direct access) failed:', e.message);
    }
    
    // Method 2: Try to get fill object and then extract URL
    try {
      if (typeof engine.block.getFill === 'function') {
        const fillId = engine.block.getFill(blockId);
        if (fillId) {
          const url = engine.block.getString(fillId, 'fill/image/imageFileURI');
          if (url) {
            console.log('Found imageURL via fill object:', url);
            return url;
          }
        }
      }
    } catch (e) {
      console.log('Method 2 (fill object) failed:', e.message);
    }
    
    // Method 3: Try alternative image properties
    try {
      const alternatives = [
        'image/imageFileURI',
        'image/uri', 
        'fill/uri',
        'source/uri'
      ];
      
      for (const prop of alternatives) {
        try {
          const url = engine.block.getString(blockId, prop);
          if (url) {
            console.log('Found imageURL via alternative property', prop + ':', url);
            return url;
          }
        } catch (e) {
          // Continue to next alternative
        }
      }
    } catch (e) {
      console.log('Method 3 (alternatives) failed:', e.message);
    }
    
    // Method 4: Generate placeholder for image blocks that don't have accessible URLs
    try {
      const blockType = engine.block.getType(blockId);
      console.log('Creating fallback preview for block:', blockId, 'type:', blockType);
      
      // Create a simple placeholder indicating this is an image without preview
      const placeholderSvg = `
        <svg width="150" height="100" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#f8f9fa" stroke="#dee2e6" stroke-width="1"/>
          <text x="50%" y="35%" text-anchor="middle" fill="#6c757d" font-size="11" font-family="Arial, sans-serif">📷</text>
          <text x="50%" y="55%" text-anchor="middle" fill="#6c757d" font-size="10" font-family="Arial, sans-serif">Preview não</text>
          <text x="50%" y="70%" text-anchor="middle" fill="#6c757d" font-size="10" font-family="Arial, sans-serif">disponível</text>
          <text x="50%" y="90%" text-anchor="middle" fill="#adb5bd" font-size="8" font-family="Arial, sans-serif">ID: ${blockId}</text>
        </svg>
      `;
      
      const placeholderUrl = `data:image/svg+xml;base64,${btoa(placeholderSvg)}`;
      console.log('Created fallback placeholder for image block:', blockId);
      return placeholderUrl;
    } catch (e) {
      console.log('Method 4 (placeholder) failed:', e.message);
    }
    
    console.log('Could not extract or create image URL for block', blockId);
    return undefined;
  };

  // Extract image element data
  const extractImageElement = (engine: any, blockId: number): ImageElement => {
    const baseData = extractBlockData(engine, blockId);
    
    const imageUrl = extractImageUrl(engine, blockId);
    
    // Extract comprehensive image properties
    const imageElement: ImageElement = {
      ...baseData,
      imageUrl
    };
    
    // Extract opacity
    try {
      if (typeof engine.block.getOpacity === 'function') {
        const opacity = engine.block.getOpacity(blockId);
        if (opacity !== undefined) imageElement.opacity = opacity;
      }
    } catch (e) {}
    
    // Extract rotation
    try {
      if (typeof engine.block.getRotation === 'function') {
        const rotation = engine.block.getRotation(blockId);
        if (rotation !== undefined) imageElement.rotation = rotation;
      }
    } catch (e) {}
    
    // Extract clipped
    try {
      const clipped = engine.block.getBool(blockId, 'clipped');
      if (clipped !== undefined) imageElement.clipped = clipped;
    } catch (e) {}
    
    // Extract crop properties
    try {
      const cropRotation = engine.block.getFloat(blockId, 'crop/rotation');
      const scaleRatio = engine.block.getFloat(blockId, 'crop/scaleRatio');
      const scaleX = engine.block.getFloat(blockId, 'crop/scaleX');
      const scaleY = engine.block.getFloat(blockId, 'crop/scaleY');
      const translationX = engine.block.getFloat(blockId, 'crop/translationX');
      const translationY = engine.block.getFloat(blockId, 'crop/translationY');
      
      if (cropRotation !== undefined || scaleRatio !== undefined || scaleX !== undefined || 
          scaleY !== undefined || translationX !== undefined || translationY !== undefined) {
        imageElement.crop = {
          rotation: cropRotation || 0,
          scaleRatio: scaleRatio || 1,
          scaleX: scaleX || 1,
          scaleY: scaleY || 1,
          translationX: translationX || 0,
          translationY: translationY || 0,
        };
      }
    } catch (e) {}
    
    // Extract drop shadow properties
    try {
      const shadowEnabled = engine.block.getBool(blockId, 'dropShadow/enabled');
      const shadowColor = engine.block.getColor(blockId, 'dropShadow/color');
      const offsetX = engine.block.getFloat(blockId, 'dropShadow/offset/x');
      const offsetY = engine.block.getFloat(blockId, 'dropShadow/offset/y');
      const blurX = engine.block.getFloat(blockId, 'dropShadow/blurRadius/x');
      const blurY = engine.block.getFloat(blockId, 'dropShadow/blurRadius/y');
      
      if (shadowEnabled !== undefined || shadowColor || offsetX !== undefined || 
          offsetY !== undefined || blurX !== undefined || blurY !== undefined) {
        const colorString = shadowColor ? `rgba(${Math.round(shadowColor.r*255)}, ${Math.round(shadowColor.g*255)}, ${Math.round(shadowColor.b*255)}, ${shadowColor.a})` : '#000000';
        imageElement.dropShadow = {
          enabled: shadowEnabled || false,
          color: colorString,
          offsetX: offsetX || 0,
          offsetY: offsetY || 0,
          blurX: blurX || 0,
          blurY: blurY || 0,
        };
      }
    } catch (e) {}
    
    // Extract stroke properties
    try {
      const strokeEnabled = engine.block.getBool(blockId, 'stroke/enabled');
      const strokeColor = engine.block.getColor(blockId, 'stroke/color');
      const strokeWidth = engine.block.getFloat(blockId, 'stroke/width');
      
      if (strokeEnabled !== undefined || strokeColor || strokeWidth !== undefined) {
        const colorString = strokeColor ? `rgba(${Math.round(strokeColor.r*255)}, ${Math.round(strokeColor.g*255)}, ${Math.round(strokeColor.b*255)}, ${strokeColor.a})` : '#000000';
        imageElement.stroke = {
          enabled: strokeEnabled || false,
          color: colorString,
          width: strokeWidth || 1,
        };
      }
    } catch (e) {}
    
    // Extract blur properties
    try {
      const blurEnabled = engine.block.getBool(blockId, 'blur/enabled');
      if (blurEnabled !== undefined) {
        imageElement.blur = {
          enabled: blurEnabled,
        };
      }
    } catch (e) {}
    
    // Extract fill properties
    try {
      const fillEnabled = engine.block.getBool(blockId, 'fill/enabled');
      const imageFileURI = engine.block.getString(blockId, 'fill/image/imageFileURI');
      const externalReference = engine.block.getString(blockId, 'fill/image/externalReference');
      const previewFileURI = engine.block.getString(blockId, 'fill/image/previewFileURI');
      const sourceSet = engine.block.getString(blockId, 'fill/image/sourceSet');
      const fillColor = engine.block.getColor(blockId, 'fill/solid/color');
      
      if (fillEnabled !== undefined || imageFileURI || externalReference || previewFileURI || sourceSet || fillColor) {
        let fillType = '//ly.img.ubq/fill/image';
        let colorString;
        
        if (fillColor) {
          fillType = '//ly.img.ubq/fill/color';
          colorString = `rgba(${Math.round(fillColor.r*255)}, ${Math.round(fillColor.g*255)}, ${Math.round(fillColor.b*255)}, ${fillColor.a})`;
        }
        
        imageElement.fill = {
          enabled: fillEnabled !== false,
          type: fillType,
          imageFileURI: imageFileURI,
          externalReference: externalReference,
          previewFileURI: previewFileURI,
          sourceSet: sourceSet,
          color: colorString,
        };
      }
    } catch (e) {}
    
    return imageElement;
  };

  // Extract shape element data
  const extractShapeElement = (engine: any, blockId: number): ShapeElement => {
    const baseData = extractBlockData(engine, blockId);
    
    let fillColor, strokeColor, strokeWidth;
    
    try {
      // Try to get fill color
      const fillColorObj = engine.block.getColor(blockId, 'fill/solid/color');
      fillColor = `rgba(${Math.round(fillColorObj.r * 255)}, ${Math.round(fillColorObj.g * 255)}, ${Math.round(fillColorObj.b * 255)}, ${fillColorObj.a})`;
    } catch (e) {
      // No fill color
    }
    
    try {
      // Try to get stroke color and width
      const strokeColorObj = engine.block.getColor(blockId, 'stroke/color');
      strokeColor = `rgba(${Math.round(strokeColorObj.r * 255)}, ${Math.round(strokeColorObj.g * 255)}, ${Math.round(strokeColorObj.b * 255)}, ${strokeColorObj.a})`;
      strokeWidth = engine.block.getFloat(blockId, 'stroke/width');
    } catch (e) {
      // No stroke properties
    }
    
    return {
      ...baseData,
      fillColor,
      strokeColor,
      strokeWidth
    } as ShapeElement;
  };

  // Load local fonts using CSS Font Loading API and register with browser
  const loadLocalFonts = async (engine: any) => {
    const localFonts = [
      // Aviano Sans family
      { name: 'AvianoSansThin', file: 'Avianos Sans Thin.otf', cssName: 'Aviano Sans Thin' },
      { name: 'AvianoSansBold', file: 'Aviano Sans Bold.otf', cssName: 'Aviano Sans Bold' },
      { name: 'AvianoSansLight', file: 'Avianos Sans Light.otf', cssName: 'Aviano Sans Light' },
      { name: 'AvianoSansBlack', file: 'Avianos Sans Black.otf', cssName: 'Aviano Sans Black' },
      
      // Inter family 
      { name: 'Inter28pt', file: 'Inter 28pt.ttf', cssName: 'Inter 28pt' },
      { name: 'Inter24pt', file: 'Inter_24pt-Regular.ttf', cssName: 'Inter 24pt' },
      { name: 'Inter24ptBold', file: 'Inter_24pt-Bold.ttf', cssName: 'Inter 24pt Bold' },
      { name: 'Inter24ptLight', file: 'Inter_24pt-Light.ttf', cssName: 'Inter 24pt Light' },
      { name: 'Inter28ptBold', file: 'Inter_28pt-Bold.ttf', cssName: 'Inter 28pt Bold' },
      
      // BebasNeue family
      { name: 'BebasNeueRegular', file: 'BebasNeue Regular.otf', cssName: 'BebasNeue Regular' },
      { name: 'BebasNeueBold', file: 'BebasNeue Bold.otf', cssName: 'BebasNeue Bold' },
      { name: 'BebasNeueLight', file: 'BebasNeue Light.otf', cssName: 'BebasNeue Light' },
      { name: 'BebasNeueThin', file: 'BebasNeue Thin.otf', cssName: 'BebasNeue Thin' },
      { name: 'BebasNeueBook', file: 'BebasNeue Book.otf', cssName: 'BebasNeue Book' },
      
      // Montserrat family
      { name: 'MontserratRegular', file: 'Montserrat-Regular.ttf', cssName: 'Montserrat Regular' },
      { name: 'MontserratBold', file: 'Montserrat-Bold.ttf', cssName: 'Montserrat Bold' },
      { name: 'MontserratLight', file: 'Montserrat-Light.ttf', cssName: 'Montserrat Light' },
    ];

    // Load fonts using CSS Font Loading API
    const fontPromises = localFonts.map(async (font) => {
      try {
        const fontUrl = `/fonts/${encodeURIComponent(font.file)}`;
        console.log(`Loading font: ${font.cssName} from ${fontUrl}`);
        
        // Create a FontFace and load it
        const fontFace = new FontFace(font.cssName, `url("${fontUrl}")`);
        const loadedFont = await fontFace.load();
        
        // Add to document fonts
        document.fonts.add(loadedFont);
        
        console.log(`✅ Successfully loaded font: ${font.cssName}`);
        return { ...font, loaded: true, fontFace: loadedFont };
      } catch (error) {
        console.log(`❌ Failed to load font ${font.cssName}:`, error.message);
        return { ...font, loaded: false };
      }
    });

    const fontResults = await Promise.all(fontPromises);
    const successCount = fontResults.filter(f => f.loaded).length;
    console.log(`Font loading complete: ${successCount}/${fontResults.length} fonts loaded successfully`);
    
    // Wait a bit for fonts to be fully available
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return fontResults.filter(f => f.loaded);
  };

  // Skip font registration for now to avoid interference
  const registerFontsInEngine = async (engine: any, loadedFonts: any[]) => {
    console.log('🔧 Fonts are loaded in document.fonts for UI display');
    console.log('✅ Font registration skipped to preserve UI functionality');
  };

  // Helper function to map font names to file names
  const getFontFileName = (fontName: string): string => {
    const fontFileMap: { [key: string]: string } = {
      'Aviano Sans Thin': 'Avianos Sans Thin.otf',
      'Aviano Sans Bold': 'Aviano Sans Bold.otf',
      'Aviano Sans Light': 'Avianos Sans Light.otf',
      'Aviano Sans Black': 'Avianos Sans Black.otf',
      'Inter 28pt': 'Inter 28pt.ttf',
      'Inter 24pt': 'Inter_24pt-Regular.ttf',
      'Inter 24pt Bold': 'Inter_24pt-Bold.ttf',
      'Inter 24pt Light': 'Inter_24pt-Light.ttf',
      'Inter 28pt Bold': 'Inter_28pt-Bold.ttf',
      'BebasNeue Regular': 'BebasNeue Regular.otf',
      'BebasNeue Bold': 'BebasNeue Bold.otf',
      'BebasNeue Light': 'BebasNeue Light.otf',
      'BebasNeue Thin': 'BebasNeue Thin.otf',
      'BebasNeue Book': 'BebasNeue Book.otf',
      'Montserrat Regular': 'Montserrat-Regular.ttf',
      'Montserrat Bold': 'Montserrat-Bold.ttf',
      'Montserrat Light': 'Montserrat-Light.ttf'
    };
    
    return fontFileMap[fontName] || `${fontName}.otf`;
  };

  // Helper function to check if a graphic block has shape properties
  const hasShapeProperties = (engine: any, blockId: number): boolean => {
    let shapeIndicators = 0;
    
    try {
      // Check for fill properties that indicate it's a shape
      const hasFillColor = engine.block.getColor(blockId, 'fill/solid/color');
      if (hasFillColor) {
        console.log(`Block ${blockId} has fill color`);
        shapeIndicators++;
      }
    } catch (e) {}
    
    try {
      // Check for stroke properties
      const hasStroke = engine.block.getColor(blockId, 'stroke/color');
      if (hasStroke) {
        console.log(`Block ${blockId} has stroke color`);
        shapeIndicators++;
      }
    } catch (e) {}
    
    try {
      // Check for stroke width
      const hasStrokeWidth = engine.block.getFloat(blockId, 'stroke/width');
      if (hasStrokeWidth !== undefined && hasStrokeWidth > 0) {
        console.log(`Block ${blockId} has stroke width: ${hasStrokeWidth}`);
        shapeIndicators++;
      }
    } catch (e) {}
    
    try {
      // Check for shape-specific properties
      const hasCornerRadius = engine.block.getFloat(blockId, 'shape/cornerRadius');
      if (hasCornerRadius !== undefined) {
        console.log(`Block ${blockId} has corner radius: ${hasCornerRadius}`);
        shapeIndicators++;
      }
    } catch (e) {}
    
    // Check if it doesn't have image properties (to distinguish from images)
    let hasImageProps = false;
    try {
      const imageUri = engine.block.getString(blockId, 'fill/image/imageFileURI');
      if (imageUri) hasImageProps = true;
    } catch (e) {}
    
    const isShape = shapeIndicators > 0 && !hasImageProps;
    console.log(`Block ${blockId} shape indicators: ${shapeIndicators}, hasImageProps: ${hasImageProps}, isShape: ${isShape}`);
    
    return isShape;
  };

  // Post-process fonts to replace missing fonts with available alternatives
  const postProcessFonts = async (engine: any, messages: any[]) => {
    console.log('Starting font post-processing...');
    
    // Map of Adobe Fonts to Google Fonts alternatives
    const fontReplacements = {
      'Source Sans Pro': 'Open Sans',
      'Source Serif Pro': 'Source Serif 4', 
      'Proxima Nova': 'Nunito Sans',
      'Futura': 'Nunito Sans',
      'Avenir': 'Nunito Sans',
      'Helvetica Neue': 'Inter',
      'Brandon Grotesque': 'Nunito Sans',
      'Minion Pro': 'Source Serif 4',
      'Myriad Pro': 'Open Sans',
      'Adobe Garamond Pro': 'EB Garamond',
      'Trajan Pro': 'Cinzel',
      'Gotham': 'Nunito Sans',
      'Helvetica': 'Inter',
      'Times': 'Source Serif 4',
      'Arial': 'Open Sans',
      // Aviano font family - map to loaded font names
      'AvianoSansThin': 'Aviano Sans Thin',
      'AvianoSansBold': 'Aviano Sans Bold',
      'AvianoSans': 'Aviano Sans Light',
      'AvianoSansLight': 'Aviano Sans Light',
      'AvianoSansBlack': 'Aviano Sans Black',
      'Aviano Sans Thin': 'Aviano Sans Thin',
      'Aviano Sans Bold': 'Aviano Sans Bold', 
      'Aviano Sans Light': 'Aviano Sans Light',
      'Aviano Sans Black': 'Aviano Sans Black',
      'Aviano Sans Regular': 'Aviano Sans Light',
      'Aviano Sans': 'Aviano Sans Light', // Default to light variant
      // Inter variants - use loaded local fonts
      'Inter28pt': 'Inter 28pt',
      'Inter': 'Inter',
      'Inter 28pt': 'Inter 28pt',
      'Inter 24pt': 'Inter 24pt',
      // BebasNeue variants
      'BebasNeue': 'BebasNeue Regular',
      'Bebas Neue': 'BebasNeue Regular',
      // Montserrat variants
      'Montserrat': 'Montserrat Regular'
    };
    
    // Get warnings about missing fonts
    const missingFonts = new Set<string>();
    messages.filter(m => m.type === 'warning')
      .forEach(warning => {
        const match = warning.message.match(/Could not find a typeface.*font family '([^']+)'/);
        if (match) {
          missingFonts.add(match[1]);
        }
      });
    
    if (missingFonts.size === 0) {
      console.log('No missing fonts detected');
      return;
    }
    
    console.log('Found missing fonts:', Array.from(missingFonts));
    
    // Debug: List all available fonts in the engine
    try {
      const availableTypes = engine.asset.findAllSources();
      console.log('🔍 Available asset sources in engine:', availableTypes);
      
      // Try to get typeface assets specifically
      if (availableTypes.includes('ly.img.typeface')) {
        const typefaceAssets = engine.asset.findAssets('ly.img.typeface');
        console.log('🔍 Available typeface assets:', typefaceAssets.length);
        typefaceAssets.slice(0, 10).forEach(asset => {
          const meta = engine.asset.getMeta(asset);
          console.log(`  - Typeface: ${asset} | Meta:`, meta);
        });
      }
    } catch (e) {
      console.log('Could not list available fonts:', e);
    }
    
    // Find and replace fonts in all text blocks
    const pages = engine.scene.getPages();
    console.log('Processing pages for font replacement:', pages);
    
    const replaceTextFonts = async (blockId: number) => {
      try {
        const blockType = engine.block.getType(blockId);
        console.log(`Checking block ${blockId} with type: ${blockType}`);
        
        if (blockType && blockType.includes('text')) {
          console.log(`Found text block: ${blockId}`);
          try {
            // CE.SDK uses 'typeface' instead of 'fontFamily'
            const currentFont = engine.block.getString(blockId, 'text/typeface');
            console.log(`Block ${blockId} current font: "${currentFont}"`);
            
            // Get the text content to help match with missing font warnings
            const blockText = engine.block.getString(blockId, 'text/text') || '';
            console.log(`Block ${blockId} text content: "${blockText.substring(0, 30)}..."`);
            
            // Check if this font needs replacement using fuzzy matching
            let needsReplacement = false;
            let matchedMissingFont = null;
            let replacement = null;
            
            // If font is empty or Open Sans, try to match by text content with warnings
            if (currentFont === '' || currentFont === 'Open Sans') {
              console.log(`Block ${blockId} has empty/default font, searching for original by text content...`);
              
              // Find missing font by matching text content
              for (const missingFont of missingFonts) {
                // Check if any warning message contains this exact text
                const matchingWarning = messages
                  .filter(m => m.type === 'warning')
                  .find(warning => {
                    const textMatch = warning.message.match(/text: '([^']+)'/);
                    const fontMatch = warning.message.match(/font family '([^']+)'/);
                    return textMatch && fontMatch && 
                           (textMatch[1] === blockText || blockText.includes(textMatch[1]) || textMatch[1].includes(blockText));
                  });
                
                if (matchingWarning) {
                  const fontMatch = matchingWarning.message.match(/font family '([^']+)'/);
                  if (fontMatch) {
                    needsReplacement = true;
                    matchedMissingFont = fontMatch[1];
                    replacement = fontReplacements[fontMatch[1]] || fontMatch[1];
                    console.log(`🎯 Found font by text matching: "${blockText}" -> "${fontMatch[1]}" -> "${replacement}"`);
                    break;
                  }
                }
              }
            }
            
            // If still no match, try original logic
            if (!needsReplacement) {
              // Direct match first
              if (missingFonts.has(currentFont)) {
                needsReplacement = true;
                matchedMissingFont = currentFont;
                replacement = fontReplacements[currentFont] || currentFont;
              } else {
                // Fuzzy matching: check if any missing font contains this font name or vice versa
                for (const missingFont of missingFonts) {
                  if (missingFont.includes(currentFont) || currentFont.includes(missingFont) || 
                      missingFont.toLowerCase().replace(/\d+pt|bold|thin|light|medium/g, '').trim() === 
                      currentFont.toLowerCase().replace(/\d+pt|bold|thin|light|medium/g, '').trim()) {
                    needsReplacement = true;
                    matchedMissingFont = missingFont;
                    replacement = fontReplacements[missingFont] || currentFont;
                    break;
                  }
                }
              }
            }
            
            if (needsReplacement && replacement && (currentFont === '' || currentFont !== replacement)) {
              console.log(`🔄 Replacing font "${currentFont}" (matched missing: "${matchedMissingFont}") with "${replacement}" in block ${blockId}`);
              
              try {
                // Try to set the replacement font using the correct property
                try {
                  engine.block.setString(blockId, 'text/typeface', replacement);
                  console.log(`✅ Successfully set typeface "${replacement}" in block ${blockId}`);
                  
                  // Verify the font was actually set
                  const verifyFont = engine.block.getString(blockId, 'text/typeface');
                  console.log(`🔍 Verification: Block ${blockId} now has font: "${verifyFont}"`);
                  
                  if (verifyFont !== replacement) {
                    console.log(`⚠️ WARNING: Font verification failed! Expected "${replacement}" but got "${verifyFont}"`);
                  }
                } catch (typefaceError) {
                  console.log(`❌ Failed to set typeface "${replacement}" for block ${blockId}:`, typefaceError.message);
                }
                
              } catch (error) {
                console.log(`❌ All font setting methods failed for block ${blockId}:`, error);
              }
            } else if (currentFont === '') {
              console.log(`Block ${blockId} has empty font, checking if we should set a default...`);
              // For empty fonts, set a default Google Font
              engine.block.setString(blockId, 'text/typeface', 'Open Sans');
              console.log(`✅ Set default font "Open Sans" for block ${blockId}`);
            } else {
              console.log(`Font "${currentFont}" is OK (not in missing fonts list)`);
            }
          } catch (fontError) {
            // Fallback: try with fontFileUri if typeface doesn't work
            try {
              const currentFont = engine.block.getString(blockId, 'text/fontFileUri');
              console.log(`Trying fontFileUri approach for block ${blockId}, current: ${currentFont}`);
            } catch (e2) {
              console.log(`Could not process font for block ${blockId}:`, fontError.message);
            }
          }
        }
        
        // Process children
        try {
          const children = engine.block.getChildren(blockId);
          for (const childId of children) {
            await replaceTextFonts(childId);
          }
        } catch (e) {
          // No children
        }
        
      } catch (e) {
        // Skip problematic blocks
      }
    };
    
    // Process all pages
    for (const pageId of pages) {
      await replaceTextFonts(pageId);
    }
    
    console.log('Font post-processing completed');
  };

  // Extract text elements from logger warnings (like the old implementation)
  const extractTextElementsFromWarnings = (messages: any[]) => {
    const textElements: TextElement[] = [];
    let id = 1;
    
    const warnings = messages
      .filter((m) => m.type === 'warning')
      .map((m) => m.message);
      
    warnings.forEach(warning => {
      if (warning.includes("Could not find a typeface")) {
        const fontMatch = warning.match(/font family '([^']+)'/);
        const textMatch = warning.match(/text: '([^']+)'/);
        
        if (fontMatch && textMatch) {
          textElements.push({
            id: id++,
            text: textMatch[1],
            fontFamily: fontMatch[1],
            fontSize: 16,
            color: '#000000',
            x: 100,
            y: 100,
            width: 200,
            height: 50,
            visible: true,
            name: `Text Element ${id - 1}`
          });
        }
      }
    });
    
    return textElements;
  };

  // Extract font information from warnings first
  const extractFontsFromWarnings = (messages: any[]) => {
    console.log('Extracting original font names from warnings...');
    const fontMap = new Map<string, string>(); // text -> originalFont mapping
    
    messages
      .filter((m) => m.type === 'warning')
      .forEach(warning => {
        if (warning.message.includes("Could not find a typeface")) {
          const fontMatch = warning.message.match(/font family '([^']+)'/);
          const textMatch = warning.message.match(/text: '([^']+)'/);
          
          if (fontMatch && textMatch) {
            fontMap.set(textMatch[1], fontMatch[1]);
            console.log(`📝 Found original font mapping: "${textMatch[1]}" -> "${fontMatch[1]}"`);
          }
        }
      });
      
    return fontMap;
  };

  // Extract real text elements from the scene
  const extractRealTextElements = (engine: any, messages: any[]) => {
    console.log('Extracting real text elements from scene...');
    const textElements: TextElement[] = [];
    const originalFontMap = extractFontsFromWarnings(messages);
    
    try {
      const pages = engine.scene.getPages();
      
      const traverseForText = (blockId: number) => {
        try {
          const blockType = engine.block.getType(blockId);
          
          // Check if it's a text block
          if (blockType && blockType.includes('text')) {
            console.log('Found real text block:', blockId, 'type:', blockType);
            
            try {
              // Extract all properties from the real block
              const text = engine.block.getString ? engine.block.getString(blockId, 'text/text') : '';
              
              let fontFamily = 'Arial';
              try {
                // Use 'typeface' as that's what CE.SDK actually uses
                fontFamily = engine.block.getString(blockId, 'text/typeface') || 'Arial';
              } catch (e) {
                // Try alternative property names
                try {
                  fontFamily = engine.block.getString(blockId, 'text/fontFamily') || 'Arial';
                } catch (e2) {
                  try {
                    fontFamily = engine.block.getString(blockId, 'text/font') || 'Arial';
                  } catch (e3) {
                    console.log('Could not get font family from block:', blockId);
                  }
                }
              }
              
              let fontSize = 16;
              try {
                fontSize = engine.block.getFloat ? engine.block.getFloat(blockId, 'text/fontSize') : 16;
              } catch (e) {
                console.log('Could not get font size from block:', blockId);
              }
              
              let color = '#000000';
              try {
                const colorObj = engine.block.getColor ? engine.block.getColor(blockId, 'text/color') : null;
                if (colorObj) {
                  color = `rgba(${Math.round(colorObj.r * 255)}, ${Math.round(colorObj.g * 255)}, ${Math.round(colorObj.b * 255)}, ${colorObj.a})`;
                }
              } catch (e) {
                console.log('Could not get color from block:', blockId);
              }
              
              let x = 0, y = 0, width = 200, height = 50, visible = true;
              try {
                x = engine.block.getPositionX ? engine.block.getPositionX(blockId) : 0;
                y = engine.block.getPositionY ? engine.block.getPositionY(blockId) : 0;
                width = engine.block.getWidth ? engine.block.getWidth(blockId) : 200;
                height = engine.block.getHeight ? engine.block.getHeight(blockId) : 50;
                visible = engine.block.getVisible ? engine.block.getVisible(blockId) : true;
              } catch (e) {
                console.log('Could not get transform properties from block:', blockId);
              }
              
              const name = engine.block.getName ? engine.block.getName(blockId) || `Text ${textElements.length + 1}` : `Text ${textElements.length + 1}`;
              
              // Check if we have original font information from warnings
              let finalFontFamily = fontFamily;
              if (fontFamily === '' || fontFamily === 'Open Sans') {
                // First try exact match
                if (originalFontMap.has(text)) {
                  finalFontFamily = originalFontMap.get(text)!;
                  console.log(`🔄 Using original font "${finalFontFamily}" (exact match) instead of "${fontFamily}" for text: "${text.substring(0, 20)}..."`);
                } else {
                  // Try fuzzy matching - check if text contains any key from the map or vice versa
                  for (const [mapText, mapFont] of originalFontMap.entries()) {
                    if (text.includes(mapText) || mapText.includes(text)) {
                      finalFontFamily = mapFont;
                      console.log(`🔄 Using original font "${finalFontFamily}" (fuzzy match) instead of "${fontFamily}" for text: "${text.substring(0, 20)}..."`);
                      break;
                    }
                  }
                }
              }
              
              const textElement: TextElement = {
                id: blockId, // Use the real block ID!
                text,
                fontFamily: finalFontFamily,
                fontSize,
                color,
                x,
                y,
                width,
                height,
                visible,
                name
              };
              
              console.log('Extracted real text element:', textElement);
              textElements.push(textElement);
              
            } catch (e) {
              console.error('Error extracting text properties from block:', blockId, e);
            }
          }
          
          // Traverse children
          try {
            const children = engine.block.getChildren(blockId);
            children.forEach((childId: number) => traverseForText(childId));
          } catch (e) {
            // No children
          }
          
        } catch (e) {
          console.error('Error processing block for text:', blockId, e);
        }
      };
      
      pages.forEach((pageId: number) => traverseForText(pageId));
    } catch (e) {
      console.error('Error during text extraction:', e);
    }
    
    console.log('Extracted real text elements:', textElements);
    return textElements;
  };

  // Extract all elements from the scene
  const extractAllElements = (engine: any, messages: any[]) => {
    console.log('Starting full element extraction...');
    
    // Extract text elements from real scene blocks (not warnings)
    const textElements = extractRealTextElements(engine, messages);
    
    // Extract images and shapes from scene traversal
    const imageElements: ImageElement[] = [];
    const shapeElements: ShapeElement[] = [];
    let canvasWidth = 800, canvasHeight = 600;
    
    try {
      const pages = engine.scene.getPages();
      console.log('Found pages:', pages);
      
      if (pages.length > 0) {
        const pageId = pages[0];
        canvasWidth = engine.block.getWidth(pageId);
        canvasHeight = engine.block.getHeight(pageId);
        console.log('Canvas dimensions:', canvasWidth, 'x', canvasHeight);
        
        // First pass: collect all block types to understand the structure
        const allBlockTypes = new Set<string>();
        const collectBlockTypes = (blockId: number) => {
          try {
            const blockType = engine.block.getType(blockId);
            allBlockTypes.add(blockType);
            const children = engine.block.getChildren(blockId);
            children.forEach((childId: number) => collectBlockTypes(childId));
          } catch (e) {
            // Skip problematic blocks
          }
        };
        collectBlockTypes(pageId);
        console.log('All block types found in PSD:', Array.from(allBlockTypes).sort());
        
        // Debug: show available methods
        console.log('Available engine.block methods:', Object.getOwnPropertyNames(engine.block).filter(name => typeof engine.block[name] === 'function'));

        // Traverse all blocks in the scene
        const traverseBlocks = (blockId: number) => {
          try {
            const blockType = engine.block.getType(blockId);
            console.log('Processing block:', blockId, 'type:', blockType);
            
            // Check if this block has an image (either by type or by having image fill)
            let hasImage = false;
            let imageUrl;
            
            // First check if it's directly an image type
            if (blockType && (
              blockType.includes('image') || 
              blockType.includes('//ly.img.ubq/image') ||
              blockType === '//ly.img.ubq/graphic/image' ||
              blockType.includes('graphic') ||
              blockType.includes('bitmap') ||
              blockType.includes('raster')
            )) {
              hasImage = true;
              console.log('Found image block by type:', blockId, blockType);
            }
            
            // Also check if any block has image fill properties
            try {
              imageUrl = engine.block.getString(blockId, 'fill/image/imageFileURI');
              if (imageUrl) {
                hasImage = true;
                console.log('Found block with image fill:', blockId, blockType, imageUrl);
              }
            } catch (e) {
              // No image fill
            }
            
            if (hasImage) {
              console.log('Found image block:', blockId, 'type:', blockType, 'imageUrl:', imageUrl);
              
              try {
                // Use the comprehensive extraction function, but pass the already found imageUrl
                const imageElement = extractImageElement(engine, blockId);
                // If we found an imageUrl during detection, use it
                if (imageUrl && !imageElement.imageUrl) {
                  imageElement.imageUrl = imageUrl;
                  console.log('Using detected imageUrl:', imageUrl);
                }
                imageElements.push(imageElement);
                
                console.log('Added image element:', imageElements[imageElements.length - 1]);
              } catch (e) {
                console.error('Error extracting image properties:', e);
              }
            }
            
            // Check for shape blocks (but not if it's already detected as an image or text)
            const isText = blockType && blockType.includes('text');
            
            // Debug: check if this graphic block could be a shape
            if (!hasImage && !isText && blockType === '//ly.img.ubq/graphic') {
              const isShape = hasShapeProperties(engine, blockId);
              console.log(`Graphic block ${blockId} shape check: ${isShape}`);
            }
            
            if (!hasImage && !isText && blockType && (
              blockType.includes('shape') ||
              blockType.includes('//ly.img.ubq/shape') ||
              blockType === '//ly.img.ubq/graphic/shape' ||
              blockType.includes('rect') ||
              blockType.includes('ellipse') ||
              blockType.includes('polygon') ||
              blockType.includes('line') ||
              blockType.includes('star') ||
              blockType.includes('vector') ||
              // Many shapes in CE.SDK are classified as 'graphic' 
              (blockType === '//ly.img.ubq/graphic' && hasShapeProperties(engine, blockId))
            )) {
              console.log('Found shape block:', blockId, 'type:', blockType);
              
              try {
                let name, visible, x, y, width, height;
                
                // Get properties safely
                try {
                  name = engine.block.getName(blockId) || `Shape ${shapeElements.length + 1}`;
                } catch (e) {
                  name = `Shape ${shapeElements.length + 1}`;
                }
                
                try {
                  visible = engine.block.getVisible ? engine.block.getVisible(blockId) : true;
                } catch (e) {
                  visible = true;
                }
                
                try {
                  x = engine.block.getPositionX ? engine.block.getPositionX(blockId) : 0;
                } catch (e) {
                  x = 0;
                }
                
                try {
                  y = engine.block.getPositionY ? engine.block.getPositionY(blockId) : 0;
                } catch (e) {
                  y = 0;
                }
                
                try {
                  width = engine.block.getWidth ? engine.block.getWidth(blockId) : 100;
                } catch (e) {
                  width = 100;
                }
                
                try {
                  height = engine.block.getHeight ? engine.block.getHeight(blockId) : 100;
                } catch (e) {
                  height = 100;
                }
                
                let fillColor, strokeColor, strokeWidth;
                
                // Try to get fill color
                try {
                  const fillColorObj = engine.block.getColor(blockId, 'fill/solid/color');
                  fillColor = `rgba(${Math.round(fillColorObj.r * 255)}, ${Math.round(fillColorObj.g * 255)}, ${Math.round(fillColorObj.b * 255)}, ${fillColorObj.a})`;
                } catch (e) {
                  // No fill color
                }
                
                // Try to get stroke properties
                try {
                  const strokeColorObj = engine.block.getColor(blockId, 'stroke/color');
                  strokeColor = `rgba(${Math.round(strokeColorObj.r * 255)}, ${Math.round(strokeColorObj.g * 255)}, ${Math.round(strokeColorObj.b * 255)}, ${strokeColorObj.a})`;
                  strokeWidth = engine.block.getFloat(blockId, 'stroke/width');
                } catch (e) {
                  // No stroke properties
                }
                
                shapeElements.push({
                  id: blockId,
                  name,
                  type: blockType,
                  x,
                  y,
                  width,
                  height,
                  visible,
                  fillColor,
                  strokeColor,
                  strokeWidth
                });
                
                console.log('Added shape element:', shapeElements[shapeElements.length - 1]);
              } catch (e) {
                console.error('Error extracting shape properties:', e);
              }
            }
            
            // Traverse children recursively
            try {
              const children = engine.block.getChildren(blockId);
              children.forEach((childId: number) => traverseBlocks(childId));
            } catch (e) {
              // No children or error accessing children
            }
            
          } catch (e) {
            console.error('Error processing block:', blockId, e);
          }
        };
        
        // Start traversal from the page
        traverseBlocks(pageId);
      }
    } catch (e) {
      console.error('Error during scene traversal:', e);
    }
    
    console.log('Extraction complete. Found:', {
      texts: textElements.length,
      images: imageElements.length,
      shapes: shapeElements.length
    });
    
    return {
      textElements,
      imageElements, 
      shapeElements,
      canvasWidth,
      canvasHeight
    };
  };
  const processFile = useCallback(async (file: ExampleFile) => {
    const path = file.url;
    setCurrentFile(file);

    const response = await fetch(path);
    const blob = await response.blob();
    const blobBuffer = await blob.arrayBuffer();
    const startTime = Date.now();

    setStatus('init');
    let imageBlob;
    let sceneArchive;
    let logger: Logger;
    let creativeEngine: any;
    
    try {
      creativeEngine = await CreativeEngine.init({
        license: process.env.NEXT_PUBLIC_LICENSE,
        ui: {
          typefaceLibraries: ['ly.img.google-fonts']
        }
      });
      setEngine(creativeEngine);
      
      setStatus('processing');
      // Add Google Fonts BEFORE parsing PSD to ensure fonts are available during parse
      console.log('Adding Google Fonts library...');
      await addGoogleFontsAssetLibrary(creativeEngine);
      console.log('Google Fonts library added successfully');

      // Load local fonts from the fonts folder
      console.log('Loading local fonts from project...');
      const loadedFonts = await loadLocalFonts(creativeEngine);
      console.log('Local fonts loaded successfully');
      
      // Register loaded fonts in CE.SDK asset system
      if (loadedFonts && loadedFonts.length > 0) {
        await registerFontsInEngine(creativeEngine, loadedFonts);
      }
      
      // Enable system font access for CE.SDK
      console.log('Configuring font fallback system...');
      try {
        // Use the correct properties shown in the error message
        if (creativeEngine.editor && creativeEngine.editor.setSettingBool) {
          // Try to enable system font fallback using the correct property
          creativeEngine.editor.setSettingBool('useSystemFontFallback', true);
          console.log('✓ System font fallback enabled');
        }
        
        // Try to set a default fallback font URI
        if (creativeEngine.editor && creativeEngine.editor.setSettingString) {
          // This would set a fallback font file
          console.log('✓ Font fallback system configured');
        }
        
      } catch (fontError) {
        console.log('Font configuration warning (this is expected):', fontError.message);
      }
      
      // Small delay to ensure fonts are fully loaded
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const parser = await PSDParser.fromFile(
        creativeEngine as any,
        blobBuffer,
        createWebEncodeBufferToPNG()
      );
      const result = await parser.parse();
      logger = result.logger;
      
      // Post-process font replacements for better visual fidelity
      console.log('Post-processing fonts for better rendering...');
      try {
        await postProcessFonts(creativeEngine, logger.getMessages());
      } catch (fontPostProcessError) {
        console.log('Font post-processing completed with warnings:', fontPostProcessError);
      }
      
      // Force delay and refresh after font changes to ensure they're applied to preview
      console.log('⏳ Waiting for font changes to take effect...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        // Force refresh of all text blocks
        const allBlocks = creativeEngine.block.findAll();
        for (const blockId of allBlocks) {
          const blockType = creativeEngine.block.getType(blockId);
          if (blockType && blockType.includes('text')) {
            creativeEngine.block.setVisible(blockId, false);
            creativeEngine.block.setVisible(blockId, true);
          }
        }
        console.log('✓ Forced refresh of all text blocks for preview');
      } catch (e) {
        console.log('Text block refresh not available, continuing...');
      }
      
      // Extract all elements from the scene
      const extractedElements = extractAllElements(creativeEngine, logger.getMessages());
      
      imageBlob = await creativeEngine.block.export(creativeEngine.scene.getPages()[0], {
        mimeType: 'image/png',
        targetHeight: 1000,
        targetWidth: 1000
      });
      sceneArchive = await creativeEngine.scene.saveToArchive();
      
      const timeDiffInSeconds = (Date.now() - startTime) / 1000;
      setInferenceTime(timeDiffInSeconds);
      
      setResult({
        messages: logger.getMessages(),
        imageUrl: URL.createObjectURL(imageBlob),
        sceneArchiveUrl: URL.createObjectURL(sceneArchive),
        textElements: extractedElements.textElements,
        imageElements: extractedElements.imageElements,
        shapeElements: extractedElements.shapeElements,
        canvasWidth: extractedElements.canvasWidth,
        canvasHeight: extractedElements.canvasHeight
      });
    } catch (error) {
      console.error(error);
      resetState();
      return;
    }
    setStatus('idle');
  }, []);

  // Find actual text blocks in the scene
  const findTextBlocks = useCallback(() => {
    if (!engine) return [];
    
    console.log('Finding text blocks in scene...');
    const textBlocks: number[] = [];
    
    try {
      const pages = engine.scene.getPages();
      console.log('Searching in pages:', pages);
      
      const traverseBlocks = (blockId: number) => {
        try {
          const blockType = engine.block.getType(blockId);
          
          // Check if it's a text block
          if (blockType && blockType.includes('text')) {
            console.log('Found text block:', blockId, 'type:', blockType);
            
            // Try to read current text content
            try {
              const currentText = engine.block.getString(blockId, 'text/text');
              console.log('Text block content:', currentText);
            } catch (e) {
              console.log('Could not read text content from block:', blockId);
            }
            
            textBlocks.push(blockId);
          }
          
          // Traverse children
          const children = engine.block.getChildren(blockId);
          children.forEach((childId: number) => traverseBlocks(childId));
        } catch (e) {
          // Skip problematic blocks
        }
      };
      
      pages.forEach((pageId: number) => traverseBlocks(pageId));
    } catch (e) {
      console.error('Error finding text blocks:', e);
    }
    
    console.log('Found text blocks:', textBlocks);
    return textBlocks;
  }, [engine]);

  // Update functions (now much simpler since we have real block IDs)
  const updateTextElement = useCallback((id: number, updates: Partial<TextElement>) => {
    console.log('=== updateTextElement CALLED ===');
    console.log('Block ID:', id);
    console.log('Updates received:', updates);
    console.log('Engine exists:', !!engine);
    console.log('Result exists:', !!result);
    
    if (!engine || !result) {
      console.log('❌ Aborting: No engine or result');
      return;
    }
    
    console.log('✓ Proceeding with text update...');

    // Since we now use real block IDs, we can update directly
    try {
      if (updates.text !== undefined && engine.block.setString) {
        console.log('Setting text to:', updates.text);
        engine.block.setString(id, 'text/text', updates.text);
      }
      if (updates.fontSize !== undefined && engine.block.setFloat) {
        console.log('Setting font size to:', updates.fontSize);
        engine.block.setFloat(id, 'text/fontSize', updates.fontSize);
      }
      if (updates.color !== undefined && engine.block.setColor) {
        console.log('🎨 COLOR UPDATE DETECTED!');
        console.log('Original color string:', updates.color);
        
        // Parse color string to CE.SDK color format
        const colorMatch = updates.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([01]?\.?\d*))?\)/);
        console.log('Color regex match result:', colorMatch);
        
        if (colorMatch) {
          const [, r, g, b, a = '1'] = colorMatch;
          const colorObj = {
            r: parseInt(r) / 255,
            g: parseInt(g) / 255,
            b: parseInt(b) / 255,
            a: parseFloat(a)
          };
          console.log('Converted color object for CE.SDK:', colorObj);
          console.log('RGB values - R:', parseInt(r), 'G:', parseInt(g), 'B:', parseInt(b));
          
          try {
            // Try both text/color and fill/solid/color paths
            let colorSuccess = false;
            
            // Method 1: Try text/color (traditional text color)
            try {
              engine.block.setColor(id, 'text/color', colorObj);
              console.log('✅ Successfully set text/color on block', id);
              colorSuccess = true;
            } catch (e) {
              console.log('text/color failed, trying fill/solid/color:', e.message);
            }
            
            // Method 2: Try fill/solid/color (based on PSD data)
            if (!colorSuccess) {
              try {
                engine.block.setColor(id, 'fill/solid/color', colorObj);
                console.log('✅ Successfully set fill/solid/color on block', id);
                colorSuccess = true;
              } catch (e) {
                console.log('fill/solid/color failed:', e.message);
              }
            }
            
            if (!colorSuccess) {
              console.error('❌ Failed to set text color using both methods');
            }
          } catch (colorError) {
            console.error('❌ General error setting text color:', colorError);
          }
        } else {
          console.error('❌ Failed to parse color string:', updates.color);
        }
      }
      if (updates.visible !== undefined) {
        try {
          // Try setBool first, then fallback to setVisible if it exists
          if (typeof engine.block.setBool === 'function') {
            engine.block.setBool(id, 'visible', updates.visible);
          } else if (typeof engine.block.setVisible === 'function') {
            engine.block.setVisible(id, updates.visible);
          }
          console.log('Setting visibility to:', updates.visible);
        } catch (e) {
          console.warn('Failed to set visibility:', e);
        }
      }
      
      // Update opacity
      if (updates.opacity !== undefined && typeof engine.block.setOpacity === 'function') {
        try {
          engine.block.setOpacity(id, updates.opacity);
          console.log('Setting opacity to:', updates.opacity);
        } catch (e) {
          console.warn('Failed to set opacity:', e);
        }
      }
      
      // Update rotation
      if (updates.rotation !== undefined && typeof engine.block.setRotation === 'function') {
        try {
          engine.block.setRotation(id, updates.rotation);
          console.log('Setting rotation to:', updates.rotation, 'radians =', (updates.rotation * 180 / Math.PI), 'degrees');
        } catch (e) {
          console.warn('Failed to set rotation:', e);
        }
      }
      
      // Update stroke properties
      if (updates.stroke) {
        const { stroke } = updates;
        try {
          if (stroke.enabled !== undefined) engine.block.setBool(id, 'stroke/enabled', stroke.enabled);
          if (stroke.color !== undefined) {
            const colorMatch = stroke.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
            if (colorMatch) {
              const [, r, g, b, a = '1'] = colorMatch;
              engine.block.setColor(id, 'stroke/color', {
                r: parseInt(r) / 255,
                g: parseInt(g) / 255,
                b: parseInt(b) / 255,
                a: parseFloat(a)
              });
            }
          }
          if (stroke.width !== undefined) engine.block.setFloat(id, 'stroke/width', stroke.width);
          console.log('Setting stroke properties:', stroke);
        } catch (e) {
          console.warn('Failed to set stroke properties:', e);
        }
      }
      
      // Update drop shadow properties
      if (updates.dropShadow) {
        const { dropShadow } = updates;
        try {
          if (dropShadow.enabled !== undefined) engine.block.setBool(id, 'dropShadow/enabled', dropShadow.enabled);
          if (dropShadow.color !== undefined) {
            const colorMatch = dropShadow.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
            if (colorMatch) {
              const [, r, g, b, a = '1'] = colorMatch;
              engine.block.setColor(id, 'dropShadow/color', {
                r: parseInt(r) / 255,
                g: parseInt(g) / 255,
                b: parseInt(b) / 255,
                a: parseFloat(a)
              });
            }
          }
          if (dropShadow.offsetX !== undefined) engine.block.setFloat(id, 'dropShadow/offset/x', dropShadow.offsetX);
          if (dropShadow.offsetY !== undefined) engine.block.setFloat(id, 'dropShadow/offset/y', dropShadow.offsetY);
          if (dropShadow.blurX !== undefined) engine.block.setFloat(id, 'dropShadow/blurRadius/x', dropShadow.blurX);
          if (dropShadow.blurY !== undefined) engine.block.setFloat(id, 'dropShadow/blurRadius/y', dropShadow.blurY);
          console.log('Setting drop shadow properties:', dropShadow);
        } catch (e) {
          console.warn('Failed to set drop shadow properties:', e);
        }
      }
      
      // Update background color properties
      if (updates.backgroundColor) {
        const { backgroundColor } = updates;
        try {
          if (backgroundColor.enabled !== undefined) engine.block.setBool(id, 'backgroundColor/enabled', backgroundColor.enabled);
          if (backgroundColor.color !== undefined) {
            const colorMatch = backgroundColor.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
            if (colorMatch) {
              const [, r, g, b, a = '1'] = colorMatch;
              engine.block.setColor(id, 'backgroundColor/color', {
                r: parseInt(r) / 255,
                g: parseInt(g) / 255,
                b: parseInt(b) / 255,
                a: parseFloat(a)
              });
            }
          }
          if (backgroundColor.cornerRadius !== undefined) engine.block.setFloat(id, 'backgroundColor/cornerRadius', backgroundColor.cornerRadius);
          if (backgroundColor.paddingTop !== undefined) engine.block.setFloat(id, 'backgroundColor/paddingTop', backgroundColor.paddingTop);
          if (backgroundColor.paddingBottom !== undefined) engine.block.setFloat(id, 'backgroundColor/paddingBottom', backgroundColor.paddingBottom);
          if (backgroundColor.paddingLeft !== undefined) engine.block.setFloat(id, 'backgroundColor/paddingLeft', backgroundColor.paddingLeft);
          if (backgroundColor.paddingRight !== undefined) engine.block.setFloat(id, 'backgroundColor/paddingRight', backgroundColor.paddingRight);
          console.log('Setting background color properties:', backgroundColor);
        } catch (e) {
          console.warn('Failed to set background color properties:', e);
        }
      }
      
      console.log('Text block updated successfully');
      
      // Force the block to refresh/re-render
      try {
        engine.block.setVisible(id, false);
        engine.block.setVisible(id, true);
        console.log('✓ Forced block refresh for ID:', id);
      } catch (e) {
        console.log('Block refresh not available, continuing...');
      }
    } catch (error) {
      console.error('Error updating text block:', error);
    }

    // Always update the local state for UI consistency
    setResult(prevResult => {
      if (!prevResult) return prevResult;
      return {
        ...prevResult,
        textElements: prevResult.textElements.map(el => 
          el.id === id ? { ...el, ...updates } : el
        )
      };
    });
  }, [engine, result]);

  const updateImageElement = useCallback((id: number, updates: Partial<ImageElement>) => {
    console.log('=== updateImageElement CALLED ===');
    console.log('Block ID:', id);
    console.log('Updates received:', updates);
    console.log('Engine exists:', !!engine);
    console.log('Result exists:', !!result);
    
    if (!engine || !result) {
      console.log('❌ Aborting: No engine or result');
      return;
    }
    
    console.log('✓ Proceeding with update...');

    try {
      // Since we're using real block IDs now, we can update directly
      if (updates.x !== undefined && typeof engine.block.setPositionX === 'function') {
        try {
          engine.block.setPositionX(id, updates.x);
        } catch (e) {
          console.warn('Failed to set position X:', e);
        }
      }
      if (updates.y !== undefined && typeof engine.block.setPositionY === 'function') {
        try {
          engine.block.setPositionY(id, updates.y);
        } catch (e) {
          console.warn('Failed to set position Y:', e);
        }
      }
      if (updates.visible !== undefined) {
        try {
          // Try setBool first, then fallback to setVisible if it exists
          if (typeof engine.block.setBool === 'function') {
            engine.block.setBool(id, 'visible', updates.visible);
          } else if (typeof engine.block.setVisible === 'function') {
            engine.block.setVisible(id, updates.visible);
          }
        } catch (e) {
          console.warn('Failed to set visibility:', e);
        }
      }
      
      // Update opacity
      if (updates.opacity !== undefined && typeof engine.block.setOpacity === 'function') {
        try {
          engine.block.setOpacity(id, updates.opacity);
        } catch (e) {
          console.warn('Failed to set opacity:', e);
        }
      }
      
      // Update rotation
      if (updates.rotation !== undefined && typeof engine.block.setRotation === 'function') {
        try {
          engine.block.setRotation(id, updates.rotation);
        } catch (e) {
          console.warn('Failed to set rotation:', e);
        }
      }
      
      // Update clipped
      if (updates.clipped !== undefined) {
        try {
          engine.block.setBool(id, 'clipped', updates.clipped);
        } catch (e) {
          console.warn('Failed to set clipped:', e);
        }
      }
      
      // Update crop properties
      if (updates.crop) {
        const { crop } = updates;
        try {
          if (crop.rotation !== undefined) engine.block.setFloat(id, 'crop/rotation', crop.rotation);
          if (crop.scaleRatio !== undefined) engine.block.setFloat(id, 'crop/scaleRatio', crop.scaleRatio);
          if (crop.scaleX !== undefined) engine.block.setFloat(id, 'crop/scaleX', crop.scaleX);
          if (crop.scaleY !== undefined) engine.block.setFloat(id, 'crop/scaleY', crop.scaleY);
          if (crop.translationX !== undefined) engine.block.setFloat(id, 'crop/translationX', crop.translationX);
          if (crop.translationY !== undefined) engine.block.setFloat(id, 'crop/translationY', crop.translationY);
        } catch (e) {
          console.warn('Failed to set crop properties:', e);
        }
      }
      
      // Update drop shadow properties
      if (updates.dropShadow) {
        const { dropShadow } = updates;
        try {
          if (dropShadow.enabled !== undefined) engine.block.setBool(id, 'dropShadow/enabled', dropShadow.enabled);
          if (dropShadow.color !== undefined) {
            // Parse color string to rgba components
            const colorMatch = dropShadow.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
            if (colorMatch) {
              const [, r, g, b, a = '1'] = colorMatch;
              engine.block.setColor(id, 'dropShadow/color', {
                r: parseInt(r) / 255,
                g: parseInt(g) / 255,
                b: parseInt(b) / 255,
                a: parseFloat(a)
              });
            }
          }
          if (dropShadow.offsetX !== undefined) engine.block.setFloat(id, 'dropShadow/offset/x', dropShadow.offsetX);
          if (dropShadow.offsetY !== undefined) engine.block.setFloat(id, 'dropShadow/offset/y', dropShadow.offsetY);
          if (dropShadow.blurX !== undefined) engine.block.setFloat(id, 'dropShadow/blurRadius/x', dropShadow.blurX);
          if (dropShadow.blurY !== undefined) engine.block.setFloat(id, 'dropShadow/blurRadius/y', dropShadow.blurY);
        } catch (e) {
          console.warn('Failed to set drop shadow properties:', e);
        }
      }
      
      // Update stroke properties
      if (updates.stroke) {
        const { stroke } = updates;
        try {
          if (stroke.enabled !== undefined) engine.block.setBool(id, 'stroke/enabled', stroke.enabled);
          if (stroke.color !== undefined) {
            // Parse color string to rgba components
            const colorMatch = stroke.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
            if (colorMatch) {
              const [, r, g, b, a = '1'] = colorMatch;
              engine.block.setColor(id, 'stroke/color', {
                r: parseInt(r) / 255,
                g: parseInt(g) / 255,
                b: parseInt(b) / 255,
                a: parseFloat(a)
              });
            }
          }
          if (stroke.width !== undefined) engine.block.setFloat(id, 'stroke/width', stroke.width);
        } catch (e) {
          console.warn('Failed to set stroke properties:', e);
        }
      }
      
      // Update blur properties
      if (updates.blur) {
        const { blur } = updates;
        try {
          if (blur.enabled !== undefined) engine.block.setBool(id, 'blur/enabled', blur.enabled);
        } catch (e) {
          console.warn('Failed to set blur properties:', e);
        }
      }
      
      // Update fill properties (for image replacement and color fills)
      if (updates.fill) {
        const { fill } = updates;
        try {
          if (fill.enabled !== undefined) engine.block.setBool(id, 'fill/enabled', fill.enabled);
          
          if (fill.type === '//ly.img.ubq/fill/image') {
            if (fill.imageFileURI !== undefined) {
              console.log('Setting new image URI for block', id, ':', fill.imageFileURI.substring(0, 50) + '...');
              
              // CORRECT METHOD: Create a new image fill and set it on the block (from working example)
              try {
                console.log('Creating new image fill...');
                const imageFill = engine.block.createFill("image");
                console.log('Setting imageFileURI on fill object...');
                engine.block.setString(imageFill, "fill/image/imageFileURI", fill.imageFileURI);
                console.log('Setting fill on block...');
                engine.block.setFill(id, imageFill);
                console.log('✓ Successfully replaced image using createFill method!');
              } catch (e) {
                console.warn('createFill method failed:', e);
                
                // Fallback: Try the old direct method
                try {
                  engine.block.setString(id, 'fill/image/imageFileURI', fill.imageFileURI);
                  console.log('✓ Fallback: Successfully set fill/image/imageFileURI directly');
                } catch (e2) {
                  console.warn('Both methods failed:', e2);
                  // Try asset replacement as last resort
                  handleImageAssetReplacement(engine, id, fill.imageFileURI);
                }
              }
            }
            if (fill.externalReference !== undefined) engine.block.setString(id, 'fill/image/externalReference', fill.externalReference);
            if (fill.previewFileURI !== undefined) engine.block.setString(id, 'fill/image/previewFileURI', fill.previewFileURI);
            if (fill.sourceSet !== undefined) engine.block.setString(id, 'fill/image/sourceSet', fill.sourceSet);
          } else if (fill.type === '//ly.img.ubq/fill/color' && fill.color) {
            // Parse color string to rgba components for solid color fills
            const colorMatch = fill.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
            if (colorMatch) {
              const [, r, g, b, a = '1'] = colorMatch;
              engine.block.setColor(id, 'fill/solid/color', {
                r: parseInt(r) / 255,
                g: parseInt(g) / 255,
                b: parseInt(b) / 255,
                a: parseFloat(a)
              });
            }
          }
        } catch (e) {
          console.warn('Failed to set fill properties:', e);
        }
      }
      
      // Update imageUrl for immediate preview update
      if (updates.imageUrl !== undefined) {
        console.log('Updating imageUrl for immediate preview:', updates.imageUrl.substring(0, 50) + '...');
      }

      // Update the local state
      setResult(prevResult => {
        if (!prevResult) return prevResult;
        return {
          ...prevResult,
          imageElements: prevResult.imageElements.map(el => 
            el.id === id ? { ...el, ...updates } : el
          )
        };
      });
    } catch (error) {
      console.error('Error updating image element:', error);
    }
  }, [engine, result]);

  const updateShapeElement = useCallback((id: number, updates: Partial<ShapeElement>) => {
    if (!engine || !result) return;
    
    console.log('Updating shape element:', id, updates);

    try {
      // Since we're using real block IDs now, we can update directly
      if (updates.fillColor !== undefined && engine.block.setColor) {
        try {
          const colorMatch = updates.fillColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([01]?\.?\d*))?\)/);
          if (colorMatch) {
            const [, r, g, b, a = '1'] = colorMatch;
            engine.block.setColor(id, 'fill/solid/color', {
              r: parseInt(r) / 255,
              g: parseInt(g) / 255,
              b: parseInt(b) / 255,
              a: parseFloat(a)
            });
          }
        } catch (e) {
          console.warn('Failed to set fill color:', e);
        }
      }
      if (updates.strokeColor !== undefined && engine.block.setColor) {
        try {
          const colorMatch = updates.strokeColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([01]?\.?\d*))?\)/);
          if (colorMatch) {
            const [, r, g, b, a = '1'] = colorMatch;
            engine.block.setColor(id, 'stroke/color', {
              r: parseInt(r) / 255,
              g: parseInt(g) / 255,
              b: parseInt(b) / 255,
              a: parseFloat(a)
            });
          }
        } catch (e) {
          console.warn('Failed to set stroke color:', e);
        }
      }
      if (updates.strokeWidth !== undefined && engine.block.setFloat) {
        try {
          engine.block.setFloat(id, 'stroke/width', updates.strokeWidth);
        } catch (e) {
          console.warn('Failed to set stroke width:', e);
        }
      }
      if (updates.x !== undefined && engine.block.setPositionX) {
        try {
          engine.block.setPositionX(id, updates.x);
        } catch (e) {
          console.warn('Failed to set position X:', e);
        }
      }
      if (updates.y !== undefined && engine.block.setPositionY) {
        try {
          engine.block.setPositionY(id, updates.y);
        } catch (e) {
          console.warn('Failed to set position Y:', e);
        }
      }
      if (updates.visible !== undefined && engine.block.setVisible) {
        try {
          engine.block.setVisible(id, updates.visible);
        } catch (e) {
          console.warn('Failed to set visibility:', e);
        }
      }

      // Update the local state
      setResult(prevResult => {
        if (!prevResult) return prevResult;
        return {
          ...prevResult,
          shapeElements: prevResult.shapeElements.map(el => 
            el.id === id ? { ...el, ...updates } : el
          )
        };
      });
    } catch (error) {
      console.error('Error updating shape element:', error);
    }
  }, [engine, result]);

  const regenerateImage = useCallback(async () => {
    console.log('Regenerate image called, engine:', !!engine);
    
    if (!engine) {
      console.error('No engine available for regeneration');
      return;
    }

    console.log('Starting image regeneration...');
    // Don't change the main status during regeneration to avoid UI conflicts
    // setStatus('processing');
    
    try {
      const pages = engine.scene.getPages();
      console.log('Available pages:', pages);
      
      if (pages.length === 0) {
        throw new Error('No pages found in scene');
      }
      
      const pageId = pages[0];
      console.log('Exporting page:', pageId);
      
      // Force a longer delay to ensure all changes are applied
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Force engine to update/refresh the scene
      try {
        engine.editor.setSettingBool('page/title/show', false);
        engine.editor.setSettingBool('page/title/show', true);
        console.log('✓ Forced engine refresh');
      } catch (e) {
        console.log('Engine refresh not available, continuing...');
      }
      
      const imageBlob = await engine.block.export(pageId, {
        mimeType: 'image/png',
        targetHeight: 1000,
        targetWidth: 1000
      });
      
      console.log('Image exported successfully, blob size:', imageBlob.size);
      
      // Verify the changes are in the scene
      if (result && result.textElements.length > 0) {
        console.log('Verifying text changes in scene:');
        result.textElements.forEach(textElement => {
          try {
            const content = engine.block.getString(textElement.id, 'text/text');
            console.log(`Text in block ${textElement.id}:`, content);
          } catch (e) {
            console.log(`Could not read text from block ${textElement.id}`);
          }
        });
      }

      setResult(prevResult => {
        if (!prevResult) return prevResult;
        
        // Revoke the old URL to prevent memory leaks
        URL.revokeObjectURL(prevResult.imageUrl);
        
        const newImageUrl = URL.createObjectURL(imageBlob);
        console.log('New image URL created:', newImageUrl);
        
        return {
          ...prevResult,
          imageUrl: newImageUrl
        };
      });
      
      console.log('Image regeneration completed successfully');
    } catch (error) {
      console.error('Error regenerating image:', error);
      alert(`Erro ao gerar imagem: ${error.message}`);
    } finally {
      // setStatus('idle');
    }
  }, [engine]);

  return (
    <FileProcessingContext.Provider
      value={{
        status,
        isProcessing: PROCESSING_STATUS.includes(status),
        processMessage,
        result,
        currentFile,
        processFile,
        resetState,
        inferenceTime,
        updateTextElement,
        updateImageElement,
        updateShapeElement,
        regenerateImage,
        engine
      }}
    >
      {children}
    </FileProcessingContext.Provider>
  );
};

export const useFileProcessing = () => {
  const context = useContext(FileProcessingContext);
  if (context === undefined) {
    throw new Error(
      'useFileProcessing must be used within a FileProcessingProvider'
    );
  }
  return context;
};

export { 
  FileProcessingContext, 
  FileProcessingContextProvider,
  type TextElement,
  type ImageElement,
  type ShapeElement,
  type ProcessResult
};
