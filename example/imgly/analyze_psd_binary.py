#!/usr/bin/env python3
"""
Análise detalhada dos dados binários do PSD
Procura por correlações entre fontes e textos nos dados reais
"""

import sys
import os
import re
from typing import List, Dict, Set, Tuple

def analyze_psd_binary_patterns(path: str) -> Dict:
    """Analisa padrões binários para encontrar correlações fonte-texto"""
    
    if not os.path.isfile(path):
        raise FileNotFoundError(f"File not found: {path}")
    
    with open(path, "rb") as f:
        data = f.read()

    print(f"[INFO] Analisando {len(data)} bytes do arquivo {path}")
    
    # Remove null bytes e decodifica
    text = data.replace(b"\x00", b"").decode("latin-1", errors="ignore")
    
    # Textos conhecidos do PSD
    known_texts = ["WOQM TESTE DE FONT", "LIGHT", "WOQM"]
    
    # Fontes conhecidas
    known_fonts = ["AvianoSansBold", "AvianoSansThin", "MyriadPro-Regular"]
    
    print("\n" + "="*60)
    print("ANÁLISE DE CORRELAÇÃO FONTE-TEXTO")
    print("="*60)
    
    correlations = []
    
    # Para cada texto, procura fontes próximas nos dados binários
    for text in known_texts:
        print(f"\n[ANALISANDO] Texto: '{text}'")
        
        # Encontra todas as posições deste texto
        text_positions = []
        start = 0
        while True:
            pos = text.find(text, start)
            if pos == -1:
                break
            text_positions.append(pos)
            start = pos + 1
        
        print(f"[POSIÇÕES] Encontrado em {len(text_positions)} posições: {text_positions}")
        
        # Para cada posição do texto, procura fontes em uma janela ao redor
        for pos in text_positions:
            print(f"\n[ANÁLISE] Posição {pos} - Texto '{text}'")
            
            # Define janela de análise (antes e depois do texto)
            window_size = 1000  # 1000 chars antes e depois
            start_window = max(0, pos - window_size)
            end_window = min(len(text), pos + len(text) + window_size)
            
            window_text = text[start_window:end_window]
            
            # Procura por fontes nesta janela
            fonts_in_window = []
            for font in known_fonts:
                font_positions = []
                start_font = 0
                while True:
                    font_pos = window_text.find(font, start_font)
                    if font_pos == -1:
                        break
                    actual_pos = start_window + font_pos
                    distance = abs(actual_pos - pos)
                    font_positions.append({'pos': actual_pos, 'distance': distance})
                    start_font = font_pos + 1
                
                if font_positions:
                    closest = min(font_positions, key=lambda x: x['distance'])
                    fonts_in_window.append({
                        'font': font,
                        'closest_distance': closest['distance'],
                        'occurrences': len(font_positions)
                    })
                    print(f"[FONTE] {font} - distância mínima: {closest['distance']}, ocorrências: {len(font_positions)}")
            
            # Ordena fontes por proximidade
            fonts_in_window.sort(key=lambda x: x['closest_distance'])
            
            if fonts_in_window:
                closest_font = fonts_in_window[0]
                correlations.append({
                    'text': text,
                    'text_position': pos,
                    'closest_font': closest_font['font'],
                    'distance': closest_font['closest_distance'],
                    'confidence': 'high' if closest_font['closest_distance'] < 200 else 'medium' if closest_font['closest_distance'] < 500 else 'low'
                })
                print(f"[CORRELAÇÃO] '{text}' <-> {closest_font['font']} (distância: {closest_font['closest_distance']})")
    
    # Análise de padrões de proximidade
    print(f"\n{'='*60}")
    print("RESULTADO DA ANÁLISE DE CORRELAÇÃO")
    print(f"{'='*60}")
    
    # Agrupa correlações por texto para encontrar a fonte mais provável
    text_font_map = {}
    for corr in correlations:
        text = corr['text']
        font = corr['closest_font']
        distance = corr['distance']
        
        if text not in text_font_map:
            text_font_map[text] = {}
        
        if font not in text_font_map[text]:
            text_font_map[text][font] = []
        
        text_font_map[text][font].append(distance)
    
    # Calcula estatísticas para cada associação
    final_associations = {}
    for text, font_data in text_font_map.items():
        print(f"\n[TEXTO] '{text}':")
        
        font_scores = []
        for font, distances in font_data.items():
            avg_distance = sum(distances) / len(distances)
            min_distance = min(distances)
            occurrences = len(distances)
            
            # Score baseado em proximidade e frequência
            score = 1000 / (avg_distance + 1) + occurrences * 10
            
            font_scores.append({
                'font': font,
                'avg_distance': avg_distance,
                'min_distance': min_distance,
                'occurrences': occurrences,
                'score': score
            })
            
            print(f"  {font}: {occurrences}x, dist.média={avg_distance:.1f}, dist.mín={min_distance}, score={score:.2f}")
        
        # Escolhe a fonte com maior score
        if font_scores:
            font_scores.sort(key=lambda x: x['score'], reverse=True)
            best_font = font_scores[0]
            final_associations[text] = best_font['font']
            print(f"  [VENCEDOR] {best_font['font']} (score: {best_font['score']:.2f})")
    
    print(f"\n{'='*60}")
    print("ASSOCIAÇÕES FINAIS DESCOBERTAS")
    print(f"{'='*60}")
    
    for text, font in final_associations.items():
        print(f"'{text}' -> {font}")
    
    return {
        'associations': final_associations,
        'correlations': correlations,
        'analysis_data': text_font_map
    }

def main():
    if len(sys.argv) != 2:
        print("Uso: python analyze_psd_binary.py <arquivo.psd>")
        sys.exit(1)
    
    psd_path = sys.argv[1]
    
    try:
        result = analyze_psd_binary_patterns(psd_path)
        
        print(f"\n{'='*60}")
        print("CÓDIGO PYTHON PARA ASSOCIAÇÕES:")
        print(f"{'='*60}")
        print("specific_associations = {")
        for text, font in result['associations'].items():
            print(f'    "{text}": "{font}",')
        print("}")
        
    except Exception as e:
        print(f"[ERRO] {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()