"""Tests for LLM analysis service — covers all failure modes."""

from datetime import UTC

import pytest

from app.core.errors import ServiceUnavailableError
from app.features.screening.llm_service import LlmAnalysisService


class FakeSettings:
    llm_api_key = ""
    llm_model = "claude-haiku-4-5-20251001"
    llm_timeout_seconds = 30
    llm_cache_ttl_seconds = 3600


def test_llm_returns_503_when_no_api_key():
    service = LlmAnalysisService(settings=FakeSettings())
    with pytest.raises(ServiceUnavailableError) as exc:
        service.analyze(
            session_id="s1",
            subject_display_name="测试",
            subject_age=12,
            subject_sex="female",
            report=None,  # type: ignore[arg-type]
            protocol_results=[],
        )
    assert "not configured" in str(exc.value).lower()


def test_llm_cache_returns_cached_result():
    """Cache hit bypasses API call."""
    settings = FakeSettings()
    settings.llm_api_key = "fake-key"
    service = LlmAnalysisService(settings=settings)

    # Pre-populate cache
    cached = {"enhanced_summary": "cached result"}
    service._cache_set("s1", cached)

    result = service.analyze(
        session_id="s1",
        subject_display_name="测试",
        subject_age=None,
        subject_sex="unknown",
        report=None,  # type: ignore[arg-type]
        protocol_results=[],
    )
    assert result == cached


def test_llm_cache_expires():
    settings = FakeSettings()
    settings.llm_api_key = "fake-key"
    settings.llm_cache_ttl_seconds = -1  # immediate expiry
    service = LlmAnalysisService(settings=settings)
    service._cache_set("s1", {"enhanced_summary": "stale"})

    # cached value expired → should try API call, which will fail with bogus key
    with pytest.raises(ServiceUnavailableError):
        service.analyze(
            session_id="s1",
            subject_display_name="测试",
            subject_age=None,
            subject_sex="unknown",
            report=None,  # type: ignore[arg-type]
            protocol_results=[],
        )


def test_llm_prompt_builds_without_errors():
    """Prompt construction handles all reasonable inputs."""
    from datetime import datetime

    from app.features.screening.schemas import IntegratedReportResponse, ProtocolResultResponse

    settings = FakeSettings()
    service = LlmAnalysisService(settings=settings)

    now = datetime.now(UTC)
    report = IntegratedReportResponse(
        report_id="r1",
        session_id="s1",
        title="测试报告",
        overall_risk="low",
        consistency_level="none",
        main_patterns=[],
        cross_protocol_evidence=[],
        next_action="pass",
        summary="无异常",
        recommendations=["按周期复查"],
        disclaimer="免责声明",
        created_at=now,
    )

    results = [
        ProtocolResultResponse(
            result_id="res-1",
            session_id="s1",
            protocol="static_posture",
            status="analyzed",
            capture_quality="good",
            metrics={},
            findings=["未见异常"],
            risk_flags=[],
            recommendations=[],
            needs_recapture=False,
            needs_review=False,
            severity_grades={"shoulder": "none", "hip": "none", "trunk": "none"},
            psi_score=95.0,
            created_at=now,
            updated_at=now,
        ),
    ]

    prompt = service._build_prompt(
        subject_display_name="测试",
        subject_age=12,
        subject_sex="female",
        report=report,
        protocol_results=results,
    )

    assert "测试" in prompt
    assert "12岁" in prompt
    assert "女" in prompt
    assert "PSI=95" in prompt or "psi" in prompt.lower()


def test_llm_bogus_api_key_raises_service_unavailable():
    settings = FakeSettings()
    settings.llm_api_key = "sk-ant-bogus-key-12345"
    service = LlmAnalysisService(settings=settings)

    from datetime import datetime

    from app.features.screening.schemas import IntegratedReportResponse

    now = datetime.now(UTC)
    report = IntegratedReportResponse(
        report_id="r1",
        session_id="s1",
        title="测试",
        overall_risk="low",
        consistency_level="none",
        main_patterns=[],
        cross_protocol_evidence=[],
        next_action="pass",
        summary="正常",
        recommendations=[],
        disclaimer="",
        created_at=now,
    )

    with pytest.raises(ServiceUnavailableError):
        service.analyze(
            session_id="s1",
            subject_display_name="测试",
            subject_age=None,
            subject_sex="unknown",
            report=report,
            protocol_results=[],
        )
