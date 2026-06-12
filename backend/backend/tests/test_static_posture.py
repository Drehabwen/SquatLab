"""Tests for static posture analysis: normative data, severity grading, PSI."""

from datetime import UTC

import pytest

from app.features.screening.normative import (
    classify_by_threshold,
    classify_severity,
    compute_psi,
    compute_z_score,
    get_age_bucket,
    get_reference,
    severity_label,
)
from app.features.screening.service import ScreeningAnalysisService

# ── normative data ──────────────────────────────────────────────────────────

def test_age_buckets():
    assert get_age_bucket(None) is None
    assert get_age_bucket(6) == "6-9"
    assert get_age_bucket(9) == "6-9"
    assert get_age_bucket(10) == "10-13"
    assert get_age_bucket(13) == "10-13"
    assert get_age_bucket(14) == "14-17"
    assert get_age_bucket(17) == "14-17"


def test_get_reference_returns_age_sex_matched_norm():
    norm = get_reference("shoulder", age=12, sex="male")
    assert norm.mean == 0.014
    assert norm.sd == 0.009


def test_get_reference_falls_back_when_no_demographics():
    norm = get_reference("hip", age=None, sex="unknown")
    assert norm.mean == 0.010
    assert norm.sd == 0.008


def test_compute_z_score_near_population_mean():
    z = compute_z_score("shoulder", 0.014, age=12, sex="male")
    assert z == pytest.approx(0.0, abs=0.01)


def test_compute_z_score_two_sd_above_mean():
    z = compute_z_score("shoulder", 0.032, age=12, sex="male")
    # mean=0.014, sd=0.009 → z = (0.032-0.014)/0.009 = 2.0
    assert z == pytest.approx(2.0, abs=0.05)


def test_compute_z_score_floored_at_zero():
    z = compute_z_score("shoulder", 0.005, age=12, sex="male")
    assert z == 0.0


def test_compute_z_score_without_demographics_uses_fallback():
    z = compute_z_score("trunk", 0.032, age=None, sex="unknown")
    # fallback mean=0.012, sd=0.010 → z = (0.032-0.012)/0.010 = 2.0
    assert z == pytest.approx(2.0, abs=0.05)


def test_classify_severity_levels():
    assert classify_severity(0.5) == "none"
    assert classify_severity(0.0) == "none"
    assert classify_severity(1.0) == "mild"
    assert classify_severity(1.5) == "mild"
    assert classify_severity(1.99) == "mild"
    assert classify_severity(2.0) == "moderate"
    assert classify_severity(2.99) == "moderate"
    assert classify_severity(3.0) == "severe"
    assert classify_severity(5.0) == "severe"


def test_classify_by_threshold_fallback():
    # threshold for hip is 0.030
    assert classify_by_threshold("hip", 0.000) == "none"
    assert classify_by_threshold("hip", 0.020) == "mild"  # ratio=0.667
    assert classify_by_threshold("hip", 0.029) == "mild"  # ratio=0.967
    assert classify_by_threshold("hip", 0.030) == "moderate"  # ratio=1.0
    assert classify_by_threshold("hip", 0.044) == "moderate"  # ratio≈1.47
    assert classify_by_threshold("hip", 0.046) == "severe"  # ratio≈1.53


def test_classify_by_threshold_different_axes():
    # shoulder threshold 0.03, hip 0.03, trunk 0.04
    assert classify_by_threshold("trunk", 0.025) == "mild"  # ratio=0.625
    assert classify_by_threshold("shoulder", 0.010) == "none"  # ratio=0.333 < 0.6


def test_severity_label():
    assert severity_label("none") == "正常"
    assert severity_label("mild") == "轻度异常"
    assert severity_label("moderate") == "中度异常"
    assert severity_label("severe") == "重度异常"


# ── PSI ─────────────────────────────────────────────────────────────────────

def test_psi_perfect_symmetry():
    assert compute_psi(shoulder_z=0, hip_z=0, trunk_z=0) == pytest.approx(100.0)


def test_psi_moderate_asymmetry():
    # z=1.0 → axis score = 75
    score = compute_psi(shoulder_z=1.0, hip_z=1.0, trunk_z=1.0)
    assert score == pytest.approx(75.0)


def test_psi_severe_asymmetry():
    # z=4.0 → axis floored to 0 → overall ~0
    score = compute_psi(shoulder_z=4.0, hip_z=4.0, trunk_z=4.0)
    assert score == pytest.approx(0.0)


def test_psi_mixed_severity():
    # shoulder_z=0→100, hip_z=2→50, trunk_z=1→75
    # weighted: 100*0.4 + 50*0.35 + 75*0.25 = 40 + 17.5 + 18.75 = 76.25
    score = compute_psi(shoulder_z=0.0, hip_z=2.0, trunk_z=1.0)
    assert score == pytest.approx(76.25)


# ── service: static posture derivation ──────────────────────────────────────

@pytest.fixture
def service():
    return ScreeningAnalysisService()


@pytest.fixture
def normal_metrics():
    return {
        "shoulder_symmetry_ratio": 0.008,
        "hip_symmetry_ratio": 0.009,
        "vertical_alignment_ratio": 0.010,
        "suspected_direction": "unclear",
    }


def test_derive_static_posture_all_normal(service, normal_metrics):
    findings, flags, recs, enriched = service._derive_static_posture(
        normal_metrics, subject_age=12, subject_sex="female",
    )
    assert "未见明显不对称" in findings[0]
    assert flags == []
    assert enriched is not None
    assert enriched["severity_grades"] == {"shoulder": "none", "hip": "none", "trunk": "none"}
    assert enriched["psi_score"] >= 80


def test_derive_static_posture_moderate_shoulder():
    service = ScreeningAnalysisService()
    metrics = {
        "shoulder_symmetry_ratio": 0.024,  # well above z=2 for male age 12
        "hip_symmetry_ratio": 0.010,
        "vertical_alignment_ratio": 0.010,
        "suspected_direction": "right",
    }
    findings, flags, recs, enriched = service._derive_static_posture(
        metrics, subject_age=12, subject_sex="male",
    )
    assert any("肩" in f for f in findings)
    assert enriched["severity_grades"]["shoulder"] in ("mild", "moderate", "severe")


def test_derive_static_posture_without_demographics_falls_back(service):
    metrics = {
        "shoulder_symmetry_ratio": 0.020,
        "hip_symmetry_ratio": 0.020,
        "vertical_alignment_ratio": 0.025,
        "suspected_direction": "left",
    }
    findings, flags, recs, enriched = service._derive_static_posture(metrics)
    assert enriched is not None
    assert enriched["use_normative"] is False
    # shoulder ratio 0.020/0.030 = 0.667 → mild
    assert enriched["severity_grades"]["shoulder"] == "mild"


def test_derive_static_posture_old_field_names(service):
    """Backward compatibility with old metric field names."""
    metrics = {
        "shoulder_height_diff_ratio": 0.035,
        "pelvis_height_diff_ratio": 0.032,
        "trunk_lateral_shift_ratio": 0.045,
        "suspected_direction": "right",
    }
    findings, flags, recs, enriched = service._derive_static_posture(metrics)
    assert any("肩" in f for f in findings)
    assert any("骨盆" in f for f in findings)
    assert any("躯干" in f for f in findings)


def test_derive_static_posture_prefers_new_field_names(service):
    """New field names should take priority when both exist."""
    metrics = {
        "shoulder_symmetry_ratio": 0.010,  # new: normal
        "shoulder_height_diff_ratio": 0.050,  # old: would be severe
        "hip_symmetry_ratio": 0.010,
        "vertical_alignment_ratio": 0.010,
        "suspected_direction": "unclear",
    }
    findings, flags, recs, enriched = service._derive_static_posture(metrics)
    assert not flags, f"Expected no flags but got {flags}"


def test_derive_static_posture_recommendations_vary_by_psi():
    service = ScreeningAnalysisService()
    severe = {
        "shoulder_symmetry_ratio": 0.045,
        "hip_symmetry_ratio": 0.040,
        "vertical_alignment_ratio": 0.050,
        "suspected_direction": "right",
    }
    _, _, recs, _ = service._derive_static_posture(severe, subject_age=10, subject_sex="male")
    assert len(recs) >= 2
    assert any("专业" in r for r in recs)

    normal = {
        "shoulder_symmetry_ratio": 0.008,
        "hip_symmetry_ratio": 0.006,
        "vertical_alignment_ratio": 0.007,
        "suspected_direction": "unclear",
    }
    _, _, recs, _ = service._derive_static_posture(normal, subject_age=10, subject_sex="female")
    assert any("常规" in r for r in recs)


# ── integrated report with PSI ──────────────────────────────────────────────

def test_integrated_report_low_psi_triggers_review():
    service = ScreeningAnalysisService()
    from datetime import datetime

    from app.features.screening.schemas import ProtocolResultResponse

    now = datetime.now(UTC)
    static_result = ProtocolResultResponse(
        result_id="res-1",
        session_id="s1",
        protocol="static_posture",
        status="analyzed",
        capture_quality="good",
        metrics={"shoulder_symmetry_ratio": 0.04},
        findings=["右肩高度不对称重度异常"],
        risk_flags=["static_shoulder_asymmetry_right"],
        recommendations=["建议专业人员评估"],
        needs_recapture=False,
        needs_review=False,
        severity_grades={"shoulder": "severe", "hip": "none", "trunk": "none"},
        psi_score=55.0,
        created_at=now,
        updated_at=now,
    )
    # Need adams + squat to reach integrated report (all protocols analyzed)
    adams_result = ProtocolResultResponse(
        result_id="res-2",
        session_id="s1",
        protocol="adams_forward_bend",
        status="analyzed",
        capture_quality="good",
        metrics={},
        findings=["Adams 前屈未见明显不对称"],
        risk_flags=[],
        recommendations=[],
        needs_recapture=False,
        needs_review=False,
        created_at=now,
        updated_at=now,
    )
    squat_result = ProtocolResultResponse(
        result_id="res-3",
        session_id="s1",
        protocol="squat",
        status="analyzed",
        capture_quality="good",
        metrics={},
        findings=["深蹲动作控制整体稳定"],
        risk_flags=[],
        recommendations=[],
        needs_recapture=False,
        needs_review=False,
        created_at=now,
        updated_at=now,
    )

    report = service.build_integrated_report(
        session_id="s1",
        results=[static_result, adams_result, squat_result],
    )
    # PSI=55 < 70 → review_required
    assert report.overall_risk == "review_required"
    assert report.next_action == "manual_review"


def test_integrated_report_high_psi_no_flags_is_low_risk():
    service = ScreeningAnalysisService()
    from datetime import datetime

    from app.features.screening.schemas import ProtocolResultResponse

    now = datetime.now(UTC)

    def make_clean_result(protocol, **kw):
        return ProtocolResultResponse(
            result_id=f"res-{protocol}",
            session_id="s2",
            protocol=protocol,
            status="analyzed",
            capture_quality="good",
            metrics={},
            findings=["未见异常"],
            risk_flags=[],
            recommendations=[],
            needs_recapture=False,
            needs_review=False,
            created_at=now,
            updated_at=now,
            **kw,
        )

    report = service.build_integrated_report(
        session_id="s2",
        results=[
            make_clean_result("static_posture", psi_score=92.0),
            make_clean_result("adams_forward_bend"),
            make_clean_result("squat"),
        ],
    )
    assert report.overall_risk == "low"
    assert report.next_action == "pass"
