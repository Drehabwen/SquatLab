import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../../shared/components/Icon";
import {
  V3EvidenceCard,
  V3Notice,
  V3PageHeader,
  V3PrimaryAction,
  V3SegmentedChoice,
  V3StatusBadge,
} from "./V3UI";
import {
  useV3Flow,
  type AdamsRecord,
  type ObservationGrade,
  type SuspectedSide,
} from "./V3Flow";

const gradeOptions: Array<{ value: ObservationGrade; label: string }> = [
  { value: "none", label: "无异常" },
  { value: "mild", label: "轻度" },
  { value: "obvious", label: "明显" },
];

const sideOptions: Array<{ value: SuspectedSide; label: string }> = [
  { value: "left", label: "左" },
  { value: "uncertain", label: "不确定" },
  { value: "right", label: "右" },
];

function PageFrame({ children }: { children: React.ReactNode }) {
  return <div className="v3-page v3-page-enter">{children}</div>;
}

export function TasksPageV3() {
  const navigate = useNavigate();
  const flow = useV3Flow();

  return (
    <PageFrame>
      <V3PageHeader
        title="早筛任务"
        trailing={
          <button className="v3-icon-button" aria-label="个人中心">
            <Icon name="account_circle" />
          </button>
        }
      />
      <p className="v3-page-lead">今天需要完成的筛查</p>

      <section className="v3-progress-panel">
        <span>今日进度</span>
        <div className="v3-progress-row">
          <strong>{flow.adamsComplete ? "4 / 8" : "3 / 8"}</strong>
          <div className="v3-progress-track" aria-label="今日任务进度">
            <span style={{ width: flow.adamsComplete ? "50%" : "37.5%" }} />
          </div>
        </div>
      </section>

      <div className="v3-stack">
        <V3EvidenceCard
          icon="directions_walk"
          title="步态剪影采集"
          description="约 30 秒 · 用于初步分流"
          badge={
            <V3StatusBadge
              tone={flow.gaitComplete ? "success" : "neutral"}
              icon={flow.gaitComplete ? "check_circle" : "radio_button_checked"}
            >
              {flow.gaitComplete ? "已完成" : "待采集"}
            </V3StatusBadge>
          }
          onClick={() =>
            navigate("/sessions/demo/capture/gait-silhouette")
          }
        />
        <V3EvidenceCard
          icon="accessibility_new"
          title="静态体态记录"
          description="正面、侧面与背面"
          badge={
            <V3StatusBadge tone="success" icon="check_circle">
              已完成
            </V3StatusBadge>
          }
        />
        <V3EvidenceCard
          icon="clinical_notes"
          title="标准筛查"
          description="需要人工完成 Adams 观察"
          attention={!flow.adamsComplete}
          badge={
            <V3StatusBadge
              tone={flow.adamsComplete ? "success" : "attention"}
              icon={flow.adamsComplete ? "check_circle" : "schedule"}
            >
              {flow.adamsComplete ? "已完成" : "待完成"}
            </V3StatusBadge>
          }
          onClick={() => navigate("/sessions/demo/standard-screening")}
        />
      </div>

      <V3Notice tone="attention" title="筛查不是诊断">
        结果用于风险分层与后续检查建议。
      </V3Notice>
      <V3PrimaryAction
        icon="assignment"
        onClick={() => navigate("/sessions/demo/capture/gait-silhouette")}
      >
        {flow.gaitComplete ? "重新查看步态采集" : "开始步态采集"}
      </V3PrimaryAction>
    </PageFrame>
  );
}

export function GaitCapturePageV3() {
  const navigate = useNavigate();
  const flow = useV3Flow();
  const [phase, setPhase] = useState<"ready" | "capturing" | "processing">(
    "ready",
  );

  function startCapture() {
    setPhase("capturing");
    window.setTimeout(() => {
      setPhase("processing");
      window.setTimeout(() => {
        flow.completeGait();
        navigate("/sessions/demo/triage-result");
      }, 700);
    }, 1100);
  }

  return (
    <PageFrame>
      <V3PageHeader title="步态剪影采集" backTo="/tasks" />
      <div className="v3-guidance-strip">
        <Icon name="info" size="small" />
        请将手机固定在身体侧前方
      </div>

      <section className="v3-viewfinder">
        <V3StatusBadge tone="success" icon="check_circle">
          画面稳定
        </V3StatusBadge>
        <span className="v3-corner v3-corner-tl" />
        <span className="v3-corner v3-corner-tr" />
        <span className="v3-corner v3-corner-bl" />
        <span className="v3-corner v3-corner-br" />
        <div className={`v3-walker ${phase !== "ready" ? "is-moving" : ""}`}>
          <Icon name="directions_walk" />
        </div>
        <div className="v3-quality-pills">
          <V3StatusBadge tone="success" icon="check_circle">
            全身入镜
          </V3StatusBadge>
          <V3StatusBadge tone="success" icon="check_circle">
            光线充足
          </V3StatusBadge>
        </div>
      </section>

      <section className="v3-instruction-panel">
        <h2>采集要求</h2>
        <ul>
          <li>
            <Icon name="video_camera_front" />侧前方固定机位
          </li>
          <li>
            <Icon name="directions_walk" />自然步行 6—8 米
          </li>
          <li>
            <Icon name="privacy_tip" />仅提取人体轮廓
          </li>
        </ul>
        <div className="v3-privacy-line">
          <Icon name="info" size="small" />
          原始画面不进入筛查报告
        </div>
      </section>

      <V3PrimaryAction
        icon="photo_camera"
        onClick={startCapture}
        loading={phase !== "ready"}
      >
        {phase === "capturing"
          ? "采集中…"
          : phase === "processing"
            ? "正在生成剪影…"
            : "开始采集"}
      </V3PrimaryAction>
      <p className="v3-action-caption">预计用时约 30 秒</p>
    </PageFrame>
  );
}

export function TriageResultPageV3() {
  const navigate = useNavigate();

  return (
    <PageFrame>
      <V3PageHeader title="初筛结果" backTo="/tasks" />
      <div className="v3-meta-line">
        <Icon name="check" size="small" />步态剪影 · 采集质量合格
      </div>

      <section className="v3-triage-hero">
        <div>
          <span>风险分层</span>
          <h2>建议进一步筛查</h2>
          <V3StatusBadge tone="attention">需关注</V3StatusBadge>
          <p>剪影特征提示存在需要复核的步态差异。</p>
        </div>
        <Icon name="directions_walk" />
      </section>

      <section className="v3-observation-panel">
        <h2>本次观察</h2>
        <div>
          <span>
            <Icon name="ecg_heart" />左右节律
          </span>
          <strong className="is-attention">需复核</strong>
        </div>
        <div>
          <span>
            <Icon name="accessibility_new" />躯干摆动
          </span>
          <strong className="is-attention">需复核</strong>
        </div>
        <div>
          <span>
            <Icon name="verified_user" />采集质量
          </span>
          <strong>合格</strong>
        </div>
      </section>

      <V3Notice title="结果说明">
        该结果仅用于初步分流，不能代替临床诊断。
      </V3Notice>
      <V3PrimaryAction
        onClick={() => navigate("/sessions/demo/standard-screening")}
      >
        进入标准筛查
      </V3PrimaryAction>
      <button
        type="button"
        className="v3-text-action"
        onClick={() => navigate("/tasks")}
      >
        稍后处理
      </button>
    </PageFrame>
  );
}

export function StandardScreeningPageV3() {
  const navigate = useNavigate();
  const flow = useV3Flow();

  return (
    <PageFrame>
      <V3PageHeader title="标准筛查" backTo="/tasks" />
      <div className="v3-warning-strip">
        <Icon name="error" size="small" />
        请按顺序完成必要证据采集
      </div>

      <div className="v3-stack">
        <V3EvidenceCard
          icon="accessibility_new"
          title="静态体态"
          description="正面、侧面与背面体态记录"
          badge={
            <V3StatusBadge tone="success" icon="check_circle">
              已完成
            </V3StatusBadge>
          }
        />
        <V3EvidenceCard
          icon="clinical_notes"
          title="Adams 人工记录"
          description="由受训观察者完成前屈观察"
          attention={!flow.adamsComplete}
          badge={
            <V3StatusBadge
              tone={flow.adamsComplete ? "success" : "attention"}
              icon={flow.adamsComplete ? "check_circle" : "schedule"}
            >
              {flow.adamsComplete ? "已完成" : "待完成"}
            </V3StatusBadge>
          }
          onClick={() => navigate("/sessions/demo/capture/adams")}
        />
        <V3EvidenceCard
          icon="sports_gymnastics"
          title="深蹲动作"
          description="补充功能性动作信息"
          badge={
            <V3StatusBadge tone="optional" icon="radio_button_unchecked">
              可选
            </V3StatusBadge>
          }
        />
      </div>

      <V3Notice title="关于深蹲动作">
        深蹲为可选项，不影响正式筛查报告条件。
      </V3Notice>
      <V3PrimaryAction
        icon={flow.adamsComplete ? "fact_check" : "assignment"}
        onClick={() =>
          navigate(
            flow.adamsComplete
              ? "/sessions/demo/report-readiness"
              : "/sessions/demo/capture/adams",
          )
        }
      >
        {flow.adamsComplete ? "检查正式报告条件" : "记录 Adams 观察"}
      </V3PrimaryAction>
    </PageFrame>
  );
}

export function AdamsRecordPageV3() {
  const navigate = useNavigate();
  const flow = useV3Flow();
  const [record, setRecord] = useState<AdamsRecord>(flow.adamsRecord);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof AdamsRecord>(key: K, value: AdamsRecord[K]) {
    setRecord((current) => ({ ...current, [key]: value }));
  }

  function submit() {
    setSaving(true);
    window.setTimeout(() => {
      flow.submitAdams(record);
      navigate("/sessions/demo/report-readiness");
    }, 650);
  }

  return (
    <PageFrame>
      <V3PageHeader
        title="Adams 前屈记录"
        backTo="/sessions/demo/standard-screening"
        trailing={
          <V3StatusBadge tone="attention">人工观察</V3StatusBadge>
        }
      />

      <section className="v3-observer-panel">
        <span className="v3-observer-illustration">
          <Icon name="clinical_notes" size="large" />
        </span>
        <div>
          <h2>人工观察记录</h2>
          <p>由受训观察者记录可见体征</p>
        </div>
      </section>

      <div className="v3-form-stack">
        <section className="v3-form-card">
          <h2>胸段观察</h2>
          <V3SegmentedChoice
            value={record.thoracic}
            options={gradeOptions}
            onChange={(value) => update("thoracic", value)}
            attentionValue="mild"
          />
        </section>
        <section className="v3-form-card">
          <h2>腰段观察</h2>
          <V3SegmentedChoice
            value={record.lumbar}
            options={gradeOptions}
            onChange={(value) => update("lumbar", value)}
            attentionValue="mild"
          />
        </section>
        <section className="v3-form-card">
          <h2>疑似侧别</h2>
          <V3SegmentedChoice
            value={record.side}
            options={sideOptions}
            onChange={(value) => update("side", value)}
          />
        </section>
        <section className="v3-form-card">
          <h2>ATR（设备录入，可选）</h2>
          <input
            className="v3-input"
            type="number"
            inputMode="decimal"
            value={record.atr}
            onChange={(event) => update("atr", event.target.value)}
            placeholder="请输入 ATR 值（°）"
            aria-label="ATR 设备录入值"
          />
          <p className="v3-field-note">
            <Icon name="info" size="small" />
            手机不自动计算 ATR
          </p>
        </section>
      </div>

      <V3PrimaryAction icon="save" onClick={submit} loading={saving}>
        {saving ? "正在提交…" : "提交人工记录"}
      </V3PrimaryAction>
    </PageFrame>
  );
}

export function ReportReadinessPageV3() {
  const navigate = useNavigate();
  const flow = useV3Flow();
  const completed = flow.adamsComplete ? 3 : 2;

  return (
    <PageFrame>
      <V3PageHeader title="正式报告条件" backTo="/reports" />

      <section className="v3-readiness-progress">
        <div>
          <strong>{completed} / 3</strong>
          <span>证据完成进度</span>
        </div>
        <div className="v3-progress-track">
          <span style={{ width: `${(completed / 3) * 100}%` }} />
        </div>
      </section>

      <div className="v3-stack">
        <V3EvidenceCard
          icon="directions_walk"
          title="剪影证据"
          description="步态轮廓采集质量合格"
          badge={
            <V3StatusBadge tone="success" icon="check_circle">
              可用
            </V3StatusBadge>
          }
        />
        <V3EvidenceCard
          icon="accessibility_new"
          title="静态体态"
          description="正面、侧面与背面记录完整"
          badge={
            <V3StatusBadge tone="success" icon="check_circle">
              可用
            </V3StatusBadge>
          }
        />
        <V3EvidenceCard
          icon="assignment"
          title="Adams 人工记录"
          description={
            flow.adamsComplete ? "人工观察结果已提交" : "尚未提交观察结果"
          }
          attention={!flow.adamsComplete}
          badge={
            <V3StatusBadge
              tone={flow.adamsComplete ? "success" : "attention"}
              icon={flow.adamsComplete ? "check_circle" : "schedule"}
            >
              {flow.adamsComplete ? "可用" : "缺失"}
            </V3StatusBadge>
          }
          onClick={
            flow.adamsComplete
              ? undefined
              : () => navigate("/sessions/demo/capture/adams")
          }
        />
      </div>

      {flow.reportGenerated ? (
        <V3Notice title="正式报告已生成">
          报告已进入归档，本演示不会上传真实筛查数据。
        </V3Notice>
      ) : (
        <V3Notice
          tone={flow.adamsComplete ? "information" : "attention"}
          title={
            flow.adamsComplete
              ? "正式报告条件已满足"
              : "暂不可生成正式报告"
          }
        >
          {flow.adamsComplete
            ? "请确认学生信息和证据版本后生成报告。"
            : "补齐 Adams 人工记录后即可生成；当前结果仅用于初步分流。"}
        </V3Notice>
      )}

      <V3PrimaryAction
        icon={flow.adamsComplete ? "description" : "assignment"}
        onClick={() =>
          flow.adamsComplete
            ? flow.generateReport()
            : navigate("/sessions/demo/capture/adams")
        }
      >
        {flow.adamsComplete ? "生成正式报告" : "补充必要证据"}
      </V3PrimaryAction>
      <p className="v3-optional-line">
        <Icon name="check_circle" size="small" />深蹲不是必选项
      </p>
    </PageFrame>
  );
}

function UtilityPage({
  title,
  icon,
  description,
  action,
  onAction,
}: {
  title: string;
  icon: string;
  description: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <PageFrame>
      <V3PageHeader title={title} />
      <section className="v3-utility-page">
        <span>
          <Icon name={icon} size="large" />
        </span>
        <h2>{title}</h2>
        <p>{description}</p>
        <V3PrimaryAction onClick={onAction}>{action}</V3PrimaryAction>
      </section>
    </PageFrame>
  );
}

export function StudentsPageV3() {
  const navigate = useNavigate();
  return (
    <UtilityPage
      title="学生"
      icon="group"
      description="学生处理中心将在下一阶段接入真实档案与批次数据。"
      action="查看演示任务"
      onAction={() => navigate("/tasks")}
    />
  );
}

export function CaptureHubPageV3() {
  const navigate = useNavigate();
  return (
    <UtilityPage
      title="采集"
      icon="photo_camera"
      description="当前演示会话已准备好进行步态剪影与标准筛查。"
      action="进入标准筛查"
      onAction={() => navigate("/sessions/demo/standard-screening")}
    />
  );
}

export function ReportsPageV3() {
  const navigate = useNavigate();
  return (
    <UtilityPage
      title="报告"
      icon="description"
      description="检查必要证据是否完整，并处理正式报告的阻塞项。"
      action="检查报告条件"
      onAction={() => navigate("/sessions/demo/report-readiness")}
    />
  );
}

export function ProfilePageV3() {
  const navigate = useNavigate();
  const flow = useV3Flow();
  return (
    <PageFrame>
      <V3PageHeader title="我的" />
      <section className="v3-profile-card">
        <span className="v3-profile-avatar">
          <Icon name="person" size="large" />
        </span>
        <div>
          <h2>演示观察员</h2>
          <p>Adams 人工观察权限 · 已验证</p>
        </div>
      </section>
      <V3Notice title="当前为 V3 原型">
        页面使用模拟数据，不保存或上传真实学生信息。
      </V3Notice>
      <button
        type="button"
        className="v3-secondary-action"
        onClick={() => {
          flow.resetDemo();
          navigate("/tasks");
        }}
      >
        重置演示流程
      </button>
    </PageFrame>
  );
}
