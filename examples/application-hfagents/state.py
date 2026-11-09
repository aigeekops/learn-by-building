def build_state(turns=1, observation=False, tool="read"):
    system = {"role": "system", "content": "只读资料，保留来源"}
    history = []
    for i in range(turns):
        history.extend([{"role": "user", "content": f"旧问题{i+1}"},
                        {"role": "assistant", "content": f"旧回答{i+1}"}])
    messages = [system, *history, {"role": "user", "content": "采样周期是多少？"}]
    if observation:
        messages.append({"role": "tool", "content": {"source": "sampling-v1", "value": "10 ms"}})
    allowed = tool == "read"
    next_action = "refuse" if not allowed else "answer_with_source" if observation else "lookup"
    return len(messages), allowed, next_action

if __name__ == "__main__":
    assert build_state() == (4, True, "lookup")
    assert build_state(2, True) == (7, True, "answer_with_source")
    assert build_state(0, False, "write") == (2, False, "refuse")
    print(build_state())
