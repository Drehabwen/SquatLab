import { useEffect, useState } from "react";
import { env } from "../../config/env";
import { Icon } from "../Icon";
import "./VersionUpdateChecker.css";

interface VersionInfo {
  latest_version: string;
  apk_url: string;
  update_log: string;
  force_update: boolean;
}

const CURRENT_VERSION = "1.0.0"; // The current client app version

function isOutdated(current: string, latest: string): boolean {
  const cParts = current.split(".").map(Number);
  const lParts = latest.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (lParts[i] > cParts[i]) return true;
    if (lParts[i] < cParts[i]) return false;
  }
  return false;
}

export function VersionUpdateChecker() {
  const [updateInfo, setUpdateInfo] = useState<VersionInfo | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const response = await fetch(`${env.apiBaseUrl}/api/version`);
        if (!response.ok) return;
        const data = (await response.json()) as VersionInfo;
        if (isOutdated(CURRENT_VERSION, data.latest_version)) {
          setUpdateInfo(data);
          setShowModal(true);
        }
      } catch (error) {
        console.warn("Failed to check for updates:", error);
      }
    };

    // Delay checking slightly to ensure UI is fully loaded and transitioned
    const timer = setTimeout(() => {
      checkVersion();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (!showModal || !updateInfo) return null;

  const handleUpdate = () => {
    setIsDownloading(true);
    // Open in system browser to trigger standard APK download
    window.open(updateInfo.apk_url, "_system");
    
    // Automatically close the dialog after starting download unless it is a forced update
    if (!updateInfo.force_update) {
      setTimeout(() => {
        setIsDownloading(false);
        setShowModal(false);
      }, 3500);
    }
  };

  const handleIgnore = () => {
    if (!updateInfo.force_update) {
      setShowModal(false);
    }
  };

  return (
    <div className="update-modal-overlay">
      <div className="update-modal-card">
        <div className="update-modal-glow"></div>
        <div className="update-modal-header">
          <div className="update-icon-wrapper">
            <Icon name="system_update" size="large" className="update-icon-pulse" />
          </div>
          <h2>发现新版本</h2>
          <div className="version-badge">
            <span className="current-ver">v{CURRENT_VERSION}</span>
            <span className="arrow-right">→</span>
            <span className="latest-ver">v{updateInfo.latest_version}</span>
          </div>
        </div>
        
        <div className="update-modal-body">
          <h3>更新日志：</h3>
          <div className="update-log-content">
            {updateInfo.update_log.split("\n").map((line, idx) => (
              <p key={idx}>{line}</p>
            ))}
          </div>
        </div>

        <div className="update-modal-footer">
          {!updateInfo.force_update && (
            <button 
              type="button" 
              className="btn-update-ignore" 
              onClick={handleIgnore}
              disabled={isDownloading}
            >
              以后再说
            </button>
          )}
          <button 
            type="button" 
            className="btn-update-now" 
            onClick={handleUpdate}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <>
                <span className="spinner"></span>
                正在获取新版本...
              </>
            ) : (
              "立即更新"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
