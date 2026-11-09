"""Standalone CPU CNN and GRU training on original synthetic data. Requires torch."""
import argparse
import hashlib
import json
from pathlib import Path
import torch
import torch.nn.functional as F

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



if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--output',default='/tmp/lbb-d2l-training');args=parser.parse_args()
    torch.set_num_threads(1);out=Path(args.output).resolve();out.mkdir(parents=True,exist_ok=True)
    report=dict(torch=torch.__version__,device='cpu',actual_multi_gpu=False,cnn=train_cnn(out),sequence=train_sequence())
    (out/'training.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(report,ensure_ascii=False))
