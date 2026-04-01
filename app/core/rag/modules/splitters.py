from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List

from ..schema import Chunk, Document, Splitter


@dataclass(frozen=True)
class MarkdownParagraphSplitter(Splitter):
    max_chars: int = 800
    overlap: int = 120

    def split(self, documents: List[Document]) -> List[Chunk]:
        chunks: List[Chunk] = []
        for doc in documents:
            text = (doc.content or "").replace("\r\n", "\n").strip()
            if not text:
                continue

            source = str(doc.metadata.get("source", "unknown"))
            for idx, piece in enumerate(self._split_markdown(text)):
                chunks.append(
                    Chunk(
                        source=source,
                        content=piece,
                        metadata={"chunk_index": idx, **doc.metadata},
                    )
                )
        return chunks

    def _split_markdown(self, text: str) -> List[str]:
        paras = [p.strip() for p in re.split(r"\n{2,}", text) if p.strip()]
        merged: List[str] = []
        buf = ""

        def flush() -> None:
            nonlocal buf
            if buf.strip():
                merged.append(buf.strip())
            buf = ""

        for p in paras:
            if not buf:
                buf = p
                continue
            if len(buf) + 2 + len(p) <= self.max_chars:
                buf = buf + "\n\n" + p
            else:
                flush()
                buf = p

        flush()

        if self.overlap > 0 and len(merged) > 1:
            overlapped: List[str] = []
            prev_tail = ""
            for c in merged:
                if prev_tail:
                    overlapped.append((prev_tail + "\n\n" + c).strip())
                else:
                    overlapped.append(c)
                prev_tail = c[-self.overlap :]
            merged = overlapped

        return merged

