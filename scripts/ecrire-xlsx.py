"""Écrit un classeur .xlsx simple (une feuille) sans bibliothèque : zipfile + XML.
Pour les fichiers remis à Sarah dans ~/exports (jamais de .csv : Excel français
les ouvre mal). Usage : python3 -I scripts/ecrire-xlsx.py <sortie.xlsx> <données.json> <nom de feuille>
Le JSON : {"colonnes": [...], "lignes": [[...], ...], "largeurs": [...]}.
"""
import json, sys, zipfile
from xml.sax.saxutils import escape

sortie, donnees_path, nom_feuille = sys.argv[1], sys.argv[2], sys.argv[3]
d = json.load(open(donnees_path, encoding="utf-8"))
colonnes, lignes, largeurs = d["colonnes"], d["lignes"], d.get("largeurs", [])

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
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        return f'<c r="{ref}"{st}><v>{v}</v></c>'
    return f'<c r="{ref}" t="inlineStr"{st}><is><t xml:space="preserve">{escape(str(v))}</t></is></c>'

rows = ['<row r="1">' + "".join(cellule(f"{lettre(i)}1", c, 1) for i, c in enumerate(colonnes)) + "</row>"]
for n, ligne in enumerate(lignes, start=2):
    rows.append(f'<row r="{n}">' + "".join(cellule(f"{lettre(i)}{n}", v) for i, v in enumerate(ligne)) + "</row>")
cols = "<cols>" + "".join(f'<col min="{i+1}" max="{i+1}" width="{w}" customWidth="1"/>' for i, w in enumerate(largeurs)) + "</cols>" if largeurs else ""
dernier = f"{lettre(len(colonnes)-1)}{len(lignes)+1}"
sheet = f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>{cols}<sheetData>{"".join(rows)}</sheetData><autoFilter ref="A1:{dernier}"/></worksheet>'
styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF3E3E2"/></patternFill></fill></fills><borders count="1"><border/></borders><cellXfs count="2"><xf fontId="0" fillId="0" borderId="0"/><xf fontId="1" fillId="2" borderId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>'
wb = f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="{escape(nom_feuille)}" sheetId="1" r:id="rId1"/></sheets></workbook>'
wb_rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'
rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
types = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'
with zipfile.ZipFile(sortie, "w", zipfile.ZIP_DEFLATED) as z:
    for nom, contenu in [("[Content_Types].xml", types), ("_rels/.rels", rels), ("xl/workbook.xml", wb), ("xl/_rels/workbook.xml.rels", wb_rels), ("xl/styles.xml", styles), ("xl/worksheets/sheet1.xml", sheet)]:
        z.writestr(nom, contenu)
print("écrit", sortie, len(lignes), "lignes")
