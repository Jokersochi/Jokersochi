import ast
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
EXECUTION_DIRS = ("runtime", "services", "agents", "api")
FORBIDDEN_CALLS = {"create_order", "post_order", "cancel_all", "cancel_order"}
FORBIDDEN_NAMES = {
    "POLYMARKET_PRIVATE_KEY",
    "POLYMARKET_API_SECRET",
    "PRIVATE_KEY",
    "WALLET_PRIVATE_KEY",
}


class PaperOnlyRepositoryTests(unittest.TestCase):
    def test_execution_modules_have_no_authenticated_order_primitives(self):
        violations = []
        for directory in EXECUTION_DIRS:
            for path in (ROOT / directory).rglob("*.py"):
                tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
                for node in ast.walk(tree):
                    if isinstance(node, (ast.Import, ast.ImportFrom)):
                        modules = [alias.name for alias in node.names]
                        if isinstance(node, ast.ImportFrom) and node.module:
                            modules.append(node.module)
                        if any("py_clob_client" in name for name in modules):
                            violations.append(f"{path}: authenticated CLOB client import")
                    if isinstance(node, ast.Call):
                        name = node.func.attr if isinstance(node.func, ast.Attribute) else (
                            node.func.id if isinstance(node.func, ast.Name) else ""
                        )
                        if name in FORBIDDEN_CALLS:
                            violations.append(f"{path}:{node.lineno}: {name}")
                    if isinstance(node, ast.Constant) and isinstance(node.value, str):
                        if node.value in FORBIDDEN_NAMES:
                            violations.append(f"{path}:{node.lineno}: secret name")
                    if isinstance(node, (ast.Assign, ast.AnnAssign)):
                        targets = node.targets if isinstance(node, ast.Assign) else [node.target]
                        value = node.value
                        for target in targets:
                            if (
                                isinstance(target, ast.Name)
                                and target.id.lower() in {"real_orders_enabled", "live_trading", "real_money"}
                                and isinstance(value, ast.Constant)
                                and value.value is True
                            ):
                                violations.append(f"{path}:{node.lineno}: {target.id}=True")
        self.assertEqual(violations, [], "\n".join(violations))


if __name__ == "__main__":
    unittest.main()
