"""LLM analysis service — optional AI-powered interpretation of screening results.

Requires Anthropic API key. Fully optional: the screening pipeline works
without LLM when no key is configured.
"""

import json
import threading
import time
from typing import Any

from app.core.config import get_settings
from app.core.errors import ServiceUnavailableError

from .schemas import IntegratedReportResponse, ProtocolResultResponse


class LlmAnalysisService:
    """Calls Anthropic Claude to interpret screening results."""

    def __init__(self, settings: Any | None = None) -> None:
        self._settings = settings or get_settings()
        self._cache: dict[str, tuple[dict[str, Any], float]] = {}
        self._cache_lock = threading.Lock()

    def analyze(
        self,
        *,
        session_id: str,
        subject_display_name: str,
        subject_age: int | None,
        subject_sex: str,
        report: IntegratedReportResponse,
        protocol_results: list[ProtocolResultResponse],
    ) -> dict[str, Any]:
        """Return LLM analysis, or raise ServiceUnavailableError."""
        api_key = self._settings.llm_api_key
        if not api_key:
            raise ServiceUnavailableError("LLM analysis not configured — set LLM_API_KEY")

        cached = self._cache_get(session_id)
        if cached is not None:
            return cached

        try:
            result = self._call_claude(
                api_key=api_key,
                subject_display_name=subject_display_name,
                subject_age=subject_age,
                subject_sex=subject_sex,
                report=report,
                protocol_results=protocol_results,
            )
            self._cache_set(session_id, result)
            return result
        except ServiceUnavailableError:
            raise
        except Exception as exc:
            raise ServiceUnavailableError(f"LLM analysis failed: {exc}") from exc

    def _build_prompt(
        self,
        *,
        subject_display_name: str,
        subject_age: int | None,
        subject_sex: str,
        report: IntegratedReportResponse,
        protocol_results: list[ProtocolResultResponse],
    ) -> str:
        """Build a structured Chinese prompt for the LLM."""
        protocol_summaries = []
        for r in protocol_results:
            flags = ", ".join(r.risk_flags) if r.risk_flags else "无"
            findings = "; ".join(r.findings[:3])
            psi = f", PSI={r.psi_score}" if r.psi_score is not None else ""
            protocol_summaries.append(
                f"- {r.protocol}: status={r.status}, risk_flags=[{flags}], findings=[{findings}]{psi}"
            )

        demographics = f"{subject_display_name}, "
        if subject_age is not None:
            demographics += f"{subject_age}岁, "
        demographics += f"{'男' if subject_sex == 'male' else '女' if subject_sex == 'female' else '未知性别'}"

        return f"""你是一位青少年体态筛查专家。请根据以下筛查数据，给出专业但通俗易懂的中文解读。

## 受试者信息
{demographics}

## 综合报告
- 整体风险: {report.overall_risk}
- 一致性: {report.consistency_level}
- 建议动作: {report.next_action}
- 摘要: {report.summary}

## 各协议结果
{chr(10).join(protocol_summaries)}

## 跨协议证据
{json.dumps([e.model_dump() for e in report.cross_protocol_evidence], ensure_ascii=False) if report.cross_protocol_evidence else '无'}

请以 JSON 格式返回分析结果，使用以下结构：
{{
  "enhanced_summary": "用通俗语言总结本次筛查的核心发现（2-3句话）",
  "clinical_context": "这个结果在青少年体态发育中的临床意义（如：是否常见、是否需要担心）",
  "risk_narrative": "详细解析风险判断的依据和需要注意的方面",
  "suggestions": ["3-5条具体可行的建议"],
  "limitations": ["本次AI分析的局限性说明"]
}}

只返回 JSON，不要有其他文字。"""

    def _call_claude(
        self,
        *,
        api_key: str,
        subject_display_name: str,
        subject_age: int | None,
        subject_sex: str,
        report: IntegratedReportResponse,
        protocol_results: list[ProtocolResultResponse],
    ) -> dict[str, Any]:
        from anthropic import Anthropic

        client = Anthropic(api_key=api_key)
        prompt = self._build_prompt(
            subject_display_name=subject_display_name,
            subject_age=subject_age,
            subject_sex=subject_sex,
            report=report,
            protocol_results=protocol_results,
        )

        try:
            import tenacity as _  # noqa: F401 — validate tenacity is importable
            message = client.messages.create(
                model=self._settings.llm_model,
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}],
                timeout=self._settings.llm_timeout_seconds,
            )
        except Exception as exc:
            raise ServiceUnavailableError(f"Claude API call failed: {exc}") from exc

        text = message.content[0].text if isinstance(message.content, list) else str(message.content)
        # Strip markdown code fences if present
        text = text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return {"raw_response": text}

    def _cache_get(self, session_id: str) -> dict[str, Any] | None:
        ttl = self._settings.llm_cache_ttl_seconds
        with self._cache_lock:
            entry = self._cache.get(session_id)
            if entry is None:
                return None
            data, stored_at = entry
            if time.monotonic() - stored_at > ttl:
                del self._cache[session_id]
                return None
            return data

    def _cache_set(self, session_id: str, data: dict[str, Any]) -> None:
        with self._cache_lock:
            self._cache[session_id] = (data, time.monotonic())
