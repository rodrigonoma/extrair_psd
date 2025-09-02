#!/usr/bin/env python3
"""
Quick font extractor for PSD files by scanning binary data.

This script is a lightweight alternative to using the `psd-tools` library when
you only need a rough estimate of the fonts used in a PSD/PSB file.  It
scans the raw bytes of the file, removes null bytes, decodes the remainder
as Latin‑1 text, and looks for ASCII sequences that contain common font
keywords (e.g. "Bold", "Light", "Thin", "Regular", etc.).  The result is a
deduplicated list of candidate font names.

Note that this approach is heuristic and may miss fonts or include false
positives.  For a more robust solution, use `psd-tools` as demonstrated in
`font_extractor/extract_fonts.py`.

Usage:
    python scan_fonts_binary.py /path/to/file.psd
    python scan_fonts_binary.py /path/to/file.psd --json
"""

import argparse
import json
import os
import re
import sys
from typing import List, Set


def scan_file_for_fonts(path: str) -> List[str]:
    """Scan a PSD/PSB file for potential font names.

    Args:
        path: Path to the PSD/PSB file.

    Returns:
        A sorted list of candidate font names (deduplicated).
    """
    if not os.path.isfile(path):
        raise FileNotFoundError(f"File not found: {path}")
    with open(path, "rb") as f:
        data = f.read()

    # Remove null bytes, which appear in UTF‑16 encoded strings.
    # We use Latin‑1 to decode remaining bytes into a string.
    text = data.replace(b"\x00", b"").decode("latin-1", errors="ignore")

    # Regular expression to find sequences of printable ASCII characters.
    # We allow letters, numbers, spaces, underscores, hyphens and slashes.
    words = re.findall(r"[A-Za-z0-9][A-Za-z0-9 _\-/]{2,}", text)

    # Terms that suggest a word is a font name.  These are typical weights
    # or styles found in font names.
    terms = [
        "Bold",
        "Light",
        "Regular",
        "Italic",
        "Thin",
        "Medium",
        "Black",
        "Semibold",
        "Condensed",
        "Heavy",
        "Ultra",
        "Book",
    ]

    candidates: Set[str] = set()
    for w in words:
        if any(t in w for t in terms):
            # Normalize by stripping leading/trailing slashes or spaces
            name = w.strip().strip("/")
            # Filter out known non-font flags
            if name.lower() not in {"fauxbold false", "fauxitalic false"}:
                # Exclude overly long names
                if 0 < len(name) <= 50:
                    candidates.add(name)

    return sorted(candidates)


def main(argv: List[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Scan a PSD/PSB file for probable font names by examining the binary contents."
        )
    )
    parser.add_argument("file", help="Path to the PSD or PSB file to analyse.")
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output the result as JSON instead of plain text.",
    )
    args = parser.parse_args(argv)

    try:
        fonts = scan_file_for_fonts(args.file)
    except Exception as exc:
        sys.stderr.write(f"Error: {exc}\n")
        sys.exit(1)

    if args.json:
        print(json.dumps({"file": args.file, "fonts": fonts}, ensure_ascii=False, indent=2))
    else:
        print(f"Arquivo: {args.file}")
        if fonts:
            print("Possíveis fontes encontradas:")
            for name in fonts:
                print(f"  - {name}")
        else:
            print("Nenhuma fonte reconhecível encontrada.")


if __name__ == "__main__":
    main()