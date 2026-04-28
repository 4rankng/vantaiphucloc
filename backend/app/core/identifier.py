import re


def detect_identifier_type(value: str) -> str:
    """
    Determine whether the input is a phone number, email, or username.

    Returns: "phone" | "email" | "username"
    """
    # Vietnamese phone: starts with 0, 10-11 digits
    if re.match(r"^0\d{9,10}$", value):
        return "phone"
    # Email: contains @ with characters on both sides
    if re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", value):
        return "email"
    return "username"
