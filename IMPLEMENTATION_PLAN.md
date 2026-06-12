# SquatLab Posture Screening Improvement Plan

## 1. Algorithm Improvements

### 1.1 Age/Sex Normalization

Create a normalization module that adjusts thresholds based on subject demographics.

**Approach**: Use z-score normalization against clinically-derived reference tables (from peer-reviewed adolescent posture studies like Penha et al. 2005, Kamal et al. 2016). Since we cannot bundle a full normative database, use a compact lookup strategy:

Reference table structure (compiled from published literature):
- sex=female, age_bucket=[9-11]: shoulder_mean=0.98, shoulder_sd=0.03, hip_mean=0.99, hip_sd=0.02, trunk_mean=1.00, trunk_sd=0.03
- sex=female, age_bucket=[12-14]: shoulder_mean=0.97, shoulder_sd=0.04, hip_mean=0.98, hip_sd=0.03, trunk_mean=0.99, trunk_sd=0.04
- sex=female, age_bucket=[15-17]: shoulder_mean=0.98, shoulder_sd=0.03, hip_mean=0.99, hip_sd=0.02, trunk_mean=1.00, trunk_sd=0.03
- sex=male, age_bucket=[9-11]: shoulder_mean=0.98, shoulder_sd=0.03, hip_mean=0.99, hip_sd=0.02, trunk_mean=1.00, trunk_sd=0.03
- sex=male, age_bucket=[12-14]: shoulder_mean=0.97, shoulder_sd=0.04, hip_mean=0.98, hip_sd=0.03, trunk_mean=0.99, trunk_sd=0.04
- sex=male, age_bucket=[15-17]: shoulder_mean=0.98, shoulder_sd=0.03, hip_mean=0.99, hip_sd=0.02, trunk_mean=1.00, trunk_sd=0.03
- fallback (sex=unknown or age=null): use clinical adult defaults

Z-score formula: `z = (abs(1.0 - ratio) - mean_deviation) / sd` (clamped to 0 minimum)

### 1.2 Severity Grading (Mild/Moderate/Severe)

Replace binary yes/no with tiered output:

| Metric | None (z < 1.0) | Mild (1.0 <= z < 2.0) | Moderate (2.0 <= z < 3.0) | Severe (z >= 3.0) |
|--------|----------------|------------------------|---------------------------|-------------------|
| shoulder_symmetry_ratio | 无异常 | 轻度肩高不对称 | 较明显肩高不对称 | 明显肩高不对称 |
| hip_symmetry_ratio | 无异常 | 轻度骨盆倾斜 | 较明显骨盆倾斜 | 明显骨盆倾斜 |
| vertical_alignment_ratio | 无异常 | 轻度躯干偏移 | 较明显躯干偏移 | 明显躯干偏移 |

Fallback (no subject demographics): Use fixed ratio thresholds:
- Mild: ratio deviation >= 0.02 and < 0.04
- Moderate: ratio deviation >= 0.04 and < 0.06
- Severe: ratio deviation >= 0.06

### 1.3 Multi-Frame Fusion Using stable_hold_seconds

The `stable_hold_seconds` field is captured but never used. Strategy:

1. During capture phase, when `stable_hold_seconds > 0`, collect N frames
2. Compute per-frame metrics, then take the **median** of each metric across frames
3. Compute the **MAD (median absolute deviation)** as a quality indicator
4. If MAD exceeds threshold (20% of the median), flag the capture as potentially unstable

Implementation: Add new optional field `per_frame_metrics: list[dict]` to the analyze request. If provided, fuse via median; if not, use single-frame metrics (backward compatible).

### 1.4 MediaPipe Error Propagation

Model 2-4cm MediaPipe error explicitly:

```
uncertainty_pct = (baseline_error_cm / torso_height_cm) * 100  # ~2-5% typical
ratio_ci_lower = ratio * (1 - uncertainty_pct)
ratio_ci_upper = ratio * (1 + uncertainty_pct)
```

If CI crosses a severity threshold, flag measurement as "borderline" and set confidence appropriately.

### 1.5 Composite Score (Posture Symmetry Index - PSI)

Weighted composite from 0-100:

```
PSI = 0.40 * shoulder_subscore + 0.35 * hip_subscore + 0.25 * trunk_subscore

Subscore (0-100 per axis):
  z < 1.0  -> 100 (excellent)
  z < 2.0  -> 80 - 10*(z-1)   (mild: 90-80)
  z < 3.0  -> 70 - 10*(z-2)   (moderate: 70-60)
  z >= 3.0 -> max(0, 50 - 10*(z-3))  (severe: 50-0)
```

Risk bands:
- PSI >= 85: low
- PSI 70-84: attention
- PSI < 70: review_required

### 1.6 Revised _derive_static_posture Logic

```python
def _derive_static_posture_v2(self, metrics, subject_age=None, subject_sex="unknown"):
    ref = NORM_REF.get_ref(age=subject_age, sex=subject_sex)
    
    shoulder_z = compute_z(metrics.shoulder_symmetry_ratio, ref.shoulder_mean, ref.shoulder_sd)
    hip_z = compute_z(metrics.hip_symmetry_ratio, ref.hip_mean, ref.hip_sd)
    trunk_z = compute_z(metrics.vertical_alignment_ratio, ref.trunk_mean, ref.trunk_sd)
    
    # Apply MediaPipe uncertainty
    shoulder_z, shoulder_borderline = adjust_for_uncertainty(shoulder_z, ...)
    
    shoulder_grade = severity_grade(shoulder_z)  # "none"|"mild"|"moderate"|"severe"
    hip_grade = severity_grade(hip_z)
    trunk_grade = severity_grade(trunk_z)
    
    psi = composite_score(shoulder_z, hip_z, trunk_z)
    
    # Build findings, risk_flags with tiered labels
    # Include psi and z-scores in response metrics
```

---

## 2. LLM Integration Architecture

### 2.1 Where LLM Fits in the Pipeline

The LLM operates as a **post-processing step** on the integrated report -- it receives algorithmic output plus subject context and produces natural-language interpretation. The deterministic analysis always runs first; the LLM is optional.

```
Protocol Results (3x)
  -> Deterministic Analysis (ScreeningAnalysisService)
  -> IntegratedReportResponse
  -> [OPTIONAL] LLM Analysis
     -> LlmAnalysisResponse (separate endpoint)
```

### 2.2 New API Endpoint

```
POST /api/v1/screening/sessions/{session_id}/reports/llm-analysis
  Response: LlmAnalysisResponse {
    report_id: str
    session_id: str
    enhanced_summary: str
    clinical_context: str
    risk_narrative: str
    recommendations_narrative: str
    cross_protocol_insight: str
    limitations: list[str]
    model_used: str
    generated_at: datetime
  }

GET /api/v1/screening/sessions/{session_id}/reports/llm-analysis
  Response: LlmAnalysisResponse | 404 if not yet generated
```

### 2.3 Anthropic Claude API Configuration

Add to `config.py`:

```python
# LLM Configuration
llm_api_key: str = ""               # Anthropic API key (empty = disabled)
llm_model: str = "claude-sonnet-4-20250514"
llm_max_tokens: int = 1500
llm_timeout_seconds: int = 30
llm_cache_ttl_seconds: int = 3600   # 1 hour
```

### 2.4 Prompt Design

Created in `llm_prompts.py`:

SYSTEM_PROMPT:
```
你是青少年运动康复筛查分析助手。你的任务是解释姿态与动作筛查的客观数据，
为康复专业人员提供参考信息。重要限制：
- 仅基于提供的客观数据分析，不推测未提供的信息
- 明确指出这是筛查而非临床诊断
- 对于严重异常，建议专业医学评估
- 用中文回复，保持专业但易懂的风格
- 如果跨协议证据一致（多项目指向同一方向），强调这个关联性
```

USER_PROMPT template:
```
被筛查者信息：
- 年龄: {age}岁 ({sex_label})
- 身高: {height_cm}cm

静态姿势分析：
- 肩对称性: {shoulder_grade} (z分数: {shoulder_z:.1f})
- 骨盆对称性: {hip_grade} (z分数: {hip_z:.1f})
- 躯干偏移: {trunk_grade} (z分数: {trunk_z:.1f})
- 综合姿势对称指数(PSI): {psi}/100

Adams前屈测试：
- 胸椎不对称: {thoracic_asymmetry}
- 腰椎不对称: {lumbar_asymmetry}

深蹲动作评估：
- 重心偏移: {center_deviation}
- 左右对称性: {symmetry}
- 膝部内扣角度: {knee_valgus}

跨协议一致性: {consistency_level}
跨协议证据: {cross_protocol_summary}

请从以下角度分析并返回JSON格式：
1. enhanced_summary: 综合摘要
2. clinical_context: 临床相关性说明
3. risk_narrative: 风险级别解读
4. recommendations_narrative: 详细建议
5. cross_protocol_insight: 多协议关联洞察
6. limitations: 本次分析的局限性列表
```

### 2.5 LLM Service Module

New file: `backend/app/features/screening/llm_service.py`

```python
class LlmAnalysisService:
    def __init__(self, settings):
        self.api_key = settings.llm_api_key
        self.model = settings.llm_model
        self.timeout = settings.llm_timeout_seconds
        self.cache = TtlCache(ttl=settings.llm_cache_ttl_seconds)
    
    def is_available(self) -> bool:
        return bool(self.api_key)
    
    async def analyze(self, report: IntegratedReportResponse, 
                      subject: SubjectResponse,
                      protocol_results: list[ProtocolResultResponse]) -> LlmAnalysisResponse:
        if not self.is_available():
            raise ServiceUnavailableError("AI analysis not configured")
        
        cache_key = self._cache_key(report.session_id, report)
        if cached := self.cache.get(cache_key):
            return cached
        
        prompt = build_llm_prompt(report, subject, protocol_results)
        
        try:
            client = AsyncAnthropic(api_key=self.api_key, timeout=self.timeout)
            message = await client.messages.create(
                model=self.model,
                max_tokens=1500,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": prompt}]
            )
            result = self._parse_response(message.content)
            self.cache.set(cache_key, result)
            return result
        except asyncio.TimeoutError:
            raise ServiceUnavailableError("AI分析超时，请稍后重试")
        except APIStatusError as e:
            if e.status_code == 429:
                raise ServiceUnavailableError("AI服务繁忙，请稍后重试")
            raise
```

### 2.6 Error Handling Flow

| Error Type | HTTP Status | User Message |
|------------|-------------|--------------|
| No API key configured | 503 | "AI分析功能未配置，请联系管理员" |
| Timeout | 503 | "AI分析超时，请稍后重试" |
| Rate limit (429) | 503 | "AI服务繁忙，系统已使用算法结果生成报告" |
| Auth error (401) | 500 (logged) + fallback | "AI分析暂时不可用" |
| Network error | 503 | "AI服务连接失败，请检查网络" |

### 2.7 Caching Strategy

- In-memory TTL cache keyed by `{session_id}:{report_hash}`
- Cache hit: return immediately without API call
- Cache TTL: 3600 seconds (configurable)
- Cache eviction: automatic on TTL expiry
- No persistence needed (reports are immutable once generated)

### 2.8 Dependencies

Add to `pyproject.toml`:
```toml
"anthropic>=0.49.0",
"tenacity>=9.0.0",
```

---

## 3. File-Level Implementation Plan (in order)

### Phase 1: Algorithm Core (no LLM, backward compatible)

| Step | File | Action | Purpose |
|------|------|--------|---------|
| 1.1 | `backend/app/features/screening/normative.py` | CREATE | Reference tables, z-score, severity grading, PSI, uncertainty adjustment |
| 1.2 | `backend/app/features/screening/schemas.py` | MODIFY | Add `SeverityGrade` type, `StaticPostureDetail` model, optional age/sex on request |
| 1.3 | `backend/app/features/screening/service.py` | MODIFY | Add `_derive_static_posture_v2()`; keep v1 active |
| 1.4 | `backend/app/api/routes/screening.py` | MODIFY | Pass subject age/sex to analysis service |
| 1.5 | `backend/app/features/screening/repository.py` | MODIFY | Add `get_subject()` method for fetching demographics |
| 1.6 | `backend/tests/test_screening_algorithm.py` | CREATE | Unit tests for normative module |
| 1.7 | `backend/tests/test_screening_api.py` | MODIFY | Add tests with age/sex; verify backward compat |

### Phase 2: LLM Backend

| Step | File | Action | Purpose |
|------|------|--------|---------|
| 2.1 | `backend/app/core/config.py` | MODIFY | Add LLM settings |
| 2.2 | `backend/pyproject.toml` | MODIFY | Add anthropic, tenacity deps |
| 2.3 | `backend/app/features/screening/llm_prompts.py` | CREATE | System/user prompt templates |
| 2.4 | `backend/app/features/screening/llm_service.py` | CREATE | Anthropic client + caching + error handling |
| 2.5 | `backend/app/features/screening/schemas.py` | MODIFY | Add LlmAnalysisResponse, LlmAnalysisRequest |
| 2.6 | `backend/app/api/routes/screening.py` | MODIFY | Add POST/GET llm-analysis endpoints |
| 2.7 | `backend/app/api/deps.py` | MODIFY | Add get_llm_service dependency |
| 2.8 | `backend/tests/test_llm_service.py` | CREATE | Unit tests with mocked client |
| 2.9 | `backend/tests/test_screening_api.py` | MODIFY | LLM endpoint integration tests |

### Phase 3: Frontend

| Step | File | Action | Purpose |
|------|------|--------|---------|
| 3.1 | `frontend/src/shared/types/api.ts` | MODIFY | Add LlmAnalysisResponse type |
| 3.2 | `frontend/src/shared/api/client.ts` | MODIFY | Add LLM API methods |
| 3.3 | `frontend/src/features/reports/components/AiAnalysisCard.tsx` | CREATE | LLM analysis display component |
| 3.4 | `frontend/src/features/reports/pages/IntegratedReportPage.tsx` | MODIFY | Add AI analysis section |
| 3.5 | `frontend/src/features/reports/components/AiAnalysisCard.test.tsx` | CREATE | Frontend component tests |

### Phase 4: Finalization

| Step | File | Action | Purpose |
|------|------|--------|---------|
| 4.1 | `backend/app/features/screening/service.py` | MODIFY | Replace v1 with v2; add multi-frame fusion |
| 4.2 | `backend/app/features/screening/llm_service.py` | MODIFY | Add observability logging |
| 4.3 | `frontend/src/features/sessions/pages/SessionDetailPage.tsx` | MODIFY | AI badge on report CTA |

---

## 4. Verification Strategy

### 4.1 Algorithm Tests (test_screening_algorithm.py)

- z-score at boundaries (z=0, 0.99, 1.0, 1.99, 2.0, 2.99, 3.0)
- Severity grading for each level
- PSI composite: perfect=100, all severe~0, mixed cases
- Reference lookup: each age/sex bucket, edge cases (age=null, sex=unknown)
- MediaPipe uncertainty: CI crossing threshold produces "borderline" flag
- Multi-frame median fusion: outlier handling, MAD quality check

### 4.2 LLM Tests (test_llm_service.py)

- `is_available()` returns False with empty key, True with key
- Prompt contains all required metric fields
- Cache hit avoids second API call
- Cache miss on different session
- Timeout -> ServiceUnavailableError
- Rate limit -> ServiceUnavailableError
- Auth error -> graceful fallback
- Successful response -> parsed correctly

### 4.3 Integration Tests (test_screening_api.py)

- Static posture with age/sex returns tiered grades
- Backward compatibility without age/sex
- PSI score in response
- LLM endpoint 503 when no API key configured
- LLM endpoint 400 when no integrated report exists
- LLM endpoint returns valid response (with mock)

### 4.4 Regression Safety

- All 6 existing tests must pass unchanged
- No database schema changes (all new data in JSON blobs)
- Frontend types are additive only
- Existing endpoints unchanged in request/response shape

---

## 5. Key Design Decisions

1. **LLM as separate endpoint**: Deterministic report always available and fast; LLM is on-demand enhancement
2. **Z-score normalization**: Clinically defensible, adapts when reference data improves
3. **In-memory cache**: Simple dict-based TTL, no Redis dependency, appropriate since reports are immutable
4. **Median multi-frame fusion**: Robust against MediaPipe transients, backward compatible
5. **No DB schema changes**: All new data in existing JSON metrics field or in-memory cache

### Critical Files for Implementation

- `backend/app/features/screening/service.py` -- main analysis logic, most changes
- `backend/app/features/screening/normative.py` -- new: algorithm core
- `backend/app/features/screening/llm_service.py` -- new: Anthropic API integration
- `backend/app/features/screening/schemas.py` -- data models for both algorithm and LLM
- `frontend/src/features/reports/pages/IntegratedReportPage.tsx` -- report display
