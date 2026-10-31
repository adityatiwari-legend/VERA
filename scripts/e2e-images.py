"""Generates the test images for scripts/e2e-check.mjs (before/after pothole + invoice)."""
from PIL import Image, ImageDraw
import random, os

os.makedirs('scratch', exist_ok=True)

img = Image.new('RGB', (700, 900), (250, 250, 248))
d = ImageDraw.Draw(img)
d.rectangle([40, 40, 660, 120], fill=(60, 60, 90))
d.text((60, 70), "SHARMA ELECTRICALS", fill=(255, 255, 255))
d.text((60, 160), "Tax Invoice", fill=(20, 20, 20))
d.text((60, 200), "Invoice No: INV-2026-0777", fill=(20, 20, 20))
d.text((60, 240), "Date: 2026-10-15", fill=(20, 20, 20))
d.text((60, 300), "Bill To: E2E Village Beneficiaries", fill=(20, 20, 20))
d.text((60, 360), "Item: Borewell pump electricals", fill=(20, 20, 20))
d.text((60, 400), "Amount: Rs 32203.39", fill=(20, 20, 20))
d.text((60, 460), "GST (18%): Rs 5796.61", fill=(20, 20, 20))
d.text((60, 520), "Grand Total: Rs 38000.00", fill=(120, 20, 20))
d.text((60, 600), "Thank you for your business.", fill=(60, 60, 60))
img.save('scratch/e2e-invoice.jpg', 'JPEG', quality=92)

img2 = Image.new('RGB', (480, 360), (105, 100, 95))
d2 = ImageDraw.Draw(img2)
for _ in range(3000):
    x, y = random.randint(0, 479), random.randint(0, 359)
    c = 95 + random.randint(-25, 25)
    d2.point((x, y), fill=(c, c, c - 4, 255))
d2.ellipse([150, 110, 330, 250], fill=(25, 22, 20))
d2.ellipse([180, 135, 300, 225], fill=(10, 9, 8))
img2.save('scratch/e2e-before.jpg', 'JPEG', quality=88)

img3 = Image.new('RGB', (480, 360), (110, 105, 100))
d3 = ImageDraw.Draw(img3)
for _ in range(3000):
    x, y = random.randint(0, 479), random.randint(0, 359)
    c = 100 + random.randint(-25, 25)
    d3.point((x, y), fill=(c, c, c - 3, 255))
d3.ellipse([150, 110, 330, 250], fill=(150, 145, 138))
d3.ellipse([170, 128, 310, 232], fill=(162, 157, 150))
d3.rectangle([60, 40, 420, 60], fill=(240, 240, 240))
img3.save('scratch/e2e-after.jpg', 'JPEG', quality=88)
print('e2e images generated')
