#!/usr/bin/env python3
"""
Análise abrangente - mapeia todos os padrões no PSD
"""

import sys
import os
import re

def comprehensive_psd_analysis(path: str):
    with open(path, "rb") as f:
        data = f.read()

    text = data.replace(b"\x00", b"").decode("latin-1", errors="ignore")
    
    target_texts = ["WOQM TESTE DE FONT", "LIGHT", "WOQM"]
    target_fonts = ["AvianoSansBold", "AvianoSansThin", "MyriadPro-Regular"]
    
    print("="*80)
    print("ANÁLISE ABRANGENTE - MAPEAMENTO COMPLETO")
    print("="*80)
    
    # Cria um mapa de posições de todos os elementos
    all_positions = []
    
    # Mapeia posições dos textos
    for text in target_texts:
        start = 0
        while True:
            pos = text.find(text, start)
            if pos == -1:
                break
            all_positions.append({'type': 'text', 'content': text, 'pos': pos})
            start = pos + 1
    
    # Mapeia posições das fontes
    for font in target_fonts:
        start = 0
        while True:
            pos = text.find(font, start)
            if pos == -1:
                break
            all_positions.append({'type': 'font', 'content': font, 'pos': pos})
            start = pos + 1
    
    # Ordena por posição
    all_positions.sort(key=lambda x: x['pos'])
    
    print(f"Total de elementos encontrados: {len(all_positions)}")
    print("\nMAPEAMENTO SEQUENCIAL (primeiros 20):")
    for i, item in enumerate(all_positions[:20]):
        print(f"{i+1:2d}. Pos {item['pos']:6d} - {item['type']:4s} - {item['content']}")
    
    # Análise de proximidade - associa textos às fontes mais próximas
    print(f"\n{'='*80}")
    print("ANÁLISE DE PROXIMIDADE")
    print(f"{'='*80}")
    
    associations = {}
    
    for text_item in [x for x in all_positions if x['type'] == 'text']:
        text_name = text_item['content']
        text_pos = text_item['pos']
        
        print(f"\n[TEXTO] '{text_name}' na posição {text_pos}")
        
        # Encontra as fontes mais próximas
        font_distances = []
        for font_item in [x for x in all_positions if x['type'] == 'font']:
            distance = abs(font_item['pos'] - text_pos)
            font_distances.append({
                'font': font_item['content'],
                'distance': distance,
                'font_pos': font_item['pos']
            })
        
        # Ordena por distância
        font_distances.sort(key=lambda x: x['distance'])
        
        print("  Fontes por proximidade:")
        for i, fd in enumerate(font_distances[:3]):  # Top 3
            print(f"    {i+1}. {fd['font']} - distância: {fd['distance']} (pos: {fd['font_pos']})")
        
        # Associa à fonte mais próxima
        if font_distances:
            closest_font = font_distances[0]['font']
            associations[text_name] = closest_font
            print(f"  [ASSOCIAÇÃO] '{text_name}' -> {closest_font}")
    
    print(f"\n{'='*80}")
    print("ASSOCIAÇÕES FINAIS BASEADAS EM PROXIMIDADE")
    print(f"{'='*80}")
    
    for text, font in associations.items():
        print(f"'{text}' -> {font}")
    
    return associations

def main():
    if len(sys.argv) != 2:
        print("Uso: python comprehensive_analysis.py <arquivo.psd>")
        sys.exit(1)
    
    psd_path = sys.argv[1]
    associations = comprehensive_psd_analysis(psd_path)
    
    print(f"\n{'='*80}")
    print("CÓDIGO PYTHON RESULTANTE:")
    print(f"{'='*80}")
    print("specific_associations = {")
    for text, font in associations.items():
        print(f'    "{text}": "{font}",')
    print("}")

if __name__ == "__main__":
    main()