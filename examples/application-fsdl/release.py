import hashlib
import json
from pathlib import Path
from tempfile import TemporaryDirectory

def decide(score, latency, manifest_ok, errors):
    eligible = score >= 0.88 and latency <= 120 and manifest_ok
    canary_rate = errors / 20 if eligible else None
    state = 'blocked' if not eligible else 'rolled_back' if canary_rate > 0.1 else 'promoted'
    return dict(state=state, active='v2' if state == 'promoted' else 'v1',
                canaryRate=canary_rate)

with TemporaryDirectory() as directory:
    path = Path(directory) / 'candidate.json'
    artifact = dict(model='v2', data='data-v1', config='config-v2')
    path.write_text(json.dumps(artifact, sort_keys=True), encoding='utf-8')
    expected_digest = hashlib.sha256(path.read_bytes()).hexdigest()
    manifest_ok = hashlib.sha256(path.read_bytes()).hexdigest() == expected_digest
    assert all(artifact.get(key) for key in ('model', 'data', 'config'))
    assert decide(0.9, 100, manifest_ok, 1)['active'] == 'v2'
    assert decide(0.9, 100, manifest_ok, 3)['state'] == 'rolled_back'
    blocked = decide(0.86, 100, manifest_ok, 5)
    assert blocked['active'] == 'v1' and blocked['canaryRate'] is None
    print(json.dumps(decide(0.9, 100, manifest_ok, 1)))
