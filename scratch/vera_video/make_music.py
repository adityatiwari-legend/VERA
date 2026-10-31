# VERA motion graphics soundtrack v2 - 90s, 120 BPM
# Sections: 0-10 intro | 10-16 title | 16-50 full | 50-62 breakdown | 62-74 full | 74-82 build | 82-90 outro
import numpy as np
import wave
import os

SR = 44100
DUR = 90.0
N = int(SR * DUR)
BPM = 120.0
SPB = 60.0 / BPM  # 0.5s

rs = np.random.RandomState(7)

kick_stem = np.zeros(N)
hat_stem = np.zeros(N)
clap_stem = np.zeros(N)
bass_stem = np.zeros(N)
pad_stem = np.zeros(N)
arp_stem = np.zeros(N)
fx_stem = np.zeros(N)
side_stem = np.zeros(N)


def add(dst, at, sig):
    i0 = int(at * SR)
    if i0 >= N or i0 < 0:
        return
    n = min(len(sig), N - i0)
    dst[i0:i0 + n] += sig[:n]


def fft_lp(x, fc, order=2):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1.0 / SR)
    H = 1.0 / (1.0 + (f / fc) ** (2 * order))
    return np.fft.irfft(X * H, len(x))


def midi_f(m):
    return 440.0 * 2.0 ** ((m - 69) / 12.0)


def kick_sig(amp=1.0):
    n = int(0.32 * SR)
    tt = np.arange(n) / SR
    f = 150.0 * np.exp(-tt / 0.045) + 44.0
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-tt / 0.13)
    click = rs.randn(n) * np.exp(-tt / 0.006) * 0.35
    return (body + click) * amp


def hat_sig(amp):
    n = int(0.05 * SR)
    nz = np.diff(rs.randn(n), prepend=0.0)
    e = np.exp(-np.arange(n) / (0.012 * SR))
    return nz * e * amp


def clap_sig(amp):
    n = int(0.28 * SR)
    tt = np.arange(n) / SR
    nz = np.diff(rs.randn(n), prepend=0.0)
    sm = np.convolve(nz, np.ones(9) / 9.0, mode="same")
    bp = (nz - sm) * np.exp(-tt / 0.05)
    sig = bp * amp
    for k, g in ((0.06, 0.7), (0.12, 0.45)):
        d = int(k * SR)
        sig[d:] += bp[:-d] * amp * g
    return sig


# ---------------- drums ----------------
kick_times = []
for b in range(0, 20):              # 0-10 heartbeat
    kick_times.append(b * SPB * 2)
for b in range(20, 100):            # 10-50 four on the floor
    kick_times.append(b * SPB)
for b in range(100, 124):           # 50-62 half-time
    kick_times.append(50.0 + (b - 100) * SPB * 2)
for b in range(24, 148):            # 62-74
    if 62.0 + (b - 24) * SPB < 74.0:
        kick_times.append(62.0 + (b - 24) * SPB)
for t in np.arange(74.0, 82.0, SPB):  # 74-82
    kick_times.append(float(t))
for kt in kick_times:
    add(kick_stem, kt, kick_sig(1.0))

for b in np.arange(16.0, 50.0, SPB):   # offbeat hats
    add(hat_stem, b + SPB / 2, hat_sig(0.5 if int(b * 2) % 2 == 0 else 0.32))
for b in np.arange(62.0, 82.0, SPB):
    add(hat_stem, b + SPB / 2, hat_sig(0.5 if int(b * 2) % 2 == 0 else 0.32))
for t in np.arange(62.0, 82.0, SPB / 2):  # shaker 16ths... 8ths light
    add(hat_stem, t + SPB / 4, hat_sig(0.1))

for bar in range(8, 41):            # claps on beats 2 & 4
    t0 = bar * 2.0
    if 16.0 <= t0 < 50.0 or 62.0 <= t0 < 82.0:
        add(clap_stem, t0 + 0.5, clap_sig(0.5))
        add(clap_stem, t0 + 1.5, clap_sig(0.55))

# snare roll crescendo 80-82
for i, t in enumerate(np.arange(80.0, 82.0, 0.125)):
    add(fx_stem, t, clap_sig(0.06 + 0.26 * (i / 16.0) ** 2))

# ---------------- bass ----------------
PROG = [45, 41, 48, 43]
OCT_PAT = [0, 0, 12, 0]


def bass_note(f, dur, amp):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    w = (np.sin(2 * np.pi * f * tt)
         + 0.35 * np.sin(4 * np.pi * f * tt)
         + 0.15 * np.sin(6 * np.pi * f * tt))
    e = np.minimum(1.0, tt / 0.006) * np.exp(-tt / (dur * 1.6))
    return w * e * amp


def beat_active(t):
    return (10.0 <= t < 50.0) or (62.0 <= t < 82.0)


for b in range(20, 196):
    t = b * SPB
    if not beat_active(t):
        continue
    chord = PROG[int(t / 4.0) % 4]
    m = chord + OCT_PAT[b % 4]
    add(bass_stem, t, bass_note(midi_f(m), 0.42, 1.0 if b % 4 == 0 else 0.78))
# breakdown: soft half-note bass 50-62
for bar in range(25, 31):
    t = bar * 2.0
    if 50.0 <= t < 62.0:
        add(bass_stem, t, bass_note(midi_f(PROG[int(t / 4.0) % 4]), 1.6, 0.4))
bass_stem = fft_lp(bass_stem, 340)

# intro sub drone A1
n_sub = int(12.0 * SR)
tt = np.arange(n_sub) / SR
sub = np.sin(2 * np.pi * 55.0 * tt) * np.minimum(1.0, tt / 1.5) * np.exp(-np.maximum(0.0, tt - 10.0) / 1.2) * 0.16
add(bass_stem, 0, sub)

# ---------------- pad ----------------
TRIADS = {45: [57, 60, 64], 41: [53, 57, 60], 48: [60, 64, 67], 43: [55, 59, 62]}


def pad_block(notes, dur, amp):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    sig = np.zeros(n)
    for m in notes:
        f = midi_f(m)
        for dt in (-0.005, 0.0, 0.005):
            sig += 2.0 * ((f * (1.0 + dt) * tt) % 1.0) - 1.0
    sig /= (3.0 * len(notes))
    atk = int(0.6 * SR)
    env = np.ones(n)
    env[:atk] = np.linspace(0, 1, atk) ** 1.5
    rel = int(0.8 * SR)
    env[-rel:] *= np.linspace(1, 0, rel) ** 1.2
    return sig * env * amp


for blk in range(2, 22):
    t0 = blk * 4.0
    if t0 >= DUR:
        break
    root = PROG[blk % 4]
    amp = 0.15
    if 50.0 <= t0 < 62.0:
        amp = 0.12
    if blk >= 20:
        amp *= max(0.0, 1.0 - (t0 - 80.0) / 8.5)
    add(pad_stem, t0, pad_block(list(TRIADS[root]), min(4.7, DUR - t0 + 1), amp))
# intro pad drone Am (0-10)
add(pad_stem, 0, pad_block([57, 60, 64], 11.0, 0.11))
pad_stem = fft_lp(pad_stem, 750)

# ---------------- arp ----------------
def pluck(f, amp):
    n = int(0.22 * SR)
    tt = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * tt) + 0.4 * np.sin(4 * np.pi * f * tt) * np.exp(-tt / 0.03)
    e = np.exp(-tt / 0.09)
    return s * e * amp


ARP_PAT = [0, 1, 2, 1, 0, 2, 1, 2]
t = 18.0
i16 = 0
while t < 82.0:
    root = PROG[int(t / 4.0) % 4]
    tones = [TRIADS[root][0] + 12, TRIADS[root][1] + 12, TRIADS[root][2] + 12, TRIADS[root][0] + 24]
    m = tones[ARP_PAT[i16 % len(ARP_PAT)]]
    amp = 0.9 if i16 % 4 == 0 else 0.6
    if 50.0 <= t < 62.0:
        amp *= 0.55
    if t >= 82.0:
        break
    add(arp_stem, t, pluck(midi_f(m), amp))
    step = SPB / 2 if t < 82.0 else SPB
    t += step
    i16 += 1
# outro sparse plucks 82-88
t = 82.25
while t < 88.0:
    root = PROG[0]
    tones = [69, 72, 76, 81]
    add(arp_stem, t, pluck(midi_f(tones[i16 % 4]), 0.4 * max(0.0, 1 - (t - 82) / 6)))
    t += SPB
    i16 += 1
d = int(0.375 * SR)
echo = np.zeros(N)
for k in range(1, 7):
    g = 0.42 ** k
    if k * d < N:
        echo[k * d:] += arp_stem[:-k * d] * g * (1.0 if k % 2 else -1.0)
side_stem += echo * 0.22

# ---------------- risers + impacts ----------------
def riser(dur, amp, f0=160.0, f1=880.0):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    u = tt / dur
    nz = np.diff(rs.randn(n), prepend=0.0)
    f = f0 * (f1 / f0) ** u
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR)
    return (nz * 0.5 + tone * 0.5) * (u ** 1.6) * amp


add(fx_stem, 10.0 - 1.6, riser(1.6, 0.5))
add(fx_stem, 16.0 - 1.4, riser(1.4, 0.42))
add(fx_stem, 34.0 - 1.6, riser(1.6, 0.3, 140, 520))
add(fx_stem, 48.0 - 1.6, riser(1.6, 0.4, 140, 620))
add(fx_stem, 62.0 - 1.6, riser(1.6, 0.5, 140, 700))
add(fx_stem, 74.0 - 1.8, riser(1.8, 0.45, 130, 600))
add(fx_stem, 82.0 - 2.0, riser(2.0, 0.6, 120, 880))


def impact(amp):
    n = int(1.6 * SR)
    tt = np.arange(n) / SR
    b = np.sin(2 * np.pi * 52 * tt) * np.exp(-tt / 0.5)
    subw = np.sin(2 * np.pi * 26 * tt) * np.exp(-tt / 0.7) * 0.6
    nz = np.diff(rs.randn(n), prepend=0.0) * np.exp(-tt / 0.08) * 0.3
    return (b + subw + nz) * amp


for at, amp in [(10.0, 1.0), (16.0, 0.6), (50.0, 0.45), (62.0, 0.6), (74.0, 0.5), (82.0, 1.15)]:
    add(fx_stem, at, impact(amp))

for at in (10.05, 82.25):
    for j, m in enumerate([76, 79, 83, 88]):
        n = int(1.4 * SR)
        tt = np.arange(n) / SR
        s = np.sin(2 * np.pi * midi_f(m) * tt) * np.exp(-tt / 0.55) * 0.09
        add(side_stem, at + j * 0.07, s * (1 if j % 2 else -1))

# ---------------- sidechain ----------------
duck = np.ones(N)
for kt in kick_times:
    i0 = int(kt * SR)
    n = min(int(0.5 * SR), N - i0)
    if n <= 0:
        continue
    duck[i0:i0 + n] *= (1.0 - 0.5 * np.exp(-np.arange(n) / (0.16 * SR)))

# ---------------- mix ----------------
mono = (kick_stem * 1.0
        + bass_stem * 0.5
        + pad_stem * 0.55 * duck
        + arp_stem * 0.26 * duck
        + hat_stem * 0.2
        + clap_stem * 0.32
        + fx_stem * 0.75)
L = mono + side_stem
R = mono - side_stem

for ch in (L, R):
    np.tanh(ch * 1.1, out=ch)
peak = max(np.abs(L).max(), np.abs(R).max())
L *= 0.88 / peak
R *= 0.88 / peak
fade_in = int(0.04 * SR)
fade_out = int(2.4 * SR)
for ch in (L, R):
    ch[:fade_in] *= np.linspace(0, 1, fade_in)
    ch[-fade_out:] *= np.cos(np.linspace(0, np.pi / 2, fade_out))

data = (np.stack([L, R], axis=1) * 32767).astype("<i2")
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "music.wav")
with wave.open(out, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(data.tobytes())
print("wrote", out, f"{os.path.getsize(out)/1e6:.1f} MB, {len(data)/SR:.2f}s")
