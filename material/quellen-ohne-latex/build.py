#!/usr/bin/env python3
"""Metro-Planspiel: erzeugt die PDFs ohne LaTeX (HTML/CSS -> Chromium -> PDF).
Aufruf: python3 build.py            (beide Varianten)
        python3 build.py 45|90      (eine Variante)
Alle Grafiken sind eigene SVG-Zeichnungen, keine Spielgrafiken."""
import sys, math, asyncio, html
from pathlib import Path

OUT = Path(__file__).parent
G = {  # Gruppen
 'N': dict(nr=1, name='Die Hydroponiker', kurz='Hydroponiker', gut='Nahrung', ort='Gewächshaus und Pilzkeller', col='#2e7d32', ico='pilz'),
 'W': dict(nr=2, name='Die Wasserwerker', kurz='Wasserwerker', gut='Wasser', ort='Pumpenraum und Filteranlage', col='#1565c0', ico='tropfen'),
 'E': dict(nr=3, name='Die Techniker', kurz='Techniker', gut='Energie', ort='Kraftwerk und Werkstatt', col='#d67800', ico='blitz'),
 'M': dict(nr=4, name='Die Sanitäter', kurz='Sanitäter', gut='Medikamente', ort='Krankenstation und Quarantänebereich', col='#c62828', ico='kreuz'),
 'S': dict(nr=5, name='Die Wächter', kurz='Wächter', gut='Schutzmaterial', ort='Zugangsschleusen und Lager', col='#555a60', ico='schild'),
}
ORDER = 'NWEMS'

# ---------------------------------------------------------------- SVG
def icon(kind, color='#fff', size=26):
    p = {
     'pilz': '<path d="M3 13a9 8 0 0118 0z"/><rect x="9.5" y="13" width="5" height="7" rx="2"/>',
     'tropfen': '<path d="M12 2C8 8 5.5 11 5.5 15a6.5 6.5 0 0013 0C18.5 11 16 8 12 2z"/>',
     'blitz': '<path d="M13.5 2L5 13.5h5.5L9.5 22 19 9.5h-5.8z"/>',
     'kreuz': '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',
     'schild': '<path d="M12 2l8 3v6c0 5-3.4 8.7-8 11-4.6-2.3-8-6-8-11V5z"/>',
    }[kind]
    return f'<svg class="ico" viewBox="0 0 24 24" width="{size}" height="{size}" fill="{color}">{p}</svg>'

def trefoil_paths(r_in=.22, r_out=.85):
    out = []
    for a in (90, 210, 330):
        a0, a1 = math.radians(a - 30), math.radians(a + 30)
        pt = lambda r, t: (r * math.cos(t), -r * math.sin(t))
        x0, y0 = pt(r_in, a0); x1, y1 = pt(r_out, a0); x2, y2 = pt(r_out, a1); x3, y3 = pt(r_in, a1)
        out.append(f'M{x0:.3f},{y0:.3f}L{x1:.3f},{y1:.3f}A{r_out},{r_out} 0 0 0 {x2:.3f},{y2:.3f}L{x3:.3f},{y3:.3f}A{r_in},{r_in} 0 0 1 {x0:.3f},{y0:.3f}Z')
    return ''.join(out)

def trefoil(size=40, fg='#111', bg='#f2a900', ring=True):
    return (f'<svg viewBox="-1.1 -1.1 2.2 2.2" width="{size}" height="{size}">'
            + (f'<circle r="1.05" fill="{bg}" stroke="{fg}" stroke-width=".07"/>' if ring else '')
            + f'<circle r=".13" fill="{fg}"/><path d="{trefoil_paths()}" fill="{fg}"/></svg>')

def figure(x, y, s, fill='#000', lens='#ffb347'):
    return (f'<g transform="translate({x},{y}) scale({s})" fill="{fill}">'
            '<path d="M-38,66 L-38,26 Q-20,14 -8,12 L8,12 Q20,14 38,26 L38,66Z"/>'
            '<ellipse cx="0" cy="-14" rx="24" ry="30"/><rect x="-8" y="10" width="16" height="12"/>'
            '<ellipse cx="0" cy="8" rx="11" ry="12"/>'
            f'<circle cx="-10" cy="-12" r="7" fill="{lens}"/><circle cx="10" cy="-12" r="7" fill="{lens}"/></g>')

def szene(w=800, h=360, schild=True, figs=True):
    cx, cy = w / 2, h * 0.56
    s = [f'<svg viewBox="0 0 {w} {h}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" class="szene">',
         '<defs><linearGradient id="fog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".9"/></linearGradient>'
         '<radialGradient id="glow"><stop offset="0" stop-color="#ffd27a" stop-opacity=".95"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient></defs>',
         f'<rect width="{w}" height="{h}" fill="#050505"/>']
    for k in range(9):
        f = 1 - 0.105 * k
        g = 18 + 17 * k
        col = f'rgb({int(g*1.0)},{int(g*.62)},{int(g*.22)})'
        rw, rh = w * 0.56 * f, h * 0.58 * f
        s.append(f'<rect x="{cx-rw:.1f}" y="{cy-rh:.1f}" width="{2*rw:.1f}" height="{2*rh:.1f}" rx="{26*f:.1f}" fill="{col}"/>')
    # Deckenrohre
    for sg in (-1, 1):
        for yy, wd, c in ((0.12, 7, '#2a2a2a'), (0.2, 3, '#3a3a3a'), (0.3, 5, '#222')):
            s.append(f'<line x1="{cx-sg*cx:.1f}" y1="{h*yy:.1f}" x2="{cx-sg*34:.1f}" y2="{cy-h*0.1:.1f}" stroke="{c}" stroke-width="{wd}"/>')
    # Gleise
    vy = cy - 14
    s.append(f'<line x1="{w*.25}" y1="{h}" x2="{cx-12}" y2="{vy}" stroke="#8a8a8a" stroke-width="4"/>')
    s.append(f'<line x1="{w*.75}" y1="{h}" x2="{cx+12}" y2="{vy}" stroke="#8a8a8a" stroke-width="4"/>')
    for t in (0.1, 0.22, 0.38, 0.58, 0.82):
        y = h - (h - vy) * t
        xl = w * .25 + (cx - 12 - w * .25) * t
        xr = w * .75 - (w * .75 - cx - 12) * t
        s.append(f'<line x1="{xl-18*(1-t)-6:.1f}" y1="{y:.1f}" x2="{xr+18*(1-t)+6:.1f}" y2="{y:.1f}" stroke="#4a4a4a" stroke-width="{3*(1-t)+1:.1f}"/>')
    if figs:
        s.append(figure(cx - 26, vy + 12, 0.34))
        s.append(figure(cx + 18, vy + 15, 0.29))
    # Lampen
    for f in (0.92, 0.78, 0.64, 0.5, 0.38):
        for sg in (-1, 1):
            x = cx + sg * w * 0.56 * f * 0.94
            y = cy - h * 0.58 * f * 0.35
            s.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{34*f:.1f}" fill="url(#glow)"/><circle cx="{x:.1f}" cy="{y:.1f}" r="{4.5*f+1:.1f}" fill="#fff3c4"/>')
    if schild:
        s.append(f'<g transform="translate({w*.14:.1f},{h*.36:.1f}) scale(26)"><circle r="1.05" fill="#f2a900" stroke="#000" stroke-width=".07"/><circle r=".13"/><path d="{trefoil_paths()}"/></g>')
    s.append(f'<rect y="{h*.62}" width="{w}" height="{h*.38}" fill="url(#fog)"/>')
    s.append('</svg>')
    return ''.join(s)

def warn(h=10):
    return f'<div class="warn" style="height:{h}px"></div>'

# ---------------------------------------------------------------- CSS
CSS = '''
@page{size:A4;margin:0}
:root{--ink:#1a1a1c;--asph:#161618;--paper:#f1ece0;--amber:#f2a900;--rust:#a4431b;--mut:#5d5a52;
--N:#2e7d32;--W:#1565c0;--E:#d67800;--M:#c62828;--S:#555a60}
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'Inter','DejaVu Sans',sans-serif;color:var(--ink);font-size:10.4pt;line-height:1.5;background:#888}
.page{width:210mm;height:297mm;position:relative;overflow:hidden;background:var(--paper);page-break-after:always;padding:15mm 15mm 17mm;display:flex;flex-direction:column}
.page:last-child{page-break-after:auto}
.page::before{content:"";position:absolute;inset:0;pointer-events:none;
 background:radial-gradient(120% 90% at 50% 40%,rgba(0,0,0,0) 55%,rgba(60,40,10,.16) 100%)}
.runhead{position:absolute;left:15mm;right:15mm;top:6.5mm;display:flex;justify-content:space-between;align-items:center;font-size:7pt;letter-spacing:.14em;text-transform:uppercase;color:var(--mut)}
.runhead b{color:var(--rust)}
.runfoot{position:absolute;left:15mm;right:15mm;bottom:6mm;display:flex;justify-content:space-between;font-size:7pt;color:var(--mut);border-top:.4mm solid #c9c1ad;padding-top:1.6mm}
.sp{height:3mm}
h1,h2,h3,.cond{font-family:'Inter','DejaVu Sans',sans-serif}
.sign{display:flex;align-items:stretch;background:var(--asph);color:#fff;margin:0 0 5mm;border-bottom:1.3mm solid var(--amber);border-radius:1mm 1mm 0 0}
.sign .tag{width:11mm;background:var(--amber);color:var(--asph);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:15pt;border-radius:1mm 0 0 0}
.sign .t{padding:3.2mm 5mm;font-weight:800;font-size:17pt;letter-spacing:.02em;line-height:1.15;flex:1}
.sign .t small{display:block;font-weight:500;font-size:8.5pt;letter-spacing:.04em;color:#cfc9b8;margin-top:.6mm}
.sign .r{display:flex;align-items:center;padding-right:5mm}
h3{font-size:11.5pt;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--rust);margin:5mm 0 1.8mm;display:flex;align-items:center;gap:2.5mm}
h3::after{content:"";flex:1;height:.35mm;background:repeating-linear-gradient(90deg,#b9ae93 0 2mm,transparent 2mm 3.5mm)}
p{margin-bottom:2.2mm}
ul,ol{margin:0 0 2.5mm 5mm}li{margin-bottom:1.2mm}
.warn{background:repeating-linear-gradient(-45deg,var(--amber) 0 7px,#111 7px 14px);border-radius:.6mm;margin:3mm 0}
.box{border:.4mm solid #bdb299;border-left:2mm solid var(--c,#555);border-radius:1.2mm;background:#fbf8f0;padding:3mm 4mm;margin:0 0 3.2mm}
.box>b:first-child,.box .bt{display:block;font-weight:800;font-size:9.4pt;letter-spacing:.06em;text-transform:uppercase;color:var(--c,#333);margin-bottom:1mm}
.box.dark{background:var(--asph);color:#f1ece0;border-color:var(--asph);border-left-color:var(--amber)}
.box.dark .bt{color:var(--amber)}
.box.ev{--c:#b8860b;background:#fff7dc}
.box.lk{--c:var(--rust)}
.small{font-size:9.2pt;line-height:1.42}.xs{font-size:8.4pt;line-height:1.38}
table{border-collapse:collapse;width:100%;margin:0 0 3mm}
th,td{border:.3mm solid #b5aa90;padding:1.6mm 2.2mm;text-align:left;vertical-align:top;font-size:9pt;line-height:1.38}
th{background:var(--asph);color:#fff;font-weight:700;font-size:8.2pt;letter-spacing:.06em;text-transform:uppercase}
td.c,th.c{text-align:center}
.dot{display:inline-block;width:4.1mm;height:4.1mm;border-radius:50%;vertical-align:-.9mm;margin-right:.6mm;border:.3mm solid rgba(0,0,0,.45)}
.dN{background:var(--N)}.dW{background:var(--W)}.dE{background:var(--E)}.dM{background:var(--M)}.dS{background:var(--S)}
.ph{display:inline-block;background:var(--asph);color:var(--amber);font-weight:800;font-size:8pt;width:4.3mm;height:4.3mm;line-height:4.3mm;text-align:center;border-radius:50%;vertical-align:.2mm}
.lines{margin:1mm 0 2.5mm}.lines i{display:block;height:6.6mm;border-bottom:.3mm solid #8e856e}
.cols{display:flex;gap:5mm}.cols>*{flex:1}
.grow{flex:1}
.page>*{flex-shrink:0}
.page>.grow,.page>.fill{flex-shrink:1}
.cut{border:.45mm dashed #6b6454;border-radius:1.4mm;padding:3mm 4mm;margin-bottom:3.6mm;background:#fcfaf3;position:relative}
.cut::before{content:"✂";position:absolute;left:-.5mm;top:-3.4mm;font-size:9pt;background:var(--paper);padding:0 1mm;color:#6b6454}
/* Gruppenkarte */
.gkopf{display:flex;align-items:stretch;background:var(--asph);color:#fff;border-radius:1.5mm;overflow:hidden;margin-bottom:5mm;border-bottom:1.3mm solid var(--amber)}
.gkopf .nr{width:25mm;background:var(--gc);display:flex;align-items:center;justify-content:center;font-size:40pt;font-weight:900;color:#fff}
.gkopf .tx{flex:1;padding:4mm 5mm}
.gkopf .tx b{display:block;font-size:20pt;font-weight:800;line-height:1.1}
.gkopf .tx span{font-size:9pt;letter-spacing:.12em;text-transform:uppercase;color:var(--amber);font-weight:700}
.gkopf .ic{display:flex;align-items:center;padding-right:6mm}
.wtab td,.wtab th{text-align:center;padding:1.8mm}
.wtab td:first-child,.wtab th:first-child{text-align:left}
.need{background:#fbf8f0;border:.3mm solid #bdb299;border-radius:1.2mm;padding:2.4mm 3.6mm;margin:2mm 0 3mm}
.chip{display:inline-block;background:var(--gc);color:#fff;font-weight:800;font-size:8.5pt;padding:.4mm 2.2mm;border-radius:5mm;margin-right:1.5mm}
.mark{display:inline-flex;align-items:center;justify-content:center;width:10mm;height:10mm;border-radius:50%;font-weight:800;color:#fff;font-size:10pt;border:.5mm dashed rgba(0,0,0,.45);margin:0 1.5mm 2mm 0}
.station{border-radius:2mm;color:#fff;text-align:center;padding:4mm 2mm;margin-bottom:4mm;border:.7mm solid #111;position:relative;background:var(--gc);flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center}
.station .e{font-size:19pt;font-weight:900;letter-spacing:.14em}
.station .n{font-size:34pt;font-weight:900;line-height:1.1;display:flex;align-items:center;gap:6mm}
.station .o{font-size:12pt;letter-spacing:.06em}
.stab{display:flex;gap:2.2mm;margin:3mm 0}
.stab div{flex:1;height:17mm;border:.5mm solid #111;border-radius:1.5mm;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:18pt}
.timeline{margin:0 0 3mm}
.tl{display:flex;margin-bottom:2.4mm;border:.3mm solid #b5aa90;border-radius:1.2mm;overflow:hidden;background:#fbf8f0}
.tl .z{width:19mm;background:var(--asph);color:var(--amber);font-weight:800;font-size:9.4pt;display:flex;align-items:center;justify-content:center;text-align:center;padding:1mm}
.tl .p{padding:2.4mm 3.4mm;flex:1;font-size:9pt;line-height:1.4}
.tl .p b{display:block;font-size:9.6pt;color:var(--rust);margin-bottom:.4mm}
.raum{position:relative;height:52mm;border:.4mm solid #6b6454;border-radius:2mm;background:#e9e2d0;margin:2mm 0 3mm}
.raum .s{position:absolute;width:42mm;height:13mm;border-radius:1.4mm;color:#fff;font-weight:700;font-size:8.2pt;display:flex;align-items:center;justify-content:center;text-align:center;line-height:1.2}
.raum .m{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:58mm;height:20mm;border-radius:50%;background:var(--asph);color:var(--amber);font-weight:800;font-size:8.6pt;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;border:.6mm solid var(--amber)}
.bilanz td{height:7.6mm}
.hide-print{display:none}
/* Titelseite */
.cover{background:#050505;color:#f1ece0;padding:0}
.cover::before{display:none}
.cover .scene{height:158mm;position:relative}
.cover .scene svg{width:100%;height:100%;display:block}
.cover .scene .badge{position:absolute;left:0;right:0;top:12mm;text-align:center}
.cover .scene .badge span{display:inline-block;background:var(--amber);color:#000;font-weight:900;letter-spacing:.3em;font-size:17pt;padding:2.4mm 9mm;border-radius:1mm}
.cover .body{flex:1;padding:6mm 18mm 0;background:linear-gradient(#050505,#15110c);text-align:center;position:relative}
.cover h1{font-size:45pt;line-height:1.02;font-weight:900;letter-spacing:.04em;color:#e8571f;text-transform:uppercase;margin:0 0 3mm;text-shadow:0 0 14mm rgba(232,87,31,.45)}
.cover .sub{font-size:12.5pt;color:#d9d2bf;letter-spacing:.05em;margin-bottom:5mm}
.cover .var{display:inline-flex;gap:5mm;align-items:center;margin-top:2mm}
.cover .var b{border:.5mm solid var(--amber);color:var(--amber);padding:2mm 7mm;font-size:13pt;letter-spacing:.2em;text-transform:uppercase;border-radius:1mm;font-weight:800}
.cover .foot{position:absolute;left:18mm;right:18mm;bottom:9mm;display:flex;justify-content:space-between;font-size:7.6pt;color:#8c8470;letter-spacing:.12em;text-transform:uppercase}
.cover .warn{margin:4mm 0}
/* Durchsage */
.durch{background:var(--asph);color:#f1ece0;border-radius:1.8mm;padding:5mm 7mm;font-style:italic;font-size:11pt;line-height:1.55;border-left:2mm solid var(--amber);margin:4mm 0}
.sceneband{height:44mm;border-radius:1.5mm;overflow:hidden;margin-bottom:4mm}
.sceneband svg{width:100%;height:100%;display:block}
.right{text-align:right}
.hr{border-top:.3mm solid #b5aa90;margin:3mm 0}
'''

# ---------------------------------------------------------------- Bausteine
def dot(k): return f'<span class="dot d{k}"></span>'
D = {k: dot(k) for k in ORDER}

class Doc:
    def __init__(s, kurz):
        s.kurz = kurz
        s.pages = []
        s.minutes = 45 if kurz else 90
    def page(s, inner, cls='', head=True, teacher=False):
        n = len(s.pages) + 1
        rh = ''
        if head:
            rh = (f'<div class="runhead"><span><b>Endstation 7</b> · Die letzte Demokratie · {s.minutes} Min.</span>'
                  f'<span>{"Spielleitung" if teacher else "Schülermaterial"}</span></div>'
                  f'<div class="runfoot"><span>Fach: Politik · Planspiel Metro 2033 · Autor/in</span><span>Schuljahr 2026/27</span><span>Seite {n}</span></div>')
        s.pages.append(f'<section class="page {cls}">{rh}{inner}</section>')
    def html(s):
        return f'<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Metro 2033 – Die letzte Demokratie ({s.minutes} Min.)</title><style>{CSS}</style></head><body>{"".join(s.pages)}</body></html>'

def sign(title, sub='', nr=None, right=''):
    tag = f'<div class="tag">{nr}</div>' if nr else '<div class="tag">▶</div>'
    sb = f'<small>{sub}</small>' if sub else ''
    return f'<div class="sign">{tag}<div class="t">{title}{sb}</div><div class="r">{right}</div></div>'

def lines(n): return '<div class="lines">' + '<i></i>' * n + '</div>'
def box(title, body, c='#555', cls=''): return f'<div class="box {cls}" style="--c:{c}"><span class="bt">{title}</span>{body}</div>'

# ---------------------------------------------------------------- Inhalt
def cover(d):
    var = 'Kurzvariante · 45 Minuten' if d.kurz else 'Vollvariante · 90 Minuten'
    d.page(f'''<div class="scene">{szene(900, 600, figs=True)}<div class="badge"><span>ENDSTATION 7</span></div></div>
<div class="body"><h1>Die letzte<br>Demokratie</h1>
<div class="sub">Ein politisches Planspiel in den Tunneln der Metro</div>{warn(9)}
<div class="var"><span>{trefoil(30, '#111', '#f2a900')}</span><b>{var}</b><span>{trefoil(30, '#111', '#f2a900')}</span></div>
<div class="foot"><span>Fach: Politik</span><span>Spielleitung und Schülermaterial</span><span>Autor/in</span></div></div>''', 'cover', head=False)

def spielleitung(d):
    k = d.kurz
    dauer = ('45 Minuten, zwei Spielrunden zu je 24 Stunden Spielzeit.' if k else '90 Minuten (Doppelstunde), drei Spielrunden zu je 16 Stunden Spielzeit.')
    # Seite 1: Überblick
    sonst = ('sichtbarer Timer (Beamer-Countdown), ' if k else '1 Würfel (W6) für Ereignis 2, sichtbarer Timer (Beamer-Countdown), ')
    d.page(sign('Spielleitung', 'Überblick, Lernziele, Vorbereitung', right=trefoil(34, '#161618', '#f2a900')) + f'''
<p class="small">Ein politisches Planspiel für fünf Gruppen nach dem Vorbild der Inseldemokratie. Statt auf einer Insel stranden die Schülerinnen und Schüler (SuS) in der Metrostation <b>Endstation 7</b>. Jede Gruppe kontrolliert ein lebenswichtiges Gut, keine Gruppe kann allein überleben. Innerhalb von 48 Stunden Spielzeit müssen sie sich auf eine Regierungsform und auf Regeln für die Verteilung der knappen Güter einigen.</p>
{box('Auf einen Blick', f"""<ul class="small">
<li><b>Dauer:</b> {dauer}</li>
<li><b>Gruppen:</b> fünf Gruppen mit je 4 bis 6 Personen (20 bis 30 SuS). Bei kleineren Kursen bleiben es fünf Gruppen mit je 3 bis 4 Personen.</li>
<li><b>Ihre Rolle:</b> Bank (Marker ausgeben und einsammeln), Stationslautsprecher (Durchsagen, Ereigniskarten) und Moderation. Sie entscheiden nicht über das Ergebnis.</li>
<li><b>Besonderheit:</b> Jede Gruppe erhält eine <i>Geheimkarte</i> mit einem Vertragsziel. Erst nach der Auflösung zeigt sich, wer seine Interessen durchsetzen konnte.</li></ul>""", '#a4431b', 'lk')}
<h3>Lernziele</h3>
<p class="small">Die SuS …</p>
<ol class="small">
<li>erklären, wie Knappheit, Abhängigkeit und Machtposition die Wahl einer Regierungsform beeinflussen,</li>
<li>vergleichen Regierungsformen (direkte und repräsentative Demokratie, autoritäre Führung, Technokratie, Föderation) anhand von Kriterien wie Entscheidungsgeschwindigkeit, Gerechtigkeit, Machtbegrenzung, Versorgungssicherheit und Konfliktlösung,</li>
<li>verhandeln Interessen, schließen Kompromisse und bewerten Legitimität und Stabilität des Ergebnisses,</li>
<li>diskutieren, wie viel Macht eine Regierung und die Sicherheitskräfte im Notstand erhalten dürfen.</li></ol>
<h3>Vorbereitung (ca. 20 Minuten)</h3>
<ul class="small">
<li><b>Ausdrucken:</b> das Schülermaterial ab Seite {6 if k else 7} (Durchsage). Regelkarte, Gruppenkarte, Bilanzblatt und Infokarten je 1× je Gruppe; Geheimkarten ausschneiden und verdeckt austeilen; Arbeitsblatt; Stationsschilder; Ereignis- und Krankheitskarten (Lehrkraft); <b>Marker auf festes Papier</b> (ausschneiden, nach Gut sortieren); Stabilitätsleiste und Rundenprotokoll (Lehrkraft); Regierungsvertrag (1× für die Konferenz).</li>
<li><b>Sonstiges:</b> {sonst}5 Schalen oder Umschläge für die Marker, 1 Schale für den Gemeinschaftsvorrat, ein Magnet oder eine Büroklammer für die Stabilitätsleiste.</li>
<li><b>Raum:</b> fünf Gruppentische als „Stationen“ an den Wänden mit Stationsschildern, in der Raummitte der Konferenztisch („Metro-Konferenz“) mit Gemeinschaftsvorrat und Regierungsvertrag. Gedimmtes Licht und Tunnelgeräusche unterstützen die Atmosphäre, sollen die Verhandlung aber nicht überdecken.</li></ul>
<div class="sceneband" style="height:32mm;margin-top:2mm">{szene(900, 130, schild=False, figs=False)}</div>''', teacher=True)

    # Seite 2: Raumplan + Spielprinzip
    rows = ''
    kosten = {'N': (1, 2, 2, 1), 'W': (1, 1, 2, 1), 'E': (1, 1, 1, 1), 'M': (1, 1, 2, 0), 'S': (1, 1, 1, 0)}
    start = {'N': 6, 'W': 6, 'E': 5, 'M': 4, 'S': 5}; prod = {'N': 6, 'W': 6, 'E': 6, 'M': 3, 'S': 3}
    for key in ORDER:
        g = G[key]; c = kosten[key]
        cells = ''.join(f'<td class="c">{v if v else "–"}</td>' for v in (c[0], c[1], c[2], 0, c[3]))
        rows += f'<tr><td><b style="color:{g["col"]}">{g["kurz"]}</b></td><td>{g["gut"]}</td><td class="c">{start[key]}</td><td class="c">{prod[key]}</td>{cells}</tr>'
    rows = rows.replace('<td class="c">0</td>', '<td class="c">–</td>')
    krank = 'Runde 1: 3, Runde 2: 5 Medikamente.' if k else 'Runde 1: 3, Runde 2: 4, Runde 3: 5 Medikamente.'
    ohne_q = '' if k else '<tr><td>Aufnahme der Fremden ohne Quarantäne bei Seuche (Würfel 5 bis 6)</td><td class="c"><b>−1</b></td></tr>'
    d.page(sign('Spielprinzip', 'Raumplan, Güter, Runden, Stabilität') + f'''
<div class="raum">
<div class="s" style="left:3mm;top:3mm;background:var(--N)">1 Hydroponiker</div>
<div class="s" style="left:50%;transform:translateX(-50%);top:3mm;background:var(--W)">2 Wasserwerker</div>
<div class="s" style="right:3mm;top:3mm;background:var(--E)">3 Techniker</div>
<div class="s" style="left:3mm;bottom:3mm;background:var(--M)">4 Sanitäter</div>
<div class="s" style="left:50%;transform:translateX(-50%);bottom:3mm;background:#8a6d3b">Bank (Lehrkraft)</div>
<div class="s" style="right:3mm;bottom:3mm;background:var(--S)">5 Wächter (am Eingang)</div>
<div class="m"><span>METRO-KONFERENZ</span><span style="font-weight:500;font-size:7.4pt;color:#d9d2bf">Gemeinschaftsvorrat · Vertrag</span></div></div>
<p class="small">Alle Güter sind <b>Marker</b>: {D['N']}Nahrung, {D['W']}Wasser, {D['E']}Energie, {D['M']}Medikamente, {D['S']}Schutzmaterial. Jede Gruppe startet nur mit ihrem eigenen Gut. Die Betriebskosten zwingen sie, mindestens drei andere Güter einzutauschen.</p>
<table><tr><th>Gruppe</th><th>Gut</th><th class="c">Start</th><th class="c">Prod.</th><th class="c" colspan="5">Betriebskosten je Runde</th></tr>
<tr><td colspan="4" style="background:#e4dcc8"></td><td class="c" style="background:#e4dcc8">{D['N']}</td><td class="c" style="background:#e4dcc8">{D['W']}</td><td class="c" style="background:#e4dcc8">{D['E']}</td><td class="c" style="background:#e4dcc8">{D['M']}</td><td class="c" style="background:#e4dcc8">{D['S']}</td></tr>
{rows}<tr><td><b>Summe</b></td><td></td><td></td><td></td><td class="c"><b>5</b></td><td class="c"><b>6</b></td><td class="c"><b>8</b></td><td class="c">–</td><td class="c"><b>3</b></td></tr></table>
<p class="small">Medikamente haben keine Betriebskosten. Sie werden über die <b>Krankheitskarte</b> verbraucht: {krank}</p>
<h3>Rundenablauf</h3>
<p class="small"><span class="ph">1</span> Produktion (Bank gibt die Produktionsmarker aus; in Runde 1 zusätzlich zum Anfangsvorrat) → <span class="ph">2</span> Handel und Verhandlung → <span class="ph">3</span> politische Entscheidungen (ab Runde 2) → <span class="ph">4</span> Betriebskosten an die Bank → <span class="ph">5</span> Krankheitskarte, Ereignis, Abrechnung.</p>
<p class="small"><b>Stufen:</b> Stufe 1 Normalbetrieb (alles bezahlt). Stufe 2 eingeschränkt (bis zur Hälfte unbezahlt): Produktion in der <i>nächsten</i> Runde halbiert, aufgerundet. Stufe 3 Stillstand (mehr als die Hälfte unbezahlt): keine Produktion in der nächsten Runde, 1 Stabilität weniger. Die Betriebskosten (Summe 22 Marker) sind keine Strafe, sondern der Grund zum Handeln.</p>
''', teacher=True)

    # Seite 3: Sonderregeln + Ablaufplan
    if k:
        tl = [('0–5', '1 Zusammenbruch', 'Kurzdurchsage vorlesen (1 Min.). Gruppen bilden; Gruppenkarten, Regelkarte, Marker und Bilanzblatt verteilen (4 Min.).'),
              ('5–10', '2 Gruppenberatung', 'Arbeitsblatt Aufgabe 1 und 2: Lage analysieren, drei Interessen und rote Linie festlegen, Wunsch-Regierungsform wählen. Buchführung und Delegation (2 bis 3 Personen) bestimmen. <i>Geheimkarten verdeckt austeilen.</i>'),
              ('10–22', '3 Runde 1: Freier Handel', 'Produktion ausgeben (1). Handel und Verhandlung, noch keine Regierung (6). Betriebskosten, Krankheitskarte 1, Abrechnung und Stabilität (3). <i>Ereignis 1 „Der letzte Filter“</i> verlesen (2).'),
              ('22–38', '4 Runde 2: Ordnung und Krise', 'Produktion ausgeben (1). Metro-Konferenz: Regierungsvertrag Artikel 1 bis 4 (7). <i>Ereignis 3 „Der Notstand“</i> und verbindliche Entscheidung (3). Betriebskosten, Krankheitskarte 2, Abrechnung (3). Vertrag unterzeichnen (2).'),
              ('38–45', '5 Auswertung', 'Rollen ablegen. Stabilität ablesen, Geheimaufträge aufdecken (2). Drei Leitfragen im Plenum (4). Abschlussfrage (1). Aufgabe 5 als Hausaufgabe.')]
    else:
        tl = [('0–8', '1 Zusammenbruch', 'Durchsage vorlesen (2 Min.). Gruppen bilden; Gruppenkarten, Regelkarte, Marker und Bilanzblatt verteilen, Regeln kurz erklären (6).'),
              ('8–18', '2 Gruppenberatung', 'Arbeitsblatt Aufgabe 1 bis 3: Lage analysieren, drei Interessen und rote Linie, Wunsch-Regierungsform, Angebot vorbereiten. Buchführung und Delegation (2 bis 3 Personen) bestimmen. <i>Geheimkarten verdeckt austeilen.</i>'),
              ('18–32', '3 Runde 1: Freier Handel', 'Produktion ausgeben (1). Handel und Verhandlung, noch keine Regierung (8). Betriebskosten, Krankheitskarte 1, Abrechnung (3). <i>Ereignis 1 „Der letzte Filter“</i> verlesen (2).'),
              ('32–52', '4 Runde 2: Regierungsbildung', 'Produktion ausgeben (1). Metro-Konferenz: Regierungsform, Machtverteilung und Versorgung, Reparatur klären, Vertrag Artikel 1 bis 3, Abstimmung (13). <i>Ereignis 2 „Unbekannte im Tunnel“</i> (3). Betriebskosten, Krankheitskarte 2, Abrechnung (3).'),
              ('52–70', '5 Runde 3: Krise', 'Produktion ausgeben (1). <i>Ereignis 3 „Der Notstand“</i>: verbindliche Entscheidung (5). Handel und Verteilung nach der beschlossenen Ordnung (6). Betriebskosten, Krankheitskarte 3, Abrechnung (3). Vertrag Artikel 4 bis 7 abschließen und unterzeichnen (3).'),
              ('70–88', '6 Auswertung', 'Rollen ablegen, Marker einsammeln (2). Stabilität ablesen, Geheimaufträge aufdecken, Würfelergebnis zu Ereignis 2 verraten (4). Plenum anhand der Leitfragen (10). Abschlussfrage (2).'),
              ('88–90', 'Ausblick', 'Aufgabe 5 (Rückblick) als Hausaufgabe oder Sicherung.')]
    ohne_q = '' if k else '<tr><td>Aufnahme der Fremden ohne Quarantäne bei Seuche (Würfel 5 bis 6)</td><td class="c"><b>−1</b></td></tr>'
    STABBOX = ('<h3>Stabilität (Start: 10)</h3><table><tr><th>Auslöser</th><th class="c" style="width:24mm">Stabilität</th></tr>'
      '<tr><td>Alle fünf Gruppen am Rundenende in Stufe 1</td><td class="c"><b>+1</b> (max. 10)</td></tr>'
      '<tr><td>Eine Gruppe am Rundenende in Stufe 3 (je Gruppe)</td><td class="c"><b>−1</b></td></tr>'
      '<tr><td>Krankheitskarte nicht vollständig bezahlt</td><td class="c"><b>−1</b></td></tr>'
      '<tr><td>Ereignis bis Rundenende nicht verbindlich entschieden bzw. Auftrag nicht erfüllt</td><td class="c"><b>−2</b></td></tr>'
      '<tr><td>Zwangsmaßnahme der Wächter ohne Beschluss der Konferenz</td><td class="c"><b>−2</b></td></tr>' + ohne_q + '</table>'
      + box('Sonderregeln (auch auf der Regelkarte)', '<p class="small"><b>Gemeinschaftsvorrat:</b> Die Gruppen dürfen beschließen, Marker in einen gemeinsamen Vorrat zu legen. Wer ihn verteilt, entscheidet die Ordnung, die sie vereinbaren. <b>Verträge</b> dürfen schriftlich festgehalten werden, sind aber nicht automatisch durchsetzbar: Bruch erzwingt eine Entscheidung der Konferenz. <b>Regierung braucht Marker:</b> Ein Beschluss ersetzt keine Marker. <b>Zwangsmaßnahme:</b> Die Wächter dürfen <i>einmal pro Spiel</i> bis zu 2 Marker einer Gruppe einziehen. Mit Beschluss der Konferenz kostet das nichts, ohne Beschluss −2 Stabilität.</p>', '#8a6d3b'))
    tlh = ''.join(f'<div class="tl"><div class="z">{z}<br>Min.</div><div class="p"><b>{p}</b>{t}</div></div>' for z, p, t in tl)
    d.page(sign('Ablaufplan', f'{d.minutes} Minuten · Minutenangaben in Klammern') + f'<div class="timeline">{tlh}</div>' + ('' if k else '<div class="sceneband" style="height:30mm;margin-top:4mm">' + szene(900, 150, schild=False, figs=False) + '</div>') + ('' if not k else '') + (STABBOX if k else ''), teacher=True)
    if not k:
        d.page(sign('Stabilität und Sonderregeln', 'Regelübersicht für die Lehrkraft') + STABBOX, teacher=True)

    # Seite 4: Ereignisse, Engpässe, Moderation
    ev2 = '' if k else box('Ereignis 2: Unbekannte im Tunnel (Runde 2, nach der Regierungsbildung)', '''<p class="xs">Konferenz oder Regierung entscheidet bis Rundenende. <b>Ablehnen:</b> keine Kosten. <b>Aufnahme mit Quarantäne:</b> 2 Nahrung, 2 Wasser, 1 Medikament, 1 Schutzmaterial. <b>Ohne Quarantäne:</b> 2 Nahrung, 2 Wasser. Wer bezahlt, entscheidet die Konferenz. <b>Würfeln Sie verdeckt</b> (nur bei Aufnahme): <b>1 bis 4</b> Die Fremden sagen die Wahrheit und führen zu einem Lager: Sie legen <b>3 Energie</b> in den Gemeinschaftsvorrat. <b>5 oder 6</b> Seuche: mit Quarantäne zusätzlich 1 Medikament, ohne Quarantäne 3 Medikamente und −1 Stabilität. Bei Ablehnung würfeln Sie nur zur Auflösung in der Auswertung („Hätten Sie es gewusst?“). Nicht entschieden: −2.</p>''', '#b8860b', 'ev')
    notst = 'Runde 2' if k else 'Runde 3'
    t3 = '3' if k else '5'
    eng = ('<li><b>Runde 2:</b> Notstand und Reparatur (2 Energie): Es fehlen 4 Energie (ohne Reparatur 2). Wasser und Nahrung reichen. Medikamente: 2 Rest.</li>' if k else
           '<li><b>Runde 2:</b> Reparatur (2 Energie, 1 Nahrung) und Aufnahme mit Quarantäne belasten Energie und Wasser: 1 Wasser fehlt, Energie reicht nur, wenn die Fremden die Wahrheit sagen (+3 Energie).</li><li><b>Runde 3:</b> Der Notstand halbiert die Energieproduktion: etwa 3 Energie fehlen, Medikamente sind danach aufgebraucht.</li>')
    fragen = 'drei' if k else 'drei bis vier'
    d.page(sign('Ereignisse und Auflösung', 'nur für die Lehrkraft') +
        box('Ereignis 1: Der letzte Filter (Ende von Runde 1)', '<p class="xs">Die Wasserwerker verlieren sofort 2 Wasser-Marker (verunreinigt). Ihre Produktion sinkt auf 3 pro Runde. <b>Reparatur:</b> Das Reparaturteam der Techniker braucht einmalig 2 Energie und 1 Nahrung (an die Bank). Danach gilt die volle Produktion ab der nächsten Produktionsphase. <b>Stabilität:</b> Ist die Reparatur bis zum Ende der nächsten Runde nicht bezahlt, −2. Wer die Kosten trägt, entscheiden die Gruppen (Techniker dürfen eine Gegenleistung verlangen).</p>', '#b8860b', 'ev') + ev2 +
        box(f'Ereignis 3: Der Notstand ({notst})', f'<p class="xs">Die Energieproduktion beträgt in dieser Runde nur <b>3 statt 6</b>. Die Konferenz muss innerhalb von {t3} Minuten verbindlich festlegen: wer über die Energieverteilung entscheidet, wie lange die Maßnahme gilt und wer sie kontrolliert. Ohne dokumentierten Beschluss −2 Stabilität. Die Konferenz darf dabei die Zwangsmaßnahme der Wächter legitimieren.</p>', '#b8860b', 'ev') +
        f'''<h3 style="margin-top:3mm">Erwartete Engpässe (Probelauf)</h3>
<p class="small">Bei idealer Verteilung (alle Marker optimal getauscht) ergibt sich rechnerisch Folgendes. Reale Verläufe sind schlechter, weil Verhandeln Zeit kostet.</p>
<ul class="small"><li><b>Runde 1:</b> Alles reicht, aber nur durch Tausch. Energie hat mit 3 Resten den kleinsten Puffer.</li>{eng}</ul>
<p class="xs">Die Werte sind Spielwerte, keine Bedarfsberechnungen. Spielt ein Kurs zu leicht oder zu schwer, drehen Sie zuerst an der <i>Energieproduktion der Techniker</i> und an den <i>Krankheitskarten</i>.</p>
<h3 style="margin-top:3mm">Moderation der Auswertung</h3>
<p class="small">Die SuS legen zuerst die Rollen ab. Lesen Sie die Stabilität vor (8 bis 10 stabil, 5 bis 7 angespannt, 1 bis 4 kritisch, 0 Zerfall) und lassen Sie die Geheimaufträge aufdecken (zählen nur bei Stabilität ≥ 1). Wählen Sie {fragen} Leitfragen:</p>
<ul class="xs" style="columns:2;column-gap:6mm;margin-bottom:1mm"><li><b>Macht:</b> Hatte die Gruppe mit dem knappsten Gut automatisch die größte Macht?</li><li><b>Gerechtigkeit:</b> Gerecht heißt gleich viel oder nach Bedarf?</li><li><b>Demokratie:</b> Kann eine Mehrheit alles entscheiden oder braucht es Grenzen?</li><li><b>Effizienz:</b> War eine zentrale Führung in der Krise handlungsfähiger?</li><li><b>Abhängigkeit:</b> Wie haben Abhängigkeiten die Wahl der Regierungsform beeinflusst?</li><li><b>Legitimität:</b> Akzeptiert man eine Entscheidung eher, wenn man beteiligt war?</li></ul>
<div class="durch" style="font-size:9pt;padding:2.6mm 4mm;margin:1mm 0 0"><b style="font-style:normal;color:var(--amber)">Abschlussfrage:</b> „Hätten Sie dieselbe Regierungsform gewählt, wenn Ihre Gruppe eine andere Station kontrolliert hätte?“</div>''', teacher=True)

def durchsage(d):
    k = d.kurz
    if k:
        story = '''<h3>Jahr 2033 – Die Oberfläche ist verloren</h3>
<p>Vor elf Jahren veränderte ein globaler Krieg die Welt für immer. Feuerstürme, radioaktive Niederschläge und eine unbekannte Seuche machten die Oberfläche unbewohnbar. Die Überlebenden flohen in die U-Bahn-Schächte und Schutzbunker. Strom gibt es nur stundenweise, Wasser kommt aus alten Filteranlagen, Nahrung wächst in Pilzkellern. Medikamente sind wertvoller als Munition.</p>
<p>Ihr lebt in der Station <b>Endstation 7</b>, einem ehemaligen Verkehrsknotenpunkt mit etwa 120 Menschen. Vor drei Tagen zerstörte eine Explosion die zentrale Pumpenanlage, dann fiel das Stromnetz aus. Die bisherige Stationsleitung ließ Vorräte beschlagnahmen und Proteste niederschlagen. Als sie die Evakuierung ankündigte, war der Verbindungstunnel eingestürzt. Die Leitung ist verschwunden.</p>
<p>Fünf Gemeinschaften kontrollieren die fünf wichtigsten Bereiche der Station. Jede besitzt etwas, das alle zum Überleben brauchen. Keine besitzt alles. Dann knackt der Lautsprecher:</p>'''
    else:
        story = '''<h3>Jahr 2033 – Die Oberfläche ist verloren</h3>
<p>Vor elf Jahren veränderte ein globaler Krieg die Welt für immer. Feuerstürme, radioaktive Niederschläge und eine unbekannte Seuche machten weite Teile der Oberfläche unbewohnbar. Die wenigen Überlebenden flohen in die U-Bahn-Schächte, Schutzbunker und Versorgungstunnel. Was zunächst als vorübergehende Zuflucht gedacht war, wurde zur neuen Heimat der Menschheit.</p>
<p>Die Metro ist längst keine funktionierende Stadt mehr. Strom gibt es nur stundenweise. Wasser wird durch alte Filteranlagen gepumpt. Nahrung wächst in improvisierten Pilzkellern und Gewächskammern. Medikamente sind wertvoller als Munition. Und draußen in den Tunneln lauern Gefahren, über die niemand gerne spricht.</p>
<p>Ihr lebt in der Station <b>Endstation 7</b>, einem ehemaligen Verkehrsknotenpunkt, der inzwischen etwa 120 Menschen beherbergt. Die Station ist groß genug, um eine Gemeinschaft zu bilden, aber zu klein, um unabhängig zu überleben.</p>
<h3>Der Tag, an dem alles zusammenbricht</h3>
<p>Vor drei Tagen ereignete sich eine Katastrophe: Eine Explosion in einem Versorgungstunnel zerstörte die zentrale Pumpenanlage. Kurz darauf fiel das überalterte Stromnetz aus. Die bisherige Stationsleitung, ein kleiner Rat aus ehemaligen Sicherheitskräften und Technikern, versuchte, die Lage unter Kontrolle zu halten. Doch die Vorräte wurden beschlagnahmt, Wasser wurde rationiert und mehrere Menschen wurden bei Protesten verletzt. Als die Stationsleitung die Evakuierung in einen anderen Metroabschnitt ankündigte, stellte sich heraus, dass der Verbindungstunnel eingestürzt war.</p>
<p>Die Leitung ist verschwunden. Niemand weiß, ob sie geflohen ist oder ums Leben kam. Seitdem herrscht Unsicherheit.</p>
<p>Die fünf wichtigsten Bereiche der Station werden von fünf Gemeinschaften kontrolliert. Jede besitzt etwas, das für das Überleben aller unverzichtbar ist. Keine Gemeinschaft verfügt jedoch über alles, was sie benötigt.</p>
<p>Am heutigen Morgen versammelt sich die Bevölkerung auf dem Bahnsteig. Eine alte Notstromanlage liefert noch genug Energie, um eine letzte Durchsage abzuspielen:</p>'''
    d.page(sign('Durchsage und Hintergrund', 'Vorlesetext für die Lehrkraft', right=trefoil(34, '#161618', '#f2a900')) +
           f'<div class="sceneband" style="height:36mm">{szene(900, 190, figs=True)}</div><div class="small" style="font-size:9.8pt">{story}</div>'
           '<div class="durch" style="font-size:10pt;padding:4mm 6mm;margin:1mm 0 3mm">„An alle Überlebenden von Endstation 7. Die bisherige Ordnung ist zusammengebrochen. Es gibt keine übergeordnete Verwaltung mehr. Ihr müsst entscheiden, wie ihr künftig zusammenleben wollt. Findet eine gemeinsame politische Ordnung – oder riskiert, dass die Station auseinanderbricht.“</div>'
           '<p class="small" style="font-size:9.8pt">Die Lautsprecher verstummen. <b>Ihr habt 48 Stunden, um eine neue Regierung zu bilden.</b> Wenn ihr euch nicht einigt, reichen die Vorräte nur noch für wenige Tage. Niemand kann garantieren, dass die Station danach noch bewohnbar ist.</p>', teacher=True)

def regelkarte(d):
    k = d.kurz
    d.page(sign('Regelkarte', 'So läuft Endstation 7', right=trefoil(34, '#161618', '#f2a900')) +
        box('1 · Marker', f'<p class="small">Jedes Gut wird durch Marker dargestellt: {D["N"]}Nahrung, {D["W"]}Wasser, {D["E"]}Energie, {D["M"]}Medikamente, {D["S"]}Schutzmaterial. Marker dürfen getauscht, verschenkt, verliehen oder gegen politische Zugeständnisse ausgehandelt werden. Alles, was ihr abgebt, bekommt ihr nur zurück, wenn ihr es vereinbart habt.</p>', '#555a60') +
        box(f'2 · Eine Runde ({24 if k else 16} Stunden Spielzeit)', '''<p class="small"><span class="ph">1</span> <b>Produktion:</b> Die Bank gibt eure Produktionsmarker aus.<br><span class="ph">2</span> <b>Handel und Verhandlung:</b> Nur die Delegation geht zum Konferenztisch. Gespräche zu zweit sind erlaubt.<br><span class="ph">3</span> <b>Politische Entscheidungen:</b> Ab Runde 2 beraten alle Gruppen über gemeinsame Regeln.<br><span class="ph">4</span> <b>Betriebskosten:</b> Jede Gruppe zahlt ihre Betriebskosten an die Bank (steht auf eurer Gruppenkarte).<br><span class="ph">5</span> <b>Ereignis und Abrechnung:</b> Krankheitskarte, Ereignis, Abrechnung der Stabilität.</p>''', '#8a6d3b') +
        box('3 · Betriebskosten und Stufen', '''<p class="small"><b>Stufe 1 Normalbetrieb:</b> alle Kosten bezahlt, ihr produziert normal.<br><b>Stufe 2 eingeschränkt:</b> bis zur Hälfte der Kosten unbezahlt, eure Produktion halbiert sich in der <i>nächsten</i> Runde (aufgerundet).<br><b>Stufe 3 Stillstand:</b> mehr als die Hälfte unbezahlt, ihr produziert in der nächsten Runde nichts, und die Station verliert 1 Stabilität.</p>''', '#d67800') +
        box('4 · Stabilität (Start: 10 Punkte)', '<p class="small">Die Stabilität der Station sinkt, wenn Gruppen im Stillstand stehen, die Krankheitskarte nicht bezahlt wird oder ein Ereignis ungelöst bleibt. Sind alle fünf Gruppen am Rundenende im Normalbetrieb, steigt sie um 1. Bei <b>0</b> bricht die Station auseinander: dann verlieren alle.</p>', '#c62828') +
        box('5 · Regierung, Verträge, Zwangsmaßnahme', '''<p class="small"><b>Gemeinschaftsvorrat:</b> Ihr dürft beschließen, Marker in einen gemeinsamen Vorrat zu legen und wer ihn verteilt.<br><b>Verträge</b> dürft ihr schriftlich festhalten. Sie sind bindend, aber nicht automatisch durchsetzbar.<br><b>Eine Regierung braucht Marker:</b> Ein Beschluss ersetzt keine Marker. Was nicht da ist, kann nicht verteilt werden.<br><b>Zwangsmaßnahme:</b> Die Wächter dürfen <i>einmal</i> bis zu 2 Marker einer Gruppe einziehen. Mit Beschluss der Konferenz ist das legitim. Ohne Beschluss verliert die Station 2 Stabilität.</p>''', '#1565c0'))

GRP = {
 'N': dict(text='Ihr betreibt die einzigen noch funktionierenden Anbauflächen der Station. Pilze, Algen und einige genießbare Pflanzen sichern die Ernährung der Bevölkerung. Die Ernte ist begrenzt und wächst nur langsam nach. Ihr seid für alle unverzichtbar, braucht aber selbst Wasser, Energie und Schutzmaterial, um weiter produzieren zu können.',
          need='2 {W} Wasser, 2 {E} Energie, 1 {S} Schutzmaterial', start=6, prod=6, kost=(1, 2, 2, 0, 1),
          ints=['Niemand darf eure Ernte ohne Gegenleistung beschlagnahmen.', 'Die Nahrungsmittel müssen gerecht verteilt werden.', 'Ihr wollt langfristig genügend Vorräte für schlechte Zeiten anlegen.'],
          dil='Soll Nahrung nach Bedarf verteilt werden oder sollen diejenigen mehr erhalten, die besonders viel zur Gemeinschaft beitragen?', macht='Ohne eure Ernte droht der Station der Hunger.', gut='Nahrung'),
 'W': dict(text='Ihr kontrolliert die letzte funktionsfähige Filteranlage. Ungefiltertes Wasser macht krank. Die Anlage ist beschädigt und braucht Energie und Schutzmaterial (Filter, Masken). Nur ihr kennt alle Arbeitsschritte, um sie sicher zu betreiben.',
          need='1 {N} Nahrung, 2 {E} Energie, 1 {S} Schutzmaterial', start=6, prod=6, kost=(1, 1, 2, 0, 1),
          ints=['Die Anlage muss repariert und gewartet werden.', 'Niemand darf eigenmächtig Wasserleitungen anzapfen.', 'Die Wasserversorgung soll nach nachvollziehbaren Regeln erfolgen.'],
          dil='Soll jeder Mensch die gleiche Menge Wasser erhalten oder sollen Kranke, Kinder und besonders hart Arbeitende bevorzugt werden?', macht='Ohne euch drohen Durst und Krankheiten.', gut='Sauberes Wasser'),
 'E': dict(text='Ihr kontrolliert den einzigen noch betriebsfähigen Generator und den größten Bestand an Werkzeugen. Strom ist knapp: Er reicht nicht für Wasseraufbereitung, Beleuchtung, Lüftung und Anbauanlagen gleichzeitig. Auch euer Generator braucht Wartung, Nahrung und Wasser für die Mannschaft sowie Schutzmaterial für Einsätze im Tunnel.',
          need='1 {N} Nahrung, 1 {W} Wasser, 1 {S} Schutzmaterial', start=5, prod=6, kost=(1, 1, 1, 0, 1),
          ints=['Die Energieversorgung muss zentral geplant werden.', 'Werkzeuge und Ersatzteile dürfen nicht verschwendet werden.', 'Fachwissen muss geschützt, aber langfristig auch weitergegeben werden.'],
          dil='Wer entscheidet, welche Bereiche zuerst Strom bekommen? Fachleute, gewählte Vertreter oder die gesamte Bevölkerung?', macht='Ohne Energie versagen die lebenswichtigen Systeme.', gut='Energie (Strom und Werkzeug)'),
 'M': dict(text='Ihr verfügt über die letzten größeren Medikamentenvorräte, Verbandsmaterial und Kenntnisse zur Behandlung von Infektionen und Verletzungen. Aus Restbeständen, Pilzkulturen und Heilkräutern stellt ihr in kleinen Mengen Ersatz her. Ohne sauberes Wasser und Strom kann die Krankenstation kaum arbeiten. Jede Runde fordert eine <b>Krankheitskarte</b> Medikamente von der Station.',
          need='1 {N} Nahrung, 1 {W} Wasser, 2 {E} Energie', start=4, prod=3, kost=(1, 1, 2, 0, 0),
          ints=['Medizinische Versorgung darf nicht vom persönlichen Reichtum abhängen.', 'Vorräte müssen für Notfälle zurückgehalten werden.', 'Medizinische Entscheidungen sollen nicht von politischen Machthabern diktiert werden.'],
          dil='Sollen Medikamente zuerst an die Schwerkranken gehen, an die mit den besten Überlebenschancen oder an Menschen, die für die Versorgung der Station besonders wichtig sind?', macht='Ohne euch steigen Krankheit und Sterblichkeit.', gut='Medikamente und medizinisches Wissen'),
 'S': dict(text='Ihr bewacht die Eingänge und kontrolliert die wenigen verbliebenen Vorräte an Schutzkleidung, Filtern und Atemschutzmasken. Ihr sichert gefährliche Bereiche ab und schützt Transporte. Ohne euch könnten Vorräte gestohlen werden oder Gefahren aus den Tunneln eindringen.',
          need='1 {N} Nahrung, 1 {W} Wasser, 1 {E} Energie', start=5, prod=3, kost=(1, 1, 1, 0, 0),
          ints=['Die Station braucht verbindliche Regeln und eine durchsetzungsfähige Ordnung.', 'Die Sicherheitskräfte müssen einsatzfähig bleiben.', 'Niemand darf die Sicherheit der gesamten Station durch leichtfertige Entscheidungen gefährden.'],
          dil='Wie viel Macht darf eine Sicherheitsorganisation besitzen? Soll sie der Regierung unterstehen, unabhängig handeln oder von der Bevölkerung kontrolliert werden?', macht='Ohne euch sind Menschen und Vorräte gefährdet.', gut='Sicherheit und Schutzmaterial'),
}

def gruppenkarten(d):
    for key in ORDER:
        g, x = G[key], GRP[key]
        need = x['need'].format(**D)
        head = f'<div class="gkopf" style="--gc:{g["col"]}"><div class="nr">{g["nr"]}</div><div class="tx"><b>{g["name"]}</b><span>Station: {g["ort"]}</span></div><div class="ic">{icon(g["ico"], "#fff", 34)}</div></div>'
        wt = ('<table class="wtab"><tr><th></th>' + ''.join(f'<th>{D[c]}</th>' for c in ORDER) + '</tr>'
              + '<tr><td><b>Anfangsvorrat</b></td>' + ''.join(f'<td>{x["start"] if c == key else "–"}</td>' for c in ORDER) + '</tr>'
              + '<tr><td><b>Produktion je Runde</b></td>' + ''.join(f'<td>{x["prod"] if c == key else "–"}</td>' for c in ORDER) + '</tr>'
              + '<tr><td><b>Betriebskosten je Runde</b></td>' + ''.join(f'<td>{v if v else "–"}</td>' for v in x['kost']) + '</tr></table>')
        ints = ''.join(f'<li>{i}</li>' for i in x['ints'])
        rolle = box('Rollen in eurer Gruppe', '<p class="small"><b>Buchführung</b> (1 Person): verwaltet Marker und Bilanzblatt. <b>Delegation</b> (2 bis 3 Personen): verhandelt am Konferenztisch. <b>Sprecher/in:</b> vertritt die Gruppe im Plenum und unterschreibt. Alle anderen beraten, entwerfen Angebote und prüfen Verträge. Wechselt die Rollen, wenn ihr wollt.</p>', g['col'])
        sonder = box('Euer Sonderrecht: die Zwangsmaßnahme', '<p class="small">Einmal pro Spiel dürft ihr bis zu 2 Marker einer Gruppe einziehen. Mit Beschluss der Konferenz ist das legitim. Ohne Beschluss verliert die Station 2 Stabilität.</p>', '#c62828') if key == 'S' else ''
        d.page(head + f'<p><b style="font-size:11pt">Euer Gut: {x["gut"]}</b></p><p>{x["text"]}</p>{wt}'
               f'<div class="need"><b>Das braucht ihr von den anderen (je Runde):</b> {need}</div>'
               f'<h3>Eure Interessen</h3><ul>{ints}</ul>'
               f'<p><b>Euer Dilemma:</b> {x["dil"]}</p><p><b>Euer Machtmittel:</b> {x["macht"]}</p><div class="grow"></div>{sonder}{rolle}', '', )
        d.pages[-1] = d.pages[-1].replace('<section class="page ', f'<section style="--gc:{g["col"]}" class="page ', 1)

GEHEIM = {
 'N': ('Eure Ernte ist euer Faustpfand.', 'Setzt durch, dass im Vertrag steht: Nahrung darf nur gegen Gegenleistung oder mit eurer Zustimmung eingezogen werden.', 'eine Regelung, die eure Ernte ohne euch verteilt.'),
 'W': ('Wasser nach festen Regeln.', 'Setzt durch, dass die Wasserverteilung nach schriftlichen, öffentlichen Regeln erfolgt und dass ihr in jedem Entscheidungsgremium einen festen Sitz habt.', 'Wasser wird zum Druckmittel einer Einzelperson.'),
 'E': ('Energie bleibt Fachsache.', 'Setzt durch, dass bei jeder Entscheidung über die Energieverteilung die Techniker mitentscheiden (Sitz oder Vetorecht).', 'Energie wird ohne euch verteilt.'),
 'M': ('Medizin kennt keine Parteien.', 'Setzt durch, dass Medikamente nach medizinischem Bedarf vergeben werden und die Regierung keine Medikamente für einzelne Personen oder Gruppen anordnen darf.', 'politische Vorzugsbehandlung.'),
 'S': ('Ordnung braucht Durchsetzungskraft.', 'Setzt durch, dass die Wächter im Notstand eigenständig handeln dürfen und nicht von einer einzelnen anderen Gruppe abgesetzt werden können.', 'die Wächter werden entwaffnet oder abhängig.'),
}

def geheim_stationen(d):
    cards = ''
    for key in ORDER:
        t, a, r = GEHEIM[key]; g = G[key]
        cards += (f'<div class="cut" style="border-left:2.4mm solid {g["col"]}"><div class="bt" style="color:{g["col"]};font-weight:800;font-size:9pt;letter-spacing:.07em;text-transform:uppercase;margin-bottom:1mm">Geheimkarte · nur für Gruppe {g["nr"]}: {g["kurz"]}</div>'
                  f'<p class="small"><b>{t}</b> {a} <i>Rote Linie: {r}</i></p></div>')
    d.page(sign('Geheimkarten', 'ausschneiden und verdeckt austeilen') + '<p class="small">Jede Gruppe erhält <i>ihre</i> Karte. Der Auftrag bleibt geheim, bis die Auswertung beginnt. Erfüllt: <b>3 Gruppenpunkte</b>. Gilt nur, wenn die Station nicht zerfällt.</p><div class="sp"></div>' + cards, teacher=True)
    st = ''
    for key in ORDER:
        g = G[key]
        st += f'<div class="station" style="--gc:{g["col"]}"><div class="e">ENDSTATION 7</div><div class="n">{g["kurz"]} {icon(g["ico"], "#fff", 56)}</div><div class="o">{g["ort"]}</div></div>'
    d.page(sign('Stationsschilder', 'an die Gruppentische hängen') + f'<div style="flex:1;display:flex;flex-direction:column">{st}</div>')

def arbeitsblatt(d):
    k = d.kurz
    mi1, mi2 = ('5', '') if k else ('8', '')
    p1 = (sign('Arbeitsauftrag', 'Die Zukunft von Endstation 7') +
        '<p class="small" style="display:flex;gap:6mm"><span>Gruppe: <u style="display:inline-block;width:52mm">&nbsp;</u></span><span style="margin-left:auto">Delegation: <u style="display:inline-block;width:52mm">&nbsp;</u></span></p>'
        '<p class="small"><b>Eure Rolle.</b> Ihr seid die anerkannten Vertreterinnen und Vertreter einer der fünf Gemeinschaften von Endstation 7. Eure Gruppe kontrolliert einen Bereich, der für das Überleben aller Menschen notwendig ist. Die bisherige Stationsleitung ist zusammengebrochen. Ihr müsst gemeinsam mit den anderen Gruppen eine neue politische Ordnung entwickeln.</p>'
        f'<h3>Aufgabe 1 · Bestandsaufnahme <span style="margin-left:auto;font-weight:600">{mi1} Min.</span></h3>'
        '<ol class="small"><li>Analysiert eure Situation: Welche Bedeutung haben eure Marker für das Überleben der Station?</li><li>Welche Probleme kann eure Gemeinschaft ohne Zusammenarbeit nicht lösen?</li><li>Legt <b>drei Interessen</b> fest, die ihr unbedingt durchsetzen wollt.</li><li>Welche <b>Zugeständnisse</b> könntet ihr anderen Gruppen machen?</li></ol>' + lines(4) +
        '<h3>Aufgabe 2 · Entscheidung über die Regierungsform</h3>'
        '<p class="small">Welche Ordnung bevorzugt ihr für Endstation 7? Ihr dürft eine bekannte Regierungsform wählen, mischen oder ein eigenes Modell entwickeln (Infokarten).</p>'
        '<p class="small">☐ Direkte Demokratie &nbsp; ☐ Repräsentative Demokratie &nbsp; ☐ Autoritäre Führung<br>☐ Technokratie &nbsp; ☐ Föderation &nbsp; ☐ Mischform oder eigenes Modell: ____________________</p>'
        '<p class="small">Begründet eure Wahl anhand von <b>mindestens drei Kriterien</b>: Wie schnell fallen Entscheidungen? Wie gerecht werden Interessen berücksichtigt? Wie wird verhindert, dass einzelne Gruppen zu viel Macht erhalten? Wie wird die Versorgung langfristig gesichert? Wie werden Regeln durchgesetzt und Konflikte gelöst?</p>' + lines(5))
    tab = ''.join(f'<tr><td style="width:55mm;height:{"11" if k else "13"}mm"><b>{t}</b></td><td></td></tr>' for t in ['Was können wir anbieten?', 'Was brauchen wir von anderen?', 'Welche Bedingungen stellen wir?', 'Unsere rote Linie:', 'Mit wem könnten wir eine Koalition bilden?'])
    p2 = ('<h3>Aufgabe 3 · Verhandlungsvorbereitung' + ('' if k else '<span style="margin-left:auto;font-weight:600">5 Min.</span>') + '</h3>'
        '<p class="small">Entwickelt ein Angebot an die anderen Gruppen.</p>'
        f'<table>{tab}</table>'
        '<h3>Aufgabe 4 · Gemeinsamer Regierungsvertrag</h3>'
        '<p class="small">Verhandelt mit den anderen Gruppen über eine gemeinsame Ordnung und haltet sie im <b>Regierungsvertrag von Endstation 7</b> fest. Euer Ziel ist nicht, alle anderen Gruppen zu besiegen: Die Vereinbarung muss das Überleben der gesamten Station ermöglichen. Eure Gruppe muss am Ende erklären können, warum sie zustimmt oder ablehnt.</p>'
        f'<h3>Aufgabe 5 · Rückblick <span style="margin-left:auto;font-weight:600">{"Hausaufgabe" if k else "Hausaufgabe oder Sicherung"}</span></h3>'
        '<ol class="small"><li>Welche Interessen haben eure Entscheidung beeinflusst?</li><li>Welche Vorteile und Nachteile hat die beschlossene Regierungsform?</li><li>Wer konnte seine Interessen besonders gut durchsetzen?</li><li>Ist die Vereinbarung gerecht, stabil und demokratisch?</li><li>Was würdet ihr bei einer erneuten Verhandlung anders machen?</li></ol>' + lines(4))
    d.page(p1)
    d.page(sign('Arbeitsauftrag', 'Fortsetzung') + p2)

def infokarten(d):
    f = [('1', 'Direkte Demokratie', '#2e7d32', 'Alle erwachsenen Bewohnerinnen und Bewohner stimmen direkt über wichtige Entscheidungen ab. Die Mehrheit entscheidet; grundlegende Rechte und Minderheitenschutz müssen gesondert geregelt werden.', 'Ist es sinnvoll, bei einem technischen Notfall erst eine Abstimmung durchzuführen?'),
         ('2', 'Repräsentative Demokratie', '#1565c0', 'Die Bevölkerung wählt einen Rat, der Entscheidungen trifft. Die fünf Gruppen könnten jeweils Vertreter entsenden, oder die Station wählt nach Einwohnerzahl.', 'Soll jede Gruppe gleich viele Sitze erhalten, obwohl ihre Größe und Macht unterschiedlich sind?'),
         ('3', 'Autoritäre Führung', '#555a60', 'Eine Führungsperson oder eine kleine Führungsspitze entscheidet zentral. Sie kann schnell handeln, muss aber nicht durch die Bevölkerung legitimiert sein.', 'Wie wird verhindert, dass die Führung ihre Notstandsbefugnisse dauerhaft behält?'),
         ('4', 'Technokratie', '#d67800', 'Fachleute aus Technik, Medizin und Versorgung übernehmen die Leitung. Entscheidungen orientieren sich vor allem an Sachkenntnis und Überlebensnotwendigkeiten.', 'Wer kontrolliert die Fachleute, wenn ihre Entscheidungen bestimmte Gruppen benachteiligen?'),
         ('5', 'Föderation (Stationskonföderation)', '#c62828', 'Die fünf Gruppen behalten weitgehende Selbstständigkeit und schließen einen Vertrag über gemeinsame Aufgaben wie Wasserverteilung, Energieversorgung und Sicherheit.', 'Was passiert, wenn eine Gruppe eine gemeinsam beschlossene Regel nicht einhält?')]
    body = ''.join(box(f'{n} · {t}', f'<p class="small">{x}</p><p class="small"><b>Konfliktfrage:</b> {q}</p>', c) for n, t, c, x, q in f)
    d.page(sign('Infokarten', 'Regierungsformen') + '<p class="small">Die Modelle sind bewusst vereinfacht. Ihr dürft auch Mischformen bilden, etwa einen gewählten Rat mit einer technischen Notfallleitung und einer unabhängigen Kontrolle der Sicherheitskräfte.</p>' + body)
    d.page(sign('Infokarte', 'Versorgungsmodelle') + '<p class="small">Zu Beginn gehören alle Marker der jeweiligen Gruppe. Im Spiel dürft ihr beschließen, einen <b>gemeinsamen Vorrat</b> einzurichten. Die Regierungsform bestimmt, wie ihr mit den Markern umgeht: Eine Demokratie könnte über Abgaben abstimmen, eine autoritäre Führung könnte zentral beschlagnahmen, eine Technokratie könnte einen Versorgungsschlüssel festlegen.</p>'
        '<table><tr><th>Modell</th><th>Regelung</th><th>Mögliche Folge</th></tr>'
        '<tr><td><b>Freier Handel</b></td><td>Jede Gruppe entscheidet selbst über ihre Marker.</td><td>Hohe Eigenständigkeit, aber Gefahr ungleicher Versorgung.</td></tr>'
        '<tr><td><b>Gemeinsamer Vorrat</b></td><td>Jede Gruppe zahlt einen vereinbarten Anteil ein.</td><td>Krisen können gemeinsam abgefedert werden.</td></tr>'
        '<tr><td><b>Zentrale Verteilung</b></td><td>Eine Regierung entscheidet über die Verteilung.</td><td>Schnellere Entscheidungen, aber Machtmissbrauch wird möglich.</td></tr>'
        '<tr><td><b>Verpflichtende Abgaben</b></td><td>Jede Gruppe muss einen festgelegten Anteil abgeben.</td><td>Die Versorgung wird planbarer, einzelne Gruppen verlieren Handlungsspielraum.</td></tr></table>'
        + box('Wichtig', '<p class="small">Keine Regierungsform gewinnt automatisch. Eine Regierung braucht tatsächlich vorhandene Marker: Ordnet sie Medikamente an, die nicht da sind, bleibt die Anordnung wirkungslos. Verträge sind bindend, aber nicht automatisch durchsetzbar. Wer sie bricht, zwingt die Konferenz zu einer Entscheidung.</p>', '#a4431b', 'lk')
        + f'<div class="sceneband" style="height:60mm;margin-top:6mm">{szene(900, 300, schild=False)}</div>')

def ereigniskarten(d):
    k = d.kurz
    r = lambda x: x.format(**D)
    evs = [('Ereignis 1: Der letzte Filter', 'Ende von Runde 1',
            r('Ein Filter der Wasseranlage ist irreparabel beschädigt. Die Wasserproduktion sinkt auf die Hälfte (<b>3 statt 6</b> Marker pro Runde), und 2 Wasser-Marker sind verunreinigt und gehen verloren. Ein Ersatzteil aus der Werkstatt könnte die Anlage wiederherstellen. Das Reparaturteam der Techniker braucht dafür einmalig <b>2 {E}Energie und 1 {N}Nahrung</b>.'),
            'Entwickelt eine gemeinsame Lösung. Wer bezahlt die Reparatur? Ist sie bis zum Ende der nächsten Runde nicht bezahlt, verliert die Station 2 Stabilität.', 'Wer darf in einer Krise über knappe Ressourcen entscheiden?')]
    if not k:
        evs.append(('Ereignis 2: Unbekannte im Tunnel', 'Runde 2, nach der Regierungsbildung',
            r('Eine Gruppe von zwölf Überlebenden erreicht den Zugang zur Station. Sie sind erschöpft, benötigen Wasser und Nahrung und berichten von einem weiteren bewohnbaren Metroabschnitt. Allerdings ist unklar, ob sie die Wahrheit sagen. Die Wächter fordern eine Quarantäne und eine gründliche Kontrolle. Die Sanitäter verlangen medizinische Versorgung. Die Hydroponiker warnen vor der ohnehin knappen Nahrung.'),
            r('Entscheidet bis zum Ende der Runde, ob und unter welchen Bedingungen die Fremden aufgenommen werden. <b>Ablehnen:</b> keine Kosten. <b>Aufnahme mit Quarantäne:</b> 2 {N}, 2 {W}, 1 {M}, 1 {S}. <b>Aufnahme ohne Quarantäne:</b> 2 {N}, 2 {W}. Wer bezahlt, entscheidet ihr. Ohne Entscheidung verliert die Station 2 Stabilität.'), 'Welche Rechte haben Menschen, die noch nicht zur Gemeinschaft gehören?'))
    evs.append((f'Ereignis {2 if k else 3}: Der Notstand', 'Runde 2, nach Beginn der Konferenz' if k else 'Runde 3, zu Beginn',
            'Ein Stromausfall droht die Lüftung lahmzulegen. Die Energieproduktion beträgt in dieser Runde nur <b>3 statt 6</b> Marker. Die Techniker verlangen, sämtliche verfügbare Energie für die Reparatur einzusetzen. Die Hydroponiker warnen vor dem Verlust der Ernte. Die Sanitäter befürchten, dass die Krankenstation nicht mehr ausreichend versorgt werden kann.',
            f'Trefft innerhalb von {3 if k else 5} Minuten eine verbindliche Entscheidung und haltet sie schriftlich fest: Wer entscheidet über die Energieverteilung? Wie lange gilt die Maßnahme? Wer kontrolliert sie? Ohne Beschluss verliert die Station 2 Stabilität.', 'Wie viel Macht darf eine Regierung im Notstand erhalten?'))
    body = ''.join(f'<div class="cut" style="background:#fff7dc;border-left:2.4mm solid #b8860b"><div style="display:flex;justify-content:space-between;font-weight:800;font-size:10pt;margin-bottom:1.2mm"><span style="color:#8a5a00;text-transform:uppercase;letter-spacing:.05em">{t}</span><span style="font-weight:500;font-size:8pt;color:#6b6454">Zeitpunkt: {z}</span></div><p class="small">{x}</p><p class="small"><b>Auftrag an die Regierung:</b> {a}</p><p class="small" style="margin:0"><b>Politische Frage:</b> {q}</p></div>' for t, z, x, a, q in evs)
    d.page(sign('Ereigniskarten', 'ausschneiden, verdeckt stapeln; Lehrkraft verliest') + body, teacher=True)
    kr = [('Runde 1: Grippewelle', 3)] + ([('Runde 2: Fieberausbruch', 5)] if k else [('Runde 2: Wundinfektionen', 4), ('Runde 3: Fieberausbruch', 5)])
    kh = ''.join(f'<div class="cut" style="border-left:2.4mm solid var(--M);display:flex;align-items:center;gap:6mm"><div style="font-size:20pt;color:var(--M);font-weight:900">✚</div><div><div class="bt" style="color:var(--M);font-weight:800;font-size:9.5pt;letter-spacing:.07em;text-transform:uppercase">Krankheitskarte {t}</div><div style="font-size:15pt">Kosten: <b>{n} Medikamente</b> {D["M"]}</div></div></div>' for t, n in kr)
    d.page(sign('Krankheitskarten', 'Lehrkraft zieht am Ende jeder Runde') + f'<p class="small">Die Karte wird mit Medikamenten ({D["M"]}) aus <i>beliebigen</i> Beständen bezahlt. Wird sie nicht vollständig bezahlt, verliert die Station 1 Stabilität.</p><div class="sp"></div>{kh}', teacher=True)

def material(d):
    k = d.kurz
    anz = (18, 9) if k else (24, 12)
    rows = ''
    for key in ORDER:
        g = G[key]
        marks = ''.join(f'<span class="mark" style="background:{g["col"]}">{key}</span>' for _ in range(anz[0] if True else 0))
        rows += f'<div style="margin-bottom:2mm"><b class="small" style="color:{g["col"]}">{g["gut"]}</b><br>{marks}</div>'
    d.page(sign('Marker', 'auf festes Papier drucken, ausschneiden') + rows, teacher=True)
    # Bilanzblatt
    def blk(n):
        r = ''.join(f'<tr><td style="width:62mm">{t}</td>' + ''.join('<td></td>' for _ in range(5)) + '</tr>' for t in ['Vorrat zu Rundenbeginn (inkl. Produktion)', 'Handel (+ erhalten, − abgegeben)', 'Betriebskosten (−)', 'Krankheitskarte / Ereignis (−)', '<b>Vorrat am Rundenende</b>'])
        return f'<h3>Runde {n}</h3><table class="bilanz"><tr><th>Position</th>' + ''.join(f'<th class="c">{D[c]}</th>' for c in ORDER) + f'</tr>{r}</table>'
    d.page(sign('Bilanzblatt', '1× je Gruppe, Buchführung') + '<p class="small">Gruppe: <u style="display:inline-block;width:70mm">&nbsp;</u></p><p class="small">Tragt in jeder Runde ein, was eure Gruppe besitzt. <b>Stufe am Rundenende:</b> ☐ 1 Normalbetrieb &nbsp; ☐ 2 eingeschränkt &nbsp; ☐ 3 Stillstand</p>' + blk(1) + blk(2) + ('' if k else blk(3)))
    # Stabilität
    farb = ['#c62828', '#d44a2a', '#e06a2c', '#e8892c', '#efb12d', '#f2d52e', '#cbd93a', '#8fcb4a', '#5cb85c', '#3da34d', '#2e8b3f']
    leiste = ''.join(f'<div style="background:{farb[i]};color:{"#fff" if i in (0,1,2,8,9,10) else "#111"}">{i}</div>' for i in range(11))
    cols = ['Stufe R1', 'Stufe R2'] + ([] if k else ['Stufe R3'])
    prot = ('<table><tr><th>Gruppe</th>' + ''.join(f'<th class="c">{c}</th>' for c in cols) + '<th class="c">Geheimauftrag erfüllt?</th><th class="c">Punkte</th></tr>'
            + ''.join(f'<tr><td style="height:9mm"><b style="color:{G[c]["col"]}">{G[c]["kurz"]}</b></td>' + ''.join('<td></td>' for _ in cols) + '<td class="c">☐ ja &nbsp; ☐ nein</td><td></td></tr>' for c in ORDER) + '</table>')
    rr = ''.join(f'<tr><td style="height:12mm">{r}</td><td></td><td></td><td></td></tr>' for r in ([1, 2] if k else [1, 2, 3]))
    d.page(sign('Stabilität der Station', 'Lehrkraft, Tafel oder Wand') + '<p class="small">Marker (Magnet) auf <b>10</b> stellen. Anpassungen nach Rundenende und Ereignissen.</p>' + f'<div class="stab">{leiste}</div>'
           '<p class="small"><b>8 bis 10:</b> stabil · <b>5 bis 7:</b> angespannt · <b>1 bis 4:</b> kritisch · <b>0:</b> Zerfall der Station.</p><h3>Rundenprotokoll</h3>' + prot +
           '<table><tr><th style="width:18mm">Runde</th><th>Gründe (Stillstand, Krankheit, Ereignis, Zwangsmaßnahme …)</th><th class="c" style="width:24mm">Änderung</th><th class="c" style="width:24mm">Stand</th></tr><tr><td>Start</td><td></td><td></td><td class="c"><b>10</b></td></tr>' + rr + '</table>', teacher=True)

def vertrag(d):
    k = d.kurz
    def art(n, t, q, z): return f'<p style="margin:0"><b>Artikel {n} – {t}</b></p><p class="xs" style="margin:0"><i>{q}</i></p>' + lines(z)
    if k:
        arts = (art(1, 'Regierungsform und Machtverteilung', 'Welche Regierungsform wird eingeführt? Wie wird die Regierung gebildet? Wer trifft Entscheidungen, und wer kontrolliert die Regierung?', 3) +
                art(2, 'Ressourcenverteilung', 'Wie werden Nahrung, Wasser, Energie und Medikamente verteilt? Gibt es einen Gemeinschaftsvorrat? Welche Regeln gelten bei Knappheit?', 2) +
                art(3, 'Rechte, Sicherheit und Konfliktlösung', 'Welche Rechte gelten für alle Menschen? Wer setzt die Regeln durch, wer kontrolliert die Wächter, und wie werden Streitigkeiten gelöst?', 2) +
                art(4, 'Notstand', 'Wer darf bei akuter Gefahr entscheiden? Wie lange gelten Sonderbefugnisse, und wer kann sie beenden?', 2))
        a2 = ''
    else:
        arts = (art(1, 'Regierungsform', 'Welche Regierungsform wird eingeführt? Wie wird die Regierung gebildet?', 3) +
                art(2, 'Machtverteilung', 'Wer trifft Entscheidungen? Welche Kompetenzen besitzen die fünf Gemeinschaften? Wer kontrolliert die Regierung?', 3) +
                art(3, 'Ressourcenverteilung', 'Wie werden Nahrung, Wasser, Energie und Medikamente verteilt? Welche Regeln gelten bei Knappheit?', 3) +
                art(4, 'Rechte der Bewohnerinnen und Bewohner', 'Welche grundlegenden Rechte gelten für alle Menschen in der Station? Wie werden Minderheiten geschützt?', 3))
        a2 = (art(5, 'Sicherheit und Konfliktlösung', 'Wer setzt die Regeln durch? Wie werden Streitigkeiten gelöst? Welche Kontrolle gibt es über die Sicherheitskräfte?', 4) +
              art(6, 'Notstand', 'Wer darf bei einer akuten Gefahr entscheiden? Wie lange gelten Sonderbefugnisse? Wer kann sie beenden?', 4) +
              art(7, 'Änderungen und Auflösung', 'Wie kann der Vertrag verändert werden? Was passiert, wenn eine Gemeinschaft die Vereinbarung nicht mehr einhält?', 4))
    sig = '<h3>Unterschriften der fünf Gemeinschaften</h3><div class="cols" style="flex-wrap:wrap">' + ''.join(f'<div style="flex:1 1 45%;margin-bottom:6mm;border-bottom:.3mm solid #6b6454;padding-top:8mm;font-size:8.6pt;color:#5d5a52">{G[c]["kurz"]}</div>' for c in ORDER) + '</div>'
    pre = '<p class="small"><b>Präambel.</b> Wir, die fünf Gemeinschaften von Endstation 7, vereinbaren eine gemeinsame Ordnung, um das Überleben der Station zu sichern und ein geregeltes Zusammenleben zu ermöglichen.</p>'
    head = f'<div style="text-align:center;margin-bottom:4mm">{trefoil(34, "#161618", "#f2a900")}<div style="font-size:19pt;font-weight:900;letter-spacing:.05em;text-transform:uppercase;margin-top:1mm">Regierungsvertrag<br><span style="color:var(--rust)">von Endstation 7</span></div></div>{warn(7)}'
    if k:
        d.page(head + pre + arts + sig)
    else:
        d.page(head + pre + arts)
        d.page(sign('Regierungsvertrag', 'Fortsetzung') + a2 + sig)

def build(kurz):
    d = Doc(kurz)
    cover(d); spielleitung(d); durchsage(d); regelkarte(d); gruppenkarten(d)
    geheim_stationen(d); arbeitsblatt(d); infokarten(d); ereigniskarten(d); material(d); vertrag(d)
    return d

async def render(paths):
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for hp, pp in paths:
            pg = await b.new_page()
            await pg.goto(hp.resolve().as_uri())
            over = await pg.evaluate('''()=>[...document.querySelectorAll('.page')].map((e,i)=>[i+1,e.scrollHeight-e.clientHeight]).filter(x=>x[1]>1)''')
            print(pp.name, 'Überläufe (Seite, px):', over)
            await pg.pdf(path=str(pp), prefer_css_page_size=True, print_background=True)
        await b.close()

if __name__ == '__main__':
    which = [a for a in sys.argv[1:]] or ['90', '45']
    jobs = []
    for w in which:
        d = build(w == '45')
        hp = OUT / f'planspiel_metro_{w}min.html'
        hp.write_text(d.html(), encoding='utf-8')
        jobs.append((hp, OUT / f'Planspiel_Metro_{w}min.pdf'))
    asyncio.run(render(jobs))
