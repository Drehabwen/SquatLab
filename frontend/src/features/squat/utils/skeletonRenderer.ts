import type { CameraKeypoint } from "../../../shared/types/api";

interface VideoRenderBox {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

// 骨架连接定义
const POSE_CONNECTIONS: Array<[string, string]> = [
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],
  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],
  ["left_hip", "right_hip"],
  ["left_hip", "left_knee"],
  ["right_hip", "right_knee"],
  ["left_knee", "left_ankle"],
  ["right_knee", "right_ankle"],
  ["left_ankle", "left_heel"],
  ["right_ankle", "right_heel"],
  ["left_heel", "left_foot_index"],
  ["right_heel", "right_foot_index"],
];

// 关键点分组 - 用于不同颜色标识
const KEYPOINT_GROUPS = {
  head: ["nose", "left_eye", "right_eye", "left_ear", "right_ear"],
  torso: ["left_shoulder", "right_shoulder", "left_hip", "right_hip"],
  leftArm: ["left_elbow", "left_wrist", "left_pinky", "left_index", "left_thumb"],
  rightArm: ["right_elbow", "right_wrist", "right_pinky", "right_index", "right_thumb"],
  leftLeg: ["left_knee", "left_ankle", "left_heel", "left_foot_index"],
  rightLeg: ["right_knee", "right_ankle", "right_heel", "right_foot_index"],
};

// 颜色配置 - 高对比度醒目配色
const COLORS = {
  primary: "#00FF41",      // 荧光绿 - 主骨架
  head: "#FFFF00",         // 黄色 - 头部
  left: "#FF3366",         // 粉红 - 左侧肢体
  right: "#33CCFF",        // 青色 - 右侧肢体
  joint: "#FFFFFF",        // 白色 - 关节点
  jointHighlight: "#00FF41", // 荧光绿 - 高亮关节
};

/**
 * 多帧融合平滑算法
 * 使用指数移动平均 (EMA) 对关键点进行平滑
 */
export class LandmarkSmoother {
  private history: CameraKeypoint[][] = [];
  private readonly maxHistory: number;
  private readonly alpha: number;

  constructor(maxHistory: number = 5, alpha: number = 0.6) {
    this.maxHistory = maxHistory;
    this.alpha = alpha;
  }

  smooth(keypoints: CameraKeypoint[]): CameraKeypoint[] {
    this.history.push([...keypoints]);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    if (this.history.length < 2) {
      return keypoints;
    }

    return keypoints.map((keypoint, index) => {
      let smoothedX = keypoint.x;
      let smoothedY = keypoint.y;
      let smoothedVisibility = keypoint.visibility;

      for (let i = this.history.length - 2; i >= 0; i--) {
        const historical = this.history[i][index];
        const weight = this.alpha * Math.pow(1 - this.alpha, this.history.length - 1 - i);

        smoothedX = smoothedX * (1 - weight) + historical.x * weight;
        smoothedY = smoothedY * (1 - weight) + historical.y * weight;
        smoothedVisibility = smoothedVisibility * (1 - weight) + historical.visibility * weight;
      }

      return {
        ...keypoint,
        x: smoothedX,
        y: smoothedY,
        visibility: smoothedVisibility,
      };
    });
  }

  reset() {
    this.history = [];
  }
}

function projectKeypointToOverlay(
  keypoint: CameraKeypoint,
  videoRenderBox: VideoRenderBox,
): { x: number; y: number } {
  return {
    x: videoRenderBox.offsetX + keypoint.x * videoRenderBox.width,
    y: videoRenderBox.offsetY + keypoint.y * videoRenderBox.height,
  };
}

function getConnectionColor(startName: string, endName: string): string {
  if (KEYPOINT_GROUPS.leftArm.includes(startName) || KEYPOINT_GROUPS.leftArm.includes(endName) ||
      KEYPOINT_GROUPS.leftLeg.includes(startName) || KEYPOINT_GROUPS.leftLeg.includes(endName)) {
    return COLORS.left;
  }
  if (KEYPOINT_GROUPS.rightArm.includes(startName) || KEYPOINT_GROUPS.rightArm.includes(endName) ||
      KEYPOINT_GROUPS.rightLeg.includes(startName) || KEYPOINT_GROUPS.rightLeg.includes(endName)) {
    return COLORS.right;
  }
  if (KEYPOINT_GROUPS.head.includes(startName) || KEYPOINT_GROUPS.head.includes(endName)) {
    return COLORS.head;
  }
  return COLORS.primary;
}

function getKeypointColor(name: string): { color: string; highlight: string } {
  if (KEYPOINT_GROUPS.head.includes(name)) {
    return { color: COLORS.head, highlight: COLORS.head };
  }
  if (KEYPOINT_GROUPS.leftArm.includes(name) || KEYPOINT_GROUPS.leftLeg.includes(name)) {
    return { color: COLORS.left, highlight: COLORS.left };
  }
  if (KEYPOINT_GROUPS.rightArm.includes(name) || KEYPOINT_GROUPS.rightLeg.includes(name)) {
    return { color: COLORS.right, highlight: COLORS.right };
  }
  return { color: COLORS.joint, highlight: COLORS.jointHighlight };
}

/**
 * 绘制醒目的骨架
 */
export function drawVividSkeleton(
  ctx: CanvasRenderingContext2D,
  keypoints: CameraKeypoint[],
  videoRenderBox: VideoRenderBox,
  canvasWidth: number,
  minVisibility: number = 0.35,
) {
  const visibleKeypoints = new Map(
    keypoints
      .filter((keypoint) => keypoint.visibility > minVisibility)
      .map((keypoint) => [keypoint.name, keypoint] as const),
  );

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // 绘制连接线
  for (const [startName, endName] of POSE_CONNECTIONS) {
    const start = visibleKeypoints.get(startName);
    const end = visibleKeypoints.get(endName);
    if (!start || !end) continue;

    const startPoint = projectKeypointToOverlay(start, videoRenderBox);
    const endPoint = projectKeypointToOverlay(end, videoRenderBox);
    const color = getConnectionColor(startName, endName);
    const lineWidth = Math.max(4, canvasWidth / 180);

    // 发光效果
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.moveTo(startPoint.x, startPoint.y);
    ctx.lineTo(endPoint.x, endPoint.y);
    ctx.stroke();

    ctx.shadowBlur = 0;
  }

  // 绘制关节点
  const dotRadius = Math.max(3, canvasWidth / 220);
  for (const keypoint of visibleKeypoints.values()) {
    const point = projectKeypointToOverlay(keypoint, videoRenderBox);
    const { color, highlight } = getKeypointColor(keypoint.name);

    // 外圈发光
    ctx.shadowColor = highlight;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.fillStyle = highlight;
    ctx.arc(point.x, point.y, dotRadius + 2, 0, Math.PI * 2);
    ctx.fill();

    // 内圈实心
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(point.x, point.y, dotRadius, 0, Math.PI * 2);
    ctx.fill();

    // 中心白点
    ctx.beginPath();
    ctx.fillStyle = "#FFFFFF";
    ctx.arc(point.x, point.y, dotRadius * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * 绘制姿态评估辅助线
 */
export function drawAssessmentGuides(
  ctx: CanvasRenderingContext2D,
  keypoints: CameraKeypoint[],
  videoRenderBox: VideoRenderBox,
  canvasHeight: number,
  minVisibility: number = 0.35,
) {
  const visibleKeypoints = new Map(
    keypoints
      .filter((keypoint) => keypoint.visibility > minVisibility)
      .map((keypoint) => [keypoint.name, keypoint] as const),
  );

  const getPoint = (name: string) => {
    const kp = visibleKeypoints.get(name);
    if (!kp) return null;
    return projectKeypointToOverlay(kp, videoRenderBox);
  };

  ctx.save();
  ctx.setLineDash([8, 8]);
  ctx.lineWidth = 2;

  // 中心线（通过鼻子）
  const nose = getPoint("nose");
  if (nose) {
    ctx.strokeStyle = "rgba(255, 255, 0, 0.6)";
    ctx.beginPath();
    ctx.moveTo(nose.x, 0);
    ctx.lineTo(nose.x, canvasHeight);
    ctx.stroke();
  }

  // 肩线
  const leftShoulder = getPoint("left_shoulder");
  const rightShoulder = getPoint("right_shoulder");
  if (leftShoulder && rightShoulder) {
    ctx.strokeStyle = "rgba(0, 255, 65, 0.7)";
    ctx.beginPath();
    ctx.moveTo(leftShoulder.x, leftShoulder.y);
    ctx.lineTo(rightShoulder.x, rightShoulder.y);
    ctx.stroke();
  }

  // 髋线
  const leftHip = getPoint("left_hip");
  const rightHip = getPoint("right_hip");
  if (leftHip && rightHip) {
    ctx.strokeStyle = "rgba(0, 255, 65, 0.7)";
    ctx.beginPath();
    ctx.moveTo(leftHip.x, leftHip.y);
    ctx.lineTo(rightHip.x, rightHip.y);
    ctx.stroke();
  }

  ctx.restore();
}
