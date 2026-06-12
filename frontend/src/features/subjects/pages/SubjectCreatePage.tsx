import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../../shared/api/client";
import type { SubjectCreateRequest } from "../../../shared/types/api";
import { Button, SurfaceCard } from "../../../shared/components/ui";
import { Icon } from "../../../shared/components/Icon";

export function SubjectCreatePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<SubjectCreateRequest>({
    display_name: "",
    sex: "unknown",
    age: undefined,
    height_cm: undefined,
    notes: "",
  });

  function updateField<K extends keyof SubjectCreateRequest>(
    key: K,
    value: SubjectCreateRequest[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.display_name.trim()) return;

    setLoading(true);
    setError("");
    try {
      const subject = await apiClient.createSubject(form);
      navigate(`/subjects/${encodeURIComponent(subject.subject_id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="subjects-create-page page-stack">
      <section className="page-header">
        <button
          className="back-button"
          type="button"
          onClick={() => navigate("/subjects")}
        >
          <Icon name="arrow_back" />
          <span>返回</span>
        </button>
        <h1 className="page-title">新建受试者</h1>
        <p className="page-subtitle">创建受试者档案信息</p>
      </section>

      {error ? (
        <SurfaceCard variant="low" padding="medium" className="error-card">
          <div className="error-content">
            <Icon name="error" />
            <p>{error}</p>
          </div>
        </SurfaceCard>
      ) : null}

      <form onSubmit={handleSubmit}>
        <SurfaceCard variant="lowest" padding="medium">
          <div className="form-group">
            <label className="form-label" htmlFor="display_name">
              姓名 <span className="form-required">*</span>
            </label>
            <input
              id="display_name"
              className="form-input"
              type="text"
              value={form.display_name}
              onChange={(e) => updateField("display_name", e.target.value)}
              placeholder="输入受试者姓名"
              required
              maxLength={80}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="sex">
              性别 <span className="form-required">*</span>
            </label>
            <select
              id="sex"
              className="form-input"
              value={form.sex}
              onChange={(e) =>
                updateField("sex", e.target.value as SubjectCreateRequest["sex"])
              }
            >
              <option value="unknown">未指定</option>
              <option value="female">女</option>
              <option value="male">男</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="age">
                年龄
              </label>
              <input
                id="age"
                className="form-input"
                type="number"
                min={3}
                max={120}
                value={form.age ?? ""}
                onChange={(e) =>
                  updateField(
                    "age",
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
                placeholder="岁"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="height_cm">
                身高
              </label>
              <input
                id="height_cm"
                className="form-input"
                type="number"
                min={60}
                max={240}
                value={form.height_cm ?? ""}
                onChange={(e) =>
                  updateField(
                    "height_cm",
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
                placeholder="cm"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="notes">
              备注
            </label>
            <textarea
              id="notes"
              className="form-input form-textarea"
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="可选备注信息"
              maxLength={500}
              rows={3}
            />
          </div>
        </SurfaceCard>

        <div className="form-actions">
          <Button
            variant="secondary"
            type="button"
            onClick={() => navigate("/subjects")}
          >
            取消
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={!form.display_name.trim() || loading}
            loading={loading}
          >
            创建受试者
          </Button>
        </div>
      </form>
    </div>
  );
}
