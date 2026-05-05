"""Fleet domain exceptions."""

from __future__ import annotations


class FleetDomainError(Exception):
    pass


class DriverNotFound(FleetDomainError):
    pass


class DriverAlreadyExists(FleetDomainError):
    pass
