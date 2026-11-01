import re

lines = open('captions.ass', encoding='utf-8').read().splitlines()

def to_srt(t):
    h, m, rest = t.split(':')
    s, cs = rest.split('.')
    return f"{int(h):02d}:{int(m):02d}:{int(s):02d},{int(cs):02d}0"

out, n = [], 0
strip = re.compile(r'\{[^}]*\}')
bsN = chr(92) + 'N'  # literal backslash-N used by ASS line breaks
for ln in lines:
    if ln.startswith('Dialogue:'):
        parts = ln.split(',', 9)
        n += 1
        text = strip.sub('', parts[9]).replace(bsN, '\n')
        out.append(f"{n}\n{to_srt(parts[1])} --> {to_srt(parts[2])}\n{text}\n")

open('captions.srt', 'w', encoding='utf-8-sig').write('\n'.join(out))
print(f"{n} captions written")
