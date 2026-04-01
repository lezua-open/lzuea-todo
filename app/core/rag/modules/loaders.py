from __future__ import annotations

import os
from dataclasses import dataclass
from typing import List

from ..schema import Document, Loader


@dataclass(frozen=True)
class MarkdownDirectoryLoader(Loader):
    root_dir: str

    def load(self) -> List[Document]:
        if not os.path.exists(self.root_dir):
            return []

        documents: List[Document] = []
        for dirpath, _, filenames in os.walk(self.root_dir):
            for fn in filenames:
                if not fn.lower().endswith(".md"):
                    continue
                path = os.path.join(dirpath, fn)
                rel_path = os.path.relpath(path, self.root_dir)
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        documents.append(
                            Document(
                                content=f.read(),
                                metadata={"source": rel_path},
                            )
                        )
                except Exception:
                    continue

        return documents

