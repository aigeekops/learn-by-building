"""Complete local, standard-library ML project: data -> training -> HTTP -> rollback.

python full_project.py --output /tmp/lbb-fsdl-project
Only generated synthetic images are used. This is not FSDL's Text Recognizer.
"""
import argparse
from datetime import datetime, timezone
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import math
from pathlib import Path
import random
import tempfile
import threading
import urllib.error
import urllib.request

FEATURE_VERSION='stripe-variation-v1'


def encoded(value):
    return json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()


def sha(data):
    return hashlib.sha256(data).hexdigest()


def sigmoid(value):
    if value>=0:
        return 1/(1+math.exp(-value))
    e=math.exp(value)
    return e/(1+e)


def features(image):
    if not isinstance(image,list) or len(image)!=8 or any(not isinstance(row,list) or len(row)!=8 for row in image):
        raise ValueError('image must have shape [8,8]')
    if any(isinstance(v,bool) or not isinstance(v,(int,float)) or not math.isfinite(v) or not 0<=v<=1 for row in image for v in row):
        raise ValueError('pixels must be finite numbers in [0,1]')
    rows=[sum(row)/8 for row in image]
    columns=[sum(image[i][j] for i in range(8))/8 for j in range(8)]
    row_variation=sum((a-b)**2 for a,b in zip(rows[1:],rows))
    column_variation=sum((a-b)**2 for a,b in zip(columns[1:],columns))
    return [column_variation-row_variation,sum(rows)/8]


def dataset():
    result=[]
    for group in range(20):
        rng=random.Random(400+group)
        at=1+group%5
        for label in (0,1):
            for variant in range(2):
                image=[]
                for y in range(8):
                    row=[]
                    for x in range(8):
                        base=float(at<=(x if label else y)<at+2)
                        row.append(round(min(1,max(0,base+rng.uniform(-.045,.045))),6))
                    image.append(row)
                result.append(dict(id=f'g{group}-{label}-{variant}',group=group,label=label,image=image,
                    split='train' if group<12 else 'validation' if group<16 else 'test'))
    return result


def probability(model,image):
    x=features(image)
    return sigmoid(sum(a*b for a,b in zip(model['weights'],x))+model['bias'])


def evaluate(model,rows):
    errors=[];loss=0
    for row in rows:
        score=probability(model,row['image']);label=int(score>=.5)
        loss-=row['label']*math.log(max(score,1e-15))+(1-row['label'])*math.log(max(1-score,1e-15))
        if label!=row['label']:
            errors.append(dict(id=row['id'],expected=row['label'],actual=label,score=score))
    return dict(samples=len(rows),accuracy=1-len(errors)/len(rows),loss=loss/len(rows),errors=errors)


def train(rows):
    w=[0.,0.];b=0.;history=[]
    train=[row for row in rows if row['split']=='train']
    for epoch in range(100):
        gw=[0.,0.];gb=0.
        for row in train:
            x=features(row['image']);e=sigmoid(sum(a*c for a,c in zip(w,x))+b)-row['label']
            gw=[a+e*c for a,c in zip(gw,x)];gb+=e
        w=[a-.4*g/len(train) for a,g in zip(w,gw)];b-=.4*gb/len(train)
        model=dict(feature_version=FEATURE_VERSION,weights=w[:],bias=b)
        if epoch in (0,24,49,99):history.append(dict(epoch=epoch+1,**evaluate(model,train)))
    return model,history


def save_package(path,model,version,data_hash):
    path.mkdir(parents=True,exist_ok=True)
    payload=encoded(model);(path/'model.json').write_bytes(payload)
    manifest=dict(version=version,feature_version=FEATURE_VERSION,model_sha256=sha(payload),dataset_sha256=data_hash)
    (path/'manifest.json').write_bytes(encoded(manifest))
    return manifest


def load_package(path):
    manifest=json.loads((path/'manifest.json').read_text());payload=(path/'model.json').read_bytes()
    if sha(payload)!=manifest.get('model_sha256'):raise ValueError('model hash mismatch')
    model=json.loads(payload)
    if manifest.get('feature_version')!=FEATURE_VERSION or model.get('feature_version')!=FEATURE_VERSION:
        raise ValueError('feature schema mismatch')
    if not isinstance(model.get('weights'),list) or len(model['weights'])!=2 or any(isinstance(x,bool) or not isinstance(x,(int,float)) or not math.isfinite(x) for x in [*model['weights'],model.get('bias')]):
        raise ValueError('invalid model coefficients')
    return model,manifest


class Application:
    def __init__(self,package):
        self.lock=threading.Lock();self.requests=0;self.rejected=0
        self.activate(package)

    def activate(self,package):
        # Verify candidate before taking the lock: failed loads preserve current state.
        model,manifest=load_package(Path(package))
        with self.lock:
            self.model=model;self.manifest=manifest


def handler(app):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self,*args):pass

        def send_json(self,status,payload):
            raw=encoded(payload);self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw)

        def do_GET(self):
            if self.path!='/health':return self.send_json(404,dict(error='not found'))
            with app.lock:payload=dict(version=app.manifest['version'],model_sha256=app.manifest['model_sha256'],requests=app.requests,rejected=app.rejected)
            self.send_json(200,payload)

        def do_POST(self):
            if self.path!='/predict':return self.send_json(404,dict(error='not found'))
            try:
                length=int(self.headers.get('Content-Length','0'))
                if not 0<length<=16384:raise ValueError('invalid body length')
                request=json.loads(self.rfile.read(length))
                if not isinstance(request,dict) or set(request)!={'image'}:raise ValueError('expected only image')
                with app.lock:
                    score=probability(app.model,request['image']);app.requests+=1;version=app.manifest['version']
                self.send_json(200,dict(probability=score,label=int(score>=.5),version=version))
            except (ValueError,TypeError,KeyError) as error:
                with app.lock:app.rejected+=1
                self.send_json(400,dict(error=str(error)))
    return Handler


def request(base,path,payload=None):
    data=None if payload is None else encoded(payload)
    req=urllib.request.Request(base+path,data=data,headers={'Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(req,timeout=5) as response:return response.status,json.load(response)
    except urllib.error.HTTPError as error:return error.code,json.load(error)


def run(output):
    output=Path(output).resolve();output.mkdir(parents=True,exist_ok=True)
    rows=dataset();data_hash=sha(encoded(rows));(output/'dataset.json').write_bytes(encoded(rows))
    splits={name:[r for r in rows if r['split']==name] for name in ['train','validation','test']}
    group_sets={name:{r['group'] for r in data} for name,data in splits.items()}
    assert not group_sets['train']&group_sets['validation'] and not group_sets['train']&group_sets['test'] and not group_sets['validation']&group_sets['test']
    model,history=train(rows)
    metrics={name:evaluate(model,data) for name,data in splits.items()}
    assert metrics['test']['accuracy']>=.95 and history[-1]['loss']<history[0]['loss']/5
    baseline=dict(feature_version=FEATURE_VERSION,weights=[0.,0.],bias=0.)
    baseline_manifest=save_package(output/'baseline',baseline,'baseline-v1',data_hash)
    candidate_manifest=save_package(output/'candidate',model,'candidate-v2',data_hash)
    bad=output/'bad-package';bad.mkdir(exist_ok=True)
    (bad/'manifest.json').write_bytes(encoded(candidate_manifest));(bad/'model.json').write_bytes(encoded(model|{'bias':999}))
    app=Application(output/'baseline');server=ThreadingHTTPServer(('127.0.0.1',0),handler(app))
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    base=f'http://127.0.0.1:{server.server_port}';http=[]
    try:
        before=request(base,'/predict',dict(image=splits['test'][0]['image']));assert before[0]==200 and before[1]['version']=='baseline-v1'
        http.append(dict(case='baseline',status=before[0],result=before[1]))
        app.activate(output/'candidate')
        for row in splits['test']:
            status,answer=request(base,'/predict',dict(image=row['image']))
            assert status==200 and answer['label']==row['label'] and answer['version']=='candidate-v2'
        http.append(dict(case='candidate_test',requests=len(splits['test']),all_correct=True,version='candidate-v2'))
        for bad_input in [{'image':[]},{'image':[[float('nan')]*8 for _ in range(8)]},{'image':[[True]*8 for _ in range(8)]},{'unknown':1}]:
            status,answer=request(base,'/predict',bad_input);assert status==400
            http.append(dict(case='bad_input',status=status,error=answer['error']))
        rejected=False
        try:app.activate(bad)
        except ValueError:rejected=True
        assert rejected and request(base,'/health')[1]['version']=='candidate-v2'
        http.append(dict(case='bad_model_hash',rejected=True,active_unchanged=True))
        app.activate(output/'baseline');after=request(base,'/predict',dict(image=splits['test'][0]['image']))
        assert after==before
        http.append(dict(case='rollback',same_response_as_baseline=True,version=after[1]['version']))
        health=request(base,'/health')[1]
    finally:
        server.shutdown();server.server_close();thread.join(timeout=5)
    report=dict(executed_utc=datetime.now(timezone.utc).isoformat(),passed=True,
        dataset_sha256=data_hash,groups={k:sorted(v) for k,v in group_sets.items()},metrics=metrics,
        training_history=history,baseline=baseline_manifest,candidate=candidate_manifest,
        http_checks=http,monitoring=health,actual_local_http=True,
        boundary='原创合成条纹分类的完整本地实验；未复现FSDL Text Recognizer、云端生产环境或真实图像性能。')
    (output/'receipt.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    return report


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--output',default='/tmp/lbb-fsdl-project');args=parser.parse_args()
    result=run(args.output)
    print(json.dumps(dict(passed=result['passed'],test_accuracy=result['metrics']['test']['accuracy'],http_checks=len(result['http_checks']),dataset_sha256=result['dataset_sha256']),ensure_ascii=False))
