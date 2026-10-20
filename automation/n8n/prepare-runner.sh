#!/bin/sh
# Preserve the installed runner configuration; add only Node's URL parser utility.
set -eu
container=task-runners-dbrwgs1curmt5wrynuj94y6c
directory=/data/coolify/services/dbrwgs1curmt5wrynuj94y6c
test -d "$directory"
test "$(realpath "$directory")" = "$directory"
docker cp "$container:/etc/n8n-task-runners.json" "$directory/newsroom-runners.original.json"
python3 - "$directory" <<'PY'
import json, pathlib, sys
directory = pathlib.Path(sys.argv[1])
config = json.loads((directory / 'newsroom-runners.original.json').read_text())
runner = next(r for r in config['task-runners'] if r['runner-type'] == 'javascript')
overrides = runner.setdefault('env-overrides', {})
for key, value in overrides.items():
    if any(word in key.upper() for word in ('TOKEN', 'PASSWORD', 'SECRET')) and value:
        raise SystemExit('Unexpected credential override; do not copy secrets into a public config mount.')
allowed = set(filter(None, overrides.get('NODE_FUNCTION_ALLOW_BUILTIN', '').split(',')))
if '*' in allowed:
    raise SystemExit('Expected a restricted builtin allowlist.')
allowed.add('url')
overrides['NODE_FUNCTION_ALLOW_BUILTIN'] = ','.join(sorted(allowed))
(directory / 'newsroom-runners.json').write_text(json.dumps(config, indent=2) + '\n')
print('Runner builtin allowlist:', overrides['NODE_FUNCTION_ALLOW_BUILTIN'])
PY
chmod 0644 "$directory/newsroom-runners.json"
echo 'Mount ./newsroom-runners.json read-only at /etc/n8n-task-runners.json on task-runners, then recreate only that service.'
