from __future__ import annotations

import hashlib
import os
from dataclasses import dataclass
from typing import Iterable, List, Tuple


@dataclass(frozen=True)
class KBFingerprint:
    value: str


def _iter_files(root_dir: str, exts: Tuple[str, ...] = (".md",)) -> Iterable[str]:
    for dirpath, _, filenames in os.walk(root_dir):
        for fn in filenames:
            low = fn.lower()
            if any(low.endswith(ext) for ext in exts):
                yield os.path.join(dirpath, fn)


def compute_kb_fingerprint(root_dir: str) -> KBFingerprint:
    """根据 knowledge_base 中文件的相对路径 + mtime + size 计算指纹。

    说明：
    - 这不是“内容 hash”，但足以满足工程上的变更检测；速度更快。
    - 若你需要更严格一致性，可改为读取文件内容参与 hash。
    """
    if not os.path.exists(root_dir):
        return KBFingerprint("missing")

    items: List[Tuple[str, int, int]] = []
    for abs_path in _iter_files(root_dir):
        try:
            rel = os.path.relpath(abs_path, root_dir).replace("\\", "/")
            st = os.stat(abs_path)
            items.append((rel, int(st.st_mtime_ns), int(st.st_size)))
        except OSError:
            continue

    items.sort(key=lambda x: x[0])

    h = hashlib.sha256()
    for rel, mtime_ns, size in items:
        h.update(rel.encode("utf-8"))
        h.update(b"\0")
        h.update(str(mtime_ns).encode("ascii"))
        h.update(b"\0")
        h.update(str(size).encode("ascii"))
        h.update(b"\n")

    return KBFingerprint(h.hexdigest())

