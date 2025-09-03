import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

interface DetectProfileRequest {
  texts: string[];
}

interface DetectProfileResponse {
  success: boolean;
  profile?: 'baixo' | 'medio' | 'alto';
  confidence?: number;
  reasoning?: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<DetectProfileResponse>> {
  console.log('🚀 API route called: ai-detect-profile');
  
  try {
    console.log('📥 Parsing request body...');
    const { texts }: DetectProfileRequest = await request.json();
    
    console.log('✅ Request parsed successfully:', { textsCount: texts.length, texts });
    
    // Validate OpenAI API key
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json({
        success: false,
        error: 'OpenAI API key not configured'
      });
    }

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    // Prepare the enhanced prompt for profile detection
    const allTexts = texts.filter(text => text && text.trim() !== '').join(' | ');
    
    const prompt = `Analise os textos extraídos de uma peça publicitária imobiliária e determine o perfil/padrão do imóvel:

TEXTOS EXTRAÍDOS:
"${allTexts}"

CRITÉRIOS DE CLASSIFICAÇÃO:

ALTO PADRÃO:
- Valores acima de R$ 800.000
- Palavras-chave: luxo, sofisticado, premium, exclusivo, requintado, elegante
- Acabamentos: mármore, granito, madeira nobre, piscina, spa, jardim
- Localização: bairros nobres, condomínio fechado, vista privilegiada
- Tamanhos: +120m², +3 suítes, +2 vagas

MÉDIO PADRÃO:
- Valores entre R$ 200.000 - R$ 800.000
- Palavras-chave: moderno, conforto, qualidade, bem localizado
- Acabamentos: porcelanato, armários planejados, varanda gourmet
- Localização: bairros consolidados, próximo ao centro/comércio
- Tamanhos: 60-120m², 2-3 dormitórios, 1-2 vagas

BAIXO PADRÃO:
- Valores abaixo de R$ 200.000
- Palavras-chave: oportunidade, entrada facilitada, financiamento próprio
- Foco em: localização, transporte público, facilidade de pagamento
- Acabamentos simples ou básicos mencionados
- Tamanhos: até 60m², 1-2 dormitórios, sem vaga ou 1 vaga

Baseado APENAS nos textos fornecidos, responda em formato JSON:
{
  "profile": "alto" | "medio" | "baixo",
  "confidence": 0.0-1.0,
  "reasoning": "explicação da análise"
}

Se não houver informações suficientes, retorne confidence < 0.6.`;

    console.log('🔄 Calling OpenAI API...');
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Você é um especialista em análise de mercado imobiliário brasileiro. Analise textos de peças publicitárias e classifique o padrão do imóvel de forma precisa."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: "json_object" }
    });

    const response = completion.choices[0]?.message?.content;
    console.log('📄 OpenAI response:', response);

    if (!response) {
      throw new Error('No response from OpenAI');
    }

    const result = JSON.parse(response);
    
    return NextResponse.json({
      success: true,
      profile: result.profile,
      confidence: result.confidence,
      reasoning: result.reasoning
    });

  } catch (error) {
    console.error('❌ AI profile detection error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}