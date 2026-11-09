"""Run the actual 16 authored PyTorch snippets and two small training experiments."""
import argparse
import contextlib
from datetime import datetime, timezone
import hashlib
import io
import json
from pathlib import Path
import platform
import sys

import torch
import torch.nn.functional as F

ROOT=Path(__file__).resolve().parents[2]


def validate_snippets():
    data=json.loads((ROOT/'config/foundation_d2l.json').read_text())
    results=[]
    for lesson in data['lessons']:
        sections=[x for x in lesson['sections'] if 'import torch' in x.get('code','')]
        if not sections:
            raise AssertionError('Missing executable PyTorch section: '+lesson['id'])
        for section in sections:
            code=section['code']; namespace={'__name__':'__lesson__'}; output=io.StringIO()
            with contextlib.redirect_stdout(output):
                exec(compile(code,lesson['id']+'.py','exec'),namespace)
            # Add independent checks to previously printed-only examples.
            if lesson['id']=='d2l-regression':
                assert abs(namespace['w'].item()-1.04825)<1e-9
                assert abs(namespace['b'].item()-.621)<1e-9
            if lesson['id']=='d2l-classification':
                assert abs(namespace['loss'].item()-.4076059644443804)<1e-12
                assert abs(namespace['logits'].grad.sum().item())<1e-12
            if lesson['id']=='d2l-generalization':
                assert abs(namespace['w'].item()-2)<1e-10
                assert abs(namespace['b'].item()-1/3)<1e-10
            results.append(dict(id=lesson['id'],passed=True,
                source_sha256=hashlib.sha256(code.encode()).hexdigest(),stdout=output.getvalue()))
    return results


def train_cnn(output):
    torch.manual_seed(61)
    generator=torch.Generator().manual_seed(71)
    images=[];labels=[];groups=[]
    for group in range(20):
        for label in (0,1):
            for variant in range(3):
                image=torch.zeros(1,8,8)
                at=1+group%5
                if label: image[0,:,at:at+2]=1
                else: image[0,at:at+2,:]=1
                image+=torch.randn(1,8,8,generator=generator)*.035
                images.append(image);labels.append(label);groups.append(group)
    x=torch.stack(images);y=torch.tensor(labels)
    train=torch.tensor([g<12 for g in groups]);valid=torch.tensor([12<=g<16 for g in groups]);test=torch.tensor([g>=16 for g in groups])
    assert not (set(g for g,t in zip(groups,train) if t)&set(g for g,t in zip(groups,test) if t))
    model=torch.nn.Sequential(torch.nn.Conv2d(1,6,3),torch.nn.ReLU(),torch.nn.Flatten(),torch.nn.Linear(6*6*6,2))
    optimizer=torch.optim.Adam(model.parameters(),lr=.025)
    history=[]
    for epoch in range(70):
        optimizer.zero_grad();loss=F.cross_entropy(model(x[train]),y[train]);loss.backward();optimizer.step()
        history.append(loss.item())
    with torch.no_grad():
        accuracy=lambda mask:(model(x[mask]).argmax(1)==y[mask]).float().mean().item()
        validation=accuracy(valid);testing=accuracy(test)
    assert history[-1]<history[0]/10 and testing>=.95
    path=output/'cnn-state.pt';torch.save(model.state_dict(),path)
    return dict(train_samples=int(train.sum()),validation_samples=int(valid.sum()),test_samples=int(test.sum()),
        epochs=70,initial_loss=history[0],final_loss=history[-1],validation_accuracy=validation,test_accuracy=testing,
        model_sha256=hashlib.sha256(path.read_bytes()).hexdigest(),device='cpu',
        data='原创合成横/竖条纹；按生成组分割；不是真实图像识别基准。')


def train_sequence():
    torch.manual_seed(83)
    # Causal next-step prediction. Test uses later indices, not shuffled windows.
    series=torch.sin(torch.arange(100,dtype=torch.float32)*.16)
    x=torch.stack([series[i:i+5] for i in range(94)]).unsqueeze(-1)
    y=torch.stack([series[i+5] for i in range(94)]).unsqueeze(-1)
    rnn=torch.nn.GRU(1,8,batch_first=True);head=torch.nn.Linear(8,1)
    optimizer=torch.optim.Adam([*rnn.parameters(),*head.parameters()],lr=.025)
    losses=[]
    for epoch in range(130):
        optimizer.zero_grad();hidden,_=rnn(x[:65]);pred=head(hidden[:,-1,:]);loss=F.mse_loss(pred,y[:65]);loss.backward();optimizer.step();losses.append(loss.item())
    # Gap prevents raw points from a training window leaking into the test window.
    with torch.no_grad():
        hidden,_=rnn(x[75:]);mse=F.mse_loss(head(hidden[:,-1,:]),y[75:]).item()
    assert losses[-1]<losses[0]/10 and mse<.04
    return dict(architecture='GRU(1,8)+Linear(8,1)',train_windows=65,test_windows=19,
        epochs=130,initial_loss=losses[0],final_loss=losses[-1],test_mse=mse,
        boundary='人工正弦序列的有间隔时序留出，不证明真实预测或长期外推。')


def run(destination):
    torch.set_num_threads(1)
    output=Path(destination).resolve();output.mkdir(parents=True,exist_ok=True)
    report=dict(executed_utc=datetime.now(timezone.utc).isoformat(),python=sys.version.split()[0],
        platform=platform.platform(),torch=torch.__version__,device='cpu',cuda_devices=torch.cuda.device_count(),
        actual_multi_gpu=False,snippets=validate_snippets(),cnn=train_cnn(output),sequence=train_sequence())
    report['passed']=True
    (output/'pytorch-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    return report


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--output',default='/tmp/lbb-pytorch-validation');args=parser.parse_args()
    report=run(args.output)
    print(json.dumps({k:v for k,v in report.items() if k!='snippets'}|{'executed_snippets':len(report['snippets'])},ensure_ascii=False))
