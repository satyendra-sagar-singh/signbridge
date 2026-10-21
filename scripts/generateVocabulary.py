#!/usr/bin/env python3
"""Generates the extended sign set and merges it into src/data/islVocabulary.json.

Poses are composed from reusable LOCATION + HANDSHAPE templates (right-hand
dominant, mirrored for the left hand). They are placeholder approximations for
the procedural mannequin; descriptions summarise the commonly documented ISL
form in words. Re-run after editing: python3 scripts/generateVocabulary.py
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
VOCAB = ROOT / "src" / "data" / "islVocabulary.json"

# ---- templates -------------------------------------------------------------

LOC = {  # right arm: (Arm, ForeArm, Hand?)
    "CHEST": ([-55, 0, -20], [-110, 0, 30]),
    "CHEST_HIGH": ([-70, 0, -25], [-120, 0, 30]),
    "FRONT": ([-70, 0, -15], [-50, 0, 0]),
    "FRONT_LOW": ([-50, 0, -15], [-40, 0, 0]),
    "FRONT_FAR": ([-85, 0, -15], [-20, 0, 0]),
    "MOUTH": ([-70, 0, -10], [-135, 0, 5]),
    "NOSE": ([-75, 0, -12], [-138, 0, 8]),
    "CHIN": ([-75, 0, -10], [-130, 0, 0]),
    "CHEEK": ([-85, 0, -22], [-135, 0, 0]),
    "FOREHEAD": ([-110, 0, -35], [-120, 0, 0]),
    "TEMPLE": ([-110, 0, -42], [-120, 0, 0]),
    "EAR": ([-100, 0, -48], [-130, 0, 0]),
    "EYE": ([-95, 0, -25], [-130, 0, 0]),
    "SHOULDER_OPP": ([-60, 0, -35], [-130, 0, 45]),
    "SHOULDER": ([-80, 0, -50], [-135, 0, -20]),
    "SIDE": ([-60, 0, -50], [-40, 0, 0]),
    "UP": ([-150, 0, -20], [-30, 0, 0]),
    "BASE": ([-60, 0, -25], [-85, 0, 0]),  # on top of the left palm
    "WAIST": ([-35, 0, -20], [-60, 0, 20]),
}
PALM_BASE = {"LeftArm": [-60, 0, 15], "LeftForeArm": [-75, 0, 0]}  # left palm held in front

HS = {
    "FLAT": {},
    "FIST": {"Fingers": [95, 0, 0], "HandThumb1": [50, 0, 0]},
    "POINT": {"Fingers": [90, 0, 0], "HandIndex1": [0, 0, 0], "HandThumb1": [40, 0, 0]},
    "CLAW": {"Fingers": [55, 0, 0]},
    "THUMB": {"Fingers": [95, 0, 0]},
    "V": {"HandRing1": [90, 0, 0], "HandPinky1": [90, 0, 0], "HandThumb1": [40, 0, 0]},
    "THREE": {"HandPinky1": [90, 0, 0], "HandThumb1": [40, 0, 0]},
    "FOUR": {"HandThumb1": [60, 0, 0]},
    "PINCH": {"Fingers": [50, 0, 0], "HandThumb1": [40, 0, 0]},
    "Y": {"HandIndex1": [90, 0, 0], "HandMiddle1": [90, 0, 0], "HandRing1": [90, 0, 0]},
    "L": {"HandMiddle1": [90, 0, 0], "HandRing1": [90, 0, 0], "HandPinky1": [90, 0, 0]},
    "O": {"Fingers": [60, 0, 0], "HandThumb1": [30, 0, 0]},
    "C": {"Fingers": [45, 0, 0], "HandThumb1": [10, 0, 0]},
    "BENT": {"Fingers": [40, 0, 0]},
    "T": {"Fingers": [90, 0, 0], "HandThumb1": [10, 0, 0]},
}


def hand(side, loc, shape="FLAT", wrist=None, d=(0, 0, 0)):
    """Pose for one hand at a location template (+ offsets on Arm x,z and ForeArm x)."""
    a, f = LOC[loc]
    a = [a[0] + d[0], a[1], a[2] + d[1]]
    f = [f[0] + d[2], f[1], f[2]]
    if side == "Left":  # mirror sideways components
        a = [a[0], -a[1], -a[2]]
        f = [f[0], -f[1], -f[2]]
    pose = {f"{side}Arm": a, f"{side}ForeArm": f}
    if wrist:
        pose[f"{side}Hand"] = wrist if side == "Right" else [wrist[0], -wrist[1], -wrist[2]]
    for k, v in HS[shape].items():
        pose[f"{side}{k}" if k != "Fingers" else f"{side}Fingers"] = v
    return pose


def both(loc, shape="FLAT", wrist=None, d=(0, 0, 0)):
    return {**hand("Right", loc, shape, wrist, d), **hand("Left", loc, shape, wrist, d)}


def merge(*poses):
    out = {}
    for p in poses:
        out.update(p)
    return out


def frames(*steps):
    """steps: (t, pose) → keyframes list."""
    return [{"t": t, "pose": p} for t, p in steps]


def tap(loc, shape="FLAT", extra=None, n=2, start=0.4, gap=0.25, side="Right", wrist=None):
    """Hold at loc, tapping by bending the forearm a little more, n times."""
    extra = extra or {}
    out = []
    t = start
    for i in range(n):
        out.append((t, merge(extra, hand(side, loc, shape, wrist))))
        out.append((t + gap, merge(extra, hand(side, loc, shape, wrist, d=(0, 0, -9)))))
        t += gap * 2
    return frames(*out)


def E(gloss, words, desc, expr="neutral", kf=None, **extra):
    return {"gloss": gloss, "words": words, "description": desc, "expression": expr, "clipName": gloss.replace("-", "_"), "keyframes": kf, **extra}


SMILE, FROWN, Q = "smile", "frown", "question"
BROW_UP = {"Brows": [-20, 0, 0]}
BROW_DOWN = {"Brows": [12, 0, 0]}

# ---- signs -----------------------------------------------------------------

NEW = [
    # people & family
    E("MOTHER", ["mother", "mom", "mum", "mummy", "mama", "maa", "amma", "mata", "mommy"], "Index finger touches the side of the nose, then moves slightly outward.", SMILE,
      frames((0.4, hand("Right", "NOSE", "POINT")), (0.8, hand("Right", "NOSE", "POINT", d=(0, -12, 10))), (1.05, hand("Right", "NOSE", "POINT", d=(0, -12, 10))))),
    E("FATHER", ["father", "dad", "daddy", "papa", "pita", "abba", "baba"], "Index finger and thumb stroke the upper lip like a moustache.", SMILE,
      frames((0.4, hand("Right", "MOUTH", "L", d=(0, 10, 0))), (0.75, hand("Right", "MOUTH", "L", d=(0, -15, 0))), (1.0, hand("Right", "MOUTH", "L", d=(0, -15, 0))))),
    E("BROTHER", ["brother", "brothers", "bhai", "bhaiya", "bro"], "Both fists held in front; the right taps down on top of the left.", "neutral",
      tap("BASE", "FIST", extra=merge(PALM_BASE, hand("Left", "BASE", "FIST", d=(5, 0, 0))))),
    E("SISTER", ["sister", "sisters", "didi", "behen", "sis"], "Index finger touches the nose, then both index fingers meet in front.", "neutral",
      frames((0.4, hand("Right", "NOSE", "POINT")), (0.9, both("FRONT", "POINT", d=(0, 5, -20))), (1.2, both("FRONT", "POINT", d=(0, 5, -20))))),
    E("FAMILY", ["family", "families", "fam", "parivar", "relatives"], "Both open hands circle around each other in front of the chest and come together.", SMILE,
      frames((0.4, both("FRONT", d=(0, 15, -20))), (0.8, both("FRONT", d=(-10, 0, -40))), (1.2, both("FRONT", d=(0, -10, -20))))),
    E("BABY", ["baby", "babies", "child", "children", "kid", "kids", "bachcha", "beta", "beti", "infant"], "Arms crossed as if cradling a baby, rocking side to side.", SMILE,
      frames((0.4, merge(hand("Right", "WAIST", d=(-20, 0, -40)), hand("Left", "WAIST", d=(-10, 0, -40)))), (0.8, merge(hand("Right", "WAIST", d=(-20, 15, -40)), hand("Left", "WAIST", d=(-10, 15, -40)))),
             (1.2, merge(hand("Right", "WAIST", d=(-20, -15, -40)), hand("Left", "WAIST", d=(-10, -15, -40)))), (1.5, merge(hand("Right", "WAIST", d=(-20, 0, -40)), hand("Left", "WAIST", d=(-10, 0, -40)))))),
    E("WE", ["we", "us", "our", "ours", "ourselves", "hum", "humara"], "Index finger points to own chest, then arcs to include others.", "neutral",
      frames((0.35, hand("Right", "CHEST", "POINT")), (0.75, hand("Right", "FRONT", "POINT", d=(0, -30, 0))), (1.0, hand("Right", "FRONT", "POINT", d=(0, -30, 0))))),
    E("THEY", ["they", "them", "their", "theirs", "he", "she", "him", "her", "his", "woh", "voh", "unka", "uska"], "Index finger points to the side, toward the person being referred to.", "neutral",
      frames((0.35, hand("Right", "SIDE", "POINT")), (0.65, hand("Right", "SIDE", "POINT", d=(-8, -5, 0))), (0.9, hand("Right", "SIDE", "POINT", d=(-8, -5, 0))))),
    E("PERSON", ["person", "people", "man", "woman", "boy", "girl", "someone", "aadmi", "log", "insaan"], "Both flat hands, palms facing, move straight down to outline a body.", "neutral",
      frames((0.4, both("FRONT", d=(-10, 0, -20))), (0.9, both("FRONT_LOW", d=(0, 0, -10))), (1.1, both("FRONT_LOW", d=(0, 0, -10))))),
    E("TEACHER", ["teacher", "teach", "teaches", "taught", "professor", "guru"], "Both pinched hands move forward from the temples, as if giving knowledge.", "neutral",
      frames((0.4, both("TEMPLE", "PINCH")), (0.9, both("FRONT", "PINCH", d=(-10, 0, -30))), (1.15, both("FRONT", "PINCH", d=(-10, 0, -30))))),
    # verbs
    E("SEE", ["see", "look", "watch", "saw", "seen", "looking", "dekho", "dekh"], "V-hand moves from the eyes forward toward what is seen.", "neutral",
      frames((0.4, hand("Right", "EYE", "V")), (0.9, hand("Right", "FRONT", "V", d=(-10, 0, 0))), (1.15, hand("Right", "FRONT", "V", d=(-10, 0, 0))))),
    E("HEAR", ["hear", "listen", "heard", "listening", "suno"], "Cupped hand held behind the ear.", "neutral",
      frames((0.4, hand("Right", "EAR", "C")), (0.7, hand("Right", "EAR", "C", d=(-5, 0, -5))), (1.0, hand("Right", "EAR", "C")))),
    E("TALK", ["talk", "speak", "say", "tell", "said", "told", "speaking", "talking", "chat", "bol", "bolo", "baat", "kaho"], "Index finger moves forward from the mouth repeatedly.", "neutral",
      frames((0.35, hand("Right", "MOUTH", "POINT")), (0.6, hand("Right", "MOUTH", "POINT", d=(0, 0, 35))), (0.85, hand("Right", "MOUTH", "POINT")), (1.1, hand("Right", "MOUTH", "POINT", d=(0, 0, 35))))),
    E("SIT", ["sit", "sits", "sat", "seat", "sitting", "baitho", "baith"], "Both flat hands, palms down, press downward.", "neutral",
      frames((0.4, both("FRONT", d=(-10, 0, -20))), (0.8, both("FRONT_LOW", d=(0, 0, -20))), (1.05, both("FRONT_LOW", d=(0, 0, -20))))),
    E("STAND", ["stand", "stood", "standing", "khade", "khada"], "V-hand fingertips stand on the open left palm.", "neutral",
      frames((0.4, merge(PALM_BASE, hand("Right", "BASE", "V", wrist=[45, 0, 0]))), (1.0, merge(PALM_BASE, hand("Right", "BASE", "V", wrist=[45, 0, 0]))))),
    E("SLEEP", ["sleep", "sleeping", "slept", "asleep", "nap", "sona", "neend"], "Flat hand rests against the cheek with the head tilted, eyes closing.", "neutral",
      frames((0.5, merge(hand("Right", "CHEEK"), {"Head": [0, 0, -18]})), (1.2, merge(hand("Right", "CHEEK"), {"Head": [0, 0, -18]})))),
    E("WALK", ["walk", "walking", "walked", "chalna", "chal", "paidal"], "Both flat hands alternate moving forward like steps.", "neutral",
      frames((0.3, merge(hand("Right", "FRONT_LOW"), hand("Left", "FRONT_LOW", d=(-15, 0, 0)))), (0.6, merge(hand("Right", "FRONT_LOW", d=(-15, 0, 0)), hand("Left", "FRONT_LOW"))),
             (0.9, merge(hand("Right", "FRONT_LOW"), hand("Left", "FRONT_LOW", d=(-15, 0, 0)))), (1.2, merge(hand("Right", "FRONT_LOW", d=(-15, 0, 0)), hand("Left", "FRONT_LOW"))))),
    E("RUN", ["run", "running", "ran", "hurry", "fast", "quick", "quickly", "asap", "jaldi", "bhaago", "rush"], "Both fists pump alternately like running.", "neutral",
      frames((0.3, merge(hand("Right", "FRONT", "FIST", d=(0, 0, -30)), hand("Left", "WAIST", "FIST"))), (0.55, merge(hand("Right", "WAIST", "FIST"), hand("Left", "FRONT", "FIST", d=(0, 0, -30)))),
             (0.8, merge(hand("Right", "FRONT", "FIST", d=(0, 0, -30)), hand("Left", "WAIST", "FIST"))), (1.05, merge(hand("Right", "WAIST", "FIST"), hand("Left", "FRONT", "FIST", d=(0, 0, -30)))))),
    E("GIVE", ["give", "gives", "gave", "given", "giving", "offer", "dena"], "Pinched hand moves forward and opens toward the receiver.", "neutral",
      frames((0.4, hand("Right", "CHEST_HIGH", "PINCH")), (0.9, hand("Right", "FRONT_FAR")), (1.15, hand("Right", "FRONT_FAR")))),
    E("TAKE", ["take", "takes", "took", "taken", "get", "got", "grab", "lo", "lena", "le"], "Open hand reaches forward and closes into a fist pulling back.", "neutral",
      frames((0.4, hand("Right", "FRONT_FAR")), (0.85, hand("Right", "CHEST_HIGH", "FIST")), (1.1, hand("Right", "CHEST_HIGH", "FIST")))),
    E("BUY", ["buy", "buying", "bought", "purchase", "shopping", "kharido", "kharidna"], "Flat hand with money on it moves forward from the palm.", "neutral",
      frames((0.4, merge(PALM_BASE, hand("Right", "BASE", "PINCH"))), (0.9, merge(PALM_BASE, hand("Right", "FRONT_FAR", "PINCH"))), (1.15, merge(PALM_BASE, hand("Right", "FRONT_FAR", "PINCH"))))),
    E("MONEY", ["money", "cash", "paisa", "paise", "rupee", "rupees", "price", "cost", "pay", "paid", "payment", "bill"], "Pinched fingers tap the open left palm.", "neutral",
      tap("BASE", "PINCH", extra=PALM_BASE)),
    E("PHONE", ["phone", "call", "called", "calling", "mobile", "cell", "telephone", "ring"], "Y-hand held to the ear like a phone.", "neutral",
      frames((0.45, hand("Right", "EAR", "Y", d=(0, 15, 0))), (1.1, hand("Right", "EAR", "Y", d=(0, 15, 0))))),
    E("BOOK", ["book", "books", "kitab", "notebook"], "Palms together open outward like the pages of a book.", "neutral",
      frames((0.4, both("FRONT", d=(0, 0, -25))), (0.9, both("FRONT", wrist=[0, 0, -40], d=(0, -10, -25))), (1.15, both("FRONT", wrist=[0, 0, -40], d=(0, -10, -25))))),
    E("READ", ["read", "reading", "reads", "padho", "padhna"], "V-hand scans across the open left palm, like eyes over a page.", "neutral",
      frames((0.4, merge(PALM_BASE, hand("Right", "BASE", "V", d=(0, 10, 0)))), (0.75, merge(PALM_BASE, hand("Right", "BASE", "V", d=(0, -10, 0)))),
             (1.1, merge(PALM_BASE, hand("Right", "BASE", "V", d=(0, 10, 0)))))),
    E("WRITE", ["write", "writing", "wrote", "written", "note", "likho", "likhna"], "Pinched fingers write across the open left palm.", "neutral",
      frames((0.4, merge(PALM_BASE, hand("Right", "BASE", "PINCH", d=(0, 10, 0)))), (0.75, merge(PALM_BASE, hand("Right", "BASE", "PINCH", d=(0, -12, 0)))),
             (1.1, merge(PALM_BASE, hand("Right", "BASE", "PINCH", d=(0, 10, 0)))))),
    E("PLAY", ["play", "playing", "played", "game", "games", "fun", "khelo", "khelna", "khel"], "Both Y-hands shake side to side.", SMILE,
      frames((0.35, both("FRONT", "Y", wrist=[0, 0, -20], d=(0, 10, -20))), (0.6, both("FRONT", "Y", wrist=[0, 0, 20], d=(0, 10, -20))),
             (0.85, both("FRONT", "Y", wrist=[0, 0, -20], d=(0, 10, -20))), (1.1, both("FRONT", "Y", wrist=[0, 0, 20], d=(0, 10, -20))))),
    E("OPEN", ["open", "opens", "opened", "kholo", "khol"], "Both flat hands together, then separate outward.", "neutral",
      frames((0.4, both("FRONT", d=(0, 0, -25))), (0.9, both("FRONT", d=(0, 25, -25))), (1.15, both("FRONT", d=(0, 25, -25))))),
    E("CLOSE", ["close", "closed", "shut", "band", "bandh"], "Both flat hands apart, then come together.", "neutral",
      frames((0.4, both("FRONT", d=(0, 25, -25))), (0.9, both("FRONT", d=(0, 0, -25))), (1.15, both("FRONT", d=(0, 0, -25))))),
    E("WASH", ["wash", "washing", "clean", "cleaning", "bath", "bathe", "shower", "dho", "nahana", "saaf"], "Fists rub against each other in circles.", "neutral",
      frames((0.35, merge(hand("Right", "BASE", "FIST"), hand("Left", "BASE", "FIST", d=(5, 0, 0)))), (0.6, merge(hand("Right", "BASE", "FIST", d=(0, 8, 0)), hand("Left", "BASE", "FIST", d=(5, -8, 0)))),
             (0.85, merge(hand("Right", "BASE", "FIST"), hand("Left", "BASE", "FIST", d=(5, 0, 0)))), (1.1, merge(hand("Right", "BASE", "FIST", d=(0, 8, 0)), hand("Left", "BASE", "FIST", d=(5, -8, 0)))))),
    E("WAIT", ["wait", "waiting", "hold on", "hang on", "one minute", "one moment", "ruko", "rukho", "ek minute", "thehro"], "Both hands, palms up, wiggle the fingers.", "neutral",
      frames((0.35, both("FRONT_LOW", d=(0, 10, -30))), (0.6, both("FRONT_LOW", "BENT", d=(0, 10, -30))), (0.85, both("FRONT_LOW", d=(0, 10, -30))), (1.1, both("FRONT_LOW", "BENT", d=(0, 10, -30))))),
    E("MEET", ["meet", "meeting", "met", "milna", "mil", "milo"], "Two upright index fingers come together.", SMILE,
      frames((0.4, both("FRONT", "POINT", wrist=[-60, 0, 0], d=(0, 25, -20))), (0.9, both("FRONT", "POINT", wrist=[-60, 0, 0], d=(0, 0, -20))), (1.15, both("FRONT", "POINT", wrist=[-60, 0, 0], d=(0, 0, -20))))),
    E("LIVE", ["live", "lives", "living", "stay", "staying", "rehna", "rahna", "rehta"], "Both thumbs-up hands brush upward on the chest.", "neutral",
      frames((0.4, both("WAIST", "THUMB", d=(-10, 0, -30))), (0.9, both("CHEST", "THUMB", d=(0, 0, -20))), (1.15, both("CHEST", "THUMB", d=(0, 0, -20))))),
    E("REMEMBER", ["remember", "remembered", "recall", "yaad"], "Thumb touches the forehead, then lands on the left thumb.", "neutral",
      frames((0.4, merge(PALM_BASE, hand("Right", "FOREHEAD", "THUMB"))), (0.95, merge(PALM_BASE, hand("Right", "BASE", "THUMB"))), (1.2, merge(PALM_BASE, hand("Right", "BASE", "THUMB"))))),
    E("FORGET", ["forget", "forgot", "forgotten", "never mind", "nevermind", "bhool", "bhul"], "Flat hand wipes across the forehead and closes.", "neutral",
      frames((0.4, hand("Right", "FOREHEAD", d=(0, 10, 0))), (0.85, hand("Right", "FOREHEAD", "FIST", d=(0, -25, 0))), (1.1, hand("Right", "FOREHEAD", "FIST", d=(0, -25, 0))))),
    E("THINK", ["think", "thinking", "thought", "idea", "socho", "soch", "sochna"], "Index finger touches the temple.", "neutral",
      frames((0.45, hand("Right", "TEMPLE", "POINT")), (0.7, hand("Right", "TEMPLE", "POINT", d=(0, 0, -6))), (1.0, hand("Right", "TEMPLE", "POINT")))),
    # places & things
    E("TOILET", ["toilet", "bathroom", "restroom", "washroom", "loo", "sauchalay", "latrine"], "T-hand shakes side to side.", "neutral",
      frames((0.35, hand("Right", "FRONT", "T", wrist=[0, 0, -20])), (0.6, hand("Right", "FRONT", "T", wrist=[0, 0, 20])), (0.85, hand("Right", "FRONT", "T", wrist=[0, 0, -20])), (1.1, hand("Right", "FRONT", "T", wrist=[0, 0, 20])))),
    E("HOSPITAL", ["hospital", "clinic", "aspatal"], "Fingertips draw a cross on the upper left arm.", "neutral",
      frames((0.4, hand("Right", "SHOULDER_OPP", "V")), (0.7, hand("Right", "SHOULDER_OPP", "V", d=(-8, 0, 0))), (1.0, hand("Right", "SHOULDER_OPP", "V", d=(0, 0, 8))), (1.2, hand("Right", "SHOULDER_OPP", "V", d=(0, 0, 8))))),
    E("MEDICINE", ["medicine", "medicines", "medication", "tablet", "tablets", "pill", "pills", "dawai", "dawa", "drug"], "Middle fingertip circles on the open left palm.", "neutral",
      frames((0.4, merge(PALM_BASE, hand("Right", "BASE", "CLAW", d=(0, 5, 0)))), (0.7, merge(PALM_BASE, hand("Right", "BASE", "CLAW", d=(0, -5, 5)))), (1.0, merge(PALM_BASE, hand("Right", "BASE", "CLAW", d=(0, 5, 0)))))),
    E("POLICE", ["police", "cop", "cops", "policeman", "officer"], "C-hand placed on the shoulder like a badge.", "neutral",
      frames((0.45, hand("Right", "SHOULDER", "C")), (1.1, hand("Right", "SHOULDER", "C")))),
    E("VEHICLE", ["car", "bus", "vehicle", "drive", "driving", "auto", "taxi", "cab", "gaadi", "gadi", "bike", "scooter"], "Both fists turn a steering wheel.", "neutral",
      frames((0.35, merge(hand("Right", "FRONT", "FIST", d=(0, 0, -10)), hand("Left", "FRONT", "FIST", d=(0, 0, -10)))),
             (0.7, merge(hand("Right", "FRONT", "FIST", d=(10, 0, -10)), hand("Left", "FRONT", "FIST", d=(-10, 0, -10)))),
             (1.05, merge(hand("Right", "FRONT", "FIST", d=(-10, 0, -10)), hand("Left", "FRONT", "FIST", d=(10, 0, -10)))),
             (1.3, merge(hand("Right", "FRONT", "FIST", d=(0, 0, -10)), hand("Left", "FRONT", "FIST", d=(0, 0, -10)))))),
    E("TRAIN", ["train", "rail", "railway", "metro", "station"], "Right V-hand slides back and forth along the left V-hand like rails.", "neutral",
      frames((0.4, merge(hand("Left", "BASE", "V"), hand("Right", "BASE", "V", d=(5, 0, 5)))), (0.75, merge(hand("Left", "BASE", "V"), hand("Right", "BASE", "V", d=(5, 0, -8)))),
             (1.1, merge(hand("Left", "BASE", "V"), hand("Right", "BASE", "V", d=(5, 0, 5)))))),
    E("SHOP", ["shop", "store", "market", "mall", "bazaar", "bazar", "dukaan", "dukan"], "Both pinched hands flip forward twice, like handing goods over the counter.", "neutral",
      frames((0.4, both("CHEST_HIGH", "PINCH")), (0.7, both("FRONT", "PINCH", d=(-5, 0, -10))), (1.0, both("CHEST_HIGH", "PINCH")), (1.3, both("FRONT", "PINCH", d=(-5, 0, -10))))),
    E("TEA", ["tea", "chai", "coffee", "chaa"], "Pinched fingers stir a small cup held in the left hand.", SMILE,
      frames((0.4, merge(hand("Left", "BASE", "C"), hand("Right", "BASE", "PINCH", d=(0, 5, 5)))), (0.7, merge(hand("Left", "BASE", "C"), hand("Right", "BASE", "PINCH", d=(0, -5, 5)))),
             (1.0, merge(hand("Left", "BASE", "C"), hand("Right", "BASE", "PINCH", d=(0, 5, 5)))))),
    E("MILK", ["milk", "doodh", "dudh"], "Fist squeezes open and closed, like milking.", "neutral",
      frames((0.35, hand("Right", "FRONT", "C")), (0.6, hand("Right", "FRONT", "FIST")), (0.85, hand("Right", "FRONT", "C")), (1.1, hand("Right", "FRONT", "FIST")))),
    E("RICE", ["rice", "chawal", "roti", "bread", "chapati", "dal", "curry", "sabzi"], "Bunched fingers scoop toward the mouth twice.", "neutral",
      tap("MOUTH", "PINCH", wrist=[-20, 0, 0])),
    E("DOG", ["dog", "dogs", "puppy", "kutta"], "Hand pats the thigh and the fingers snap.", SMILE,
      frames((0.4, hand("Right", "WAIST", d=(10, -15, -30))), (0.7, hand("Right", "WAIST", "PINCH", d=(0, -15, -20))), (1.0, hand("Right", "WAIST", d=(10, -15, -30))))),
    E("CAT", ["cat", "cats", "kitten", "billi"], "Pinched fingers stroke outward from the cheek like whiskers.", SMILE,
      frames((0.4, hand("Right", "CHEEK", "PINCH")), (0.8, hand("Right", "CHEEK", "PINCH", d=(0, -25, 15))), (1.05, hand("Right", "CHEEK", "PINCH", d=(0, -25, 15))))),
    # feelings & adjectives
    E("HAPPY", ["happy", "glad", "joy", "joyful", "excited", "cheerful", "khush", "khushi", "delighted"], "Flat hands brush upward on the chest twice with a smile.", SMILE,
      frames((0.35, both("WAIST", d=(-10, 0, -30))), (0.65, both("CHEST", d=(0, 0, -20))), (0.95, both("WAIST", d=(-10, 0, -30))), (1.25, both("CHEST", d=(0, 0, -20))))),
    E("SAD", ["sad", "unhappy", "upset", "depressed", "udaas", "dukhi", "crying", "cry"], "Open hands move down in front of the face with a sad expression.", FROWN,
      frames((0.4, merge(both("EYE", d=(0, 0, -10)), BROW_DOWN)), (0.95, merge(both("CHIN", d=(0, 0, -20)), BROW_DOWN, {"Head": [10, 0, 0]})), (1.2, merge(both("CHIN", d=(0, 0, -20)), BROW_DOWN, {"Head": [10, 0, 0]})))),
    E("TIRED", ["tired", "exhausted", "sleepy", "weary", "thaka", "thak", "fatigue"], "Bent hands on the chest sag downward with a sigh.", FROWN,
      frames((0.4, both("CHEST", "BENT")), (1.0, merge(both("WAIST", "BENT", d=(0, 0, -10)), {"Head": [12, 0, 0]})), (1.3, merge(both("WAIST", "BENT", d=(0, 0, -10)), {"Head": [12, 0, 0]})))),
    E("ANGRY", ["angry", "mad", "furious", "annoyed", "gussa", "irritated", "rage"], "Claw hand at the face pulls down with a scowl.", FROWN,
      frames((0.4, merge(hand("Right", "NOSE", "CLAW"), BROW_DOWN)), (0.8, merge(hand("Right", "CHIN", "CLAW", d=(0, 0, -15)), BROW_DOWN)), (1.05, merge(hand("Right", "CHIN", "CLAW", d=(0, 0, -15)), BROW_DOWN)))),
    E("SCARED", ["scared", "afraid", "fear", "frightened", "darr", "dar", "nervous", "worried", "worry", "tension"], "Both open hands shake in front of the chest.", FROWN,
      frames((0.35, merge(both("CHEST_HIGH", "CLAW", d=(0, 5, -20)), BROW_UP)), (0.55, merge(both("CHEST_HIGH", "CLAW", d=(0, 12, -20)), BROW_UP)),
             (0.75, merge(both("CHEST_HIGH", "CLAW", d=(0, 5, -20)), BROW_UP)), (0.95, merge(both("CHEST_HIGH", "CLAW", d=(0, 12, -20)), BROW_UP)))),
    E("BEAUTIFUL", ["beautiful", "pretty", "cute", "lovely", "handsome", "gorgeous", "sundar", "khoobsurat", "nice looking"], "Open hand circles the face and closes at the chin.", SMILE,
      frames((0.4, hand("Right", "FOREHEAD", d=(0, 10, 0))), (0.7, hand("Right", "CHEEK", d=(0, 10, 0))), (1.0, hand("Right", "CHIN", "PINCH")), (1.2, hand("Right", "CHIN", "PINCH")))),
    E("HOT", ["hot", "warm", "heat", "garam", "garmi", "summer"], "Claw hand at the mouth turns and throws outward.", "neutral",
      frames((0.4, hand("Right", "MOUTH", "CLAW")), (0.8, hand("Right", "FRONT", "CLAW", wrist=[0, 0, -60], d=(0, -15, 0))), (1.05, hand("Right", "FRONT", "CLAW", wrist=[0, 0, -60], d=(0, -15, 0))))),
    E("COLD", ["cold", "chilly", "freezing", "thanda", "thand", "winter", "sardi"], "Both fists shiver close to the body.", "neutral",
      frames((0.3, both("CHEST", "FIST", d=(0, 0, -15))), (0.5, both("CHEST", "FIST", d=(0, 6, -15))), (0.7, both("CHEST", "FIST", d=(0, 0, -15))), (0.9, both("CHEST", "FIST", d=(0, 6, -15))), (1.1, both("CHEST", "FIST", d=(0, 0, -15))))),
    E("BIG", ["big", "large", "huge", "bada", "bade", "giant"], "Both L-hands spread far apart.", "neutral",
      frames((0.4, both("FRONT", "L", d=(0, 0, -20))), (0.9, both("FRONT", "L", d=(0, 35, -20))), (1.15, both("FRONT", "L", d=(0, 35, -20))))),
    E("SMALL", ["small", "little", "tiny", "chhota", "chota", "mini"], "Flat hands move close together.", "neutral",
      frames((0.4, both("FRONT", d=(0, 15, -20))), (0.9, both("FRONT", d=(0, -2, -20))), (1.15, both("FRONT", d=(0, -2, -20))))),
    E("NEW", ["new", "naya", "nayi", "fresh", "latest"], "Back of the right hand brushes across the left palm.", "neutral",
      frames((0.4, merge(PALM_BASE, hand("Right", "BASE", wrist=[30, 0, 0], d=(0, 10, 0)))), (0.85, merge(PALM_BASE, hand("Right", "BASE", wrist=[30, 0, 0], d=(0, -12, 0)))), (1.1, merge(PALM_BASE, hand("Right", "BASE", wrist=[30, 0, 0], d=(0, -12, 0)))))),
    E("OLD", ["old", "purana", "purani", "aged", "elderly", "ancient"], "Fist at the chin moves down like a long beard.", "neutral",
      frames((0.4, hand("Right", "CHIN", "FIST")), (0.9, hand("Right", "CHEST_HIGH", "FIST", d=(-5, 0, -20))), (1.15, hand("Right", "CHEST_HIGH", "FIST", d=(-5, 0, -20))))),
    E("SLOW", ["slow", "slowly", "dheere", "dhire", "aaram se"], "Right hand slides slowly up the back of the left hand and forearm.", "neutral",
      frames((0.4, merge(PALM_BASE, hand("Right", "BASE", d=(0, 10, 10)))), (1.2, merge(PALM_BASE, hand("Right", "BASE", d=(-15, -5, -15)))), (1.5, merge(PALM_BASE, hand("Right", "BASE", d=(-15, -5, -15)))))),
    E("SICK-STOMACH", ["stomach ache", "stomachache", "stomach pain", "pet dard"], "Hand circles on the stomach with a pained face.", FROWN,
      frames((0.4, merge(hand("Right", "WAIST", d=(0, 0, 0)), BROW_DOWN)), (0.8, merge(hand("Right", "WAIST", d=(5, 5, 5)), BROW_DOWN)), (1.2, merge(hand("Right", "WAIST", d=(0, 0, 0)), BROW_DOWN)))),
    # time
    E("TODAY", ["today", "aaj"], "Both Y-hands drop down together in front of the body.", "neutral",
      frames((0.4, both("CHEST_HIGH", "Y", d=(0, 5, -20))), (0.8, both("FRONT_LOW", "Y", d=(0, 5, -10))), (1.05, both("FRONT_LOW", "Y", d=(0, 5, -10))))),
    E("TOMORROW", ["tomorrow", "tmrw", "tmr", "tomo", "next day"], "Thumb on the cheek arcs forward.", "neutral",
      frames((0.4, hand("Right", "CHEEK", "THUMB")), (0.9, hand("Right", "FRONT", "THUMB", d=(-10, 0, -20))), (1.15, hand("Right", "FRONT", "THUMB", d=(-10, 0, -20))))),
    E("YESTERDAY", ["yesterday", "last day"], "Thumb on the cheek arcs backward toward the ear.", "neutral",
      frames((0.4, hand("Right", "CHEEK", "THUMB")), (0.9, hand("Right", "EAR", "THUMB")), (1.15, hand("Right", "EAR", "THUMB")))),
    E("NOW", ["now", "right now", "abhi", "immediately", "currently", "present"], "Both bent hands drop sharply in front of the body.", "neutral",
      frames((0.4, both("FRONT", "BENT", d=(0, 5, -20))), (0.7, both("FRONT_LOW", "BENT", d=(0, 5, -15))), (1.0, both("FRONT_LOW", "BENT", d=(0, 5, -15))))),
    E("LATER", ["later", "afterwards", "afterward", "after", "then", "baad", "baad mein", "l8r", "soon"], "L-hand tips forward like a clock hand.", "neutral",
      frames((0.4, hand("Right", "FRONT", "L", wrist=[0, 0, -30])), (0.9, hand("Right", "FRONT", "L", wrist=[0, 0, 40])), (1.15, hand("Right", "FRONT", "L", wrist=[0, 0, 40])))),
    E("BEFORE", ["before", "earlier", "ago", "previously", "pehle", "b4"], "Flat hand moves backward over the shoulder.", "neutral",
      frames((0.4, hand("Right", "CHEST_HIGH", d=(-10, 0, 0))), (0.9, hand("Right", "SHOULDER", d=(0, 0, 0))), (1.15, hand("Right", "SHOULDER")))),
    E("DAY", ["day", "days", "din", "daytime"], "Index finger arcs across like the sun crossing the sky over the left forearm.", "neutral",
      frames((0.4, merge(hand("Left", "FRONT", d=(-20, 0, -40)), hand("Right", "UP", "POINT", d=(0, 0, 0)))), (1.0, merge(hand("Left", "FRONT", d=(-20, 0, -40)), hand("Right", "FRONT", "POINT", d=(0, -10, -20)))),
             (1.25, merge(hand("Left", "FRONT", d=(-20, 0, -40)), hand("Right", "FRONT", "POINT", d=(0, -10, -20)))))),
    E("WEEK", ["week", "weeks", "weekly", "hafta", "saptah"], "Index finger slides across the open left palm.", "neutral",
      frames((0.4, merge(PALM_BASE, hand("Right", "BASE", "POINT", d=(0, 10, 0)))), (0.9, merge(PALM_BASE, hand("Right", "BASE", "POINT", d=(0, -12, 0)))), (1.15, merge(PALM_BASE, hand("Right", "BASE", "POINT", d=(0, -12, 0)))))),
    E("MONTH", ["month", "months", "monthly", "mahina", "mahine"], "Index finger slides down the upright left index finger.", "neutral",
      frames((0.4, merge(hand("Left", "FRONT", "POINT", wrist=[-60, 0, 0], d=(0, 0, -20)), hand("Right", "FRONT", "POINT", d=(5, 0, -10)))),
             (0.9, merge(hand("Left", "FRONT", "POINT", wrist=[-60, 0, 0], d=(0, 0, -20)), hand("Right", "FRONT", "POINT", d=(-10, 0, -10)))),
             (1.15, merge(hand("Left", "FRONT", "POINT", wrist=[-60, 0, 0], d=(0, 0, -20)), hand("Right", "FRONT", "POINT", d=(-10, 0, -10)))))),
    E("YEAR", ["year", "years", "yearly", "saal", "varsh", "annual"], "Right fist circles around the left fist, like the earth around the sun.", "neutral",
      frames((0.4, merge(hand("Left", "BASE", "FIST"), hand("Right", "BASE", "FIST", d=(-10, 0, 5)))), (0.7, merge(hand("Left", "BASE", "FIST"), hand("Right", "BASE", "FIST", d=(-10, -10, 10)))),
             (1.0, merge(hand("Left", "BASE", "FIST"), hand("Right", "BASE", "FIST", d=(5, 0, 8)))), (1.3, merge(hand("Left", "BASE", "FIST"), hand("Right", "BASE", "FIST", d=(-5, 0, 0)))))),
    # discourse
    E("AGAIN", ["again", "repeat", "once more", "phir", "phir se", "dobara", "more"], "Bent right hand turns over and lands in the left palm.", "neutral",
      frames((0.4, merge(PALM_BASE, hand("Right", "FRONT", "BENT", wrist=[0, 0, -50], d=(0, -10, 0)))), (0.85, merge(PALM_BASE, hand("Right", "BASE", "BENT"))), (1.1, merge(PALM_BASE, hand("Right", "BASE", "BENT"))))),
    E("FINISH", ["finish", "finished", "done", "complete", "completed", "over", "end", "khatam", "khatm", "ho gaya", "enough", "bas"], "Both open hands flip outward from palms-in to palms-out.", "neutral",
      frames((0.4, both("FRONT", wrist=[0, 0, 30], d=(0, 0, -20))), (0.85, both("FRONT", wrist=[0, 0, -40], d=(0, 15, -20))), (1.1, both("FRONT", wrist=[0, 0, -40], d=(0, 15, -20))))),
    E("GOODBYE", ["bye", "goodbye", "good bye", "see you", "see ya", "cya", "tata", "ta ta", "alvida", "farewell", "take care"], "Open hand waves side to side.", SMILE,
      frames((0.35, hand("Right", "UP", wrist=[0, 0, -25], d=(20, 20, 0))), (0.6, hand("Right", "UP", wrist=[0, 0, 25], d=(20, 20, 0))), (0.85, hand("Right", "UP", wrist=[0, 0, -25], d=(20, 20, 0))), (1.1, hand("Right", "UP", wrist=[0, 0, 25], d=(20, 20, 0))))),
    E("WELCOME", ["welcome", "swagat", "come in"], "Open hand sweeps inward toward the body, palm up.", SMILE,
      frames((0.4, hand("Right", "SIDE", d=(-15, 0, 0))), (0.9, hand("Right", "CHEST", d=(-5, 0, 0))), (1.15, hand("Right", "CHEST", d=(-5, 0, 0))))),
    E("CONGRATULATIONS", ["congratulations", "congrats", "congratulation", "badhai", "badhaai", "well done", "mubarak"], "Both hands clasp together and shake, like a handshake with yourself.", SMILE,
      frames((0.4, both("FRONT", "C", d=(0, 0, -25))), (0.6, both("FRONT", "C", d=(-6, 0, -25))), (0.8, both("FRONT", "C", d=(0, 0, -25))), (1.0, both("FRONT", "C", d=(-6, 0, -25))), (1.2, both("FRONT", "C", d=(0, 0, -25))))),
    E("BIRTHDAY", ["birthday", "bday", "janamdin", "janmdin"], "Middle finger touches the chin, then the chest.", SMILE,
      frames((0.4, hand("Right", "CHIN", "CLAW")), (0.85, hand("Right", "CHEST", "CLAW")), (1.1, hand("Right", "CHEST", "CLAW")))),
    E("BECAUSE", ["because", "cuz", "coz", "cos", "bcoz", "bc", "since", "kyunki", "kyuki", "reason"], "Index finger at the forehead moves out and closes into a fist.", "neutral",
      frames((0.4, hand("Right", "FOREHEAD", "POINT")), (0.9, hand("Right", "FRONT", "FIST", d=(-15, -10, 0))), (1.15, hand("Right", "FRONT", "FIST", d=(-15, -10, 0))))),
    E("FUNNY", ["funny", "laugh", "laughing", "lol", "lmao", "rofl", "haha", "hahaha", "hilarious", "joke", "joking", "kidding", "mazak", "hasna", "hasi"], "Index and middle fingers brush down the nose twice with a laugh.", SMILE,
      tap("NOSE", "V", extra={"Head": [-5, 0, 0]})),
    E("WOW", ["wow", "omg", "amazing", "awesome", "cool", "dope", "lit", "superb", "fantastic", "wonderful", "mast", "zabardast", "incredible", "unbelievable", "whoa", "woah", "damn"], "Open hand shakes loosely in front with a wide-open mouth.", Q,
      frames((0.35, merge(hand("Right", "FRONT", wrist=[0, 0, -25], d=(0, 0, -10)), BROW_UP)), (0.55, merge(hand("Right", "FRONT", wrist=[0, 0, 25], d=(0, 0, -10)), BROW_UP)),
             (0.75, merge(hand("Right", "FRONT", wrist=[0, 0, -25], d=(0, 0, -10)), BROW_UP)), (0.95, merge(hand("Right", "FRONT", wrist=[0, 0, 25], d=(0, 0, -10)), BROW_UP)))),
    E("RELAX", ["relax", "chill", "chill out", "calm", "calm down", "take it easy", "easy", "aaram", "shant", "cool down"], "Both flat hands press slowly downward, palms down.", SMILE,
      frames((0.4, both("CHEST_HIGH", d=(0, 10, -20))), (1.1, both("FRONT_LOW", d=(0, 10, -10))), (1.4, both("FRONT_LOW", d=(0, 10, -10))))),
    E("TRUE", ["true", "truth", "real", "really", "honest", "honestly", "sach", "sachi", "seriously", "fr", "for real"], "Index finger moves straight out from the lips.", "neutral",
      frames((0.4, hand("Right", "MOUTH", "POINT")), (0.85, hand("Right", "FRONT", "POINT", d=(-10, 0, 0))), (1.1, hand("Right", "FRONT", "POINT", d=(-10, 0, 0))))),
    E("WRONG", ["wrong", "mistake", "error", "galat", "galti", "incorrect", "false", "fake", "lie", "lying", "jhooth"], "Y-hand knocks against the chin.", FROWN,
      tap("CHIN", "Y", extra=BROW_DOWN)),
    E("MAYBE", ["maybe", "perhaps", "possibly", "shayad", "might", "probably", "not sure", "idk", "dunno"], "Both flat hands, palms up, alternate up and down like scales.", Q,
      frames((0.35, merge(hand("Right", "FRONT", d=(0, 0, -10)), hand("Left", "FRONT", d=(-15, 0, -10)))), (0.65, merge(hand("Right", "FRONT", d=(-15, 0, -10)), hand("Left", "FRONT", d=(0, 0, -10)))),
             (0.95, merge(hand("Right", "FRONT", d=(0, 0, -10)), hand("Left", "FRONT", d=(-15, 0, -10)))), (1.25, merge(hand("Right", "FRONT", d=(-15, 0, -10)), hand("Left", "FRONT", d=(0, 0, -10)))))),
    E("CAN", ["can", "able", "possible", "capable", "sakta", "sakte", "sakti"], "Both fists drop down firmly together.", "neutral",
      frames((0.4, both("FRONT", "FIST", d=(0, 5, -20))), (0.75, both("FRONT_LOW", "FIST", d=(0, 5, -15))), (1.0, both("FRONT_LOW", "FIST", d=(0, 5, -15))))),
    E("HAVE", ["have", "has", "had", "own", "possess", "hai", "mere paas"], "Bent hands touch the chest.", "neutral",
      frames((0.45, both("CHEST", "BENT")), (1.0, both("CHEST", "BENT")))),
    E("WHICH", ["which", "kaunsa", "kaunsi", "either"], "Thumbs-up hands alternate up and down.", Q,
      frames((0.35, merge(hand("Right", "FRONT", "THUMB", d=(0, 0, -10)), hand("Left", "FRONT", "THUMB", d=(-12, 0, -10)), BROW_UP)),
             (0.65, merge(hand("Right", "FRONT", "THUMB", d=(-12, 0, -10)), hand("Left", "FRONT", "THUMB", d=(0, 0, -10)), BROW_UP)),
             (0.95, merge(hand("Right", "FRONT", "THUMB", d=(0, 0, -10)), hand("Left", "FRONT", "THUMB", d=(-12, 0, -10)), BROW_UP)))),
    E("HOW-MANY", ["how many", "how much", "kitna", "kitne", "kitni"], "Closed hand flicks open upward with raised brows.", Q,
      frames((0.4, merge(hand("Right", "FRONT", "FIST", d=(0, 0, -20)), BROW_UP)), (0.75, merge(hand("Right", "FRONT", d=(-15, 0, -10)), BROW_UP)), (1.0, merge(hand("Right", "FRONT", d=(-15, 0, -10)), BROW_UP)))),
    E("EXCUSE-ME", ["excuse me", "excuse", "pardon me", "sorry to bother", "suniye", "sunye"], "Fingertips brush twice across the open left palm.", "neutral",
      frames((0.4, merge(PALM_BASE, hand("Right", "BASE", wrist=[20, 0, 0], d=(0, 8, 0)))), (0.7, merge(PALM_BASE, hand("Right", "BASE", wrist=[20, 0, 0], d=(0, -8, 0)))),
             (1.0, merge(PALM_BASE, hand("Right", "BASE", wrist=[20, 0, 0], d=(0, 8, 0)))), (1.3, merge(PALM_BASE, hand("Right", "BASE", wrist=[20, 0, 0], d=(0, -8, 0)))))),
    E("HUNGRY", ["hungry", "starving", "bhookha", "bhookh", "bhukh", "appetite"], "Claw hand moves down the chest from the throat.", FROWN,
      frames((0.4, hand("Right", "CHIN", "CLAW", d=(0, 0, -15))), (0.9, hand("Right", "WAIST", "CLAW", d=(0, 0, 10))), (1.15, hand("Right", "WAIST", "CLAW", d=(0, 0, 10))))),
    E("THIRSTY", ["thirsty", "thirst", "pyasa", "pyaasa"], "Index finger draws down the throat.", FROWN,
      frames((0.4, hand("Right", "CHIN", "POINT")), (0.85, hand("Right", "CHEST_HIGH", "POINT", d=(0, 0, -10))), (1.1, hand("Right", "CHEST_HIGH", "POINT", d=(0, 0, -10))))),
    E("MOVIE", ["movie", "movies", "film", "films", "cinema", "picture show", "tv", "television", "show", "series", "video", "videos"], "Open right hand shakes across the left palm like a flickering screen.", "neutral",
      frames((0.35, merge(PALM_BASE, hand("Right", "BASE", d=(0, 8, 0)))), (0.6, merge(PALM_BASE, hand("Right", "BASE", d=(0, -8, 0)))), (0.85, merge(PALM_BASE, hand("Right", "BASE", d=(0, 8, 0)))), (1.1, merge(PALM_BASE, hand("Right", "BASE", d=(0, -8, 0)))))),
    E("MUSIC", ["music", "song", "songs", "sing", "singing", "dance", "dancing", "gaana", "gana", "naach"], "Flat hand sweeps back and forth over the left forearm like conducting.", SMILE,
      frames((0.35, merge(hand("Left", "FRONT", d=(-20, 0, -40)), hand("Right", "FRONT", d=(-10, 10, -10)))), (0.7, merge(hand("Left", "FRONT", d=(-20, 0, -40)), hand("Right", "FRONT", d=(-10, -10, -25)))),
             (1.05, merge(hand("Left", "FRONT", d=(-20, 0, -40)), hand("Right", "FRONT", d=(-10, 10, -10)))))),
    E("COMPUTER", ["computer", "laptop", "pc", "internet", "online", "wifi", "email", "website", "app"], "Fingers type on an imaginary keyboard.", "neutral",
      frames((0.35, both("FRONT_LOW", "CLAW", d=(0, 5, -20))), (0.55, merge(hand("Right", "FRONT_LOW", "CLAW", d=(0, 5, -26)), hand("Left", "FRONT_LOW", "CLAW", d=(0, 5, -20)))),
             (0.75, merge(hand("Right", "FRONT_LOW", "CLAW", d=(0, 5, -20)), hand("Left", "FRONT_LOW", "CLAW", d=(0, 5, -26)))), (0.95, both("FRONT_LOW", "CLAW", d=(0, 5, -20))))),
    E("PICTURE", ["picture", "pictures", "photo", "photos", "pic", "pics", "selfie", "camera", "tasveer", "photu"], "C-hand at the eye moves down onto the left palm, like placing a photo.", SMILE,
      frames((0.4, merge(PALM_BASE, hand("Right", "EYE", "C"))), (0.9, merge(PALM_BASE, hand("Right", "BASE", "C"))), (1.15, merge(PALM_BASE, hand("Right", "BASE", "C"))))),
    E("DO", ["doing", "kar", "karo", "karna", "karta", "karti", "karte", "kar raha", "kar rahi", "kar rahe", "kiya", "kiye"], "Both fists, palms down, swing side to side in front of the body.", "neutral",
      frames((0.35, both("FRONT_LOW", "FIST", d=(0, 5, -15))), (0.65, both("FRONT_LOW", "FIST", d=(0, -8, -15))), (0.95, both("FRONT_LOW", "FIST", d=(0, 5, -15))), (1.2, both("FRONT_LOW", "FIST", d=(0, -8, -15))))),
    E("STUPID", ["stupid", "silly", "foolish", "dumb", "crazy", "mad person"], "Fist knocks against the forehead twice.", FROWN,
      tap("FOREHEAD", "FIST", extra=BROW_DOWN)),
    E("HATE", ["hate", "hates", "hated", "dislike", "nafrat", "disgusting", "yuck", "ew", "gross"], "Both hands flick open away from the body with a disgusted face.", FROWN,
      frames((0.4, merge(both("CHEST_HIGH", "PINCH", d=(0, 5, -20)), BROW_DOWN)), (0.85, merge(both("FRONT_FAR", d=(-5, 15, 0)), BROW_DOWN)), (1.1, merge(both("FRONT_FAR", d=(-5, 15, 0)), BROW_DOWN)))),
    E("QUIET", ["quiet", "silence", "silent", "hush", "shh", "shush", "chup", "shaant"], "Index finger held to the lips.", "neutral",
      frames((0.45, hand("Right", "MOUTH", "POINT", d=(0, 0, 5))), (1.1, hand("Right", "MOUTH", "POINT", d=(0, 0, 5))))),
    E("NONSENSE", ["nonsense", "rubbish", "bakwaas", "bakwas", "faltu", "useless", "garbage", "trash"], "Open hand waves away from the side of the head.", FROWN,
      frames((0.4, merge(hand("Right", "TEMPLE", "CLAW"), BROW_DOWN)), (0.8, merge(hand("Right", "SIDE", d=(-20, 0, 0)), BROW_DOWN)), (1.05, merge(hand("Right", "SIDE", d=(-20, 0, 0)), BROW_DOWN)))),
]

# numbers 0–10 (handshapes held in front; 6–10 add the left hand)
NUM_SHAPES = {0: "O", 1: "POINT", 2: "V", 3: "THREE", 4: "FOUR", 5: "FLAT"}
NUM_WORDS = {0: ["zero"], 1: ["one"], 2: ["two"], 3: ["three"], 4: ["four"], 5: ["five"], 6: ["six"], 7: ["seven"], 8: ["eight"], 9: ["nine"], 10: ["ten"]}
for n in range(0, 11):
    if n <= 5:
        pose = hand("Right", "FRONT", NUM_SHAPES[n], wrist=[-70, 0, 0], d=(-5, 0, -20))
        desc = f"Right hand held up showing {n} finger{'s' if n != 1 else ''}." if n else "Right hand forms an O shape."
    else:
        pose = merge(hand("Right", "FRONT", "FLAT", wrist=[-70, 0, 0], d=(-5, 0, -20)), hand("Left", "FRONT", NUM_SHAPES[n - 5], wrist=[-70, 0, 0], d=(-5, 0, -20)))
        desc = f"Open right hand (5) plus {n - 5} finger{'s' if n - 5 != 1 else ''} on the left hand."
    NEW.append(E(f"NUM-{n}", NUM_WORDS[n] + [str(n)], desc, "neutral", frames((0.3, pose), (0.8, pose)), kind="number", value=n))

# ---- merge -----------------------------------------------------------------

data = json.loads(VOCAB.read_text())
existing = {s["gloss"]: s for s in data["signs"]}
# STOP no longer owns "wait"; WAIT is its own sign
for gloss, drop, extra in [("EAT", {"hungry"}, ["khao", "khana", "khane", "khaana"]), ("WATER", {"thirsty"}, []), ("DRINK", set(), ["peena", "peene", "piyo", "pi", "peeta", "peeti"])]:
    if gloss in existing:
        existing[gloss]["words"] = [w for w in existing[gloss]["words"] if w not in drop] + [w for w in extra if w not in existing[gloss]["words"]]
if "STOP" in existing:
    existing["STOP"]["words"] = [w for w in existing["STOP"]["words"] if w not in ("wait", "ruko")]
for entry in NEW:
    existing[entry["gloss"]] = entry
existing.pop("CENSORED", None)
marker = existing.pop("QUESTION")
signs = list(existing.values()) + [marker]
data["signs"] = signs
VOCAB.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
print(f"wrote {len(signs)} signs ({len(NEW)} generated)")
