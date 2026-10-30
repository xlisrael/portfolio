"""Regenerate the favicon, app icons and Open Graph card.

    python3 tools/make-assets.py      (requires: pip install pillow)
"""

import os
from PIL import Image, ImageDraw, ImageFont

BG   = (15, 22, 19)
SURF = (23, 33, 28)
ACC  = (92, 207, 163)
FG   = (227, 235, 230)
MUT  = (146, 163, 154)

def mark(d, S, accent=ACC, bg=BG):
    """Draw the >_ terminal mark scaled to size S."""
    d.rounded_rectangle([0, 0, S-1, S-1], radius=int(S*0.22), fill=bg)
    w = max(2, int(S*0.105))
    d.line([(S*0.26, S*0.30), (S*0.48, S*0.50), (S*0.26, S*0.70)],
           fill=accent, width=w, joint="curve")
    d.rectangle([S*0.545, S*0.585, S*0.765, S*0.685], fill=accent)

# --- app icons -------------------------------------------------------------
for size, name in [(180, "apple-touch-icon.png"), (512, "icon-512.png"), (192, "icon-192.png")]:
    img = Image.new("RGB", (size, size), BG)
    mark(ImageDraw.Draw(img), size)
    img.save(os.path.join("assets", name), optimize=True)
    print("wrote", name, img.size)

# --- Open Graph card --------------------------------------------------------
W, H = 1200, 630
og = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(og)

# faint grid
for x in range(0, W + 1, 40):
    d.line([(x, 0), (x, H)], fill=SURF, width=1)
for y in range(0, H + 1, 40):
    d.line([(0, y), (W, y)], fill=SURF, width=1)

# soft accent glow top-left
glow = Image.new("RGB", (W, H), BG)
gd = ImageDraw.Draw(glow)
for r in range(420, 0, -12):
    t = 1 - r / 420
    gd.ellipse([120 - r, 90 - r, 120 + r, 90 + r],
               fill=(int(BG[0] + (ACC[0]-BG[0])*0.10*t),
                     int(BG[1] + (ACC[1]-BG[1])*0.10*t),
                     int(BG[2] + (ACC[2]-BG[2])*0.10*t)))
og = Image.blend(og, glow, 0.0)
d = ImageDraw.Draw(og)

mono  = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
monob = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"
sansb = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

f_prompt = ImageFont.truetype(mono, 30)
f_name   = ImageFont.truetype(sansb, 150)
f_role   = ImageFont.truetype(mono, 32)
f_small  = ImageFont.truetype(mono, 24)

# mark
mark_img = Image.new("RGB", (96, 96), BG)
mark(ImageDraw.Draw(mark_img), 96)
og.paste(mark_img, (80, 74))

d.text((200, 92), "excel@ubuntu:~$", font=f_prompt, fill=ACC)

d.text((80, 200), "Excel", font=f_name, fill=FG)

d.line([(80, 395), (1120, 395)], fill=SURF, width=2)

d.text((80, 425), "Security tooling · Android apps · Research", font=f_role, fill=FG)
d.text((80, 490), "Security and mobile developer  —  Nigeria", font=f_small, fill=MUT)

# accent bar
d.rectangle([80, 545, 300, 551], fill=ACC)

og.save(os.path.join("assets", "og.png"), optimize=True)
print("wrote og.png", og.size)
