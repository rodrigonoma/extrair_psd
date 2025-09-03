'use client';

import { useState, useEffect } from 'react';
import { useFileProcessing } from './FileProcessingContext';
import EditableTextElement from './EditableTextElement';
import AdvancedTextEditor from './AdvancedTextEditor';
import EditableImageElement from './EditableImageElement';
import AdvancedImageEditor from './AdvancedImageEditor';
import EditableShapeElement from './EditableShapeElement';
import PropertyEditor from '../PropertyEditor';
import ChevronLeftIcon from './icons/ChevronLeft.svg';
import NoSSRWrapper from './NoSSRWrapper';
import { useToast } from '../Toast';

function NewResultScreen() {
  const { 
    result, 
    currentFile, 
    resetState, 
    inferenceTime, 
    updateTextElement,
    updateImageElement,
    updateShapeElement,
    updateElement,
    regenerateImage,
    generateBatchImages,
    isProcessing,
    engine
  } = useFileProcessing();

  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'preview' | 'text' | 'images' | 'shapes' | 'properties'>('preview');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isAiRepositioning, setIsAiRepositioning] = useState(false);
  const [aiResponses, setAiResponses] = useState<Array<{timestamp: string, reasoning: string, prompt: string}>>([]);
  const [expandedPrompts, setExpandedPrompts] = useState<Set<number>>(new Set());
  const [showAiModal, setShowAiModal] = useState(false);
  const [textElements, setTextElements] = useState<any[]>([]);
  const [fixedElements, setFixedElements] = useState<Set<number>>(new Set());
  const [processingTextId, setProcessingTextId] = useState<number | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<'baixo' | 'medio' | 'alto'>('medio');
  const [colorPalettes, setColorPalettes] = useState<any[]>([]);
  const [isGeneratingPalettes, setIsGeneratingPalettes] = useState(false);
  const [selectedPaletteIndex, setSelectedPaletteIndex] = useState<number | null>(null);
  const [isApplyingChanges, setIsApplyingChanges] = useState(false);
  const [showElementPreview, setShowElementPreview] = useState(false);
  const [previewData, setPreviewData] = useState<{
    willChange: Array<{element: any, type: 'shape' | 'image', reason: string}>,
    willSkip: Array<{element: any, type: 'shape' | 'image', reason: string}>
  }>({ willChange: [], willSkip: [] });
  const [uploadedImages, setUploadedImages] = useState<{[elementId: number]: string}>({});
  const [uploadingImages, setUploadingImages] = useState<Set<number>>(new Set());
  const [isGeneratingAiImage, setIsGeneratingAiImage] = useState(false);
  const [generatedAiImage, setGeneratedAiImage] = useState<string | null>(null);
  const [generatedAiImages, setGeneratedAiImages] = useState<string[]>([]);
  const [aiPromptAddition, setAiPromptAddition] = useState('');
  const [isDetectingProfile, setIsDetectingProfile] = useState(false);
  const [profileDetectedAutomatically, setProfileDetectedAutomatically] = useState(false);
  const [generationStyle, setGenerationStyle] = useState<'conservador' | 'moderado' | 'radical'>('moderado');
  if (!result) return null;

  const { messages } = result;
  const warnings = messages
    .filter((m) => m.type === 'warning')
    .map((m) => m.message);
  const errors = messages
    .filter((m) => m.type === 'error')
    .map((m) => m.message);

  // Função para detectar perfil do imóvel automaticamente
  const detectPropertyProfile = async (textElements: any[]) => {
    console.log('🔍 Detecting property profile from texts...');
    setIsDetectingProfile(true);
    
    try {
      // Extrair apenas os textos das camadas
      const extractedTexts = textElements
        .filter(element => element.text && element.text.trim() !== '')
        .map(element => element.text.trim());
      
      console.log('📄 Extracted texts for profile detection:', extractedTexts);
      
      if (extractedTexts.length === 0) {
        console.log('⚠️ No texts found for profile detection');
        return null;
      }

      const response = await fetch('/api/ai-detect-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          texts: extractedTexts
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Profile detection API error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        return null;
      }

      const data = await response.json();
      console.log('🎯 Profile detection result:', data);
      
      if (data.success && data.profile && data.confidence >= 0.6) {
        console.log(`✅ Profile detected: ${data.profile} (confidence: ${data.confidence})`);
        return data.profile;
      } else {
        console.log('⚠️ Profile detection confidence too low or failed');
        return null;
      }
      
    } catch (error) {
      console.error('❌ Error detecting profile:', error);
      return null;
    } finally {
      setIsDetectingProfile(false);
    }
  };

  const handleAiReposition = async () => {
    console.log('AI Modal clicked');
    
    // Extrair apenas elementos de texto
    if (result.textElements && result.textElements.length > 0) {
      setTextElements(result.textElements);
      
      // Detectar perfil automaticamente antes de abrir o modal
      showToast({ type: 'info', title: '🔍 Detectando perfil do imóvel...' });
      const detectedProfile = await detectPropertyProfile(result.textElements);
      
      if (detectedProfile) {
        setSelectedProfile(detectedProfile);
        setProfileDetectedAutomatically(true);
        showToast({ 
          type: 'success', 
          title: `🎯 Perfil ${detectedProfile.toUpperCase()} detectado automaticamente!`,
          message: 'O perfil foi selecionado baseado na análise dos textos.'
        });
      } else {
        setProfileDetectedAutomatically(false);
        showToast({ 
          type: 'info', 
          title: '📝 Abrindo editor de textos IA...',
          message: 'Não foi possível detectar o perfil automaticamente. Selecione manualmente.'
        });
      }
      
      setShowAiModal(true);
    } else {
      showToast({ type: 'warning', title: '⚠️ Nenhum elemento de texto encontrado no PSD.' });
    }
  };

  const handleGenerateIndividualText = async (element: any) => {
    console.log('Generating text for element:', element.id);
    setProcessingTextId(element.id);
    
    showToast({ type: 'info', title: `🤖 Gerando novo texto para "${element.name}"...` });
    
    try {
      const response = await fetch('/api/ai-generate-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          originalText: element.text,
          elementId: element.id,
          elementName: element.name
        })
      });
      
      if (!response.ok) {
        throw new Error('Falha na chamada da API de geração de texto');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Atualizar o texto no elemento
        updateTextElement(element.id, { text: data.generatedText });
        
        // Atualizar também no estado local do modal
        setTextElements(prev => prev.map(el => 
          el.id === element.id 
            ? { ...el, text: data.generatedText }
            : el
        ));
        
        showToast({ 
          type: 'success', 
          title: `✨ Texto gerado com sucesso!\n${data.reasoning || 'Texto atualizado'}` 
        });
        
      } else {
        throw new Error(data.error || 'Erro na geração do texto');
      }
      
    } catch (error) {
      console.error('Erro na geração de texto:', error);
      showToast({ 
        type: 'error', 
        title: '❌ Erro ao gerar texto. Tente novamente.' 
      });
    } finally {
      setProcessingTextId(null);
    }
  };

  const toggleFixedElement = (elementId: number) => {
    const newFixed = new Set(fixedElements);
    if (newFixed.has(elementId)) {
      newFixed.delete(elementId);
    } else {
      newFixed.add(elementId);
    }
    setFixedElements(newFixed);
  };

  const generateColorPalettes = async () => {
    console.log('Generating color palettes for profile:', selectedProfile);
    setIsGeneratingPalettes(true);
    
    showToast({ type: 'info', title: `🎨 Gerando paletas de cores para padrão ${selectedProfile}...` });
    
    try {
      const response = await fetch('/api/ai-color-palettes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          profile: selectedProfile
        })
      });
      
      if (!response.ok) {
        throw new Error('Falha na chamada da API de paletas');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setColorPalettes(data.palettes);
        setSelectedPaletteIndex(null); // Reset selection
        showToast({ 
          type: 'success', 
          title: `✨ Paletas geradas com sucesso!` 
        });
        
      } else {
        throw new Error(data.error || 'Erro na geração das paletas');
      }
      
    } catch (error) {
      console.error('Erro na geração de paletas:', error);
      showToast({ 
        type: 'error', 
        title: '❌ Erro ao gerar paletas. Tente novamente.' 
      });
    } finally {
      setIsGeneratingPalettes(false);
    }
  };

  // Função para lidar com upload de imagem
  const handleImageUpload = async (elementId: number, file: File) => {
    if (!file) return;

    console.log(`📤 Uploading image for element ${elementId}:`, file.name);
    
    setUploadingImages(prev => new Set([...prev, elementId]));
    
    try {
      // Criar URL temporária para a imagem
      const imageUrl = URL.createObjectURL(file);
      
      // Aplicar a imagem imediatamente no elemento
      console.log(`🖼️ Applying uploaded image to element ${elementId}`);
      updateImageElement(elementId, {
        fill: {
          type: '//ly.img.ubq/fill/image',
          imageFileURI: imageUrl,
          enabled: true
        }
      });
      
      // Salvar referência da imagem uploaded
      setUploadedImages(prev => ({
        ...prev,
        [elementId]: imageUrl
      }));
      
      // Regenerar preview
      await regenerateImage();
      
      showToast({
        type: 'success',
        title: `✅ Imagem aplicada ao elemento ${elementId} com sucesso!`
      });
      
    } catch (error) {
      console.error('Error uploading image:', error);
      showToast({
        type: 'error',
        title: '❌ Erro ao fazer upload da imagem'
      });
    } finally {
      setUploadingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(elementId);
        return newSet;
      });
    }
  };

  // Função para gerar imagem similar com fal.ai
  const generateAiImage = async () => {
    if (!result || selectedPaletteIndex === null || selectedPaletteIndex === undefined || !colorPalettes[selectedPaletteIndex]) {
      showToast({
        type: 'error',
        title: '❌ Selecione uma paleta de cores primeiro'
      });
      return;
    }

    const selectedPalette = colorPalettes[selectedPaletteIndex];
    
    console.log('🎨 Gerando imagem com IA usando fal.ai...');
    setIsGeneratingAiImage(true);
    
    try {
      // Converter blob URL para base64 se necessário
      let baseImageUrl = result.imageUrl;
      
      if (baseImageUrl.startsWith('blob:')) {
        console.log('🔄 Convertendo blob para base64...');
        try {
          const response = await fetch(baseImageUrl);
          const blob = await response.blob();
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          baseImageUrl = base64;
          console.log('✅ Conversão para base64 concluída');
        } catch (blobError) {
          console.error('Erro ao converter blob:', blobError);
          throw new Error('Erro ao processar a imagem base');
        }
      }
      
      console.log('🔄 Enviando requisição para API...');
      console.log('Base image URL type:', typeof baseImageUrl, baseImageUrl?.substring(0, 50));
      
      const response = await fetch('/api/ai-generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          baseImageUrl: baseImageUrl,
          colors: selectedPalette.colors,
          paletteDescription: selectedPalette.description,
          prompt: aiPromptAddition || 'Focus on precise color replacement while maintaining professional marketing quality.',
          generationStyle: generationStyle
        })
      });

      console.log('✅ Response recebido, status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API response error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('📦 Data recebido:', data);
      
      if (data.success && (data.imageUrls || data.imageUrl)) {
        const images = data.imageUrls || [data.imageUrl];
        setGeneratedAiImages(images);
        setGeneratedAiImage(images[0]); // Manter compatibilidade
        
        showToast({
          type: 'success',
          title: '✨ Variações geradas com sucesso!',
          message: `${images.length} variações criadas com IA usando as cores da paleta selecionada`
        });
        
        console.log(`✅ ${images.length} imagens geradas com IA:`, images);
        console.log('💭 Reasoning:', data.reasoning);
      } else {
        throw new Error(data.error || 'Erro desconhecido na geração');
      }
      
    } catch (error) {
      console.error('Erro ao gerar imagem com IA:', error);
      showToast({
        type: 'error',
        title: '❌ Erro na geração com IA',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      setIsGeneratingAiImage(false);
    }
  };

  // Função para analisar elementos e gerar preview
  const generateElementPreview = () => {
    if (!result) return;

    const willChange: Array<{element: any, type: 'shape' | 'image', reason: string}> = [];
    const willSkip: Array<{element: any, type: 'shape' | 'image', reason: string}> = [];

    // Analisar shapes
    if (result.shapeElements) {
      result.shapeElements.forEach((element) => {
        if (shouldApplySolidColor(element, 'shape')) {
          const hasGradient = element.fill && (
            element.fill.type?.includes('gradient') ||
            element.name?.toLowerCase().includes('gradient') ||
            element.name?.toLowerCase().includes('degradê')
          );
          
          willChange.push({
            element,
            type: 'shape',
            reason: hasGradient 
              ? 'Elemento com gradiente - aplicará overlay semi-transparente'
              : 'Elemento de forma simples - aplicará cor sólida'
          });
        } else {
          const excludePatterns = ['logo', 'marca', 'brand', 'gradient', 'degradê', 'degrade', 'gradiente', 'photo', 'foto', 'imagem', 'image', 'texture', 'textura', 'shadow', 'sombra', 'drop-shadow', 'overlay', 'sobreposição', 'background-image', 'bg-img', 'icon', 'icone', 'ícone', 'illustration', 'ilustração', 'ilustracao'];
          const detectedPattern = excludePatterns.find(pattern => 
            element.name?.toLowerCase().includes(pattern)
          );
          
          willSkip.push({
            element,
            type: 'shape',
            reason: `Excluído por padrão detectado: "${detectedPattern}" - preserva qualidade original`
          });
        }
      });
    }

    // Analisar images
    if (result.imageElements) {
      result.imageElements.forEach((element) => {
        if (shouldApplySolidColor(element, 'image')) {
          willChange.push({
            element,
            type: 'image',
            reason: 'Elemento de background/forma - aplicará overlay semi-transparente (30%)'
          });
        } else {
          const allowedImagePatterns = ['background', 'bg', 'fundo', 'color', 'cor', 'shape', 'forma', 'rectangle', 'retangulo', 'rect', 'circle', 'circulo', 'oval', 'banner', 'header', 'footer', 'button', 'botão', 'botao', 'card', 'cartão', 'cartao'];
          const hasAllowedPattern = allowedImagePatterns.some(pattern => 
            element.name?.toLowerCase().includes(pattern)
          );
          
          willSkip.push({
            element,
            type: 'image',
            reason: hasAllowedPattern 
              ? 'Imagem complexa - preserva conteúdo original'
              : 'Não identificado como elemento colorível - preserva conteúdo original'
          });
        }
      });
    }

    setPreviewData({ willChange, willSkip });
    setShowElementPreview(true);
  };

  // Função para detectar se um elemento deve receber cor sólida
  const shouldApplySolidColor = (element: any, elementType: 'shape' | 'image') => {
    const name = element.name?.toLowerCase() || '';
    
    console.log(`🔍 Analisando elemento: "${element.name}" (${elementType})`);
    
    // Lista de padrões que indicam elementos que NÃO devem receber cor sólida
    const excludePatterns = [
      'logo', 'marca', 'brand',
      'photo', 'foto'
    ];
    
    // Verificar se o nome do elemento contém padrões a serem excluídos
    const hasExcludePattern = excludePatterns.some(pattern => name.includes(pattern));
    
    if (hasExcludePattern) {
      console.log(`🚫 Elemento "${element.name}" excluído da aplicação de cor (padrão detectado: ${excludePatterns.find(p => name.includes(p))})`);
      return false;
    }
    
    // Para debug: aceitar todos os outros elementos temporariamente
    console.log(`✅ Elemento "${element.name}" aprovado para aplicação de cor`);
    return true;
  };

  // Função para aplicar cor preservando efeitos
  const applyColorPreservingEffects = (element: any, newColor: string, elementType: 'shape' | 'image') => {
    console.log(`🎨 Aplicando cor inteligente em ${elementType} ${element.id} (${element.name}): ${newColor}`);
    
    if (elementType === 'shape') {
      // Para shapes, sempre aplicar cor sólida mas de forma mais cuidadosa
      console.log(`🔷 Aplicando cor sólida em forma "${element.name}"`);
      updateShapeElement(element.id, {
        fillColor: newColor
      });
    } else if (elementType === 'image') {
      // Para imagens, aplicar como fill de cor (método que funcionava antes)
      console.log(`🖼️ Aplicando cor como fill em imagem "${element.name}"`);
      updateImageElement(element.id, {
        fill: {
          type: '//ly.img.ubq/fill/color',
          color: newColor,
          enabled: true
        }
      });
    }
  };

  const applyAiChanges = async () => {
    console.log('Applying AI changes to PSD');
    console.log('Current result elements:', {
      textElements: result.textElements?.length || 0,
      imageElements: result.imageElements?.length || 0,
      shapeElements: result.shapeElements?.length || 0
    });
    
    setIsApplyingChanges(true);
    
    showToast({ type: 'info', title: '🎨 Aplicando mudanças IA no PSD...' });
    
    try {
      // Aplicar cores da paleta selecionada nos elementos gráficos
      if (selectedPaletteIndex !== null && colorPalettes[selectedPaletteIndex]) {
        const selectedPalette = colorPalettes[selectedPaletteIndex];
        console.log('🎨 Paleta selecionada:', selectedPalette.name, selectedPalette.colors);
        
        let changesApplied = 0;
        
        // Aplicar cores em elementos de forma/shape COM DETECÇÃO INTELIGENTE
        if (result.shapeElements && result.shapeElements.length > 0) {
          console.log('🔷 Processando', result.shapeElements.length, 'elementos de forma com detecção inteligente...');
          
          result.shapeElements.forEach((element, index) => {
            if (shouldApplySolidColor(element, 'shape')) {
              const colorIndex = index % selectedPalette.colors.length;
              const newColor = selectedPalette.colors[colorIndex];
              
              applyColorPreservingEffects(element, newColor, 'shape');
              changesApplied++;
            }
          });
        }
        
        // Textos mantêm cores originais - não aplicar paleta nos textos
        console.log('📝 Elementos de texto mantêm cores originais (não alterados)');
        if (result.textElements && result.textElements.length > 0) {
          console.log('📝 Encontrados', result.textElements.length, 'elementos de texto (cores preservadas)');
        }
        
        // Aplicar cores em elementos de imagem COM DETECÇÃO INTELIGENTE
        if (result.imageElements && result.imageElements.length > 0) {
          console.log('🖼️ Processando', result.imageElements.length, 'elementos de imagem com detecção inteligente...');
          
          result.imageElements.forEach((element, index) => {
            if (shouldApplySolidColor(element, 'image')) {
              // Usar cores diferentes das shapes, mas não considerar textos
              const colorIndex = (index + (result.shapeElements?.length || 0)) % selectedPalette.colors.length;
              const newColor = selectedPalette.colors[colorIndex];
              
              applyColorPreservingEffects(element, newColor, 'image');
              changesApplied++;
            }
          });
        }
        
        console.log(`🎨 Total de mudanças de cor aplicadas: ${changesApplied}`);
        
        if (changesApplied === 0) {
          showToast({ 
            type: 'warning', 
            title: '⚠️ Nenhuma mudança de cor foi aplicada. Verifique se há elementos gráficos no PSD.' 
          });
        }
      }
      
      // Aplicar imagens que foram carregadas via upload
      console.log('🖼️ Verificando imagens carregadas via upload...');
      if (Object.keys(uploadedImages).length > 0) {
        console.log('📤 Aplicando', Object.keys(uploadedImages).length, 'imagens carregadas');
        
        Object.entries(uploadedImages).forEach(([elementIdStr, imageUrl]) => {
          const elementId = parseInt(elementIdStr);
          console.log(`📷 Aplicando imagem carregada no elemento ${elementId}`);
          
          updateImageElement(elementId, {
            fill: {
              type: '//ly.img.ubq/fill/image',
              imageFileURI: imageUrl,
              enabled: true
            }
          });
        });
        
        // Pequena pausa após aplicar as imagens carregadas
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Aguardar um pouco para as mudanças serem processadas
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Regenerar a imagem final
      console.log('🔄 Regenerando imagem...');
      await regenerateImage();
      
      showToast({ 
        type: 'success', 
        title: '✨ Mudanças IA aplicadas com sucesso!' 
      });
      
      // Fechar modal após aplicar
      setShowAiModal(false);
      
    } catch (error) {
      console.error('Erro ao aplicar mudanças IA:', error);
      showToast({ 
        type: 'error', 
        title: '❌ Erro ao aplicar mudanças. Tente novamente.' 
      });
    } finally {
      setIsApplyingChanges(false);
    }
  };

  const handleRegenerateImage = async () => {
    console.log('Handle regenerate image clicked');
    setIsRegenerating(true);
    
    // Toast de início
    showToast({ type: 'info', title: '🚀 Iniciando geração da nova imagem...' });
    
    try {
      await regenerateImage();
      console.log('Regenerate image completed');
      
      // Toast de sucesso
      showToast({ type: 'success', title: '✅ Imagem gerada com sucesso!' });
    } catch (error) {
      console.error('Error in handleRegenerateImage:', error);
      
      // Toast de erro
      showToast({ type: 'error', title: '❌ Erro ao gerar imagem. Tente novamente.' });
    } finally {
      setIsRegenerating(false);
    }
  };

  const TabButton = ({ 
    id, 
    label, 
    count, 
    icon 
  }: { 
    id: 'preview' | 'text' | 'images' | 'shapes' | 'properties'; 
    label: string; 
    count?: number; 
    icon: string;
  }) => {
    const isActive = activeTab === id;
    
    return (
      <button
        className="tab-button"
        onClick={() => setActiveTab(id)}
        style={{
          padding: '12px 16px',
          margin: '0 2px',
          border: 'none',
          borderRadius: '12px 12px 0 0',
          backgroundColor: isActive ? '#ffffff' : 'transparent',
          color: isActive ? '#1f2937' : '#6b7280',
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: isActive ? '700' : '500',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          minWidth: '80px',
          position: 'relative',
          boxShadow: isActive ? '0 -2px 8px rgba(0,0,0,0.1)' : 'none',
          transform: isActive ? 'translateY(-2px)' : 'translateY(0)',
          scrollSnapAlign: 'start',
          flexShrink: 0,
          ...(isActive && {
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          })
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.8)';
            e.currentTarget.style.transform = 'translateY(-1px) scale(1.02)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
            // Icon animation
            const icon = e.currentTarget.querySelector('.tab-icon');
            if (icon) icon.style.transform = 'scale(1.15)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = 'none';
            // Icon animation reset
            const icon = e.currentTarget.querySelector('.tab-icon');
            if (icon) icon.style.transform = 'scale(1)';
          }
        }}
      >
        {/* Icon with animation */}
        <div className="tab-icon" style={{
          fontSize: '1.2rem',
          transition: 'transform 0.2s ease',
          transform: isActive ? 'scale(1.1)' : 'scale(1)'
        }}>
          {icon}
        </div>
        
        {/* Label - responsive */}
        <div className="tab-label" style={{
          fontSize: '0.75rem',
          fontWeight: isActive ? '600' : '500',
          textAlign: 'center',
          lineHeight: '1.2',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '100px'
        }}>
          {label}
        </div>
        
        {/* Count badge */}
        {count !== undefined && count > 0 && (
          <div className="tab-count-badge" style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            backgroundColor: isActive ? '#ef4444' : '#6b7280',
            color: '#fff',
            borderRadius: '10px',
            width: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.65rem',
            fontWeight: '700',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            animation: isActive ? 'pulse 2s infinite' : 'none',
            transition: 'all 0.2s ease'
          }}>
            {count > 99 ? '99+' : count}
          </div>
        )}
        
        {/* Active indicator */}
        {isActive && (
          <div style={{
            position: 'absolute',
            bottom: '0',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '40px',
            height: '3px',
            background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
            borderRadius: '2px 2px 0 0'
          }} />
        )}
      </button>
    );
  };

  return (
    <>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '1.5rem 2rem',
        borderBottom: '1px solid #e2e8f0',
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <button
          onClick={() => resetState()}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem',
            padding: '12px 20px',
            border: 'none',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            color: '#ffffff',
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: '600',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(239, 68, 68, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.4)';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(0.98)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
          }}
        >
          <div style={{
            width: '20px',
            height: '20px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem'
          }}>
            ←
          </div>
          <span>Analisar Novo Arquivo</span>
          <div style={{
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
            transition: 'left 0.6s ease',
            pointerEvents: 'none'
          }} 
          onAnimationEnd={() => {
            // Reset shine effect
          }}
          />
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.9rem', color: '#666' }}>
            Tempo de processamento: {inferenceTime.toFixed(2)}s
          </span>
          {warnings.length > 0 && (
            <span style={{ 
              backgroundColor: '#fff3cd', 
              color: '#856404', 
              padding: '0.25rem 0.5rem', 
              borderRadius: '4px',
              fontSize: '0.85rem'
            }}>
              {warnings.length} Aviso{warnings.length > 1 ? 's' : ''}
            </span>
          )}
          {errors.length > 0 && (
            <span style={{ 
              backgroundColor: '#f8d7da', 
              color: '#721c24', 
              padding: '0.25rem 0.5rem', 
              borderRadius: '4px',
              fontSize: '0.85rem'
            }}>
              {errors.length} Erro{errors.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: '0' }}>
        {/* Modern Tab Navigation */}
        <div style={{ 
          background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
          borderBottom: '1px solid #cbd5e1',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <style>
            {`
              @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
              }
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
              @keyframes float {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-10px); }
              }
              @media (max-width: 768px) {
                .tab-container {
                  justify-content: flex-start !important;
                  padding-bottom: 4px !important;
                }
                .tab-button {
                  min-width: 60px !important;
                  padding: 8px 12px !important;
                }
                .tab-icon {
                  font-size: 1rem !important;
                }
                .tab-label {
                  font-size: 0.65rem !important;
                  max-width: 80px !important;
                }
                .action-buttons {
                  flex-direction: column !important;
                  gap: 4px !important;
                  align-items: stretch !important;
                }
                .action-button {
                  padding: 8px 12px !important;
                  font-size: 0.75rem !important;
                }
              }
              @media (max-width: 480px) {
                .tab-button {
                  min-width: 50px !important;
                  padding: 6px 8px !important;
                }
                .tab-label {
                  display: none !important;
                }
                .tab-count-badge {
                  top: -2px !important;
                  right: -2px !important;
                  width: 16px !important;
                  height: 16px !important;
                  font-size: 0.6rem !important;
                }
              }
            `}
          </style>
          <div style={{ 
            display: 'flex', 
            padding: '0 1.5rem',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            minHeight: '60px'
          }}>
            {/* Tab Container with responsive overflow */}
            <div className="tab-container" style={{ 
              display: 'flex',
              flex: 1,
              overflowX: 'auto',
              overflowY: 'hidden',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              gap: '4px',
              paddingBottom: '0',
              scrollSnapType: 'x mandatory'
            }} 
            onScroll={(e) => {
              const container = e.target as HTMLDivElement;
              const scrollIndicator = container.nextElementSibling as HTMLDivElement;
              if (scrollIndicator) {
                const scrollPercentage = container.scrollLeft / (container.scrollWidth - container.clientWidth);
                scrollIndicator.style.opacity = container.scrollWidth > container.clientWidth ? '1' : '0';
              }
            }}
            >
              <TabButton 
                id="preview" 
                label="Preview" 
                icon="🖼️"
              />
              <TabButton 
                id="text" 
                label="Textos" 
                count={result.textElements.length}
                icon="📝"
              />
              <TabButton 
                id="images" 
                label="Imagens" 
                count={result.imageElements.length}
                icon="🎞️"
              />
              <TabButton 
                id="shapes" 
                label="Formas" 
                count={result.shapeElements.length}
                icon="🎨"
              />
              <TabButton 
                id="properties" 
                label="Editor" 
                icon="⚙️"
              />
            </div>
            
            {/* Scroll indicator */}
            <div style={{
              width: '20px',
              height: '2px',
              background: 'linear-gradient(90deg, #3b82f6, transparent)',
              opacity: 0,
              transition: 'opacity 0.3s ease',
              alignSelf: 'flex-end',
              marginBottom: '8px',
              borderRadius: '1px'
            }} />
            
            {/* Action Buttons */}
            <div className="action-buttons" style={{ 
              display: 'flex', 
              gap: '8px',
              alignItems: 'center',
              paddingBottom: '8px'
            }}>
              <button
                className="action-button"
                onClick={handleRegenerateImage}
                disabled={isRegenerating || isProcessing}
                style={{
                  padding: '10px 20px',
                  background: isRegenerating || isProcessing 
                    ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: isRegenerating || isProcessing ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: isRegenerating || isProcessing 
                    ? 'none' 
                    : '0 4px 12px rgba(16, 185, 129, 0.4)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: isRegenerating || isProcessing ? 'scale(0.95)' : 'scale(1)',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  if (!(isRegenerating || isProcessing)) {
                    e.currentTarget.style.transform = 'scale(1.02) translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!(isRegenerating || isProcessing)) {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
                  }
                }}
              >
                <span style={{
                  fontSize: '1rem',
                  animation: isRegenerating || isProcessing ? 'spin 1s linear infinite' : 'none'
                }}>
                  {isRegenerating || isProcessing ? '⏳' : '🚀'}
                </span>
                <span>
                  {isRegenerating || isProcessing ? 'Gerando...' : 'Gerar PNG'}
                </span>
              </button>
              
              <button
                className="action-button"
                onClick={handleAiReposition}
                disabled={isAiRepositioning || isRegenerating || isProcessing}
                style={{
                  background: isAiRepositioning 
                    ? 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)' 
                    : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px 16px',
                  cursor: isAiRepositioning ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: isAiRepositioning 
                    ? 'none' 
                    : '0 4px 12px rgba(139, 92, 246, 0.4)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: isAiRepositioning ? 'scale(0.95)' : 'scale(1)',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  if (!isAiRepositioning) {
                    e.currentTarget.style.transform = 'scale(1.02) translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(139, 92, 246, 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isAiRepositioning) {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.4)';
                  }
                }}
              >
                <span style={{
                  fontSize: '1rem',
                  animation: isAiRepositioning ? 'spin 1s linear infinite' : 'none'
                }}>
                  {isAiRepositioning ? '🔄' : '🤖'}
                </span>
                <span>
                  {isAiRepositioning ? 'Analisando...' : 'IA Textos'}
                </span>
              </button>
              
              <button
                className="action-button"
                onClick={() => {
                  console.log('Download button clicked, imageUrl:', result.imageUrl);
                  // Create a temporary link element to trigger download
                  const link = document.createElement('a');
                  link.href = result.imageUrl;
                  link.download = `${currentFile?.name?.replace('.psd', '') || 'image'}_edited.png`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  console.log('Download initiated for:', link.download);
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(0, 123, 255, 0.4)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02) translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 123, 255, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 123, 255, 0.4)';
                }}
              >
                <span>💾</span>
                <span>Download Imagem</span>
              </button>
            </div>
          </div>
        </div>

        <div style={{ 
          padding: '2rem 1rem', 
          maxWidth: '1400px', 
          margin: '0 auto',
          minHeight: 'calc(100vh - 200px)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '2rem',
            padding: '1.5rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '16px',
            color: '#fff',
            boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)'
          }}>
            <div style={{ fontSize: '2rem' }}>📄</div>
            <div>
              <h2 style={{ 
                margin: 0, 
                fontSize: '1.8rem',
                fontWeight: '700',
                textShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}>
                Editor PSD: &quot;{currentFile?.name}&quot;
              </h2>
              <p style={{
                margin: '0.5rem 0 0 0',
                fontSize: '1rem',
                opacity: 0.9,
                fontWeight: '400'
              }}>
                Explore e edite os elementos encontrados no arquivo PSD
              </p>
            </div>
          </div>

          {activeTab === 'preview' && (
            <div style={{ 
              backgroundColor: '#fff', 
              borderRadius: '20px', 
              padding: '2.5rem',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
              border: '1px solid #f0f0f0',
              background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '2rem'
              }}>
                <div style={{
                  width: '4px',
                  height: '40px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '2px'
                }} />
                <h3 style={{ 
                  margin: 0, 
                  color: '#1a1a1a', 
                  fontSize: '1.5rem',
                  fontWeight: '700'
                }}>
                  Preview da Imagem
                </h3>
              </div>
              <div style={{ 
                border: '2px dashed #e2e8f0', 
                borderRadius: '16px', 
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '500px',
                position: 'relative',
                transition: 'all 0.3s ease'
              }}>
                <img
                  src={result.imageUrl}
                  alt="Resultado Atual"
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '700px', 
                    height: 'auto',
                    borderRadius: '12px',
                    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.12)',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    cursor: 'zoom-in'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.12)';
                  }}
                />
              </div>

              {/* Seção de Variações Geradas com IA */}
              {generatedAiImages.length > 0 && (
                <div style={{
                  marginTop: '2rem',
                  padding: '24px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '16px',
                  border: '2px solid #e2e8f0'
                }}>
                  <h3 style={{
                    margin: '0 0 16px 0',
                    color: '#1a202c',
                    fontSize: '1.25rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    ✨ {generatedAiImages.length} Variações Geradas com IA
                  </h3>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: generatedAiImages.length === 1 ? '1fr' : 
                                       generatedAiImages.length === 2 ? 'repeat(2, 1fr)' :
                                       'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '20px',
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    padding: '16px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
                  }}>
                    {generatedAiImages.map((imageUrl, index) => (
                      <div key={index} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <div style={{
                          position: 'relative',
                          width: '100%'
                        }}>
                          <img
                            src={imageUrl}
                            alt={`Variação ${index + 1} Gerada com IA`}
                            style={{
                              width: '100%',
                              height: 'auto',
                              maxHeight: '300px',
                              objectFit: 'contain',
                              borderRadius: '8px',
                              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)'
                            }}
                          />
                          <div style={{
                            position: 'absolute',
                            top: '8px',
                            left: '8px',
                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: '600'
                          }}>
                            Variação {index + 1}
                          </div>
                        </div>
                        
                        <button
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = imageUrl;
                            link.download = `${currentFile?.name?.replace('.psd', '') || 'image'}_ai_variation_${index + 1}.png`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          style={{
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            width: 'fit-content'
                          }}
                        >
                          Baixar
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <div style={{
                    marginTop: '16px',
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'center'
                  }}>
                    <button
                      onClick={() => {
                        setGeneratedAiImages([]);
                        setGeneratedAiImage(null);
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>🗑️</span>
                      <span>Remover</span>
                    </button>
                  </div>
                </div>
              )}

              <div style={{ 
                marginTop: '2rem',
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%)',
                borderRadius: '12px',
                border: '1px solid #bfdbfe',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.1)'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem',
                  marginBottom: '1rem'
                }}>
                  <div style={{
                    backgroundColor: '#3b82f6',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem'
                  }}>
                    💡
                  </div>
                  <strong style={{ color: '#1e40af', fontSize: '1.1rem' }}>
                    Como usar o editor
                  </strong>
                </div>
                <ul style={{ 
                  margin: 0,
                  paddingLeft: '1.5rem',
                  color: '#1e40af',
                  lineHeight: '1.6'
                }}>
                  <li>Clique nas abas para editar diferentes elementos</li>
                  <li>Faça suas alterações nos textos, cores e propriedades</li>
                  <li>Clique em "Gerar Nova Imagem" para ver o resultado</li>
                  <li>Use os botões de visibilidade para mostrar/ocultar elementos</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'text' && (
            <div style={{
              backgroundColor: '#fff',
              borderRadius: '20px',
              padding: '2rem',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
              border: '1px solid #f0f0f0'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '2rem'
              }}>
                <div style={{
                  width: '4px',
                  height: '40px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  borderRadius: '2px'
                }} />
                <h3 style={{ 
                  margin: 0, 
                  color: '#1a1a1a', 
                  fontSize: '1.5rem',
                  fontWeight: '700'
                }}>
                  Elementos de Texto ({result.textElements.length})
                </h3>
              </div>
              
              {result.textElements.length > 0 ? (
                <NoSSRWrapper>
                  <div>
                    {result.textElements.map((element) => (
                      <AdvancedTextEditor
                        key={element.id}
                        element={element}
                        onUpdate={updateTextElement}
                      />
                    ))}
                  </div>
                </NoSSRWrapper>
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  color: '#6b7280', 
                  padding: '4rem 2rem',
                  background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                  borderRadius: '20px',
                  border: '2px dashed #d1d5db',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    fontSize: '4rem', 
                    marginBottom: '1.5rem',
                    opacity: 0.8,
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                    animation: 'float 3s ease-in-out infinite'
                  }}>📝</div>
                  <p style={{ 
                    fontSize: '1.4rem', 
                    fontWeight: '700',
                    marginBottom: '0.75rem',
                    color: '#374151'
                  }}>
                    Nenhum elemento de texto encontrado
                  </p>
                  <p style={{ 
                    fontSize: '1rem',
                    color: '#6b7280',
                    lineHeight: '1.6',
                    maxWidth: '400px',
                    margin: '0 auto'
                  }}>
                    Este arquivo PSD não contém elementos de texto editáveis. Tente usar um arquivo com camadas de texto.
                  </p>
                  <div style={{
                    position: 'absolute',
                    top: '-50px',
                    left: '-50px',
                    width: '100px',
                    height: '100px',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    borderRadius: '50%',
                    opacity: 0.1,
                    animation: 'pulse 4s infinite'
                  }} />
                  <div style={{
                    position: 'absolute',
                    bottom: '-30px',
                    right: '-30px',
                    width: '60px',
                    height: '60px',
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    borderRadius: '50%',
                    opacity: 0.1,
                    animation: 'pulse 3s infinite 1s'
                  }} />
                </div>
              )}
            </div>
          )}

          {activeTab === 'images' && (
            <div style={{
              backgroundColor: '#fff',
              borderRadius: '20px',
              padding: '2rem',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
              border: '1px solid #f0f0f0'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '2rem'
              }}>
                <div style={{
                  width: '4px',
                  height: '40px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  borderRadius: '2px'
                }} />
                <h3 style={{ 
                  margin: 0, 
                  color: '#1a1a1a', 
                  fontSize: '1.5rem',
                  fontWeight: '700'
                }}>
                  Elementos de Imagem ({result.imageElements.length})
                </h3>
              </div>
              
              {result.imageElements.length > 0 ? (
                <div>
                  {result.imageElements.map((element) => (
                    <div key={element.id} style={{
                      backgroundColor: '#fff',
                      border: '2px solid #f0f0f0',
                      borderRadius: '12px',
                      padding: '16px',
                      marginBottom: '16px',
                      transition: 'all 0.3s ease'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '12px'
                      }}>
                        <h4 style={{
                          margin: 0,
                          color: '#1a1a1a',
                          fontSize: '1.1rem',
                          fontWeight: '600'
                        }}>
                          📷 {element.name || `Imagem #${element.id}`}
                        </h4>
                        <div style={{
                          fontSize: '0.8rem',
                          color: '#666',
                          background: '#f3f4f6',
                          padding: '4px 8px',
                          borderRadius: '6px'
                        }}>
                          ID: {element.id}
                        </div>
                      </div>
                      
                      {/* Debug info */}
                      <details style={{ marginBottom: '12px' }}>
                        <summary style={{
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          color: '#6b7280',
                          marginBottom: '8px'
                        }}>
                          🔍 Debug Info
                        </summary>
                        <div style={{
                          fontSize: '0.75rem',
                          color: '#6b7280',
                          backgroundColor: '#f9fafb',
                          padding: '8px',
                          borderRadius: '4px',
                          fontFamily: 'monospace'
                        }}>
                          <div><strong>Type:</strong> {typeof element}</div>
                          <div><strong>Fill:</strong> {element.fill ? JSON.stringify(element.fill).substring(0, 100) + '...' : 'undefined'}</div>
                          <div><strong>ImageUrl:</strong> {element.imageUrl ? 'Presente' : 'Ausente'}</div>
                          <div><strong>Visible:</strong> {element.visible ? 'true' : 'false'}</div>
                          <div><strong>Width:</strong> {element.width || 'undefined'}</div>
                          <div><strong>Height:</strong> {element.height || 'undefined'}</div>
                          <div><strong>Properties:</strong> {Object.keys(element).join(', ')}</div>
                        </div>
                      </details>

                      {/* Detectar se é realmente uma imagem ou shape */}
                      {(!element.imageUrl && !element.fill?.imageFileURI) && (
                        <div style={{
                          backgroundColor: '#fef3c7',
                          border: '1px solid #f59e0b',
                          borderRadius: '6px',
                          padding: '8px',
                          marginBottom: '12px'
                        }}>
                          <div style={{
                            fontSize: '0.8rem',
                            color: '#92400e',
                            fontWeight: '600',
                            marginBottom: '4px'
                          }}>
                            ⚠️ Este elemento parece ser uma FORMA, não uma imagem
                          </div>
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#b45309'
                          }}>
                            Elementos sem imageUrl ou imageFileURI são provavelmente shapes vetoriais que foram classificados incorretamente.
                          </div>
                          <button
                            onClick={() => {
                              console.log('Elemento classificado como shape:', element);
                              showToast({
                                type: 'info',
                                title: '💡 Elemento identificado como forma',
                                message: 'Este elemento deveria estar na aba "Formas" ao invés de "Imagens"'
                              });
                            }}
                            style={{
                              marginTop: '6px',
                              padding: '4px 8px',
                              fontSize: '0.75rem',
                              backgroundColor: '#f59e0b',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            📋 Log Details
                          </button>
                        </div>
                      )}
                      
                      {/* Upload de Imagem */}
                      <div style={{
                        border: '2px dashed #d1d5db',
                        borderRadius: '8px',
                        padding: '16px',
                        textAlign: 'center',
                        marginBottom: '12px',
                        background: uploadedImages[element.id] ? '#f0f9ff' : '#fafafa'
                      }}>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleImageUpload(element.id, file);
                            }
                          }}
                          style={{ display: 'none' }}
                          id={`upload-${element.id}`}
                          disabled={uploadingImages.has(element.id)}
                        />
                        <label
                          htmlFor={`upload-${element.id}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            backgroundColor: uploadingImages.has(element.id) 
                              ? '#9ca3af' 
                              : uploadedImages[element.id] 
                                ? '#10b981'
                                : '#3b82f6',
                            color: 'white',
                            borderRadius: '6px',
                            cursor: uploadingImages.has(element.id) ? 'not-allowed' : 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          <span>
                            {uploadingImages.has(element.id) 
                              ? '🔄' 
                              : uploadedImages[element.id] 
                                ? '✅'
                                : '📤'}
                          </span>
                          <span>
                            {uploadingImages.has(element.id) 
                              ? 'Carregando...' 
                              : uploadedImages[element.id] 
                                ? 'Imagem Carregada'
                                : 'Fazer Upload de Imagem'}
                          </span>
                        </label>
                        
                        {uploadedImages[element.id] && (
                          <div style={{
                            marginTop: '8px',
                            fontSize: '0.75rem',
                            color: '#059669'
                          }}>
                            ✅ Nova imagem será aplicada no elemento
                          </div>
                        )}
                      </div>

                      {/* Controles adicionais usando AdvancedImageEditor */}
                      <details style={{ marginTop: '12px' }}>
                        <summary style={{
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: '#4b5563',
                          padding: '4px 0'
                        }}>
                          ⚙️ Controles Avançados
                        </summary>
                        <div style={{ marginTop: '8px' }}>
                          <NoSSRWrapper>
                            <AdvancedImageEditor
                              element={element}
                              onUpdate={updateImageElement}
                            />
                          </NoSSRWrapper>
                        </div>
                      </details>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  color: '#6b7280', 
                  padding: '4rem 2rem',
                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                  borderRadius: '20px',
                  border: '2px dashed #f59e0b',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    fontSize: '4rem', 
                    marginBottom: '1.5rem',
                    opacity: 0.8,
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                    animation: 'float 3s ease-in-out infinite'
                  }}>🖼️</div>
                  <p style={{ 
                    fontSize: '1.4rem', 
                    fontWeight: '700',
                    marginBottom: '0.75rem',
                    color: '#92400e'
                  }}>
                    Nenhum elemento de imagem encontrado
                  </p>
                  <p style={{ 
                    fontSize: '1rem',
                    color: '#a16207',
                    lineHeight: '1.6',
                    maxWidth: '400px',
                    margin: '0 auto'
                  }}>
                    Este arquivo PSD não contém imagens editáveis. Tente usar um arquivo com camadas de imagem.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'shapes' && (
            <div style={{
              backgroundColor: '#fff',
              borderRadius: '20px',
              padding: '2rem',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
              border: '1px solid #f0f0f0'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '2rem'
              }}>
                <div style={{
                  width: '4px',
                  height: '40px',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  borderRadius: '2px'
                }} />
                <h3 style={{ 
                  margin: 0, 
                  color: '#1a1a1a', 
                  fontSize: '1.5rem',
                  fontWeight: '700'
                }}>
                  Elementos de Forma ({result.shapeElements.length})
                </h3>
              </div>
              
              {result.shapeElements.length > 0 ? (
                <NoSSRWrapper>
                  <div>
                    {result.shapeElements.map((element) => (
                      <EditableShapeElement
                        key={element.id}
                        element={element}
                        onUpdate={updateShapeElement}
                      />
                    ))}
                  </div>
                </NoSSRWrapper>
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  color: '#6b7280', 
                  padding: '4rem 2rem',
                  background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
                  borderRadius: '20px',
                  border: '2px dashed #8b5cf6',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    fontSize: '4rem', 
                    marginBottom: '1.5rem',
                    opacity: 0.8,
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                    animation: 'float 3s ease-in-out infinite'
                  }}>🎨</div>
                  <p style={{ 
                    fontSize: '1.4rem', 
                    fontWeight: '700',
                    marginBottom: '0.75rem',
                    color: '#6b21a8'
                  }}>
                    Nenhum elemento de forma encontrado
                  </p>
                  <p style={{ 
                    fontSize: '1rem',
                    color: '#7c3aed',
                    lineHeight: '1.6',
                    maxWidth: '400px',
                    margin: '0 auto'
                  }}>
                    Este arquivo PSD não contém formas editáveis. Tente usar um arquivo com elementos de forma.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'properties' && (
            <div style={{ 
              backgroundColor: '#fff', 
              borderRadius: '20px', 
              padding: '2.5rem',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
              border: '1px solid #f0f0f0',
              minHeight: '700px',
              background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '2rem'
              }}>
                <div style={{
                  width: '4px',
                  height: '40px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  borderRadius: '2px'
                }} />
                <h3 style={{ 
                  margin: 0, 
                  color: '#1a1a1a', 
                  fontSize: '1.5rem',
                  fontWeight: '700'
                }}>
                  Editor Avançado de Propriedades
                </h3>
              </div>
              <NoSSRWrapper>
                <PropertyEditor
                  elements={[...result.textElements, ...result.imageElements, ...result.shapeElements]}
                  onElementUpdate={updateElement}
                  onGenerateImage={handleRegenerateImage}
                />
              </NoSSRWrapper>
            </div>
          )}

          {/* Additional Information */}
          {(errors.length > 0 || warnings.filter(w => !w.includes("Could not find a typeface")).length > 0) && (
            <div style={{ 
              backgroundColor: '#fff', 
              borderRadius: '12px', 
              padding: '1.5rem',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              marginTop: '2rem'
            }}>
              <h3 style={{ marginBottom: '1rem', color: '#333' }}>Mensagens do Sistema</h3>
              {errors.map((error, index) => (
                <div key={index} style={{ 
                  marginBottom: '0.5rem',
                  padding: '0.75rem',
                  backgroundColor: '#f8d7da',
                  color: '#721c24',
                  borderRadius: '6px',
                  border: '1px solid #f5c6cb'
                }}>
                  <strong>Erro:</strong> {error}
                </div>
              ))}
              {warnings.filter(w => !w.includes("Could not find a typeface")).map((warning, index) => (
                <div key={index} style={{ 
                  marginBottom: '0.5rem',
                  padding: '0.75rem',
                  backgroundColor: '#fff3cd',
                  color: '#856404',
                  borderRadius: '6px',
                  border: '1px solid #ffeaa7'
                }}>
                  <strong>Aviso:</strong> {warning}
                </div>
              ))}
            </div>
          )}

          {/* AI Responses Section */}
          {aiResponses.length > 0 && (
            <div style={{ 
              backgroundColor: '#fff', 
              borderRadius: '12px', 
              padding: '1.5rem',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              marginTop: '1rem'
            }}>
              <h3 style={{ 
                marginBottom: '1rem', 
                color: '#333',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                🤖 Análises da Inteligência Artificial
              </h3>
              {aiResponses.map((response, index) => {
                const isPromptExpanded = expandedPrompts.has(index);
                
                return (
                  <div key={index} style={{ 
                    marginBottom: '1rem',
                    padding: '1rem',
                    backgroundColor: '#f8f9ff',
                    color: '#1e293b',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    borderLeft: '4px solid #8b5cf6'
                  }}>
                    <div style={{ 
                      fontSize: '0.875rem',
                      color: '#64748b',
                      marginBottom: '12px',
                      fontWeight: '500'
                    }}>
                      📅 {response.timestamp}
                    </div>
                    
                    {/* AI Response */}
                    <div style={{ 
                      lineHeight: '1.6',
                      fontSize: '0.95rem',
                      marginBottom: '12px'
                    }}>
                      <strong>💭 Análise da IA:</strong> {response.reasoning}
                    </div>
                    
                    {/* Prompt Section */}
                    <div style={{ 
                      borderTop: '1px solid #e2e8f0',
                      paddingTop: '12px'
                    }}>
                      <button
                        onClick={() => {
                          const newExpanded = new Set(expandedPrompts);
                          if (isPromptExpanded) {
                            newExpanded.delete(index);
                          } else {
                            newExpanded.add(index);
                          }
                          setExpandedPrompts(newExpanded);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#8b5cf6',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 0',
                          marginBottom: '8px'
                        }}
                      >
                        <span>{isPromptExpanded ? '🔽' : '▶️'}</span>
                        📝 Prompt Enviado para OpenAI
                      </button>
                      
                      {isPromptExpanded && (
                        <div style={{
                          backgroundColor: '#1f2937',
                          color: '#f9fafb',
                          padding: '12px',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontFamily: 'monospace',
                          whiteSpace: 'pre-wrap',
                          lineHeight: '1.5',
                          maxHeight: '300px',
                          overflowY: 'auto',
                          border: '1px solid #374151'
                        }}>
                          {response.prompt}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div style={{
                marginTop: '1rem',
                padding: '0.75rem',
                backgroundColor: '#f0f8ff',
                borderRadius: '6px',
                fontSize: '0.85rem',
                color: '#0066cc',
                border: '1px solid #b3d9ff'
              }}>
                ℹ️ Estas análises foram geradas pela IA para explicar as decisões de reposicionamento dos elementos.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Text Modal */}
      {showAiModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '800px',
            maxHeight: '80vh',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            overflowY: 'auto'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
              borderBottom: '1px solid #e5e7eb',
              paddingBottom: '16px'
            }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: '#1f2937',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                🤖 Editor de Textos IA
              </h2>
              <button
                onClick={() => setShowAiModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '4px',
                  borderRadius: '4px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                ✕
              </button>
            </div>

            {/* Property Profile Section */}
            <div style={{
              backgroundColor: '#f0f8ff',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
              border: '1px solid #bfdbfe'
            }}>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#1e40af',
                margin: '0 0 16px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {isDetectingProfile ? '🔍 Detectando Perfil...' : '🏢 Perfil do Imóvel'}
                {isDetectingProfile && (
                  <span style={{
                    fontSize: '0.75rem',
                    color: '#3b82f6',
                    fontWeight: '400',
                    marginLeft: '8px'
                  }}>
                    (analisando textos)
                  </span>
                )}
              </h3>
              
              <div style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '16px',
                flexWrap: 'wrap'
              }}>
                {(['baixo', 'medio', 'alto'] as const).map((profile) => (
                  <label key={profile} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '2px solid',
                    borderColor: selectedProfile === profile ? '#3b82f6' : '#e5e7eb',
                    backgroundColor: selectedProfile === profile ? '#dbeafe' : '#ffffff',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}>
                    <input
                      type="radio"
                      name="profile"
                      value={profile}
                      checked={selectedProfile === profile}
                      onChange={(e) => {
                        setSelectedProfile(e.target.value as typeof profile);
                        setProfileDetectedAutomatically(false); // Reset automatic detection flag
                      }}
                      style={{ margin: 0 }}
                    />
                    <span style={{ textTransform: 'capitalize' }}>
                      {profile === 'baixo' && '💰'} 
                      {profile === 'medio' && '🏠'} 
                      {profile === 'alto' && '✨'} 
                      {profile} Padrão
                      {selectedProfile === profile && profileDetectedAutomatically && (
                        <span style={{
                          fontSize: '0.7rem',
                          color: '#10b981',
                          fontWeight: '600',
                          marginLeft: '4px',
                          backgroundColor: '#d1fae5',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>
                          IA
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </div>

              {/* Seção de Estilo de Geração */}
              <h3 style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: '#1f2937',
                margin: '24px 0 16px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                🎨 Estilo de Geração
              </h3>
              
              <div style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '20px',
                flexWrap: 'wrap'
              }}>
                {(['conservador', 'moderado', 'radical'] as const).map((style) => (
                  <label key={style} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '2px solid',
                    borderColor: generationStyle === style ? '#8b5cf6' : '#e5e7eb',
                    backgroundColor: generationStyle === style ? '#f3e8ff' : '#ffffff',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    transition: 'all 0.2s ease',
                    minWidth: '120px'
                  }}>
                    <input
                      type="radio"
                      name="generationStyle"
                      value={style}
                      checked={generationStyle === style}
                      onChange={(e) => setGenerationStyle(e.target.value as typeof style)}
                      style={{ margin: 0 }}
                    />
                    <span style={{ textTransform: 'capitalize', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {style === 'conservador' && '🛡️'} 
                        {style === 'moderado' && '⚖️'} 
                        {style === 'radical' && '🔥'} 
                        {style}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '2px' }}>
                        {style === 'conservador' && 'Mudanças sutis'} 
                        {style === 'moderado' && 'Equilibrio visual'} 
                        {style === 'radical' && 'Transformação total'} 
                      </span>
                    </span>
                  </label>
                ))}
              </div>

              <button
                onClick={generateColorPalettes}
                disabled={isGeneratingPalettes}
                style={{
                  background: isGeneratingPalettes
                    ? 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)'
                    : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  cursor: isGeneratingPalettes ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (!isGeneratingPalettes) {
                    e.currentTarget.style.transform = 'scale(1.02)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isGeneratingPalettes) {
                    e.currentTarget.style.transform = 'scale(1)';
                  }
                }}
              >
                <span style={{
                  animation: isGeneratingPalettes ? 'spin 1s linear infinite' : 'none'
                }}>
                  {isGeneratingPalettes ? '🔄' : '🎨'}
                </span>
                <span>
                  {isGeneratingPalettes ? 'Gerando Paletas...' : 'Gerar Paletas de Cores IA'}
                </span>
              </button>
            </div>

            {/* Color Palettes Section */}
            {colorPalettes.length > 0 && (
              <div style={{
                backgroundColor: '#fefefe',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '24px',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px'
                }}>
                  <h3 style={{
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: '#1f2937',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    🎨 Paletas Recomendadas ({selectedProfile} padrão)
                  </h3>
                  <button
                    onClick={generateColorPalettes}
                    disabled={isGeneratingPalettes}
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    🔄 Gerar Outras
                  </button>
                </div>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '16px'
                }}>
                  {colorPalettes.map((palette, index) => (
                    <div 
                      key={index} 
                      onClick={() => setSelectedPaletteIndex(index)}
                      style={{
                        border: selectedPaletteIndex === index ? '3px solid #3b82f6' : '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '16px',
                        backgroundColor: selectedPaletteIndex === index ? '#f0f8ff' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        position: 'relative'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedPaletteIndex !== index) {
                          e.currentTarget.style.borderColor = '#9ca3af';
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedPaletteIndex !== index) {
                          e.currentTarget.style.borderColor = '#e5e7eb';
                          e.currentTarget.style.backgroundColor = '#ffffff';
                        }
                      }}
                    >
                      {selectedPaletteIndex === index && (
                        <div style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          backgroundColor: '#3b82f6',
                          color: '#ffffff',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.875rem',
                          fontWeight: 'bold'
                        }}>
                          ✓
                        </div>
                      )}
                      
                      <h4 style={{
                        fontSize: '1rem',
                        fontWeight: '600',
                        color: selectedPaletteIndex === index ? '#1e40af' : '#1f2937',
                        margin: '0 0 8px 0'
                      }}>
                        {palette.name}
                      </h4>
                      
                      <div style={{
                        display: 'flex',
                        gap: '4px',
                        marginBottom: '12px'
                      }}>
                        {palette.colors.map((color: string, colorIndex: number) => (
                          <div key={colorIndex} style={{
                            width: '40px',
                            height: '40px',
                            backgroundColor: color,
                            borderRadius: '6px',
                            border: '2px solid #ffffff',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
                            position: 'relative',
                            cursor: 'pointer'
                          }} title={color}>
                            <div style={{
                              position: 'absolute',
                              bottom: '-18px',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              fontSize: '0.65rem',
                              color: '#6b7280',
                              whiteSpace: 'nowrap',
                              fontFamily: 'monospace'
                            }}>
                              {color}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <p style={{
                        fontSize: '0.8rem',
                        color: '#4b5563',
                        lineHeight: '1.4',
                        margin: '8px 0'
                      }}>
                        <strong>Descrição:</strong> {palette.description}
                      </p>
                      
                      <p style={{
                        fontSize: '0.75rem',
                        color: '#6b7280',
                        lineHeight: '1.3',
                        margin: '4px 0 0 0'
                      }}>
                        <strong>Como usar:</strong> {palette.usage}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Text Elements List */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              {textElements.map((element, index) => (
                <div key={element.id} style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '16px',
                  backgroundColor: '#f9fafb'
                }}>
                  {/* Element Info */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '12px'
                  }}>
                    <div>
                      <div style={{
                        fontSize: '0.875rem',
                        color: '#6b7280',
                        marginBottom: '4px'
                      }}>
                        <strong>ID:</strong> {element.id} | <strong>Nome:</strong> {element.name}
                      </div>
                      <div style={{
                        fontSize: '1rem',
                        color: '#1f2937',
                        lineHeight: '1.5',
                        padding: '8px 12px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        minHeight: '40px'
                      }}>
                        "{element.text}"
                      </div>
                    </div>
                  </div>

                  {/* Controls */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '12px'
                  }}>
                    {/* Fixed Checkbox */}
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      color: '#374151'
                    }}>
                      <input
                        type="checkbox"
                        checked={fixedElements.has(element.id)}
                        onChange={() => toggleFixedElement(element.id)}
                        style={{
                          width: '16px',
                          height: '16px',
                          cursor: 'pointer'
                        }}
                      />
                      <span>🔒 Fixo (não alterar)</span>
                    </label>

                    {/* AI Generate Button */}
                    <button
                      onClick={() => handleGenerateIndividualText(element)}
                      disabled={processingTextId === element.id || fixedElements.has(element.id)}
                      style={{
                        background: processingTextId === element.id
                          ? 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)'
                          : fixedElements.has(element.id)
                          ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                          : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        cursor: (processingTextId === element.id || fixedElements.has(element.id))
                          ? 'not-allowed'
                          : 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!(processingTextId === element.id || fixedElements.has(element.id))) {
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!(processingTextId === element.id || fixedElements.has(element.id))) {
                          e.currentTarget.style.transform = 'scale(1)';
                        }
                      }}
                    >
                      <span style={{
                        animation: processingTextId === element.id ? 'spin 1s linear infinite' : 'none'
                      }}>
                        {processingTextId === element.id ? '🔄' : '🤖'}
                      </span>
                      <span>
                        {processingTextId === element.id ? 'Gerando...' : 'Gerar IA'}
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Apply Changes Button */}
            <div style={{
              marginTop: '32px',
              padding: '24px',
              backgroundColor: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              textAlign: 'center'
            }}>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#1f2937',
                margin: '0 0 12px 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}>
                🎯 Aplicar Mudanças no PSD
              </h3>
              
              <p style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                margin: '0 0 20px 0',
                lineHeight: '1.5'
              }}>
                Aplicará os textos gerados pela IA e as cores da paleta selecionada nos elementos gráficos, 
                regenerando automaticamente o preview da imagem.
              </p>
              
              {/* Botão de Preview */}
              <button
                onClick={generateElementPreview}
                disabled={!colorPalettes.length || selectedPaletteIndex === null}
                style={{
                  background: (!colorPalettes.length || selectedPaletteIndex === null)
                    ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                    : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px 24px',
                  cursor: (!colorPalettes.length || selectedPaletteIndex === null) ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.3s ease',
                  margin: '0 auto 16px auto',
                  boxShadow: (!colorPalettes.length || selectedPaletteIndex === null) 
                    ? 'none'
                    : '0 4px 12px rgba(59, 130, 246, 0.4)'
                }}
                onMouseEnter={(e) => {
                  if (colorPalettes.length && selectedPaletteIndex !== null) {
                    e.currentTarget.style.transform = 'scale(1.05) translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (colorPalettes.length && selectedPaletteIndex !== null) {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
                  }
                }}
              >
                <span>🔍</span>
                <span>Ver Preview de Elementos</span>
              </button>
              
              {/* Campo opcional para instruções adicionais */}
              <div style={{ margin: '16px 0' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  🎯 Instruções Adicionais para IA (Opcional)
                </label>
                <textarea
                  value={aiPromptAddition}
                  onChange={(e) => setAiPromptAddition(e.target.value)}
                  placeholder="Ex: Manter gradientes suaves, usar tons mais vibrantes, preservar sombras..."
                  style={{
                    width: '100%',
                    minHeight: '80px',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.2s ease',
                    backgroundColor: '#fafafa'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.backgroundColor = '#ffffff';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.backgroundColor = '#fafafa';
                  }}
                />
                <div style={{
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  marginTop: '4px'
                }}>
                  💡 A IA manterá textos e posições automaticamente. Use este campo para ajustes específicos.
                </div>
              </div>
              
              {/* Botão para gerar imagem com IA */}
              <button
                onClick={generateAiImage}
                disabled={isGeneratingAiImage || !colorPalettes.length || selectedPaletteIndex === null}
                style={{
                  background: isGeneratingAiImage
                    ? 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)'
                    : (!colorPalettes.length || selectedPaletteIndex === null)
                    ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                    : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 32px',
                  cursor: (isGeneratingAiImage || !colorPalettes.length || selectedPaletteIndex === null)
                    ? 'not-allowed'
                    : 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.3s ease',
                  margin: '0 auto 16px auto',
                  boxShadow: (isGeneratingAiImage || !colorPalettes.length || selectedPaletteIndex === null)
                    ? 'none'
                    : '0 4px 12px rgba(139, 92, 246, 0.4)'
                }}
                onMouseEnter={(e) => {
                  if (!(isGeneratingAiImage || !colorPalettes.length || selectedPaletteIndex === null)) {
                    e.currentTarget.style.transform = 'scale(1.05) translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(139, 92, 246, 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!(isGeneratingAiImage || !colorPalettes.length || selectedPaletteIndex === null)) {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.4)';
                  }
                }}
              >
                <span style={{
                  fontSize: '1.2rem',
                  animation: isGeneratingAiImage ? 'spin 1s linear infinite' : 'none'
                }}>
                  {isGeneratingAiImage ? '🔄' : '✨'}
                </span>
                <span>
                  {isGeneratingAiImage 
                    ? 'Gerando com IA...' 
                    : (!colorPalettes.length || selectedPaletteIndex === null)
                    ? 'Selecione uma Paleta Primeiro'
                    : 'Gerar Variação com IA'
                  }
                </span>
              </button>

              <button
                onClick={applyAiChanges}
                disabled={isApplyingChanges || (colorPalettes.length > 0 && selectedPaletteIndex === null)}
                style={{
                  display: 'none', // Hidden button
                  background: isApplyingChanges
                    ? 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)'
                    : (colorPalettes.length > 0 && selectedPaletteIndex === null)
                    ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                    : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 32px',
                  cursor: (isApplyingChanges || (colorPalettes.length > 0 && selectedPaletteIndex === null))
                    ? 'not-allowed'
                    : 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.3s ease',
                  margin: '0 auto',
                  boxShadow: isApplyingChanges || (colorPalettes.length > 0 && selectedPaletteIndex === null)
                    ? 'none'
                    : '0 4px 12px rgba(239, 68, 68, 0.4)'
                }}
                onMouseEnter={(e) => {
                  if (!(isApplyingChanges || (colorPalettes.length > 0 && selectedPaletteIndex === null))) {
                    e.currentTarget.style.transform = 'scale(1.05) translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!(isApplyingChanges || (colorPalettes.length > 0 && selectedPaletteIndex === null))) {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.4)';
                  }
                }}
              >
                <span style={{
                  fontSize: '1.2rem',
                  animation: isApplyingChanges ? 'spin 1s linear infinite' : 'none'
                }}>
                  {isApplyingChanges ? '🔄' : '🎨'}
                </span>
                <span>
                  {isApplyingChanges 
                    ? 'Aplicando Mudanças...' 
                    : colorPalettes.length > 0 && selectedPaletteIndex === null
                    ? 'Selecione uma Paleta Primeiro'
                    : 'Aplicar Mudanças IA no PSD'
                  }
                </span>
              </button>
              
              {colorPalettes.length > 0 && selectedPaletteIndex === null && (
                <p style={{
                  fontSize: '0.75rem',
                  color: '#ef4444',
                  margin: '8px 0 0 0',
                  fontWeight: '500'
                }}>
                  ⚠️ Você deve selecionar uma paleta de cores antes de aplicar as mudanças
                </p>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              marginTop: '24px',
              padding: '16px',
              backgroundColor: '#f0f8ff',
              borderRadius: '8px',
              fontSize: '0.875rem',
              color: '#1e40af'
            }}>
              💡 <strong>Como usar:</strong> Clique em "Gerar IA" para criar textos similares com palavras diferentes. 
              Faça upload de imagens para substituir elementos. Selecione uma paleta de cores. 
              Use "Gerar Variação com IA" para criar 3 novas versões com transformações visuais radicais.
            </div>
          </div>
        </div>
      )}

      {/* Modal de Preview de Elementos */}
      {showElementPreview && (
        <div style={{
          position: 'fixed',
          top: '0',
          left: '0',
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#1f2937',
                margin: '0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                🔍 Preview de Aplicação da Paleta
              </h3>
              <button
                onClick={() => setShowElementPreview(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ×
              </button>
            </div>

            {/* Elementos que SERÃO alterados */}
            {previewData.willChange.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#059669',
                  margin: '0 0 12px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  ✅ Elementos que receberão cores ({previewData.willChange.length})
                </h4>
                <div style={{ 
                  maxHeight: '200px',
                  overflowY: 'auto',
                  border: '1px solid #d1fae5',
                  borderRadius: '8px',
                  padding: '12px'
                }}>
                  {previewData.willChange.map((item, index) => (
                    <div key={index} style={{
                      padding: '8px',
                      marginBottom: '8px',
                      backgroundColor: '#f0fdf4',
                      borderRadius: '6px',
                      borderLeft: '3px solid #22c55e'
                    }}>
                      <div style={{
                        fontWeight: '600',
                        color: '#16a34a',
                        fontSize: '0.875rem'
                      }}>
                        {item.element.name || `${item.type} #${item.element.id}`}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#4ade80',
                        marginTop: '4px'
                      }}>
                        {item.reason}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Elementos que serão PRESERVADOS */}
            {previewData.willSkip.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#dc2626',
                  margin: '0 0 12px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  🛡️ Elementos preservados ({previewData.willSkip.length})
                </h4>
                <div style={{ 
                  maxHeight: '200px',
                  overflowY: 'auto',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '12px'
                }}>
                  {previewData.willSkip.map((item, index) => (
                    <div key={index} style={{
                      padding: '8px',
                      marginBottom: '8px',
                      backgroundColor: '#fef2f2',
                      borderRadius: '6px',
                      borderLeft: '3px solid #ef4444'
                    }}>
                      <div style={{
                        fontWeight: '600',
                        color: '#dc2626',
                        fontSize: '0.875rem'
                      }}>
                        {item.element.name || `${item.type} #${item.element.id}`}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#f87171',
                        marginTop: '4px'
                      }}>
                        {item.reason}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <button
                onClick={() => setShowElementPreview(false)}
                style={{
                  background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  setShowElementPreview(false);
                  applyAiChanges();
                }}
                style={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}
              >
                Aplicar Mesmo Assim
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default NewResultScreen;