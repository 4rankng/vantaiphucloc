from app.ai.pipeline import _detect_duplicates

def test_detect_duplicates_exact():
    rows = [
        {"Số Cont": "OBLU3323816", "Ngày đi": "2026-05-22", "Cước chuyến": "2000"},
        {"Số Cont": "OBLU3323816", "Ngày đi": "2026-05-22", "Cước chuyến": "2000"},
    ]
    groups, warnings = _detect_duplicates(rows)
    assert len(groups) == 1
    assert groups[0].type == "exact"
    assert groups[0].row_indices == [0, 1]
    assert groups[0].containers == ["OBLU3323816"]
    assert len(warnings) == 1
    assert "1 nhóm cont trùng nhau" in warnings[0]

def test_detect_duplicates_different_metadata():
    rows = [
        {"Số Cont": "OBLU3323816", "Ngày đi": "2026-05-22", "Cước chuyến": "2000"},
        {"Số Cont": "OBLU3323816", "Ngày đi": "2026-05-23", "Cước chuyến": "2500"},
    ]
    groups, warnings = _detect_duplicates(rows)
    assert len(groups) == 0
    assert len(warnings) == 0

def test_detect_duplicates_fuzzy_ignored():
    rows = [
        {"Số Cont": "OBLU3323816", "Ngày đi": "2026-05-22", "Cước chuyến": "2000"},
        {"Số Cont": "OBLU3323014", "Ngày đi": "2026-05-22", "Cước chuyến": "2000"},
    ]
    groups, warnings = _detect_duplicates(rows)
    assert len(groups) == 0
    assert len(warnings) == 0

def test_detect_duplicates_digits_ignored():
    rows = [
        {"Số Cont": "CAAU2135684", "Ngày đi": "2026-05-22", "Cước chuyến": "2000"},
        {"Số Cont": "CAAU2135344", "Ngày đi": "2026-05-22", "Cước chuyến": "2000"},
    ]
    groups, warnings = _detect_duplicates(rows)
    assert len(groups) == 0
    assert len(warnings) == 0
