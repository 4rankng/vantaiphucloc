from app.contexts.operations.infrastructure.import_pipeline.pattern_detector import DETECTION_THRESHOLD

def test_threshold_is_lowered():
    """The threshold should be lowered from 0.6 to 0.5 to allow marginally-matching files."""
    assert DETECTION_THRESHOLD <= 0.5, f"Expected <= 0.5, got {DETECTION_THRESHOLD}"
