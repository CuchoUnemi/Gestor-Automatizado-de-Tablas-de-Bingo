"""
Run this AFTER uploading a PDF through the web interface.
It reads the uploaded file saved by the debug hook.
"""
import fitz
import os

pdf_path = os.path.join(os.path.dirname(__file__), "last_upload.pdf")
if not os.path.exists(pdf_path):
    print(f"No file at {pdf_path}")
    print("Upload a PDF through the web interface first - it will be saved automatically.")
    exit()

print(f"Opening: {pdf_path}")
doc = fitz.open(pdf_path)
page = doc[0]

# 1. Raw text
raw = page.get_text()
print("=== RAW TEXT (first 2000 chars) ===")
print(repr(raw[:2000]))
print()

# 2. Text dict
print("=== ALL TEXT SPANS ON PAGE 1 ===")
d = page.get_text("dict")
for bi, block in enumerate(d["blocks"]):
    if "lines" not in block:
        print(f"  Block {bi}: IMAGE block, bbox={block.get('bbox')}")
        continue
    for line in block["lines"]:
        for span in line["spans"]:
            txt = span["text"].strip()
            if txt:
                print(f"  text={txt!r:15s}  bbox=({span['bbox'][0]:.0f},{span['bbox'][1]:.0f},{span['bbox'][2]:.0f},{span['bbox'][3]:.0f})  size={span['size']:.1f}")

print()
print(f"Total pages: {len(doc)}")
print(f"Total blocks on page 1: {len(d['blocks'])}")
