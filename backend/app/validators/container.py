"""Container type and quantity validation per BizLogic.md."""

from fastapi import HTTPException


def validate_container_quantity(work_type: str, quantity: int) -> None:
    """Validate container quantity against work type rules.

    - 40ft containers (E40, F40): only quantity=1 allowed
    - 20ft containers (E20, F20): quantity can be 1 or 2
    """
    if quantity < 1:
        raise HTTPException(
            status_code=422, detail="Container quantity must be at least 1"
        )

    if work_type.endswith("40") and quantity > 1:
        raise HTTPException(
            status_code=422,
            detail=f"40ft containers ({work_type}) allow only 1 container, got {quantity}",
        )

    if work_type.endswith("20") and quantity > 2:
        raise HTTPException(
            status_code=422,
            detail=f"20ft containers ({work_type}) allow at most 2 containers, got {quantity}",
        )


def validate_same_work_type(containers: list) -> None:
    """Ensure all containers have the same work_type (no mixing)."""
    if not containers:
        return
    types = set()
    for c in containers:
        wt = c.work_type if hasattr(c, "work_type") else c.get("work_type", "")
        if wt:
            types.add(wt)
    if len(types) > 1:
        raise HTTPException(
            status_code=422,
            detail=f"Mixed container types not allowed: {', '.join(sorted(types))}",
        )
