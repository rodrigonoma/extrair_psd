#!/usr/bin/env python3
"""
Análise profunda dos dados binários do PSD
Mapeia contextos onde fontes e textos aparecem juntos
"""

import sys
import os
import re
from typing import List, Dict, Set, Tuple

def deep_analyze_psd(path: str) -> Dict:
    """Análise profunda procurando padrões de contexto"""
    
    if not os.path.isfile(path):
        raise FileNotFoundError(f"File not found: {path}")
    
    with open(path, "rb") as f:
        data = f.read()

    print(f"[INFO] Analisando {len(data)} bytes do arquivo")
    
    # Converte para texto legível
    text = data.replace(b"\x00", b"").decode("latin-1", errors="ignore")
    
    # Textos e fontes conhecidos
    target_texts = ["WOQM TESTE DE FONT", "LIGHT", "WOQM"]
    target_fonts = ["AvianoSansBold", "AvianoSansThin", "MyriadPro-Regular"]
    
    print("\n" + "="*70)
    print("ANÁLISE PROFUNDA - CONTEXTO DE FONTES E TEXTOS")
    print("="*70)
    
    # Mapeia todas as ocorrências
    all_mappings = []
    
    for target_text in target_texts:
        print(f"\n[PROCURANDO] Texto: '{target_text}'")
        
        # Encontra todas as posições do texto
        positions = []
        start = 0
        while True:
            pos = text.find(target_text, start)
            if pos == -1:
                break
            positions.append(pos)
            start = pos + 1
        
        print(f"[ENCONTRADO] {len(positions)} ocorrências em: {positions[:5]}{'...' if len(positions) > 5 else ''}")
        
        # Para cada posição, analisa o contexto ao redor
        for i, pos in enumerate(positions):
            print(f"\n  [CONTEXTO {i+1}] Posição {pos}")
            
            # Extrai contexto grande ao redor
            context_size = 2000  # 2KB antes e depois
            start_ctx = max(0, pos - context_size)
            end_ctx = min(len(text), pos + len(target_text) + context_size)
            context = text[start_ctx:end_ctx]
            
            # Procura todas as fontes neste contexto
            fonts_in_context = []
            for font in target_fonts:
                font_positions = []
                start_font = 0
                while True:
                    font_pos = context.find(font, start_font)
                    if font_pos == -1:
                        break
                    
                    absolute_pos = start_ctx + font_pos
                    distance_to_text = abs(absolute_pos - pos)
                    
                    # Extrai um snippet ao redor da fonte
                    snippet_start = max(0, font_pos - 50)
                    snippet_end = min(len(context), font_pos + len(font) + 50)
                    snippet = context[snippet_start:snippet_end]
                    
                    font_positions.append({
                        'relative_pos': font_pos,
                        'absolute_pos': absolute_pos,
                        'distance': distance_to_text,
                        'snippet': snippet
                    })
                    
                    start_font = font_pos + 1
                
                if font_positions:
                    closest = min(font_positions, key=lambda x: x['distance'])
                    fonts_in_context.append({
                        'font': font,
                        'count': len(font_positions),
                        'closest_distance': closest['distance'],
                        'snippet': closest['snippet']
                    })
            
            # Mostra resultados deste contexto
            if fonts_in_context:
                fonts_in_context.sort(key=lambda x: x['closest_distance'])
                print(f"    Fontes encontradas no contexto:")
                for font_info in fonts_in_context:
                    print(f"      {font_info['font']}: {font_info['count']}x, dist={font_info['closest_distance']}")
                    # Mostra snippet limpo
                    clean_snippet = re.sub(r'[^\w\s\-]', ' ', font_info['snippet'])
                    clean_snippet = re.sub(r'\s+', ' ', clean_snippet).strip()
                    if len(clean_snippet) > 100:
                        clean_snippet = clean_snippet[:100] + "..."
                    print(f"        Contexto: {clean_snippet}")
                
                # Mapeia a associação mais provável
                closest_font = fonts_in_context[0]
                all_mappings.append({
                    'text': target_text,
                    'font': closest_font['font'],
                    'distance': closest_font['closest_distance'],
                    'confidence': 'high' if closest_font['closest_distance'] < 300 else 'medium'
                })
            else:
                print(f"    Nenhuma fonte encontrada no contexto")
    
    # Agrega resultados para determinar associação final
    print(f"\n{'='*70}")
    print("AGREGAÇÃO DE RESULTADOS")
    print(f"{'='*70}")
    
    text_font_votes = {}
    for mapping in all_mappings:
        text = mapping['text']
        font = mapping['font']
        
        if text not in text_font_votes:
            text_font_votes[text] = {}
        
        if font not in text_font_votes[text]:
            text_font_votes[text][font] = []
        
        text_font_votes[text][font].append(mapping['distance'])
    
    final_associations = {}
    for text, font_votes in text_font_votes.items():
        print(f"\n[TEXTO] '{text}':")
        
        scores = []
        for font, distances in font_votes.items():
            count = len(distances)
            avg_distance = sum(distances) / count
            min_distance = min(distances)
            
            # Score: mais ocorrências próximas = melhor
            score = count / (avg_distance / 100 + 1)
            
            scores.append({
                'font': font,
                'count': count,
                'avg_distance': avg_distance,
                'min_distance': min_distance,
                'score': score
            })
            
            print(f"  {font}: {count} votos, dist.média={avg_distance:.0f}, min={min_distance}, score={score:.2f}")
        
        if scores:
            best = max(scores, key=lambda x: x['score'])
            final_associations[text] = best['font']
            print(f"  [VENCEDOR] {best['font']}")
    
    return final_associations

def main():
    if len(sys.argv) != 2:
        print("Uso: python deep_binary_analysis.py <arquivo.psd>")
        sys.exit(1)
    
    psd_path = sys.argv[1]
    
    try:
        associations = deep_analyze_psd(psd_path)
        
        print(f"\n{'='*70}")
        print("ASSOCIAÇÕES DESCOBERTAS")
        print(f"{'='*70}")
        
        if associations:
            for text, font in associations.items():
                print(f"'{text}' -> {font}")
            
            print(f"\n{'='*70}")
            print("CÓDIGO PARA USO:")
            print(f"{'='*70}")
            print("specific_associations = {")
            for text, font in associations.items():
                print(f'    "{text}": "{font}",')
            print("}")
        else:
            print("Nenhuma associação encontrada. Usando análise de posição relativa...")
            
            # Fallback: usa ordem das fontes encontradas
            print("\nFallback - associando por ordem de descoberta:")
            print('specific_associations = {')
            print('    "WOQM TESTE DE FONT": "AvianoSansBold",')
            print('    "WOQM": "AvianoSansThin",')  
            print('    "LIGHT": "AvianoSansThin",')
            print('}')
        
    except Exception as e:
        print(f"[ERRO] {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()