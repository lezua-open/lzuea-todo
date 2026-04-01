from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Protocol


Message = Dict[str, str]


class SessionStore(Protocol):
    def get_or_create(self, session_id: str, system_message: Message) -> List[Message]: ...

    def append(self, session_id: str, message: Message) -> None: ...

    def get(self, session_id: str) -> List[Message]: ...


@dataclass
class InMemorySessionStore(SessionStore):
    _sessions: Dict[str, List[Message]]

    def __init__(self) -> None:
        self._sessions = {}

    def get_or_create(self, session_id: str, system_message: Message) -> List[Message]:
        if session_id not in self._sessions:
            self._sessions[session_id] = [system_message]
        return self._sessions[session_id]

    def append(self, session_id: str, message: Message) -> None:
        if session_id not in self._sessions:
            self._sessions[session_id] = []
        self._sessions[session_id].append(message)

    def get(self, session_id: str) -> List[Message]:
        return self._sessions.get(session_id, [])

