"""Two real DDP ranks compared with a single-process global-batch reference.

CPU: python distributed_train.py --output /tmp/lbb-ddp
Two CUDA GPUs: python distributed_train.py --device cuda --output /tmp/lbb-ddp-cuda
"""
import argparse
import contextlib
from datetime import timedelta
import json
import os
from pathlib import Path
import tempfile

import torch
import torch.distributed as dist
import torch.multiprocessing as mp
from torch.nn.parallel import DistributedDataParallel


def reference(steps, microbatches):
    model = torch.nn.Linear(1, 1, bias=False, dtype=torch.float64)
    with torch.no_grad():
        model.weight.fill_(0)
    optimizer = torch.optim.SGD(model.parameters(), lr=0.05)
    x = torch.arange(1, 5, dtype=torch.float64).reshape(-1, 1)
    history = []
    for _ in range(steps):
        optimizer.zero_grad()
        (0.5 * (model(x) - 2*x).square()).mean().backward()
        optimizer.step()
        history.append(model.weight.item())
    return history


def worker(rank, world, rendezvous, output, device_name, steps, microbatches):
    torch.set_num_threads(1)
    if device_name == 'cuda':
        torch.cuda.set_device(rank)
        device = torch.device('cuda', rank)
    else:
        device = torch.device('cpu')
    dist.init_process_group('nccl' if device_name == 'cuda' else 'gloo',
        init_method=Path(rendezvous).as_uri(), rank=rank, world_size=world,
        timeout=timedelta(seconds=45))
    try:
        model = torch.nn.Linear(1, 1, bias=False, dtype=torch.float64).to(device)
        with torch.no_grad():
            model.weight.fill_(0)
        wrapped = DistributedDataParallel(model, device_ids=[rank] if device_name == 'cuda' else None)
        optimizer = torch.optim.SGD(wrapped.parameters(), lr=0.05)
        # Deterministic, non-overlapping and equal-size local batches.
        x = torch.arange(rank*2+1, rank*2+3, dtype=torch.float64, device=device).reshape(-1, 1)
        history = []
        for _ in range(steps):
            optimizer.zero_grad()
            for micro in range(microbatches):
                context = wrapped.no_sync() if micro < microbatches-1 else contextlib.nullcontext()
                with context:  # Include BOTH forward and backward in no_sync.
                    loss = (0.5 * (wrapped(x)-2*x).square()).mean() / microbatches
                    loss.backward()
            optimizer.step()
            history.append(model.weight.item())
        report = dict(rank=rank, world_size=world, device=str(device),
            local_samples=x.flatten().tolist(), weights=history,
            microbatches=microbatches)
        (Path(output)/f'rank-{rank}.json').write_text(json.dumps(report, indent=2)+'\n')
    finally:
        dist.destroy_process_group()


def run(output, device='cpu', steps=4, microbatches=2):
    if device == 'cuda' and torch.cuda.device_count() < 2:
        raise RuntimeError('CUDA验证需要至少两张可用CUDA GPU；没有执行，不能记为通过。')
    output = Path(output).resolve()
    output.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='lbb-ddp-rendezvous-') as temp:
        mp.spawn(worker, args=(2, str(Path(temp)/'store'), str(output), device, steps, microbatches),
            nprocs=2, join=True)
    expected = reference(steps, microbatches)
    ranks = [json.loads((output/f'rank-{i}.json').read_text()) for i in range(2)]
    error = max(abs(a-b) for rank in ranks for a,b in zip(rank['weights'], expected))
    if error > 1e-10:
        raise AssertionError(f'DDP/global-batch mismatch: {error}')
    report = dict(torch=torch.__version__, device=device, ranks=ranks,
        global_batch_reference=expected, max_absolute_error=error,
        passed=True, actual_multi_gpu=device=='cuda',
        boundary='CPU Gloo验证同步与数值等价；不证明CUDA多GPU或多机性能。' if device=='cpu' else '单机两CUDA GPU数值等价验证；未作性能基准。')
    (output/'receipt.json').write_text(json.dumps(report, indent=2, ensure_ascii=False)+'\n')
    return report


if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--output',default='/tmp/lbb-ddp')
    parser.add_argument('--device',choices=['cpu','cuda'],default='cpu')
    parser.add_argument('--microbatches',type=int,choices=range(1,5),default=2)
    args=parser.parse_args()
    print(json.dumps(run(args.output,args.device,microbatches=args.microbatches),ensure_ascii=False))
