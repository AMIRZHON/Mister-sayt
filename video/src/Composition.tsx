import { AbsoluteFill, Easing, Sequence, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

const NAVY = "#142036";
const AMBER = "#f3a712";
const INK = "#eef1f6";
const MUTED = "#a7b1c3";
const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";

const ease = Easing.bezier(0.16, 1, 0.3, 1);

const Pop: React.FC<{ delay?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  delay = 0,
  children,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease } as const;
  return (
    <div
      style={{
        opacity: interpolate(frame, [delay, delay + 0.5 * fps], [0, 1], t),
        translate: interpolate(frame, [delay, delay + 0.6 * fps], ["0px 70px", "0px 0px"], t),
        ...style,
      }}
    >
      {children}
    </div>
  );
};

const Scene: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(circle at 50% 20%, #1d2c48, ${NAVY} 70%)`,
      fontFamily: FONT,
      color: INK,
      padding: "0 80px",
      justifyContent: "center",
      alignItems: "center",
      textAlign: "center",
    }}
  >
    {children}
  </AbsoluteFill>
);

const Hook: React.FC = () => (
  <Scene>
    <Pop style={{ fontSize: 56, color: AMBER, fontWeight: 800, letterSpacing: 6 }}>MISTER</Pop>
    <Pop delay={10} style={{ fontSize: 112, fontWeight: 900, lineHeight: 1.1, marginTop: 40 }}>
      Кешке тапсырыс —
    </Pop>
    <Pop delay={20} style={{ fontSize: 112, fontWeight: 900, lineHeight: 1.1, color: AMBER }}>
      таңертең кафеңізде
    </Pop>
    <Pop delay={36} style={{ fontSize: 44, color: MUTED, marginTop: 50 }}>
      Алматыдағы кафелерге тауар жеткізу
    </Pop>
  </Scene>
);

const steps = ["Тапсырыс", "Жинау және тексеру", "Жеткізу", "Қабылдау және төлем"];

const Steps: React.FC = () => (
  <Scene>
    <Pop style={{ fontSize: 70, fontWeight: 900, marginBottom: 60 }}>Төрт қадам</Pop>
    {steps.map((s, i) => (
      <Pop
        key={s}
        delay={12 + i * 14}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 36,
          width: "100%",
          background: "#1d2c48",
          border: "2px solid #2b3a57",
          borderRadius: 32,
          padding: "36px 44px",
          marginBottom: 28,
          fontSize: 52,
          fontWeight: 700,
          textAlign: "left",
        }}
      >
        <span
          style={{
            background: AMBER,
            color: "#1a1204",
            width: 84,
            height: 84,
            borderRadius: 42,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 48,
            fontWeight: 900,
            flexShrink: 0,
          }}
        >
          {i + 1}
        </span>
        {s}
      </Pop>
    ))}
  </Scene>
);

const Cta: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = interpolate(Math.sin(frame / 6), [-1, 1], [1, 1.05]);
  return (
    <Scene>
      <Pop style={{ fontSize: 84, fontWeight: 900, lineHeight: 1.15 }}>
        Өтінім қалдырыңыз —
      </Pop>
      <Pop delay={8} style={{ fontSize: 84, fontWeight: 900, color: AMBER, lineHeight: 1.15 }}>
        15 минутта хабарласамыз
      </Pop>
      <Pop
        delay={22}
        style={{
          marginTop: 80,
          background: AMBER,
          color: "#1a1204",
          fontSize: 70,
          fontWeight: 900,
          padding: "36px 70px",
          borderRadius: 100,
          scale: pulse,
        }}
      >
        +7 777 228 73 77
      </Pop>
    </Scene>
  );
};

export const MyComposition: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <Sequence name="Hook" from={0} durationInFrames={4 * fps}>
        <Hook />
      </Sequence>
      <Sequence name="Steps" from={4 * fps} durationInFrames={5 * fps}>
        <Steps />
      </Sequence>
      <Sequence name="CTA" from={9 * fps} durationInFrames={4 * fps}>
        <Cta />
      </Sequence>
    </AbsoluteFill>
  );
};
