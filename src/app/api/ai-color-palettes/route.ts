import { NextRequest, NextResponse } from 'next/server';

interface ColorPaletteRequest {
  profile: 'baixo' | 'medio' | 'alto';
}

interface ColorPaletteResponse {
  success: boolean;
  palettes?: Array<{
    name: string;
    description: string;
    colors: string[];
    usage: string;
  }>;
  reasoning?: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ColorPaletteResponse>> {
  try {
    const { profile }: ColorPaletteRequest = await request.json();
    
    // Validate OpenAI API key
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json({
        success: false,
        error: 'OpenAI API key not configured'
      });
    }

    const profileDescriptions = {
      'baixo': 'econômico, acessível, popular, primeiro imóvel',
      'medio': 'classe média, conforto, qualidade de vida, família',
      'alto': 'luxo, sofisticação, exclusividade, alto padrão'
    };

    // Prepare the prompt for ChatGPT
    const prompt = `
Em uma campanha publicitária para atrair compradores de um apartamento em redes sociais, quais seriam as cores mais utilizadas para montar uma peça no padrão ${profile.toUpperCase()}?

CONTEXTO DO PERFIL:
- Padrão ${profile}: ${profileDescriptions[profile]}
- Público-alvo: pessoas interessadas em imóveis de padrão ${profile}
- Objetivo: criar peças atrativas para redes sociais
- Foco: apartamentos residenciais

REQUISITOS:
1. Gere 3-4 paletas de cores diferentes
2. Cada paleta deve ter 4-5 cores em hexadecimal
3. Explique o uso de cada paleta (fundo, texto, destaque, etc.)
4. Considere psicologia das cores para o mercado imobiliário
5. Pense em conversão e engajamento nas redes sociais

Responda APENAS com um JSON válido no formato:
{
  "palettes": [
    {
      "name": "Nome da Paleta",
      "description": "Breve descrição da paleta e seu impacto",
      "colors": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
      "usage": "Como usar: cor1 para fundos, cor2 para títulos, etc."
    }
  ],
  "reasoning": "Explicação geral sobre as escolhas de cores para este perfil de imóvel"
}
`;

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em marketing imobiliário e design gráfico com foco em campanhas digitais para redes sociais.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 1200
      })
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const responseContent = openaiData.choices[0]?.message?.content;

    if (!responseContent) {
      throw new Error('Empty response from OpenAI');
    }

    // Parse the JSON response from ChatGPT
    let aiSuggestions;
    try {
      // Extract JSON from the response (in case ChatGPT adds extra text)
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : responseContent;
      aiSuggestions = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseContent);
      throw new Error('Invalid JSON response from AI');
    }

    return NextResponse.json({
      success: true,
      palettes: aiSuggestions.palettes,
      reasoning: aiSuggestions.reasoning
    });

  } catch (error) {
    console.error('AI color palettes error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}