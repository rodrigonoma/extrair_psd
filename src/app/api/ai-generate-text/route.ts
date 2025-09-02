import { NextRequest, NextResponse } from 'next/server';

interface GenerateTextRequest {
  originalText: string;
  elementId: number;
  elementName: string;
}

interface GenerateTextResponse {
  success: boolean;
  generatedText?: string;
  reasoning?: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<GenerateTextResponse>> {
  try {
    const { originalText, elementId, elementName }: GenerateTextRequest = await request.json();
    
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
Gere um texto similar ao texto original mantendo o mesmo sentido, tom e propósito, mas com palavras e estrutura diferentes.

CONTEXTO:
- Elemento: ${elementName}
- ID: ${elementId}
- Este texto faz parte de um design/layout visual

TEXTO ORIGINAL:
"${originalText}"

INSTRUÇÕES:
1. Mantenha o mesmo sentido e propósito do texto original
2. Use palavras e estrutura diferentes (paráfrase criativa)
3. Preserve o tom (formal, casual, comercial, etc.)
4. Mantenha aproximadamente o mesmo tamanho
5. Se for um título, continue sendo um título
6. Se for um botão, mantenha a ação clara
7. Se for descritivo, mantenha informativo
8. Considere que será usado em design gráfico

Responda APENAS com um JSON válido no formato:
{
  "text": "novo texto gerado aqui",
  "reasoning": "breve explicação das mudanças feitas"
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
            content: 'Você é um copywriter especialista em reescrita criativa que mantém o sentido original dos textos.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 500
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
      generatedText: aiSuggestions.text,
      reasoning: aiSuggestions.reasoning
    });

  } catch (error) {
    console.error('AI text generation error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}