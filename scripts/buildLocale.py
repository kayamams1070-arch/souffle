"""Merge flat JSON fragments (dotted keys) into a nested locale file.
Usage: python3 scripts/buildLocale.py out.json part1.json part2.json ..."""
import json, sys

def unflatten(flat):
    root = {}
    for key in sorted(flat):
        parts = key.split('.')
        node = root
        for p in parts[:-1]:
            if p in node and not isinstance(node[p], dict):
                raise SystemExit(f'Conflict: {key} (leaf {p} already exists)')
            node = node.setdefault(p, {})
        if parts[-1] in node and isinstance(node[parts[-1]], dict):
            raise SystemExit(f'Conflict: {key} is also a parent')
        node[parts[-1]] = flat[key]
    return root

out, *parts = sys.argv[1:]
flat = {}
for p in parts:
    d = json.load(open(p, encoding='utf-8'))
    dup = set(d) & set(flat)
    if dup:
        print('Duplicate keys overridden:', sorted(dup)[:20])
    flat.update(d)
with open(out, 'w', encoding='utf-8') as f:
    json.dump(unflatten(flat), f, ensure_ascii=False, indent=2)
    f.write('\n')
print(f'{len(flat)} strings -> {out}')
