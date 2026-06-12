import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../../shared/api/client";
import type { SubjectResponse } from "../../../shared/types/api";
import {
  Button,
  EmptyState,
  Icon,
  SearchInput,
  SkeletonList,
  SurfaceCard,
} from "../../../shared/components/ui";

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(dateString));
}

export function SubjectListPage() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<SubjectResponse[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiClient
      .listSubjects()
      .then((data) => {
        if (active) setSubjects(data);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "加载失败");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = query.trim()
    ? subjects.filter((s) =>
        s.display_name.toLowerCase().includes(query.trim().toLowerCase()) ||
        s.subject_id.toLowerCase().includes(query.trim().toLowerCase())
      )
    : subjects;

  const sexLabel: Record<string, string> = {
    female: "女",
    male: "男",
    unknown: "—",
  };

  return (
    <div className="subjects-page page-stack">
      <section className="page-header">
        <h1 className="page-title">受试者</h1>
        <p className="page-subtitle">管理受试者档案</p>
      </section>

      <div className="page-toolbar">
        <SearchInput
          placeholder="搜索受试者姓名…"
          value={query}
          onChange={setQuery}
        />
        <Button
          variant="primary"
          icon="person_add"
          onClick={() => navigate("/subjects/new")}
        >
          新建
        </Button>
      </div>

      {loading ? (
        <SkeletonList count={4} />
      ) : error ? (
        <SurfaceCard variant="low" padding="medium" className="error-card">
          <div className="error-content">
            <Icon name="error" />
            <p>{error}</p>
          </div>
        </SurfaceCard>
      ) : subjects.length === 0 ? (
        <SurfaceCard variant="lowest" padding="large">
          <EmptyState
            icon="person_search"
            title="暂无受试者"
            description="创建第一个受试者以开始筛查"
            action={
              <Button
                variant="secondary"
                icon="person_add"
                onClick={() => navigate("/subjects/new")}
              >
                新建受试者
              </Button>
            }
          />
        </SurfaceCard>
      ) : filtered.length === 0 ? (
        <SurfaceCard variant="lowest" padding="large">
          <EmptyState
            icon="search_off"
            title="未找到"
            description={`没有匹配 "${query}" 的受试者`}
            action={
              <Button variant="tertiary" onClick={() => setQuery("")}>
                清除搜索
              </Button>
            }
          />
        </SurfaceCard>
      ) : (
        <div className="subject-list list-stagger">
          {filtered.map((subject) => (
            <SurfaceCard
              key={subject.subject_id}
              variant="lowest"
              padding="medium"
              onClick={() =>
                navigate(
                  `/subjects/${encodeURIComponent(subject.subject_id)}`,
                )
              }
            >
              <div className="subject-card-content">
                <div className="subject-avatar">
                  <Icon name="person" size="large" />
                </div>
                <div className="subject-info">
                  <h3 className="subject-name">{subject.display_name}</h3>
                  <p className="subject-meta" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                    <span className="subject-id-badge" style={{ display: 'inline-flex', alignItems: 'center', padding: '1px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', marginRight: '4px' }}>
                      {subject.subject_id}
                    </span>
                    <span style={{ color: '#94a3b8' }}>·</span>
                    <span>{sexLabel[subject.sex]}</span>
                    {subject.age ? <span> · {subject.age}岁</span> : null}
                    {subject.height_cm ? (
                      <span> · {subject.height_cm}cm</span>
                    ) : null}
                  </p>
                  {subject.notes ? (
                    <p className="subject-notes">{subject.notes}</p>
                  ) : null}
                </div>
                <div className="subject-date">
                  {formatDate(subject.created_at)}
                </div>
                <Icon name="chevron_right" className="subject-chevron" />
              </div>
            </SurfaceCard>
          ))}
        </div>
      )}
    </div>
  );
}
