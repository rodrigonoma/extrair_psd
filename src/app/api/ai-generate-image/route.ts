import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

interface GenerateImageRequest {
  baseImageUrl: string;
  colors: string[];
  paletteDescription: string;
  prompt?: string;
  generationStyle?: 'conservador' | 'moderado' | 'radical';
}

interface GenerateImageResponse {
  success: boolean;
  imageUrls?: string[]; // Changed to array for multiple images
  imageUrl?: string; // Keep for backwards compatibility
  reasoning?: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<GenerateImageResponse>> {
  console.log('🚀 API route called: ai-generate-image');
  
  try {
    console.log('📥 Parsing request body...');
    const { baseImageUrl, colors, paletteDescription, prompt, generationStyle = 'moderado' }: GenerateImageRequest = await request.json();
    
    console.log('✅ Request parsed successfully:', { 
      baseImageUrl: baseImageUrl?.substring(0, 50) + '...', 
      colors, 
      paletteDescription,
      prompt: prompt?.substring(0, 50),
      generationStyle
    });
    
    // Validate Google API key
    const googleApiKey = process.env.GOOGLE_API_KEY;
    if (!googleApiKey) {
      return NextResponse.json({
        success: false,
        error: 'Google API key not configured'
      });
    }

    // Determine the pattern based on palette description
    const getPatternPrompt = (description: string, colors: string[]) => {
      const desc = description.toLowerCase();
      
      if (desc.includes('alto padrão') || desc.includes('alto padrao') || desc.includes('luxo') || desc.includes('sofisticado')) {
        return `Alto Padrão

Fundo: ${colors[0] || '#0A0A0A'} (fundo principal)
Destaque: ${colors[1] || '#D4AF37'} (elementos de destaque)
Texto: ${colors[2] || '#FFFFFF'} (texto principal) e secundário ${colors[3] || '#1F3B73'} (texto secundário)

Estilo: clean, sofisticado, minimalista, transmitindo exclusividade e luxo.`;
      } else if (desc.includes('médio padrão') || desc.includes('medio padrao') || desc.includes('moderno') || desc.includes('equilibrado')) {
        return `Médio Padrão

Fundo: ${colors[0] || '#F5F5F5'} (fundo principal)
Destaque: ${colors[1] || '#0077B6'} (elementos de destaque)
Texto: ${colors[2] || '#333333'} (texto principal) e secundário ${colors[3] || '#00A86B'} (texto secundário)

Estilo: moderno, equilibrado e acessível, transmitindo confiança e bom custo-benefício.`;
      } else {
        return `Baixo Padrão

Fundo: ${colors[0] || '#FFFFFF'} (fundo principal)
Destaque: ${colors[1] || '#FF0000'} (elementos de destaque)
Texto: ${colors[2] || '#000000'} (texto principal) e secundário ${colors[3] || '#008000'} (texto secundário)

Estilo: cores vivas e contrastantes, transmitindo energia e dinamismo.`;
      }
    };

    const patternPrompt = getPatternPrompt(paletteDescription, colors);

    // Function to get style-specific instructions
    const getStyleInstructions = (style: string) => {
      switch (style) {
        case 'conservador':
          return {
            intensity: 'CONSERVADOR e SUTIL',
            instructions: [
              '- Mudanças SUTIS e ELEGANTES nas cores',
              '- Preservar TOTALMENTE o layout e composição original',
              '- Aplicar cores com SUAVIDADE e naturalidade',
              '- Manter harmonia visual DISCRETA',
              '- Transformações REFINADAS e profissionais'
            ],
            variations: [
              'CONSERVADOR: Aplicação suave da paleta mantendo elegância original',
              'CONSERVADOR: Ajustes sutis de cor com máxima preservação do design',
              'CONSERVADOR: Refinamento discreto das cores sem alterações dramáticas'
            ]
          };
        case 'radical':
          return {
            intensity: 'EXTREMAMENTE RADICAL e TRANSFORMADOR',
            instructions: [
              '- Transformação TOTAL e REVOLUCIONÁRIA das cores',
              '- Mudanças EXTREMAS e IMPACTANTES',
              '- Usar cores com MÁXIMA INTENSIDADE e contraste',
              '- Criar CHOQUE VISUAL impressionante',
              '- Recomposição OUSADA e arriscada'
            ],
            variations: [
              'RADICAL: Revolução completa das cores com impacto visual extremo',
              'RADICAL: Transformação total criando atmosfera completamente nova',
              'RADICAL: Redesign revolucionário com cores intensas e contrastantes'
            ]
          };
        default: // moderado
          return {
            intensity: 'MODERADO e EQUILIBRADO',
            instructions: [
              '- Transformação PERCEPTÍVEL mas HARMONIOSA',
              '- Equilibrio entre impacto visual e elegância',
              '- Aplicar cores com INTENSIDADE MODERADA',
              '- Mudanças VISÍVEIS mas profissionais',
              '- Criar diferença CLARA da imagem original'
            ],
            variations: [
              'MODERADO: Equilibrio entre mudança perceptível e elegância profissional',
              'MODERADO: Transformação harmoniosa com impacto visual controlado',
              'MODERADO: Aplicação balanceada das cores com resultado impactante'
            ]
          };
      }
    };

    const styleConfig = getStyleInstructions(generationStyle);

    const enhancedPrompt = `REDESIGN ${styleConfig.intensity} desta peça publicitária usando a imagem fornecida como base.

REGRAS OBRIGATÓRIAS:
- Não altere o texto nem os valores apresentados
- Mantenha a legibilidade de todos os elementos

ESTILO DE TRANSFORMAÇÃO ${generationStyle.toUpperCase()}:

${patternPrompt}

INSTRUÇÕES ESPECÍFICAS PARA ESTE ESTILO:
${styleConfig.instructions.join('\n')}

${prompt ? `Instrução adicional: ${prompt}` : ''}

RESULTADO ESPERADO: Variação que reflita perfeitamente o estilo ${generationStyle.toUpperCase()} escolhido.`;

    console.log('🔄 Calling Google Gemini Flash Image Preview API for 3 variations...');
    console.log('API Key configured:', !!googleApiKey);
    console.log('Base64 image size:', baseImageUrl.length);
    
    // Initialize Gemini with the new SDK
    const ai = new GoogleGenAI({
      apiKey: googleApiKey,
    });

    // Convert base64 to format expected by Gemini
    const base64Data = baseImageUrl.replace(/^data:image\/[a-z]+;base64,/, '');
    const mimeType = baseImageUrl.match(/data:image\/([a-z]+);base64,/)?.[1] === 'png' ? 'image/png' : 'image/jpeg';
    
    // Generate 3 variations based on selected style
    const variations = styleConfig.variations;

    const generatedImageUrls: string[] = [];

    console.log('🤖 Generating 3 variations with Gemini Flash Image Preview...');

    for (let i = 0; i < 3; i++) {
      console.log(`🔄 Generating variation ${i + 1}/3...`);
      
      const variationPrompt = `${enhancedPrompt}

FOCO ESPECÍFICO PARA ESTILO ${generationStyle.toUpperCase()}: ${variations[i]}

INSTRUÇÕES EXTRAS PARA ESTE ESTILO:
${styleConfig.instructions.join('\n')}

Gere apenas 1 imagem seguindo EXATAMENTE o estilo ${generationStyle.toUpperCase()} especificado.`;

      const parts: any[] = [{ text: variationPrompt }];

      // Add the base image for editing
      parts.push({
        inlineData: {
          mimeType,
          data: base64Data,
        },
      });

      try {
        const resp = await ai.models.generateContent({
          model: "gemini-2.5-flash-image-preview",
          contents: [{ role: "user", parts }],
        });

        // Get the first image returned
        const candidate = resp.candidates?.[0];
        const imagePart = candidate?.content?.parts?.find((p: any) => p.inlineData);

        if (imagePart?.inlineData?.data) {
          const variationImageUrl = `data:image/png;base64,${imagePart.inlineData.data}`;
          generatedImageUrls.push(variationImageUrl);
          console.log(`✅ Variation ${i + 1} generated successfully!`);
        } else {
          console.warn(`⚠️ No image generated for variation ${i + 1}`);
          // Add the original image as fallback
          generatedImageUrls.push(baseImageUrl);
        }
      } catch (error) {
        console.error(`❌ Error generating variation ${i + 1}:`, error);
        // Add the original image as fallback
        generatedImageUrls.push(baseImageUrl);
      }

      // Add a small delay between calls to avoid rate limits
      if (i < 2) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (generatedImageUrls.length === 0) {
      throw new Error("Nenhuma imagem gerada pelo Gemini.");
    }

    console.log(`✅ Generated ${generatedImageUrls.length} variations successfully!`);

    return NextResponse.json({
      success: true,
      imageUrls: generatedImageUrls,
      imageUrl: generatedImageUrls[0], // First variation for backwards compatibility
      reasoning: `${generatedImageUrls.length} variações geradas pelo Gemini 2.5 Flash Image Preview no estilo ${generationStyle.toUpperCase()} usando ${paletteDescription}. Cores aplicadas: ${colors.join(', ')}`
    });

  } catch (error) {
    console.error('❌ AI image generation error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}