"""
Erzeugt die Bilder der Beispiel-Fundgegenstände (public/demo-photos/*.webp).

Die Bilder sind gezeichnete «Studioaufnahmen» (SVG → PNG → WebP), keine echten Fotos.
So gibt es keine Lizenzfragen, alle Bilder haben denselben Stil und zeigen genau
Farbe und Art aus den Beispieldaten. Interne Erkennungsmerkmale (Initialen, Gravuren,
Anhänger, Namensschilder) sind absichtlich NICHT zu sehen – sonst wäre der
Eigentumsnachweis bei der Rückgabeanfrage wertlos. Markenlogos werden nicht gezeichnet.

Einmalig ausführen (nicht Teil des Builds):
    python3 scripts/demo-photos/generate.py
Benötigt: Python 3, playwright (mit Chromium) und Pillow.
"""

from __future__ import annotations

import io
import sys
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

W, H = 1200, 900
OUT = Path(__file__).resolve().parents[2] / "public" / "demo-photos"


# --------------------------------------------------------------------------- Farben
def _rgb(hex_color: str) -> tuple[int, int, int]:
    h = hex_color.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def mix(a: str, b: str, t: float) -> str:
    ra, ga, ba = _rgb(a)
    rb, gb, bb = _rgb(b)
    return "#%02x%02x%02x" % (round(ra + (rb - ra) * t), round(ga + (gb - ga) * t), round(ba + (bb - ba) * t))


def light(c: str, t: float = 0.3) -> str:
    return mix(c, "#ffffff", t)


def dark(c: str, t: float = 0.3) -> str:
    return mix(c, "#000000", t)


def vgrad(gid: str, c: str, top: float = 0.18, bottom: float = 0.22) -> str:
    """Vertikaler Verlauf: oben heller, unten dunkler (Licht von oben)."""
    return (
        f'<linearGradient id="{gid}" x1="0" y1="0" x2="0" y2="1">'
        f'<stop offset="0" stop-color="{light(c, top)}"/><stop offset="1" stop-color="{dark(c, bottom)}"/></linearGradient>'
    )


def hgrad(gid: str, c: str, edge: float = 0.28, hi: float = 0.22) -> str:
    """Horizontaler Zylinder-Verlauf: Ränder dunkel, Glanzlicht links der Mitte."""
    return (
        f'<linearGradient id="{gid}" x1="0" y1="0" x2="1" y2="0">'
        f'<stop offset="0" stop-color="{dark(c, edge)}"/><stop offset="0.32" stop-color="{light(c, hi)}"/>'
        f'<stop offset="0.55" stop-color="{c}"/><stop offset="1" stop-color="{dark(c, edge + 0.08)}"/></linearGradient>'
    )


def rgrad(gid: str, c: str, cx: float = 0.38, cy: float = 0.32) -> str:
    return (
        f'<radialGradient id="{gid}" cx="{cx}" cy="{cy}" r="0.75">'
        f'<stop offset="0" stop-color="{light(c, 0.3)}"/><stop offset="0.6" stop-color="{c}"/>'
        f'<stop offset="1" stop-color="{dark(c, 0.3)}"/></radialGradient>'
    )


# --------------------------------------------------------------------------- Szene
def scene(defs: str, body: str, shadow: tuple[float, float, float] = (600, 770, 300), backdrop: str = "#efece6") -> str:
    sx, sy, srx = shadow
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<defs>
  <radialGradient id="bg" cx="0.5" cy="0.42" r="0.85">
    <stop offset="0" stop-color="{light(backdrop, 0.45)}"/><stop offset="0.7" stop-color="{backdrop}"/>
    <stop offset="1" stop-color="{dark(backdrop, 0.1)}"/></radialGradient>
  <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.06"/></linearGradient>
  <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="26"/></filter>
  <filter id="contact" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7"/></filter>
  <filter id="lift" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000" flood-opacity="0.18"/></filter>
  <filter id="grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n"/>
    <feColorMatrix type="saturate" values="0"/>
    <feComponentTransfer><feFuncA type="linear" slope="0.07"/></feComponentTransfer></filter>
  {defs}
</defs>
<rect width="{W}" height="{H}" fill="url(#bg)"/>
<rect y="{H * 0.55}" width="{W}" height="{H * 0.45}" fill="url(#floor)"/>
<g transform="__ZOOM__">
<ellipse cx="{sx}" cy="{sy}" rx="{srx}" ry="{srx * 0.13}" fill="#000" opacity="0.2" filter="url(#soft)"/>
<ellipse cx="{sx}" cy="{sy - 4}" rx="{srx * 0.78}" ry="{srx * 0.05}" fill="#000" opacity="0.22" filter="url(#contact)"/>
<g filter="url(#lift)">{body}</g>
</g>
<rect width="{W}" height="{H}" filter="url(#grain)"/>
</svg>"""


# --------------------------------------------------------------------------- Kleidung
def garment(c: str, *, hood: bool = False, zipper: bool = False, quilted: bool = False, pocket: bool = False,
            strings: bool = False, scale: float = 1.0, trim: str | None = None, collar: bool = False) -> str:
    defs = vgrad("gb", c, 0.16, 0.2) + vgrad("gs", dark(c, 0.06), 0.12, 0.24) + vgrad("gh", dark(c, 0.12), 0.1, 0.2)
    line = dark(c, 0.35)
    hi = light(c, 0.45)
    parts = []
    if hood:
        parts.append(f'<path d="M500,262 C505,150 695,150 700,262 C660,236 540,236 500,262 Z" fill="url(#gh)"/>')
        parts.append(f'<path d="M528,252 C545,190 655,190 672,252" fill="none" stroke="{dark(c, 0.3)}" stroke-width="5" opacity="0.6"/>')
    # Ärmel
    parts.append('<path d="M470,262 L338,588 Q330,612 352,620 L400,636 Q420,640 426,620 L492,420 Z" fill="url(#gs)"/>')
    parts.append('<path d="M730,262 L862,588 Q870,612 848,620 L800,636 Q780,640 774,620 L708,420 Z" fill="url(#gs)"/>')
    cuff = trim or dark(c, 0.18)
    parts.append(f'<path d="M346,598 L424,624 L416,648 L340,622 Z" fill="{cuff}" opacity="0.9"/>')
    parts.append(f'<path d="M854,598 L776,624 L784,648 L860,622 Z" fill="{cuff}" opacity="0.9"/>')
    # Rumpf
    parts.append('<path d="M470,262 L548,236 Q600,282 652,236 L730,262 L760,712 Q600,736 440,712 Z" fill="url(#gb)"/>')
    if collar:
        parts.append(f'<path d="M548,236 L600,300 L652,236 L640,226 L600,272 L560,226 Z" fill="{dark(c, 0.15)}"/>')
    parts.append(f'<path d="M442,700 Q600,724 758,700 L760,712 Q600,736 440,712 Z" fill="{trim or dark(c, 0.2)}"/>')
    # Falten / Licht
    parts.append(f'<path d="M520,330 Q540,520 515,690" stroke="{line}" stroke-width="3" fill="none" opacity="0.18"/>')
    parts.append(f'<path d="M690,330 Q668,520 690,690" stroke="{line}" stroke-width="3" fill="none" opacity="0.15"/>')
    parts.append(f'<path d="M560,280 Q600,300 640,280" stroke="{hi}" stroke-width="4" fill="none" opacity="0.35"/>')
    if quilted:
        for y in (330, 410, 490, 570, 650):
            parts.append(f'<path d="M455,{y} Q600,{y + 22} 745,{y}" stroke="{line}" stroke-width="3.5" fill="none" opacity="0.5"/>')
            parts.append(f'<path d="M455,{y - 10} Q600,{y + 12} 745,{y - 10}" stroke="{hi}" stroke-width="3" fill="none" opacity="0.25"/>')
        for t in (0.35, 0.6, 0.85):
            x1, y1 = 470 + (338 - 470) * t, 262 + (588 - 262) * t
            parts.append(f'<path d="M{x1:.0f},{y1:.0f} l62,24" stroke="{line}" stroke-width="3" opacity="0.45"/>')
            parts.append(f'<path d="M{1200 - x1:.0f},{y1:.0f} l-62,24" stroke="{line}" stroke-width="3" opacity="0.45"/>')
    if zipper:
        parts.append(f'<path d="M600,276 L600,716" stroke="{dark(c, 0.45)}" stroke-width="7"/>')
        parts.append('<path d="M600,276 L600,716" stroke="#c9ccd1" stroke-width="2" stroke-dasharray="3 5"/>')
        parts.append('<rect x="592" y="300" width="16" height="30" rx="4" fill="#b8bcc2" stroke="#7d828a" stroke-width="2"/>')
    if pocket:
        parts.append(f'<path d="M505,560 L695,560 L725,690 Q600,704 475,690 Z" fill="none" stroke="{line}" stroke-width="4" opacity="0.45"/>')
        parts.append(f'<path d="M505,560 L475,690 M695,560 L725,690" stroke="{dark(c, 0.25)}" stroke-width="8" opacity="0.25"/>')
    if zipper and not quilted:
        parts.append(f'<path d="M490,520 L540,500" stroke="{dark(c, 0.4)}" stroke-width="5" stroke-linecap="round"/>')
        parts.append(f'<path d="M710,520 L660,500" stroke="{dark(c, 0.4)}" stroke-width="5" stroke-linecap="round"/>')
    if strings:
        parts.append('<path d="M578,280 Q574,360 582,420" stroke="#f1f1f1" stroke-width="6" fill="none" stroke-linecap="round"/>')
        parts.append('<path d="M622,280 Q628,350 618,410" stroke="#f1f1f1" stroke-width="6" fill="none" stroke-linecap="round"/>')
        parts.append('<rect x="576" y="418" width="11" height="22" rx="3" fill="#d9d9d9"/><rect x="613" y="408" width="11" height="22" rx="3" fill="#d9d9d9"/>')
    body = "".join(parts)
    if scale != 1.0:
        body = f'<g transform="translate(600 480) scale({scale}) translate(-600 -480)">{body}</g>'
    return scene(defs, body, (600, 735 if scale == 1 else 480 + 255 * scale, 320 * scale))


# --------------------------------------------------------------------------- Taschen
def backpack(c: str, *, boxy: bool = False, rolltop: bool = False, patch: bool = False, accent: str | None = None) -> str:
    defs = vgrad("bb", c, 0.14, 0.22) + vgrad("bp", dark(c, 0.08), 0.12, 0.24) + hgrad("bs", dark(c, 0.15))
    seam = dark(c, 0.4)
    acc = accent or dark(c, 0.25)
    p = []
    # Tragriemen (seitlich sichtbar)
    p.append(f'<path d="M455,300 Q392,470 430,690" stroke="{dark(c, 0.3)}" stroke-width="30" fill="none" stroke-linecap="round"/>')
    p.append(f'<path d="M745,300 Q808,470 770,690" stroke="{dark(c, 0.3)}" stroke-width="30" fill="none" stroke-linecap="round"/>')
    if rolltop:
        p.append('<path d="M450,330 Q450,300 480,300 L720,300 Q750,300 750,330 L760,712 Q760,740 730,740 L470,740 Q440,740 440,712 Z" fill="url(#bb)"/>')
        p.append(f'<path d="M462,215 L738,215 Q752,215 752,232 L752,300 L448,300 L448,232 Q448,215 462,215 Z" fill="{dark(c, 0.1)}"/>')
        p.append(f'<path d="M448,255 L752,255" stroke="{dark(c, 0.3)}" stroke-width="4" opacity="0.6"/>')
        p.append('<rect x="584" y="236" width="32" height="96" rx="6" fill="#2a2d31"/><rect x="590" y="300" width="20" height="26" rx="3" fill="#55595f"/>')
    elif boxy:
        p.append('<path d="M450,300 Q450,232 600,232 Q750,232 750,300 L752,716 Q752,742 726,742 L474,742 Q448,742 448,716 Z" fill="url(#bb)"/>')
        p.append(f'<path d="M470,318 Q470,256 600,256 Q730,256 730,318" fill="none" stroke="{seam}" stroke-width="4" opacity="0.6"/>')
        p.append(f'<path d="M560,232 Q600,170 640,232" fill="none" stroke="{dark(c, 0.25)}" stroke-width="14" stroke-linecap="round"/>')
        p.append(f'<rect x="490" y="540" width="220" height="150" rx="22" fill="url(#bp)"/>')
        p.append(f'<path d="M500,556 L700,556" stroke="{seam}" stroke-width="3" opacity="0.6"/>')
        if patch:
            p.append(f'<circle cx="600" cy="618" r="26" fill="{light(c, 0.12)}" stroke="{seam}" stroke-width="2"/>')
    else:
        p.append('<path d="M455,330 Q455,236 600,236 Q745,236 745,330 L760,708 Q760,742 726,742 L474,742 Q440,742 440,708 Z" fill="url(#bb)"/>')
        p.append(f'<path d="M560,240 Q600,186 640,240" fill="none" stroke="{dark(c, 0.3)}" stroke-width="13" stroke-linecap="round"/>')
        p.append(f'<path d="M478,345 Q478,262 600,262 Q722,262 722,345" fill="none" stroke="{seam}" stroke-width="4" opacity="0.55"/>')
        p.append(f'<path d="M478,345 L470,520 M722,345 L730,520" stroke="{seam}" stroke-width="3" opacity="0.35"/>')
        p.append('<rect x="472" y="300" width="14" height="22" rx="3" fill="#2b2e33"/>')
        p.append(f'<path d="M480,500 Q600,476 720,500 L732,690 Q732,716 706,716 L494,716 Q468,716 468,690 Z" fill="url(#bp)"/>')
        p.append(f'<path d="M486,520 Q600,498 714,520" fill="none" stroke="{seam}" stroke-width="4" opacity="0.55"/>')
        p.append(f'<path d="M520,600 L680,600" stroke="{acc}" stroke-width="10" stroke-linecap="round" opacity="0.8"/>')
    p.append(f'<path d="M470,380 Q480,560 466,700" stroke="{light(c, 0.35)}" stroke-width="10" fill="none" opacity="0.18" stroke-linecap="round"/>')
    return scene(defs, "".join(p), (600, 748, 300))


def gymsack(c: str) -> str:
    defs = vgrad("gy", c, 0.16, 0.24)
    p = [
        '<path d="M455,250 L745,250 Q770,250 772,280 L790,700 Q792,742 750,742 L450,742 Q408,742 410,700 L428,280 Q430,250 455,250 Z" fill="url(#gy)"/>',
        f'<path d="M430,262 Q600,300 770,262" fill="none" stroke="{dark(c, 0.3)}" stroke-width="6"/>',
        '<path d="M445,258 Q520,170 600,190 Q680,170 755,258" fill="none" stroke="#2b2d30" stroke-width="9" stroke-linecap="round"/>',
        '<path d="M445,258 Q400,480 424,724" fill="none" stroke="#2b2d30" stroke-width="9" stroke-linecap="round"/>',
        '<path d="M755,258 Q800,480 776,724" fill="none" stroke="#2b2d30" stroke-width="9" stroke-linecap="round"/>',
        '<rect x="410" y="712" width="30" height="24" rx="6" fill="#2b2d30"/><rect x="760" y="712" width="30" height="24" rx="6" fill="#2b2d30"/>',
        f'<path d="M470,420 Q600,450 730,420" fill="none" stroke="{light(c, 0.4)}" stroke-width="6" opacity="0.3"/>',
        '<path d="M500,600 L700,560" stroke="#ffffff" stroke-width="14" stroke-linecap="round" opacity="0.85"/>',
        f'<path d="M470,320 Q490,520 470,700" stroke="{dark(c, 0.35)}" stroke-width="4" fill="none" opacity="0.25"/>',
    ]
    return scene(defs, "".join(p), (600, 748, 290))


# --------------------------------------------------------------------------- Elektronik
def headphones_over_ear(c: str) -> str:
    defs = vgrad("hb", c, 0.25, 0.2) + rgrad("hc", c) + rgrad("hp", dark(c, 0.2), 0.5, 0.5)
    p = [
        f'<path d="M382,540 C372,250 828,250 818,540" fill="none" stroke="{dark(c, 0.1)}" stroke-width="40" stroke-linecap="round"/>',
        f'<path d="M398,520 C392,282 808,282 802,520" fill="none" stroke="{light(c, 0.22)}" stroke-width="10" stroke-linecap="round" opacity="0.7"/>',
        '<rect x="368" y="470" width="28" height="70" rx="10" fill="#9ca1a8"/><rect x="804" y="470" width="28" height="70" rx="10" fill="#9ca1a8"/>',
        f'<ellipse cx="382" cy="600" rx="82" ry="118" fill="url(#hc)"/><ellipse cx="818" cy="600" rx="82" ry="118" fill="url(#hc)"/>',
        f'<ellipse cx="404" cy="600" rx="54" ry="92" fill="url(#hp)"/><ellipse cx="796" cy="600" rx="54" ry="92" fill="url(#hp)"/>',
        f'<ellipse cx="350" cy="560" rx="16" ry="40" fill="{light(c, 0.5)}" opacity="0.35"/>',
        f'<ellipse cx="786" cy="560" rx="16" ry="40" fill="{light(c, 0.5)}" opacity="0.3"/>',
    ]
    return scene(defs, "".join(p), (600, 740, 330))


def headset(c: str) -> str:
    defs = rgrad("hc", c) + rgrad("hp", dark(c, 0.2), 0.5, 0.5)
    p = [
        f'<path d="M412,560 C400,270 800,270 788,560" fill="none" stroke="{dark(c, 0.05)}" stroke-width="22" stroke-linecap="round"/>',
        f'<path d="M430,420 C470,300 730,300 770,420" fill="none" stroke="{light(c, 0.5)}" stroke-width="4" opacity="0.4"/>',
        '<ellipse cx="412" cy="610" rx="62" ry="78" fill="url(#hc)"/><ellipse cx="788" cy="610" rx="62" ry="78" fill="url(#hc)"/>',
        '<ellipse cx="428" cy="610" rx="40" ry="58" fill="url(#hp)"/><ellipse cx="772" cy="610" rx="40" ry="58" fill="url(#hp)"/>',
        f'<path d="M402,650 C430,720 520,740 610,712" fill="none" stroke="{dark(c, 0.05)}" stroke-width="12" stroke-linecap="round"/>',
        f'<ellipse cx="622" cy="708" rx="24" ry="16" fill="{dark(c, 0.15)}"/>',
        '<path d="M604,704 L640,712" stroke="#555a61" stroke-width="2"/>',
    ]
    return scene(defs, "".join(p), (600, 750, 300))


def earbuds_case() -> str:
    defs = ('<linearGradient id="ca" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/>'
            '<stop offset="0.6" stop-color="#eef0f2"/><stop offset="1" stop-color="#c9cdd2"/></linearGradient>'
            '<linearGradient id="bud" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/>'
            '<stop offset="1" stop-color="#cfd3d8"/></linearGradient>')
    p = [
        '<rect x="420" y="380" width="250" height="300" rx="78" fill="url(#ca)"/>',
        '<path d="M422,470 L668,470" stroke="#b9bec4" stroke-width="3"/>',
        '<circle cx="545" cy="560" r="6" fill="#9fd29f"/>',
        '<path d="M440,420 Q450,395 480,392" stroke="#fff" stroke-width="8" fill="none" opacity="0.9" stroke-linecap="round"/>',
        # Ohrhörer
        '<g transform="rotate(-18 770 520)"><ellipse cx="770" cy="470" rx="46" ry="40" fill="url(#bud)"/>'
        '<rect x="752" y="490" width="34" height="150" rx="17" fill="url(#bud)"/><ellipse cx="786" cy="462" rx="14" ry="10" fill="#3a3d42"/></g>',
        '<g transform="rotate(14 860 560)"><ellipse cx="860" cy="510" rx="46" ry="40" fill="url(#bud)"/>'
        '<rect x="842" y="530" width="34" height="150" rx="17" fill="url(#bud)"/><ellipse cx="846" cy="502" rx="14" ry="10" fill="#3a3d42"/></g>',
    ]
    return scene(defs, "".join(p), (640, 712, 300), backdrop="#e9e6df")


def smartphone(case: str) -> str:
    defs = vgrad("pc", case, 0.18, 0.2) + rgrad("lens", "#2b2f36", 0.4, 0.35)
    p = [
        '<g transform="rotate(-8 600 470)">',
        '<rect x="470" y="190" width="270" height="550" rx="52" fill="url(#pc)"/>',
        f'<rect x="478" y="198" width="254" height="534" rx="46" fill="none" stroke="{light(case, 0.3)}" stroke-width="3" opacity="0.5"/>',
        f'<rect x="496" y="220" width="128" height="128" rx="30" fill="{dark(case, 0.2)}"/>',
        '<circle cx="531" cy="255" r="24" fill="url(#lens)" stroke="#8b9097" stroke-width="3"/>',
        '<circle cx="589" cy="313" r="24" fill="url(#lens)" stroke="#8b9097" stroke-width="3"/>',
        '<circle cx="589" cy="255" r="9" fill="#f3f0dc"/>',
        f'<path d="M500,420 Q510,600 500,700" stroke="{light(case, 0.5)}" stroke-width="14" opacity="0.18" stroke-linecap="round"/>',
        '</g>',
    ]
    return scene(defs, "".join(p), (600, 760, 230))


def charger() -> str:
    defs = ('<linearGradient id="ch" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/>'
            '<stop offset="1" stop-color="#cdd1d6"/></linearGradient>')
    p = [
        '<path d="M700,560 C800,560 860,640 800,690 C720,750 520,740 470,690 C420,640 520,600 610,640 C690,676 760,640 720,610"'
        ' fill="none" stroke="#f4f5f6" stroke-width="16" stroke-linecap="round"/>',
        '<path d="M700,560 C800,560 860,640 800,690 C720,750 520,740 470,690 C420,640 520,600 610,640 C690,676 760,640 720,610"'
        ' fill="none" stroke="#c4c8cd" stroke-width="16" stroke-linecap="round" opacity="0.35" transform="translate(0 4)"/>',
        '<rect x="700" y="596" width="54" height="26" rx="8" fill="#e6e8eb" transform="rotate(-25 727 609)"/>',
        '<rect x="420" y="300" width="250" height="250" rx="40" fill="url(#ch)"/>',
        '<rect x="520" y="530" width="50" height="16" rx="7" fill="#2f3237"/>',
        '<path d="M440,330 Q446,316 470,314" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round"/>',
        '<path d="M670,520 C700,540 690,560 700,560" stroke="#f4f5f6" stroke-width="16" fill="none"/>',
    ]
    return scene(defs, "".join(p), (620, 745, 300))


# --------------------------------------------------------------------------- Accessoires
def wallet(c: str) -> str:
    defs = vgrad("wa", c, 0.2, 0.25) + vgrad("wf", dark(c, 0.05), 0.15, 0.2)
    p = [
        '<g transform="rotate(-6 600 500)">',
        '<rect x="390" y="330" width="420" height="300" rx="34" fill="url(#wa)"/>',
        '<rect x="406" y="346" width="388" height="268" rx="24" fill="none" stroke="#9b9187" stroke-width="2.5" stroke-dasharray="9 7" opacity="0.6"/>',
        '<path d="M600,334 L600,626" stroke="#000" stroke-width="5" opacity="0.25"/>',
        f'<path d="M604,334 L604,626" stroke="{light(c, 0.3)}" stroke-width="2" opacity="0.4"/>',
        f'<path d="M420,360 Q440,350 480,350" stroke="{light(c, 0.5)}" stroke-width="6" fill="none" opacity="0.35" stroke-linecap="round"/>',
        '</g>',
    ]
    return scene(defs, "".join(p), (600, 680, 260))


def ring_gold() -> str:
    defs = ('<linearGradient id="go" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2b8"/>'
            '<stop offset="0.35" stop-color="#e2b84a"/><stop offset="0.7" stop-color="#a87b1c"/><stop offset="1" stop-color="#f0d27a"/></linearGradient>'
            '<linearGradient id="gi" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a5612"/>'
            '<stop offset="1" stop-color="#d9b04c"/></linearGradient>')
    p = [
        '<ellipse cx="600" cy="520" rx="130" ry="96" fill="none" stroke="url(#gi)" stroke-width="30"/>',
        '<path d="M470,520 A130,96 0 0 0 730,520" fill="none" stroke="url(#go)" stroke-width="40"/>',
        '<path d="M500,572 A130,96 0 0 0 630,616" fill="none" stroke="#fff6d0" stroke-width="7" opacity="0.8" stroke-linecap="round"/>',
    ]
    return scene(defs, "".join(p), (600, 640, 170), backdrop="#e8e4dc")


def watch_silver() -> str:
    defs = ('<linearGradient id="si" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/>'
            '<stop offset="0.4" stop-color="#c9ced4"/><stop offset="0.75" stop-color="#8d939a"/><stop offset="1" stop-color="#e3e6ea"/></linearGradient>'
            '<radialGradient id="di" cx="0.4" cy="0.35" r="0.8"><stop offset="0" stop-color="#2f4a6e"/><stop offset="1" stop-color="#14233a"/></radialGradient>')
    links = "".join(
        f'<rect x="548" y="{y}" width="104" height="30" rx="6" fill="url(#si)" stroke="#8a9097" stroke-width="2"/>'
        for y in (180, 214, 248, 282, 618, 652, 686, 720)
    )
    ticks = "".join(
        f'<rect x="597" y="398" width="6" height="18" fill="#e9edf2" transform="rotate({a} 600 470)"/>' for a in range(0, 360, 30)
    )
    p = [
        links,
        '<circle cx="600" cy="470" r="150" fill="url(#si)"/>',
        '<circle cx="600" cy="470" r="118" fill="url(#di)"/>',
        ticks,
        '<path d="M600,470 L600,392" stroke="#f4f6f8" stroke-width="7" stroke-linecap="round"/>',
        '<path d="M600,470 L656,500" stroke="#f4f6f8" stroke-width="9" stroke-linecap="round"/>',
        '<circle cx="600" cy="470" r="9" fill="#d6dade"/>',
        '<rect x="744" y="455" width="22" height="30" rx="5" fill="url(#si)"/>',
        '<path d="M520,380 Q560,350 610,352" stroke="#fff" stroke-width="8" fill="none" opacity="0.25" stroke-linecap="round"/>',
    ]
    return scene(defs, "".join(p), (600, 775, 150))


def sunglasses() -> str:
    defs = ('<linearGradient id="le" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3c4048"/>'
            '<stop offset="0.6" stop-color="#15171b"/><stop offset="1" stop-color="#2a2d33"/></linearGradient>')
    lens = "M0,0 C0,-40 30,-60 110,-60 C190,-60 210,-40 205,10 C198,80 160,110 100,110 C40,110 0,70 0,0 Z"
    p = [
        '<path d="M370,440 L250,470 M830,440 L950,470" stroke="#16181c" stroke-width="16" stroke-linecap="round"/>',
        f'<path d="{lens}" transform="translate(372 470)" fill="url(#le)" stroke="#0e0f12" stroke-width="16"/>',
        f'<path d="{lens}" transform="translate(828 470) scale(-1 1)" fill="url(#le)" stroke="#0e0f12" stroke-width="16"/>',
        '<path d="M577,445 Q600,425 623,445" fill="none" stroke="#0e0f12" stroke-width="14"/>',
        '<path d="M400,440 Q430,418 480,416" stroke="#fff" stroke-width="7" fill="none" opacity="0.3" stroke-linecap="round"/>',
        '<path d="M650,440 Q680,418 730,416" stroke="#fff" stroke-width="7" fill="none" opacity="0.3" stroke-linecap="round"/>',
    ]
    return scene(defs, "".join(p), (600, 640, 330))


def scarf(c: str) -> str:
    defs = vgrad("sc", c, 0.15, 0.2) + vgrad("sd", dark(c, 0.1), 0.1, 0.25)
    knit = "".join(
        f'<path d="M{x},300 L{x},700" stroke="{dark(c, 0.25)}" stroke-width="3" opacity="0.25"/>' for x in list(range(474, 600, 22)) + list(range(612, 740, 22))
    )
    fringe_a = "".join(f'<path d="M{x},700 l-4,48" stroke="{c}" stroke-width="6" stroke-linecap="round"/>' for x in range(468, 600, 14))
    fringe_b = "".join(f'<path d="M{x},700 l4,48" stroke="{dark(c, 0.08)}" stroke-width="6" stroke-linecap="round"/>' for x in range(612, 744, 14))
    p = [
        '<path d="M460,300 Q535,272 610,286 L610,700 L460,700 Z" fill="url(#sc)"/>',
        '<path d="M590,286 Q665,272 740,300 L740,700 L590,700 Z" fill="url(#sd)"/>',
        f'<path d="M592,290 L592,700" stroke="{dark(c, 0.4)}" stroke-width="6" opacity="0.35"/>',
        knit, fringe_a, fringe_b,
        f'<path d="M470,300 Q600,262 730,300" fill="none" stroke="{light(c, 0.35)}" stroke-width="10" opacity="0.4"/>',
    ]
    return scene(defs, "".join(p), (600, 760, 230))


def beanie(c: str) -> str:
    defs = vgrad("be", c, 0.18, 0.18) + vgrad("bc", dark(c, 0.08), 0.1, 0.25)
    ribs = "".join(f'<path d="M{x},560 L{x},690" stroke="{dark(c, 0.3)}" stroke-width="4" opacity="0.35"/>' for x in range(440, 780, 18))
    knit = "".join(
        f'<path d="M{x},560 Q{x + (x - 600) * 0.1:.0f},400 600,300" stroke="{dark(c, 0.25)}" stroke-width="3" fill="none" opacity="0.18"/>'
        for x in range(450, 760, 30)
    )
    p = [
        '<path d="M430,580 C420,340 520,270 600,270 C680,270 780,340 770,580 Z" fill="url(#be)"/>',
        knit,
        '<rect x="420" y="555" width="360" height="140" rx="28" fill="url(#bc)"/>',
        ribs,
        f'<path d="M470,380 Q510,310 580,296" stroke="{light(c, 0.4)}" stroke-width="10" fill="none" opacity="0.3" stroke-linecap="round"/>',
    ]
    return scene(defs, "".join(p), (600, 712, 230))


def helmet() -> str:
    defs = ('<linearGradient id="he" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/>'
            '<stop offset="0.6" stop-color="#e7e9ec"/><stop offset="1" stop-color="#b9bec4"/></linearGradient>')
    vents = "".join(
        f'<path d="M{x},{y} q{dx},-60 {dx * 2},-100" stroke="#2d3035" stroke-width="20" stroke-linecap="round" fill="none"/>'
        for x, y, dx in ((470, 520, 10), (540, 470, 14), (620, 450, 18), (700, 470, 20))
    )
    p = [
        '<path d="M360,600 C350,380 500,280 640,280 C790,280 880,400 860,560 C850,620 800,640 740,630 L420,640 C380,640 362,625 360,600 Z" fill="url(#he)"/>',
        vents,
        '<path d="M380,620 L860,560" stroke="#2d3035" stroke-width="16" stroke-linecap="round"/>',
        '<path d="M760,520 L900,500 Q910,520 880,540 L780,560 Z" fill="#2d3035"/>',
        '<path d="M430,640 Q470,720 560,730 M720,628 Q690,720 600,734" fill="none" stroke="#3d4148" stroke-width="10" stroke-linecap="round"/>',
        '<rect x="562" y="718" width="44" height="26" rx="7" fill="#22252a"/>',
        '<path d="M420,450 Q470,350 560,318" stroke="#fff" stroke-width="12" fill="none" opacity="0.8" stroke-linecap="round"/>',
    ]
    return scene(defs, "".join(p), (620, 760, 310))


def keyring() -> str:
    defs = ('<linearGradient id="ke" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f2f3f5"/>'
            '<stop offset="0.5" stop-color="#a9aeb5"/><stop offset="1" stop-color="#d7dadf"/></linearGradient>'
            '<linearGradient id="br" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6dc93"/>'
            '<stop offset="0.5" stop-color="#b98a2e"/><stop offset="1" stop-color="#e5c573"/></linearGradient>')

    def key(rot: float, fill: str, length: int) -> str:
        teeth = f"M70,-14 L{length},-14 L{length},14 L{length - 18},14 L{length - 24},26 L{length - 40},14 L{length - 58},26 L{length - 66},14 L70,14 Z"
        return (f'<g transform="translate(560 380) rotate({rot})">'
                f'<circle cx="38" cy="0" r="40" fill="{fill}" stroke="#7e848c" stroke-width="2"/>'
                f'<circle cx="22" cy="0" r="10" fill="#e9e6df"/>'
                f'<path d="{teeth}" fill="{fill}" stroke="#7e848c" stroke-width="2"/></g>')

    p = [
        key(62, "url(#ke)", 250),
        key(88, "url(#br)", 220),
        key(112, "url(#ke)", 200),
        '<circle cx="560" cy="380" r="52" fill="none" stroke="#b7bcc3" stroke-width="10"/>',
        '<circle cx="560" cy="380" r="52" fill="none" stroke="#ffffff" stroke-width="3" opacity="0.6" stroke-dasharray="40 300"/>',
    ]
    return scene(defs, "".join(p), (600, 720, 230))


def bottle(c: str) -> str:
    defs = hgrad("bo", c) + hgrad("cap", "#3a3e44", 0.3, 0.25)
    p = [
        '<g transform="rotate(-4 600 480)">',
        '<rect x="525" y="220" width="150" height="70" rx="18" fill="url(#cap)"/>',
        '<path d="M560,222 Q600,170 640,222" fill="none" stroke="#3a3e44" stroke-width="14"/>',
        '<path d="M520,300 L680,300 Q700,300 700,330 L700,710 Q700,744 666,744 L534,744 Q500,744 500,710 L500,330 Q500,300 520,300 Z" fill="url(#bo)"/>',
        f'<path d="M500,330 L700,330" stroke="{dark(c, 0.3)}" stroke-width="5" opacity="0.6"/>',
        '<rect x="538" y="360" width="16" height="340" rx="8" fill="#fff" opacity="0.25"/>',
        '</g>',
    ]
    return scene(defs, "".join(p), (600, 752, 150))


# --------------------------------------------------------------------------- Schirme
def stick_umbrella(c: str) -> str:
    defs = hgrad("um", c, 0.3, 0.12)
    p = [
        '<g transform="rotate(-28 600 470)">',
        '<path d="M600,170 L600,210" stroke="#8b8f96" stroke-width="10" stroke-linecap="round"/>',
        '<path d="M600,200 C640,260 650,520 620,640 L580,640 C550,520 560,260 600,200 Z" fill="url(#um)"/>',
        f'<path d="M600,210 C612,330 612,520 604,640" stroke="{dark(c, 0.5)}" stroke-width="3" fill="none" opacity="0.6"/>',
        f'<path d="M588,240 C580,360 582,520 592,630" stroke="{light(c, 0.4)}" stroke-width="5" fill="none" opacity="0.35"/>',
        f'<rect x="588" y="430" width="24" height="14" rx="4" fill="{dark(c, 0.2)}"/>',
        '<path d="M600,640 L600,720" stroke="#5a5f66" stroke-width="12"/>',
        '<path d="M600,715 L600,770 C600,830 680,830 680,770" fill="none" stroke="#6b4a2f" stroke-width="26" stroke-linecap="round"/>',
        '</g>',
    ]
    return scene(defs, "".join(p), (600, 760, 320))


def folding_umbrella(c: str) -> str:
    defs = hgrad("fu", c, 0.28, 0.15) + hgrad("fs", dark(c, 0.06), 0.3, 0.12)
    p = [
        '<g transform="rotate(-62 600 480)">',
        '<rect x="560" y="380" width="80" height="250" rx="34" fill="url(#fs)"/>',
        f'<path d="M560,420 L640,420 M560,590 L640,590" stroke="{dark(c, 0.3)}" stroke-width="4" opacity="0.6"/>',
        '<path d="M572,380 Q600,330 628,380 Z" fill="url(#fu)"/>',
        '<rect x="568" y="630" width="64" height="110" rx="20" fill="#26282c"/>',
        '<rect x="578" y="642" width="10" height="86" rx="5" fill="#fff" opacity="0.15"/>',
        '<path d="M600,740 C600,780 640,790 650,770" fill="none" stroke="#26282c" stroke-width="6"/>',
        '<rect x="572" y="400" width="12" height="210" rx="6" fill="#fff" opacity="0.2"/>',
        '</g>',
    ]
    return scene(defs, "".join(p), (600, 680, 300))


def clear_umbrella() -> str:
    defs = ('<radialGradient id="cl" cx="0.45" cy="0.3" r="0.8"><stop offset="0" stop-color="#ffffff" stop-opacity="0.75"/>'
            '<stop offset="1" stop-color="#cfd8de" stop-opacity="0.45"/></radialGradient>')
    ribs = "".join(
        f'<path d="M600,250 Q{600 + dx * 0.55:.0f},300 {600 + dx},{y}" stroke="#9aa3ab" stroke-width="3" fill="none" opacity="0.8"/>'
        for dx, y in ((-280, 520), (-170, 545), (-60, 555), (60, 555), (170, 545), (280, 520))
    )
    p = [
        '<path d="M320,520 C330,330 470,250 600,250 C730,250 870,330 880,520 Q823,500 770,545 Q715,525 660,555 Q600,535 540,555 Q485,525 430,545 Q377,500 320,520 Z"'
        ' fill="url(#cl)" stroke="#a9b2ba" stroke-width="3"/>',
        ribs,
        '<path d="M600,230 L600,252" stroke="#6f767e" stroke-width="8" stroke-linecap="round"/>',
        '<path d="M600,252 L600,760" stroke="#7d848c" stroke-width="9"/>',
        '<path d="M600,740 L600,780 C600,830 660,830 664,780" fill="none" stroke="#2c2f34" stroke-width="22" stroke-linecap="round"/>',
        '<path d="M420,360 Q480,290 560,272" stroke="#fff" stroke-width="10" fill="none" opacity="0.7" stroke-linecap="round"/>',
    ]
    return scene(defs, "".join(p), (600, 800, 300))


# --------------------------------------------------------------------------- Liste
IMAGES = {
    # Berufsbildungszentrum Seetal
    "bzs-kopfhoerer-schwarz": headphones_over_ear("#2a2c30"),
    "bzs-kapuzenpullover-grau": garment("#9aa0a7", hood=True, pocket=True, strings=True),
    "bzs-schluesselbund": keyring(),
    "bzs-trinkflasche-blau": bottle("#2f6fdb"),
    "bzs-regenjacke-blau": garment("#2459b8", hood=True, zipper=True, trim="#1b3f82"),
    "bzs-rucksack-grau": backpack("#7d848c", accent="#c2d23a"),
    "bzs-stockschirm-schwarz": stick_umbrella("#25272b"),
    # Fundbüro Stadt Lindenau
    "fbl-rucksack-schwarz": backpack("#26282c", boxy=True, patch=True),
    "fbl-smartphone-gruen": smartphone("#3e8a5a"),
    "fbl-portemonnaie-schwarz": wallet("#2b2724"),
    "fbl-kinderjacke-blau": garment("#3d8be0", hood=True, zipper=True, scale=0.78, trim="#f2c230"),
    "fbl-daunenjacke-rot": garment("#c8322f", zipper=True, quilted=True, collar=True),
    "fbl-ring-gold": ring_gold(),
    "fbl-armbanduhr-silber": watch_silver(),
    # Nordwind Logistik AG
    "nwl-ladegeraet-weiss": charger(),
    "nwl-wollschal-braun": scarf("#8a5a35"),
    "nwl-sonnenbrille-schwarz": sunglasses(),
    "nwl-headset-schwarz": headset("#2a2c30"),
    "nwl-softshelljacke-schwarz": garment("#2c2f33", zipper=True, collar=True),
    "nwl-regenschirm-transparent": clear_umbrella(),
    "nwl-rucksack-gruen": backpack("#3f6b45", rolltop=True),
    # Regionalverkehr Seetal
    "rvs-taschenschirm-rot": folding_umbrella("#c8322f"),
    "rvs-ohrhoerer-weiss": earbuds_case(),
    "rvs-turnbeutel-blau": gymsack("#2f5fc4"),
    "rvs-muetze-gruen": beanie("#2e7d4f"),
    "rvs-velohelm-weiss": helmet(),
}


# Vergrösserung pro Bild, damit der Gegenstand auch in kleinen Vorschaubildern gut erkennbar ist.
ZOOM = {
    "bzs-schluesselbund": 1.55, "fbl-ring-gold": 1.45, "rvs-ohrhoerer-weiss": 1.3, "rvs-taschenschirm-rot": 1.35,
    "fbl-portemonnaie-schwarz": 1.3, "nwl-sonnenbrille-schwarz": 1.15, "fbl-armbanduhr-silber": 1.05,
    "nwl-regenschirm-transparent": 1.05, "bzs-stockschirm-schwarz": 1.1, "fbl-kinderjacke-blau": 1.2,
    "nwl-ladegeraet-weiss": 1.3, "rvs-muetze-gruen": 1.3, "nwl-wollschal-braun": 1.2, "fbl-smartphone-gruen": 1.1,
}
DEFAULT_ZOOM = 1.18


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    only = set(sys.argv[1:])
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={"width": W, "height": H})
        for name, svg in IMAGES.items():
            if only and name not in only:
                continue
            z = ZOOM.get(name, DEFAULT_ZOOM)
            svg = svg.replace("__ZOOM__", f"translate(600 480) scale({z}) translate(-600 -480)")
            page.set_content(f'<html><body style="margin:0">{svg}</body></html>')
            png = page.screenshot(clip={"x": 0, "y": 0, "width": W, "height": H})
            Image.open(io.BytesIO(png)).convert("RGB").save(OUT / f"{name}.webp", "WEBP", quality=84, method=6)
            print(f"✓ {name}.webp")
        browser.close()


if __name__ == "__main__":
    main()
