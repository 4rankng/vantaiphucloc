"""Domain exceptions for the Identity context.

Routers translate these to HTTP responses; nothing in domain knows about HTTP.
"""


class IdentityDomainError(Exception):
    """Base class for identity-context domain errors."""


class UserNotFound(IdentityDomainError):
    pass


class DuplicatePhone(IdentityDomainError):
    pass


class DuplicateEmail(IdentityDomainError):
    pass


class DuplicateUsername(IdentityDomainError):
    pass


class DuplicateCccd(IdentityDomainError):
    pass


class InvalidCredentials(IdentityDomainError):
    pass


class InactiveUser(IdentityDomainError):
    pass


class InvalidCccd(IdentityDomainError):
    pass


class PermissionDenied(IdentityDomainError):
    pass


class WrongCurrentPassword(IdentityDomainError):
    pass
