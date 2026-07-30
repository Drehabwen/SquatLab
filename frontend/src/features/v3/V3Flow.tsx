import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ObservationGrade = "none" | "mild" | "obvious";
type SuspectedSide = "left" | "uncertain" | "right";

interface AdamsRecord {
  thoracic: ObservationGrade;
  lumbar: ObservationGrade;
  side: SuspectedSide;
  atr: string;
}

interface V3FlowState {
  gaitComplete: boolean;
  staticComplete: boolean;
  adamsComplete: boolean;
  reportGenerated: boolean;
  adamsRecord: AdamsRecord;
  completeGait: () => void;
  submitAdams: (record: AdamsRecord) => void;
  generateReport: () => void;
  resetDemo: () => void;
}

const initialAdamsRecord: AdamsRecord = {
  thoracic: "none",
  lumbar: "mild",
  side: "right",
  atr: "",
};

const V3FlowContext = createContext<V3FlowState | null>(null);

export function V3FlowProvider({ children }: { children: ReactNode }) {
  const [gaitComplete, setGaitComplete] = useState(false);
  const [adamsComplete, setAdamsComplete] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [adamsRecord, setAdamsRecord] =
    useState<AdamsRecord>(initialAdamsRecord);

  const value = useMemo<V3FlowState>(
    () => ({
      gaitComplete,
      staticComplete: true,
      adamsComplete,
      reportGenerated,
      adamsRecord,
      completeGait: () => setGaitComplete(true),
      submitAdams: (record) => {
        setAdamsRecord(record);
        setAdamsComplete(true);
        setReportGenerated(false);
      },
      generateReport: () => setReportGenerated(true),
      resetDemo: () => {
        setGaitComplete(false);
        setAdamsComplete(false);
        setReportGenerated(false);
        setAdamsRecord(initialAdamsRecord);
      },
    }),
    [adamsComplete, adamsRecord, gaitComplete, reportGenerated],
  );

  return (
    <V3FlowContext.Provider value={value}>{children}</V3FlowContext.Provider>
  );
}

export function useV3Flow() {
  const context = useContext(V3FlowContext);
  if (!context) {
    throw new Error("useV3Flow must be used inside V3FlowProvider");
  }
  return context;
}

export type { AdamsRecord, ObservationGrade, SuspectedSide };
