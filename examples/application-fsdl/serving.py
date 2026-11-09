import heapq
import json
from math import ceil

def replay(batch=2, workers=1, overhead=4, per_item=3):
    arrivals = [0, 2, 4, 6, 8, 10]
    free, jobs = [(0, worker) for worker in range(workers)], []
    heapq.heapify(free)
    for i in range(0, len(arrivals), batch):
        group = arrivals[i:i + batch]
        available, worker = heapq.heappop(free)
        start = max(available, group[-1])
        finish = start + overhead + len(group) * per_item
        jobs.append(dict(worker=worker, start=start, finish=finish, group=group))
        heapq.heappush(free, (finish, worker))
    latency = [job['finish'] - arrival for job in jobs for arrival in job['group']]
    makespan = max(job['finish'] for job in jobs)
    return dict(jobs=jobs, latencies=latency,
                p95=sorted(latency)[ceil(0.95 * len(latency)) - 1],
                throughput=len(arrivals) * 1000 / makespan)

result = replay()
assert result['latencies'] == [12, 10, 18, 16, 24, 22]
assert result['p95'] == 24 and result['throughput'] == 187.5
print(json.dumps(result))  # Simulated queue; not a measured service benchmark.
