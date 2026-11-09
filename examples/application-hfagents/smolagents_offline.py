"""Offline integration fixture: real smolagents, fixed trusted model output, no LLM/network.
Run in an isolated environment with smolagents==1.26.0. Never feed untrusted code
into this example or add broad tools just to make a generated program succeed.
"""
import json
from importlib.metadata import version
from smolagents import CodeAgent, Model, ChatMessage, tool


@tool
def count_items(category: str) -> int:
    """Count one category in a fixed read-only inventory.

    Args:
        category: The inventory category, exactly sensors.
    """
    if category != "sensors":
        raise ValueError("unknown category")
    return 3


class ReplayModel(Model):
    def __init__(self):
        super().__init__(model_id="offline-replay-fixture")
        self.calls = 0

    def generate(self, messages, stop_sequences=None, **kwargs):
        # A test response is supplied explicitly: this does not infer a solution.
        self.calls += 1
        if self.calls != 1:
            raise RuntimeError("this controlled fixture expects one generation")
        return ChatMessage(
            role="assistant",
            content='Thought: Use the supplied inventory tool.\n'
                    'Code:\n```python\nn = count_items("sensors")\n'
                    'final_answer(n * 12)\n```<end_code>',
        )


if __name__ == "__main__":
    model = ReplayModel()
    agent = CodeAgent(tools=[count_items], model=model, max_steps=2, verbosity_level=0)
    answer = agent.run("Count the sensors and multiply their count by 12.")
    assert answer == 36
    assert model.calls == 1
    print(json.dumps({"smolagents": version("smolagents"), "answer": answer,
                      "model_calls": model.calls, "real_model_inference": False,
                      "scope": "offline framework/tool integration only"}))
