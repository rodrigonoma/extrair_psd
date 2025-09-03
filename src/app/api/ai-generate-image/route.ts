import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

interface GenerateImageRequest {
  baseImageUrl: string;
  colors: string[];
  paletteDescription: string;
  prompt?: string;
}

interface GenerateImageResponse {
  success: boolean;
  imageUrl?: string;
  reasoning?: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<GenerateImageResponse>> {
  console.log('🚀 API route called: ai-generate-image');
  
  try {
    console.log('📥 Parsing request body...');
    const { baseImageUrl, colors, paletteDescription, prompt }: GenerateImageRequest = await request.json();
    
    console.log('✅ Request parsed successfully:', { 
      baseImageUrl: baseImageUrl?.substring(0, 50) + '...', 
      colors, 
      paletteDescription,
      prompt: prompt?.substring(0, 50)
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

    const enhancedPrompt = `Gere novas versões desta peça publicitária usando a imagem fornecida como base.

Não altere o texto nem os valores apresentados.

Você pode mudar apenas cores e posicionamento dos elementos, respeitando a hierarquia visual.

Crie 1 variação de acordo com o padrão de imóvel e sua paleta:

${patternPrompt}

${prompt ? `Instrução adicional: ${prompt}` : ''}

Mantenha a qualidade profissional e a legibilidade de todos os elementos.`;

    console.log('🔄 Calling Google Gemini Flash Image Preview API...');
    console.log('API Key configured:', !!googleApiKey);
    console.log('Base64 image size:', baseImageUrl.length);
    
    // Initialize Gemini with the new SDK
    const ai = new GoogleGenAI({
      apiKey: googleApiKey,
    });

    // Convert base64 to format expected by Gemini
    const base64Data = baseImageUrl.replace(/^data:image\/[a-z]+;base64,/, '');
    const mimeType = baseImageUrl.match(/data:image\/([a-z]+);base64,/)?.[1] === 'png' ? 'image/png' : 'image/jpeg';
    
    const parts: any[] = [{ text: enhancedPrompt }];

    // Add the base image for editing
    parts.push({
      inlineData: {
        mimeType,
        data: base64Data, // base64 puro
      },
    });

    console.log('🤖 Generating image with Gemini Flash Image Preview...');
    console.log('Prompt:', enhancedPrompt.substring(0, 200) + '...');

    const resp = await ai.models.generateContent({
      model: "gemini-2.5-flash-image-preview",
      contents: [{ role: "user", parts }],
    });

    // Get the first image returned
    const candidate = resp.candidates?.[0];
    const imagePart = candidate?.content?.parts?.find((p: any) => p.inlineData);

    if (!imagePart?.inlineData?.data) {
      throw new Error("Nenhuma imagem gerada pelo Gemini.");
    }

    console.log('✅ Image generated successfully by Gemini!');

    const generatedImageUrl = `data:image/png;base64,${imagePart.inlineData.data}`;

    return NextResponse.json({
      success: true,
      imageUrl: generatedImageUrl,
      reasoning: `Imagem gerada pelo Gemini 2.5 Flash Image Preview usando ${paletteDescription}. Cores aplicadas: ${colors.join(', ')}`
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