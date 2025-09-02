#!/usr/bin/env python3
"""
Extrator de Fontes PSD - Versão Híbrida
Combina psd-tools + psdtxtractor + análise manual
"""

import sys
import os
import json
import subprocess
import tempfile
import re
from psd_tools import PSDImage

def run_psdtxtractor(psd_path):
    """Executa psdtxtractor e captura o output"""
    try:
        # Tenta diferentes formas de chamar psdtxtractor
        commands = [
            ['psdtxtractor', psd_path],
            ['psdtxtractor.cmd', psd_path],
            ['npx', 'psdtxtractor', psd_path]
        ]
        
        for cmd in commands:
            try:
                result = subprocess.run(cmd, capture_output=True, text=True, 
                                      encoding='utf-8', shell=True)
                
                if result.returncode == 0 and result.stdout:
                    return result.stdout
                elif result.stdout:
                    return result.stdout
                    
            except:
                continue
        
        print("[AVISO] psdtxtractor nao encontrado ou nao funcionou")
        return None
        
    except Exception as e:
        print(f"[AVISO] Erro ao executar psdtxtractor: {e}")
        return None

def parse_psdtxtractor_output(output):
    """Analisa output do psdtxtractor"""
    if not output:
        return {}
    
    layers = {}
    current_layer = None
    
    for line in output.split('\n'):
        line = line.strip()
        
        # Layer de texto
        if line.startswith('- Text Layer [') and ']:' in line:
            layer_match = re.search(r'\[([^\]]+)\]:', line)
            if layer_match:
                current_layer = layer_match.group(1)
                layers[current_layer] = {'type': 'text'}
        
        # Layer comum
        elif line.startswith('- Layer [') and ']' in line:
            layer_match = re.search(r'\[([^\]]+)\]', line)
            if layer_match:
                current_layer = layer_match.group(1)
                layers[current_layer] = {'type': 'layer'}
        
        # Propriedades da layer
        elif current_layer and line.startswith('- '):
            prop_line = line[2:]  # Remove "- "
            
            if prop_line.startswith('Font: '):
                font_value = prop_line[6:]
                if font_value and font_value != 'undefined':
                    layers[current_layer]['font'] = font_value
                    
            elif prop_line.startswith('Size(s): '):
                size_value = prop_line[9:]
                layers[current_layer]['font_size'] = size_value
                
            elif prop_line.startswith('Color '):
                color_match = re.search(r'rgba\(([^)]+)\)', prop_line)
                if color_match:
                    layers[current_layer]['color'] = color_match.group(1)
    
    return layers

def extract_via_photoshop_script(psd_path):
    """Cria script ExtendScript para extrair fontes via Photoshop (se disponível)"""
    script_content = '''
// ExtendScript para extrair fontes
try {
    var doc = app.open(new File("%s"));
    var fonts = [];
    
    function processLayer(layer) {
        if (layer.kind == LayerKind.TEXT) {
            try {
                var fontName = layer.textItem.font;
                if (fontName && fonts.indexOf(fontName) == -1) {
                    fonts.push(fontName);
                }
            } catch (e) {}
        }
        
        if (layer.layerSets) {
            for (var i = 0; i < layer.layerSets.length; i++) {
                processLayer(layer.layerSets[i]);
            }
        }
        if (layer.artLayers) {
            for (var i = 0; i < layer.artLayers.length; i++) {
                processLayer(layer.artLayers[i]);
            }
        }
    }
    
    for (var i = 0; i < doc.layers.length; i++) {
        processLayer(doc.layers[i]);
    }
    
    doc.close(SaveOptions.DONOTSAVECHANGES);
    
    // Output as JSON
    alert("FONTS_JSON:" + JSON.stringify(fonts));
    
} catch (e) {
    alert("ERROR:" + e.toString());
}
''' % psd_path.replace('\\', '\\\\')
    
    # Salva script temporário
    script_path = os.path.join(tempfile.gettempdir(), 'extract_fonts.jsx')
    with open(script_path, 'w', encoding='utf-8') as f:
        f.write(script_content)
    
    return script_path

def analyze_psd_advanced(psd_path):
    """Análise avançada do PSD"""
    results = {
        'psd_tools_info': {},
        'psdtxtractor_info': {},
        'extracted_fonts': set(),
        'text_layers': []
    }
    
    # 1. Análise via psd-tools
    try:
        psd = PSDImage.open(psd_path)
        
        results['psd_tools_info'] = {
            'width': psd.width,
            'height': psd.height,
            'layers_count': len(list(psd))
        }
        
        for layer in psd:
            if layer.kind == 'type':
                layer_info = {
                    'name': layer.name,
                    'text': getattr(layer, 'text', ''),
                    'visible': layer.visible,
                    'fonts_found': []
                }
                
                # Tenta diferentes métodos de extração
                if hasattr(layer, 'text_data') and layer.text_data:
                    text_data = layer.text_data
                    
                    # Via document_resources
                    if (hasattr(text_data, 'document_resources') and 
                        text_data.document_resources and
                        hasattr(text_data.document_resources, 'font_set') and
                        text_data.document_resources.font_set):
                        
                        for font in text_data.document_resources.font_set:
                            for attr in ['name', 'postscript_name', 'family_name', 'font_name']:
                                if hasattr(font, attr):
                                    value = getattr(font, attr)
                                    if value and isinstance(value, str):
                                        layer_info['fonts_found'].append(value)
                                        results['extracted_fonts'].add(value)
                    
                    # Via style_runs
                    if hasattr(text_data, 'style_runs') and text_data.style_runs:
                        for run in text_data.style_runs:
                            if hasattr(run, 'style') and run.style:
                                for attr in ['font', 'font_name', 'font_family']:
                                    if hasattr(run.style, attr):
                                        value = getattr(run.style, attr)
                                        if value and isinstance(value, str):
                                            layer_info['fonts_found'].append(value)
                                            results['extracted_fonts'].add(value)
                
                results['text_layers'].append(layer_info)
                
    except Exception as e:
        print(f"[AVISO] Erro na análise psd-tools: {e}")
    
    # 2. Análise via psdtxtractor
    psdtxt_output = run_psdtxtractor(psd_path)
    if psdtxt_output:
        results['psdtxtractor_info'] = parse_psdtxtractor_output(psdtxt_output)
        
        # Adiciona informações do psdtxtractor aos layers
        for layer_name, psdtxt_data in results['psdtxtractor_info'].items():
            if psdtxt_data.get('type') == 'text' and 'font' in psdtxt_data:
                font_name = psdtxt_data['font']
                results['extracted_fonts'].add(font_name)
                
                # Adiciona à layer correspondente
                for layer_info in results['text_layers']:
                    if layer_info['name'] == layer_name:
                        if font_name not in layer_info['fonts_found']:
                            layer_info['fonts_found'].append(font_name)
    
    return results

def main():
    if len(sys.argv) != 2:
        print("Uso: python psd_font_extractor_hybrid.py <arquivo.psd>")
        sys.exit(1)
    
    psd_path = sys.argv[1]
    
    if not os.path.exists(psd_path):
        print(f"[ERRO] Arquivo não encontrado: {psd_path}")
        sys.exit(1)
    
    print(f"[INFO] Análise híbrida de: {os.path.basename(psd_path)}")
    print("[INFO] Usando psd-tools + psdtxtractor...")
    
    # Executa análise completa
    results = analyze_psd_advanced(psd_path)
    
    print(f"\n{'='*60}")
    print("RESULTADO DA ANÁLISE HÍBRIDA")
    print(f"{'='*60}")
    
    # Mostra informações do arquivo
    if results['psd_tools_info']:
        info = results['psd_tools_info']
        print(f"[PSD] Dimensões: {info['width']}x{info['height']}, Layers: {info['layers_count']}")
    
    # Mostra layers de texto encontradas
    print(f"\n[LAYERS DE TEXTO] Encontradas {len(results['text_layers'])} layers:")
    
    for layer in results['text_layers']:
        print(f"  • {layer['name']}: '{layer['text']}'")
        
        if layer['fonts_found']:
            print(f"    Fontes: {', '.join(set(layer['fonts_found']))}")
        
        # Adiciona informações do psdtxtractor se disponível
        psdtxt_info = results['psdtxtractor_info'].get(layer['name'], {})
        if 'font_size' in psdtxt_info:
            print(f"    Tamanho: {psdtxt_info['font_size']}")
        if 'color' in psdtxt_info:
            print(f"    Cor: rgba({psdtxt_info['color']})")
    
    # Resultado final de fontes
    if results['extracted_fonts']:
        unique_fonts = sorted(list(results['extracted_fonts']))
        print(f"\n[FONTES EXTRAÍDAS] Total: {len(unique_fonts)}")
        
        for i, font in enumerate(unique_fonts, 1):
            print(f"  {i}. {font}")
        
        # Salva resultado completo
        output_data = {
            'source_file': psd_path,
            'analysis_methods': ['psd-tools', 'psdtxtractor'],
            'fonts_extracted': unique_fonts,
            'total_fonts': len(unique_fonts),
            'text_layers_details': results['text_layers'],
            'psd_info': results['psd_tools_info'],
            'psdtxtractor_raw': results['psdtxtractor_info']
        }
        
        output_file = psd_path.replace('.psd', '_fonts_hybrid.json')
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)
        
        # Lista simples de fontes
        txt_file = psd_path.replace('.psd', '_fonts_hybrid.txt')
        with open(txt_file, 'w', encoding='utf-8') as f:
            f.write(f"Fontes extraídas de: {os.path.basename(psd_path)}\\n")
            f.write(f"Métodos: psd-tools + psdtxtractor\\n")
            f.write(f"Total: {len(unique_fonts)} fontes\\n\\n")
            for i, font in enumerate(unique_fonts, 1):
                f.write(f"{i}. {font}\\n")
        
        print(f"\n[SALVOS]")
        print(f"  Completo: {output_file}")
        print(f"  Lista:    {txt_file}")
        
    else:
        print(f"\n[AVISO] Nenhuma fonte foi extraída do arquivo")
        print(f"[INFO] Detalhes salvos para análise:")
        
        debug_file = psd_path.replace('.psd', '_debug.json')
        with open(debug_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False, default=str)
        
        print(f"  Debug: {debug_file}")
        
        print(f"[SUGESTÕES]")
        print(f"  1. Verifique se o PSD tem layers de texto")
        print(f"  2. Teste abrir o PSD no Photoshop")
        print(f"  3. Verifique se as fontes são padrão ou customizadas")

if __name__ == "__main__":
    main()