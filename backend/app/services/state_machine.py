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

    # Transitions
    match = Event(from_states=pending, to_state=matched)
    complete_from_pending = Event(from_states=pending, to_state=completed)
    complete_from_matched = Event(from_states=matched, to_state=completed)

    def __init__(
        self,
        status: str = "PENDING",
        on_transition: Optional[Callable[[str, str, dict], None]] = None,
    ):
        """Initialize state machine with current status and optional transition callback.

        Args:
            status: Current status from database (PENDING, MATCHED, COMPLETED)
            on_transition: Callback function(old_state, new_state, context) called on each transition
        """
        self.on_transition = on_transition
        # Set initial state from status
        if status == "MATCHED":
            self._set_state("matched")
        elif status == "COMPLETED":
            self._set_state("completed")
        # else: already in pending (initial)

    def _set_state(self, state_name: str):
        """Set the current state manually (for re-initialization from database)."""
        if state_name == "matched":
            self._state_machine_state = self.matched
        elif state_name == "completed":
            self._state_machine_state = self.completed
        # else: pending

    @before("match")
    def _before_match(self):
        self._log_transition("match")

    @before("complete_from_pending")
    def _before_complete_from_pending(self):
        self._log_transition("complete_from_pending")

    @before("complete_from_matched")
    def _before_complete_from_matched(self):
        self._log_transition("complete_from_matched")

    @after("match")
    def _after_match(self):
        self._log_complete()

    @after("complete_from_pending")
    def _after_complete_from_pending(self):
        self._log_complete()

    @after("complete_from_matched")
    def _after_complete_from_matched(self):
        self._log_complete()

    def _log_transition(self, event_name: str):
        """Log transition start."""
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
        """Log transition complete."""
        new_state = self.current_state.name if self.current_state else "unknown"
        _logger.info(
            "WO_STATE_TRANSITION_COMPLETE",
            f"WO now in {new_state}",
            "state_machine",
        )

    def _get_target_state(self, event_name: str) -> str:
        """Get target state name for an event."""
        event_map = {
            "match": "matched",
            "complete_from_pending": "completed",
            "complete_from_matched": "completed",
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
    cancel_from_draft = Event(from_states=draft, to_state=cancelled)
    cancel_from_pending = Event(from_states=pending, to_state=cancelled)

    def __init__(
        self,
        status: str = "DRAFT",
        on_transition: Optional[Callable[[str, str, dict], None]] = None,
    ):
        """Initialize state machine with current status and optional transition callback.

        Args:
            status: Current status from database (DRAFT, PENDING, COMPLETED, CANCELLED)
            on_transition: Callback function(old_state, new_state, context) called on each transition
        """
        self.on_transition = on_transition
        # Set initial state from status
        if status == "PENDING":
            self._set_state("pending")
        elif status == "COMPLETED":
            self._set_state("completed")
        elif status == "CANCELLED":
            self._set_state("cancelled")
        # else: draft (initial)

    def _set_state(self, state_name: str):
        """Set the current state manually (for re-initialization from database)."""
        if state_name == "pending":
            self._state_machine_state = self.pending
        elif state_name == "completed":
            self._state_machine_state = self.completed
        elif state_name == "cancelled":
            self._state_machine_state = self.cancelled
        # else: draft

    @before("fill_info")
    def _before_fill_info(self):
        self._log_transition("fill_info")

    @before("complete")
    def _before_complete(self):
        self._log_transition("complete")

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

    @after("cancel_from_draft")
    def _after_cancel_from_draft(self):
        self._log_complete()

    @after("cancel_from_pending")
    def _after_cancel_from_pending(self):
        self._log_complete()

    def _log_transition(self, event_name: str):
        """Log transition start."""
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
        """Log transition complete."""
        new_state = self.current_state.name if self.current_state else "unknown"
        _logger.info(
            "TO_STATE_TRANSITION_COMPLETE",
            f"TO now in {new_state}",
            "state_machine",
        )

    def _get_target_state(self, event_name: str) -> str:
        """Get target state name for an event."""
        event_map = {
            "fill_info": "pending",
            "complete": "completed",
            "cancel_from_draft": "cancelled",
            "cancel_from_pending": "cancelled",
        }
        return event_map.get(event_name, "unknown")


def initialize_wo_state_machine(
    status: str = "PENDING",
    on_transition: Optional[Callable[[str, str, dict], None]] = None,
) -> WorkOrderStateMachine:
    """Create a WorkOrderStateMachine initialized from the current status.

    Args:
        status: Current status from database
        on_transition: Optional callback for transitions

    Returns:
        WorkOrderStateMachine instance initialized to the given status
    """
    return WorkOrderStateMachine(status=status, on_transition=on_transition)


def initialize_to_state_machine(
    status: str = "DRAFT",
    on_transition: Optional[Callable[[str, str, dict], None]] = None,
) -> TripOrderStateMachine:
    """Create a TripOrderStateMachine initialized from the current status.

    Args:
        status: Current status from database
        on_transition: Optional callback for transitions

    Returns:
        TripOrderStateMachine instance initialized to the given status
    """
    return TripOrderStateMachine(status=status, on_transition=on_transition)
