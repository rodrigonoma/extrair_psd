#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Extrai fontes de arquivos PSD/PSB.
Requer: psd-tools (pip install psd-tools)
Uso:
  python extract_psd_fonts.py caminho/arquivo.psd
  python extract_psd_fonts.py caminho/arquivo.psd --json
"""

import argparse
import json
from typing import Dict, List, Set, Any
from psd_tools import PSDImage

# ordem de preferência dos campos que costumam existir no FontSet
FONT_NAME_KEYS = ("PostScriptName", "Name", "FontName", "FontFamilyName", "FontFamily")

def _safe_get(d: Dict, *keys, default=None):
    cur = d
    for k in keys:
        if not isinstance(cur, dict) or k not in cur:
            return default
        cur = cur[k]
    return cur

def _font_name_from_fontset_entry(entry: Dict[str, Any]) -> str:
    for k in FONT_NAME_KEYS:
        v = entry.get(k)
        if v:
            return str(v)
    return ""

def fonts_from_text_layer(layer) -> List[str]:
    """
    Retorna a lista (sem duplicados) de nomes de fonte usados em uma camada de texto.
    Lê engine_dict.ResourceDict.FontSet e mapeia os índices usados em StyleRun.RunArray[*].StyleSheet.StyleSheetData.Font.
    """
    names: Set[str] = set()

    # psd-tools expõe dicionários prontos
    engine = getattr(layer, "engine_dict", None) or {}
    # algumas versões também expõem resource_dict separado
    resource_dict = engine.get("ResourceDict") or getattr(layer, "resource_dict", {}) or {}

    font_set = resource_dict.get("FontSet", []) or []
    style_run = engine.get("StyleRun") or {}
    runs = style_run.get("RunArray", []) or []

    # quando não há runs, alguns PSDs guardam o estilo em "StyleSheetSet"
    if not runs:
        style_sheet_set = engine.get("StyleSheetSet") or {}
        # ainda assim, o índice costuma estar na própria camada de texto; tentamos pegar de StyleSheetData
        single_idx = _safe_get(style_sheet_set, "StyleSheetData", "Font")
        if isinstance(single_idx, int) and 0 <= single_idx < len(font_set):
            names.add(_font_name_from_fontset_entry(font_set[single_idx]))

    for r in runs:
        idx = _safe_get(r, "StyleSheet", "StyleSheetData", "Font")
        if isinstance(idx, int) and 0 <= idx < len(font_set):
            entry = font_set[idx]
            name = _font_name_from_fontset_entry(entry)
            if name:
                names.add(name)

    return sorted(names)

def extract_fonts(psd_path: str):
    psd = PSDImage.open(psd_path)
    all_fonts: Set[str] = set()
    per_layer: List[Dict[str, Any]] = []

    for layer in psd.descendants():
        # só camadas de texto
        if getattr(layer, "kind", None) == "type":
            layer_fonts = fonts_from_text_layer(layer)
            # fallback extra (quando o engine_dict é muito pobre)
            if not layer_fonts:
                # alguns PSDs permitem pegar família/peso do "text_data" do psd-tools
                try:
                    td = layer.get_text_data()  # pode levantar exceção em versões antigas
                    # PostScript name costuma estar em td.font_set também
                    font_set = td.font_set or []
                    for f in font_set:
                        # f.postscript_name é comum; caímos para family se não houver
                        nm = getattr(f, "postscript_name", "") or getattr(f, "family", "")
                        if nm:
                            layer_fonts.append(nm)
                except Exception:
                    pass

            per_layer.append({
                "layer_name": layer.name,
                "fonts": sorted(set(layer_fonts))
            })
            for n in layer_fonts:
                all_fonts.add(n)

    return sorted(all_fonts), per_layer

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("psd", help="Caminho do arquivo .psd ou .psb")
    ap.add_argument("--json", action="store_true", help="Imprimir resultado em JSON")
    args = ap.parse_args()

    all_fonts, per_layer = extract_fonts(args.psd)

    if args.json:
        print(json.dumps({
            "file": args.psd,
            "fonts": all_fonts,
            "layers": per_layer,
        }, ensure_ascii=False, indent=2))
    else:
        print(f"Arquivo: {args.psd}")
        print("Fontes únicas encontradas:")
        for f in all_fonts:
            print("  -", f)
        print("\nPor camada:")
        for item in per_layer:
            print(f"  [{item['layer_name']}]")
            if item["fonts"]:
                for f in item["fonts"]:
                    print("    •", f)
            else:
                print("    (sem fonte ou camada sem runs)")

if __name__ == "__main__":
    main()