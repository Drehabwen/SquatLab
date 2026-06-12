import { useState, useRef, type DragEvent } from "react";
import { apiClient } from "../../../shared/api/client";
import type { BatchImportResponse } from "../../../shared/types/api";
import { Button, Icon, SurfaceCard } from "../../../shared/components/ui";

type ImportType = "subjects" | "sessions";

function downloadTemplate(type: ImportType) {
  let csv: string;
  let filename: string;
  if (type === "subjects") {
    csv =
      "display_name,sex,age,height_cm,notes\n张三,male,25,175,\n李四,female,30,162,篮球运动员\n";
    filename = "subjects_template.csv";
  } else {
    csv =
      "subject_display_name,protocols\n张三,static_posture,adams_forward_bend,squat\n李四,static_posture,squat\n";
    filename = "sessions_template.csv";
  }
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportPage() {
  const [importType, setImportType] = useState<ImportType>("subjects");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<BatchImportResponse | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptedExts = ".csv,.xlsx,.xls,.json";

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
    setResult(null);
    setError("");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
    setResult(null);
    setError("");
  }

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    setError("");
    setResult(null);
    try {
      const res =
        importType === "subjects"
          ? await apiClient.importSubjectsBatch(file)
          : await apiClient.importSessionsBatch(file);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "导入失败");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="import-page page-stack">
      <section className="page-header">
        <h1 className="page-title">批量导入</h1>
        <p className="page-subtitle">
          支持 CSV、Excel (.xlsx/.xls)、JSON 格式
        </p>
      </section>

      <section className="import-tabs">
        <div className="tab-bar">
          <button
            type="button"
            className={`tab-item${importType === "subjects" ? " tab-active" : ""}`}
            onClick={() => {
              setImportType("subjects");
              setFile(null);
              setResult(null);
              setError("");
            }}
          >
            导入受试者
          </button>
          <button
            type="button"
            className={`tab-item${importType === "sessions" ? " tab-active" : ""}`}
            onClick={() => {
              setImportType("sessions");
              setFile(null);
              setResult(null);
              setError("");
            }}
          >
            导入筛查数据
          </button>
        </div>
      </section>

      <section className="import-upload-section">
        <SurfaceCard variant="lowest" padding="medium">
          <div
            className={`import-dropzone${dragOver ? " import-dropzone-over" : ""}${file ? " import-dropzone-has-file" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedExts}
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            {file ? (
              <div className="import-file-selected">
                <Icon name="description" />
                <span className="import-filename">{file.name}</span>
                <span className="import-filesize">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              </div>
            ) : (
              <div className="import-dropzone-empty">
                <Icon name="upload" />
                <p>拖拽文件到此处，或点击选择文件</p>
                <p className="section-caption">
                  支持 .csv / .xlsx / .xls / .json
                </p>
              </div>
            )}
          </div>

          <div className="import-actions">
            <Button
              variant="secondary"
              icon="download"
              onClick={() => downloadTemplate(importType)}
            >
              下载模板
            </Button>
            <Button
              variant="primary"
              icon="upload"
              onClick={handleImport}
              disabled={!file || importing}
            >
              {importing ? "导入中…" : "开始导入"}
            </Button>
          </div>
        </SurfaceCard>
      </section>

      {error ? (
        <section className="import-error-section">
          <SurfaceCard variant="low" padding="medium">
            <div className="error-content">
              <Icon name="error" />
              <p>{error}</p>
            </div>
          </SurfaceCard>
        </section>
      ) : null}

      {result ? (
        <section className="import-result-section">
          <h2 className="section-title">导入结果</h2>
          <SurfaceCard variant="lowest" padding="medium">
            <div className="import-summary">
              <div className="import-stat">
                <span className="import-stat-value">{result.total_rows}</span>
                <span className="import-stat-label">总行数</span>
              </div>
              <div className="import-stat import-stat-success">
                <span className="import-stat-value">{result.success_count}</span>
                <span className="import-stat-label">成功</span>
              </div>
              <div className="import-stat import-stat-failure">
                <span className="import-stat-value">{result.failure_count}</span>
                <span className="import-stat-label">失败</span>
              </div>
            </div>

            {result.results.length > 0 ? (
              <div className="import-table-wrap">
                <table className="import-table">
                  <thead>
                    <tr>
                      <th>行号</th>
                      <th>状态</th>
                      <th>实体 ID</th>
                      <th>详情</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.results.map((row) => (
                      <tr
                        key={row.row_index}
                        className={
                          row.success ? "import-row-success" : "import-row-failure"
                        }
                      >
                        <td>{row.row_index + 1}</td>
                        <td>
                          {row.success ? (
                            <span className="status-badge status-completed">
                              成功
                            </span>
                          ) : (
                            <span className="status-badge status-pending_recapture">
                              失败
                            </span>
                          )}
                        </td>
                        <td>
                          {row.entity_id ? (
                            <code>{row.entity_id}</code>
                          ) : (
                            "--"
                          )}
                        </td>
                        <td>
                          {row.errors.length > 0
                            ? row.errors.join("；")
                            : "--"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </SurfaceCard>
        </section>
      ) : null}

      <section className="import-help-section">
        <h2 className="section-title">字段说明</h2>
        <SurfaceCard variant="lowest" padding="medium">
          {importType === "subjects" ? (
            <table className="import-table">
              <thead>
                <tr>
                  <th>字段</th>
                  <th>必填</th>
                  <th>说明</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>display_name</td>
                  <td>是</td>
                  <td>受试者姓名，1-80字符</td>
                </tr>
                <tr>
                  <td>sex</td>
                  <td>否</td>
                  <td>性别：female / male / unknown（默认 unknown）</td>
                </tr>
                <tr>
                  <td>age</td>
                  <td>否</td>
                  <td>年龄，3-120</td>
                </tr>
                <tr>
                  <td>height_cm</td>
                  <td>否</td>
                  <td>身高(cm)，60-240</td>
                </tr>
                <tr>
                  <td>notes</td>
                  <td>否</td>
                  <td>备注，最多500字符</td>
                </tr>
              </tbody>
            </table>
          ) : (
            <table className="import-table">
              <thead>
                <tr>
                  <th>字段</th>
                  <th>必填</th>
                  <th>说明</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>subject_display_name</td>
                  <td>二选一</td>
                  <td>受试者姓名，系统自动查找或创建受试者</td>
                </tr>
                <tr>
                  <td>subject_id</td>
                  <td>二选一</td>
                  <td>已有受试者的 ID（如 subj-xxx）</td>
                </tr>
                <tr>
                  <td>protocols</td>
                  <td>否</td>
                  <td>
                    协议列表，逗号分隔：static_posture, adams_forward_bend, squat（默认全选）
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </SurfaceCard>
      </section>
    </div>
  );
}
