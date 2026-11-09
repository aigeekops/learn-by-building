def run(budget=4, scenario="retry"):
    calls, observation, status, answer = 0, None, "running", None
    decisions = 0
    for step in range(1, budget + 1):
        decisions = step
        if observation is not None:
            answer, status = observation, "completed"
            break
        calls += 1
        if scenario == "fatal":
            status = "tool_error"
            break
        retryable = scenario == "stall" or scenario == "retry" and calls == 1
        if not retryable:
            observation = "10 ms"
    if status == "running":
        status = "budget_exhausted"
    return {"calls": calls, "decisions": decisions, "status": status, "answer": answer}

if __name__ == "__main__":
    assert run() == {"calls": 2, "decisions": 3, "status": "completed", "answer": "10 ms"}
    assert run(1, "success")["status"] == "budget_exhausted"
    assert run(6, "stall")["calls"] == 6
    assert run(6, "fatal")["calls"] == 1
    print(run())
