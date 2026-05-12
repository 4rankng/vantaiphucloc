"""Vietnamese text utilities."""


def slugify_vi(text: str) -> str:
    """Convert Vietnamese text to a URL-safe slug.

    Removes diacritics, replaces spaces with underscores, keeps only
    alphanumeric characters and underscores.
    """
    import unicodedata

    # Normalize to NFD and strip combining marks (removes Vietnamese diacritics)
    normalized = unicodedata.normalize("NFD", text)
    without_diacritics = "".join(
        ch for ch in normalized if unicodedata.category(ch) != "Mn"
    )
    # Replace đ/Đ with d
    without_diacritics = without_diacritics.replace("đ", "d").replace("Đ", "D")
    # Lowercase, replace spaces/special chars with underscore
    slug = without_diacritics.lower()
    slug = "".join(ch if ch.isalnum() else "_" for ch in slug)
    # Collapse multiple underscores
    while "__" in slug:
        slug = slug.replace("__", "_")
    return slug.strip("_")
