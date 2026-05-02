"""State machine for WorkOrder and TripOrder workflows.

Uses state_machine library with acts_as_state_machine decorator.
State is persisted in the database, so the machine re-initializes on restart.
"""

import logging
from typing import Optional, Callable

from state_machine import (
    State,
    Event,
    acts_as_state_machine,
    after,
    before,
)

_logger = logging.getLogger(__name__)


@acts_as_state_machine
class WorkOrderStateMachine:
    """State machine for WorkOrder status transitions."""

    # States
    pending = State(initial=True)
    matched = State()
    completed = State()
    cancelled = State()

    # Transitions
    match = Event(from_states=pending, to_state=matched)
    unmatch = Event(from_states=matched, to_state=pending)
    complete_from_pending = Event(from_states=pending, to_state=completed)
    complete_from_matched = Event(from_states=matched, to_state=completed)
    cancel = Event(from_states=pending, to_state=cancelled)

    def __init__(
        self,
        status: str = "PENDING",
        on_transition: Optional[Callable[[str, str, dict], None]] = None,
    ):
        self.on_transition = on_transition
        if status == "MATCHED":
            self._set_state("matched")
        elif status == "COMPLETED":
            self._set_state("completed")
        elif status == "CANCELLED":
            self._set_state("cancelled")

    def _set_state(self, state_name: str):
        if state_name == "matched":
            self._state_machine_state = self.matched
        elif state_name == "completed":
            self._state_machine_state = self.completed
        elif state_name == "cancelled":
            self._state_machine_state = self.cancelled

    @before("match")
    def _before_match(self):
        self._log_transition("match")

    @before("unmatch")
    def _before_unmatch(self):
        self._log_transition("unmatch")

    @before("complete_from_pending")
    def _before_complete_from_pending(self):
        self._log_transition("complete_from_pending")

    @before("complete_from_matched")
    def _before_complete_from_matched(self):
        self._log_transition("complete_from_matched")

    @before("cancel")
    def _before_cancel(self):
        self._log_transition("cancel")

    @after("match")
    def _after_match(self):
        self._log_complete()

    @after("unmatch")
    def _after_unmatch(self):
        self._log_complete()

    @after("complete_from_pending")
    def _after_complete_from_pending(self):
        self._log_complete()

    @after("complete_from_matched")
    def _after_complete_from_matched(self):
        self._log_complete()

    @after("cancel")
    def _after_cancel(self):
        self._log_complete()

    def _log_transition(self, event_name: str):
        old_state = self.current_state.name if self.current_state else "unknown"
        target_state = self._get_target_state(event_name)
        _logger.info(
            "WO_STATE_TRANSITION_START",
            f"WO: {old_state} → {target_state} via {event_name}",
            "state_machine",
        )
        if self.on_transition:
            self.on_transition(old_state, target_state, {})

    def _log_complete(self):
        new_state = self.current_state.name if self.current_state else "unknown"
        _logger.info(
            "WO_STATE_TRANSITION_COMPLETE",
            f"WO now in {new_state}",
            "state_machine",
        )

    def _get_target_state(self, event_name: str) -> str:
        event_map = {
            "match": "matched",
            "unmatch": "pending",
            "complete_from_pending": "completed",
            "complete_from_matched": "completed",
            "cancel": "cancelled",
        }
        return event_map.get(event_name, "unknown")


@acts_as_state_machine
class TripOrderStateMachine:
    """State machine for TripOrder status transitions."""

    # States
    draft = State(initial=True)
    pending = State()
    completed = State()
    cancelled = State()

    # Transitions
    fill_info = Event(from_states=draft, to_state=pending)
    complete = Event(from_states=pending, to_state=completed)
    unmatch = Event(from_states=completed, to_state=pending)
    cancel_from_draft = Event(from_states=draft, to_state=cancelled)
    cancel_from_pending = Event(from_states=pending, to_state=cancelled)

    def __init__(
        self,
        status: str = "DRAFT",
        on_transition: Optional[Callable[[str, str, dict], None]] = None,
    ):
        self.on_transition = on_transition
        if status == "PENDING":
            self._set_state("pending")
        elif status == "COMPLETED":
            self._set_state("completed")
        elif status == "CANCELLED":
            self._set_state("cancelled")

    def _set_state(self, state_name: str):
        if state_name == "pending":
            self._state_machine_state = self.pending
        elif state_name == "completed":
            self._state_machine_state = self.completed
        elif state_name == "cancelled":
            self._state_machine_state = self.cancelled

    @before("fill_info")
    def _before_fill_info(self):
        self._log_transition("fill_info")

    @before("complete")
    def _before_complete(self):
        self._log_transition("complete")

    @before("unmatch")
    def _before_unmatch(self):
        self._log_transition("unmatch")

    @before("cancel_from_draft")
    def _before_cancel_from_draft(self):
        self._log_transition("cancel_from_draft")

    @before("cancel_from_pending")
    def _before_cancel_from_pending(self):
        self._log_transition("cancel_from_pending")

    @after("fill_info")
    def _after_fill_info(self):
        self._log_complete()

    @after("complete")
    def _after_complete(self):
        self._log_complete()

    @after("unmatch")
    def _after_unmatch(self):
        self._log_complete()

    @after("cancel_from_draft")
    def _after_cancel_from_draft(self):
        self._log_complete()

    @after("cancel_from_pending")
    def _after_cancel_from_pending(self):
        self._log_complete()

    def _log_transition(self, event_name: str):
        old_state = self.current_state.name if self.current_state else "unknown"
        target_state = self._get_target_state(event_name)
        _logger.info(
            "TO_STATE_TRANSITION_START",
            f"TO: {old_state} → {target_state} via {event_name}",
            "state_machine",
        )
        if self.on_transition:
            self.on_transition(old_state, target_state, {})

    def _log_complete(self):
        new_state = self.current_state.name if self.current_state else "unknown"
        _logger.info(
            "TO_STATE_TRANSITION_COMPLETE",
            f"TO now in {new_state}",
            "state_machine",
        )

    def _get_target_state(self, event_name: str) -> str:
        event_map = {
            "fill_info": "pending",
            "complete": "completed",
            "unmatch": "pending",
            "cancel_from_draft": "cancelled",
            "cancel_from_pending": "cancelled",
        }
        return event_map.get(event_name, "unknown")


def initialize_wo_state_machine(
    status: str = "PENDING",
    on_transition: Optional[Callable[[str, str, dict], None]] = None,
) -> WorkOrderStateMachine:
    return WorkOrderStateMachine(status=status, on_transition=on_transition)


def initialize_to_state_machine(
    status: str = "DRAFT",
    on_transition: Optional[Callable[[str, str, dict], None]] = None,
) -> TripOrderStateMachine:
    return TripOrderStateMachine(status=status, on_transition=on_transition)
