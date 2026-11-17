import json
import re
from collections import Counter
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
WIDTH, HEIGHT = 2800, 520
MASK_PATH = ROOT / "images/oxskyline-small-cropped.png"
OUTPUT_PATH = ROOT / "images/research-wordart.png"
FONT_PATH = "/usr/share/fonts/truetype/lato/Lato-Bold.ttf"
COLORS = ("#205f52", "#397968", "#a56d34", "#5c715e", "#344f4d")
STOP = set("""a an and are as at be been being by can could did do does each for from had has have in into is it its may more most of on or our out over per same show shown so such than that the their them then there these they this those through to under upon us use used using various was we were what when where which while who will with within without would""".split())
GENERIC = set("""across approach approaches algorithm algorithms also analysis applications attacks based become better body both common computer dense demonstrate demonstrated different effective efficient efficiently enables even existing experiments experimental first following framework fully function general generally given highly however improve improves including introduce introduced knowledge labels large learn learned method methods model models number object only paper papers parameters perform performance popular previous problem problems provide provides proposed propose results show similar similarity simple solution solutions space specifically state state-of-the-art standard study task tasks technique techniques time trained variables version well work works""".split())
PHRASES = {
    "protocol learning": 24, "decentralized training": 22, "asynchronous optimization": 18,
    "communication efficiency": 14, "pipeline parallelism": 14, "data parallelism": 12,
    "subspace networks": 18, "neural network quantization": 18, "network pruning": 16,
    "learning dynamics": 18, "Markov random fields": 14, "energy minimization": 10,
    "semantic segmentation": 10, "stereo correspondence": 9, "visual representation": 10,
    "weak supervision": 9, "language models": 11, "signal propagation": 12, "graph cuts": 9,
    "metric learning": 9, "low-rank": 12, "incremental learning": 10, "generative models": 9,
    "image retrieval": 8, "vision language": 8, "collective training": 10,
}
RECENT_ABSTRACT_TERMS = """
internet-scale pretraining heterogeneous consumer GPUs pipeline-parallel model sharding
fault-tolerant collective operations communication bottleneck asynchronous updates
sparse averaging convergence guarantees low-rank weight structure nuclear-norm constraint
compressed activation masking anchor circuit model adaptation decentralized fine-tuning
"""


def load_corpus():
    abstracts = (ROOT / "abstracts.txt").read_text(encoding="utf-8")
    papers = json.loads((ROOT / "data/publications.json").read_text(encoding="utf-8"))
    topics = json.loads((ROOT / "data/topics.json").read_text(encoding="utf-8"))
    titles = "\n".join(paper["title"] for paper in papers)
    theme_text = "\n".join(f'{item["title"]} {item["description"]}' for item in topics)
    return f"{abstracts}\n{titles}\n{titles}\n{titles}\n{theme_text}\n{RECENT_ABSTRACT_TERMS}".lower()


def term_frequencies(corpus):
    words = Counter(re.findall(r"[a-z][a-z0-9-]{2,}", corpus))
    words.update(dict(json.loads((ROOT / "data/arxiv-abstract-terms.json").read_text(encoding="utf-8"))))
    for word in STOP | GENERIC:
        words.pop(word, None)
    phrase_counts = []
    abstract_counts = dict(json.loads((ROOT / "data/arxiv-abstract-terms.json").read_text(encoding="utf-8")))
    for phrase, boost in PHRASES.items():
        component_score = sum(abstract_counts.get(word, 0) for word in phrase.split()) // len(phrase.split())
        occurrences = len(re.findall(rf"\b{re.escape(phrase)}\b", corpus)) * 2
        phrase_counts.append((phrase, max(boost, component_score, occurrences)))
    singles = [(word, words.get(word, 0)) for word in ("memory", "gradient", "initialization", "sparsity", "calibration", "inference", "stereo", "compression") if words.get(word, 0) > 1]
    return phrase_counts + singles


def make_mask():
    source = Image.open(MASK_PATH).convert("RGBA").resize((WIDTH, HEIGHT), Image.LANCZOS)
    rgba = np.asarray(source)
    return (rgba[:, :, 3] > 20).astype(np.uint8)


def draw_wordart():
    terms = term_frequencies(load_corpus())
    mask = make_mask()
    mask_integral = np.pad(mask.astype(np.int64).cumsum(axis=0).cumsum(axis=1), ((1, 0), (1, 0)))
    occupancy = np.zeros((HEIGHT, WIDTH), dtype=np.uint8)
    art = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(art)
    candidates = [(x, y) for y in range(12, HEIGHT - 12, 18) for x in range(12, WIDTH - 12, 24)]
    center_x, center_y = WIDTH / 2, HEIGHT * 0.60
    candidates.sort(key=lambda point: (abs(point[0] - center_x) + abs(point[1] - center_y), point[1], point[0]))
    max_weight = max(weight for _, weight in terms)
    placed = []

    for index, (term, weight) in enumerate(sorted(terms, key=lambda item: (-item[1], item[0]))):
        ideal = min(118, max(33, round(30 + 75 * (weight / max_weight) ** 0.54)))
        position = None
        for size in range(ideal, 28, -5):
            font = ImageFont.truetype(FONT_PATH, size)
            left, top, right, bottom = draw.textbbox((0, 0), term, font=font)
            text_width, text_height = right - left, bottom - top
            if text_width + 10 >= WIDTH or text_height + 8 >= HEIGHT:
                continue
            for cx, cy in candidates:
                x, y = cx - text_width // 2, cy - text_height // 2
                box = (x - 4, y - 3, x + text_width + 4, y + text_height + 3)
                if box[0] < 0 or box[1] < 0 or box[2] >= WIDTH or box[3] >= HEIGHT:
                    continue
                x0, y0, x1, y1 = box
                area = (x1 - x0) * (y1 - y0)
                shape_pixels = mask_integral[y1, x1] - mask_integral[y0, x1] - mask_integral[y1, x0] + mask_integral[y0, x0]
                if shape_pixels < area * 0.72 or occupancy[y0:y1, x0:x1].any():
                    continue
                position = (x - left, y - top, font, box)
                break
            if position:
                break
        if not position:
            continue
        x, y, font, box = position
        draw.text((x, y), term, font=font, fill=COLORS[index % len(COLORS)])
        occupancy[box[1]:box[3], box[0]:box[2]] = 1
        placed.append(term)

    skyline = Image.new("RGBA", (WIDTH, HEIGHT), "#e8efe9")
    skyline.putalpha(Image.fromarray(mask * 220))
    art = Image.alpha_composite(skyline, art)
    art.save(OUTPUT_PATH, optimize=True)
    print(f"Saved {OUTPUT_PATH.name}: {len(placed)}/{len(terms)} terms placed")


if __name__ == "__main__":
    draw_wordart()
