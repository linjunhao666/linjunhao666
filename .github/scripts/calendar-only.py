"""Keep the upstream 3D calendar, removing its language and stats panels."""
from pathlib import Path
import xml.etree.ElementTree as ET

NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", NS)

for mode in ("dark", "light"):
    path = Path(f"profile-3d-contrib/profile-{mode}.svg")
    tree = ET.parse(path)
    root = tree.getroot()
    groups = root.findall(f"{{{NS}}}g")
    if len(groups) != 4:
        raise ValueError("Unexpected upstream layout; refusing to publish")
    calendar = groups[0]
    bars = calendar.findall(f"{{{NS}}}g")
    # GitHub returns whole weeks at the edges of its rolling year.
    if not 350 <= len(bars) <= 378:
        raise ValueError("Missing or incomplete contribution calendar")
    if any(len(bar.findall(f"{{{NS}}}rect")) != 3 for bar in bars):
        raise ValueError("Unexpected upstream calendar structure")
    for group in groups[1:]:
        root.remove(group)
    # Leave the upstream geometry and growth animation intact.
    # Remove blank space above the calendar without clipping its tallest bars.
    import re
    positions = [float(re.fullmatch(r"translate\([\d.]+ ([\d.-]+)\)",
                                   bar.attrib["transform"])[1]) for bar in bars]
    top = max(0, int(min(positions)) - 32)
    root.set("viewBox", f"0 {top} 1280 {850 - top}")
    root.set("height", str(850 - top))
    style = root.find(f"{{{NS}}}style")
    style.text += "\n@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }"
    tree.write(path, encoding="unicode")
