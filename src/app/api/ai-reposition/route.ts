import { NextRequest, NextResponse } from 'next/server';

interface ElementInfo {
  id: number;
  type: 'text' | 'image' | 'shape';
  content?: string; // for text elements
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  fontFamily?: string;
  fontSize?: number;
  name: string;
}

interface RepositionRequest {
  elements: ElementInfo[];
  canvasWidth: number;
  canvasHeight: number;
}

interface RepositionResponse {
  success: boolean;
  repositionedElements?: ElementInfo[];
  reasoning?: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<RepositionResponse>> {
  try {
    const { elements, canvasWidth, canvasHeight }: RepositionRequest = await request.json();
    
    // Validate OpenAI API key
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json({
        success: false,
        error: 'OpenAI API key not configured'
      });
    }

    // Prepare the prompt for ChatGPT
    const prompt = `
Analise os seguintes elementos de design de uma imagem PSD e reposicione-os de forma inteligente para melhorar o layout visual, sem sobrepor elementos:

CANVAS: ${canvasWidth}x${canvasHeight}px

ELEMENTOS:
${elements.map(el => `
- ID: ${el.id} (${el.type})
  ${el.type === 'text' ? `Texto: "${el.content}"` : ''}
  ${el.type === 'text' ? `Fonte: ${el.fontFamily}, ${el.fontSize}px` : ''}
  Posição: x=${el.x}, y=${el.y}
  Tamanho: ${el.width}x${el.height}
  ${el.color ? `Cor: ${el.color}` : ''}
  Nome: ${el.name}
`).join('')}

INSTRUÇÕES:
1. Mantenha elementos relacionados próximos
2. Crie hierarquia visual lógica
3. Garanta espaçamento adequado entre elementos
4. NÃO permita sobreposição de elementos
5. Mantenha elementos dentro dos limites do canvas
6. Considere alinhamento e grid invisible
7. Preserve a funcionalidade e legibilidade

Responda APENAS com um JSON válido no formato:
{
  "elements": [
    {
      "id": number,
      "x": number,
      "y": number
    }
  ],
  "reasoning": "Explicação breve das mudanças realizadas"
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
            content: 'Você é um designer especialista em UI/UX que reposiciona elementos de design de forma inteligente.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
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

    // Update elements with new positions
    const repositionedElements = elements.map(element => {
      const aiElement = aiSuggestions.elements.find((e: any) => e.id === element.id);
      if (aiElement) {
        return {
          ...element,
          x: aiElement.x,
          y: aiElement.y
        };
      }
      return element;
    });

    return NextResponse.json({
      success: true,
      repositionedElements,
      reasoning: aiSuggestions.reasoning
    });

  } catch (error) {
    console.error('AI reposition error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}