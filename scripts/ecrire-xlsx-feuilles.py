"""Écrit un classeur .xlsx à PLUSIEURS feuilles, sans bibliothèque : zipfile + XML.
Même présentation que ecrire-xlsx.py (en-tête rose, filtre, première ligne figée),
pour les fichiers remis à Sarah dans ~/exports (jamais de .csv).
Usage : python3 -I scripts/ecrire-xlsx-feuilles.py <sortie.xlsx> <données.json>
Le JSON : {"feuilles": [{"nom": "...", "colonnes": [...], "lignes": [[...], ...], "largeurs": [...]}, ...]}.
"""
import json, sys, zipfile
from xml.sax.saxutils import escape

sortie, donnees_path = sys.argv[1], sys.argv[2]
feuilles = json.load(open(donnees_path, encoding="utf-8"))["feuilles"]

def lettre(i):
    s, i = "", i + 1
    while i:
        i, r = divmod(i - 1, 26)
        s = chr(65 + r) + s
    return s

def cellule(ref, v, style=None):
    st = f' s="{style}"' if style else ""
    if v is None or v == "":
        return ""
    if isinstance(v, bool):
        v = "oui" if v else "non"
    if isinstance(v, (int, float)):
        return f'<c r="{ref}"{st}><v>{v}</v></c>'
    return f'<c r="{ref}" t="inlineStr"{st}><is><t xml:space="preserve">{escape(str(v))}</t></is></c>'

def xml_feuille(f):
    colonnes, lignes, largeurs = f["colonnes"], f["lignes"], f.get("largeurs", [])
    rows = ['<row r="1">' + "".join(cellule(f"{lettre(i)}1", c, 1) for i, c in enumerate(colonnes)) + "</row>"]
    for n, ligne in enumerate(lignes, start=2):
        rows.append(f'<row r="{n}">' + "".join(cellule(f"{lettre(i)}{n}", v) for i, v in enumerate(ligne)) + "</row>")
    cols = "<cols>" + "".join(f'<col min="{i+1}" max="{i+1}" width="{w}" customWidth="1"/>' for i, w in enumerate(largeurs)) + "</cols>" if largeurs else ""
    dernier = f"{lettre(len(colonnes)-1)}{len(lignes)+1}"
    return f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>{cols}<sheetData>{"".join(rows)}</sheetData><autoFilter ref="A1:{dernier}"/></worksheet>'

n = len(feuilles)
styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF3E3E2"/></patternFill></fill></fills><borders count="1"><border/></borders><cellXfs count="2"><xf fontId="0" fillId="0" borderId="0"/><xf fontId="1" fillId="2" borderId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>'
wb = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + "".join(f'<sheet name="{escape(f["nom"])}" sheetId="{i+1}" r:id="rId{i+1}"/>' for i, f in enumerate(feuilles)) + "</sheets></workbook>"
wb_rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + "".join(f'<Relationship Id="rId{i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{i+1}.xml"/>' for i in range(n)) + f'<Relationship Id="rId{n+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'
rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
types = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' + "".join(f'<Override PartName="/xl/worksheets/sheet{i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' for i in range(n)) + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'
with zipfile.ZipFile(sortie, "w", zipfile.ZIP_DEFLATED) as z:
    for nom, contenu in [("[Content_Types].xml", types), ("_rels/.rels", rels), ("xl/workbook.xml", wb), ("xl/_rels/workbook.xml.rels", wb_rels), ("xl/styles.xml", styles)]:
        z.writestr(nom, contenu)
    for i, f in enumerate(feuilles):
        z.writestr(f"xl/worksheets/sheet{i+1}.xml", xml_feuille(f))
print("écrit", sortie, [(f["nom"], len(f["lignes"])) for f in feuilles])
