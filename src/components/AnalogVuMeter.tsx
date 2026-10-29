import React, { useRef, useEffect, useState } from 'react';

interface AnalogVuMeterProps {
  label: string; // 'INPUT' or 'OUTPUT'
  subLabel?: string;
  rmsDb: number; // e.g. -60 to +6 dBFS
  peakDb: number; // e.g. -60 to +6 dBFS
  isPlaying: boolean;
  backlightColor?: 'warm' | 'amber';
}

/**
 * Maps RMS level in dBFS to needle rotation angle in degrees.
 * 0 VU corresponds to approximately -14 dBFS standard digital reference.
 * Angle span: -44 deg (rest / <= -20 VU) to +36 deg (+3 VU redline)
 */
function dbToNeedleAngle(dbFs: number): number {
  if (dbFs <= -48) return -44;

  // Convert dBFS to VU scale where 0 VU = -14 dBFS
  const vuDb = dbFs + 14;

  if (vuDb <= -20) return -44;
  if (vuDb >= 3.5) return 38;

  // Authentic non-linear d'Arsonval movement spacing
  if (vuDb < -10) {
    // -20 to -10 VU maps to -44 to -26 deg
    const t = (vuDb - (-20)) / 10;
    return -44 + t * 18;
  } else if (vuDb < -5) {
    // -10 to -5 VU maps to -26 to -12 deg
    const t = (vuDb - (-10)) / 5;
    return -26 + t * 14;
  } else if (vuDb < 0) {
    // -5 to 0 VU maps to -12 to +10 deg
    const t = (vuDb - (-5)) / 5;
    return -12 + t * 22;
  } else {
    // 0 to +3 VU maps to +10 to +35 deg
    const t = Math.min(1, vuDb / 3);
    return 10 + t * 25;
  }
}

export const AnalogVuMeter: React.FC<AnalogVuMeterProps> = ({
  label,
  subLabel = 'RMS dB VU',
  rmsDb,
  peakDb,
  isPlaying,
  backlightColor = 'warm',
}) => {
  const [needleAngle, setNeedleAngle] = useState(-44);
  const [isPeaking, setIsPeaking] = useState(false);

  // Ballistic spring & inertia physics state
  const currentAngleRef = useRef(-44);
  const targetAngleRef = useRef(-44);
  const velocityRef = useRef(0);
  const peakHoldTimerRef = useRef<number | null>(null);

  // Update target angle based on input dB
  useEffect(() => {
    if (!isPlaying) {
      targetAngleRef.current = -44;
    } else {
      targetAngleRef.current = dbToNeedleAngle(rmsDb);
    }

    // Peak LED check (if peak exceeds -0.5 dBFS)
    if (peakDb >= -0.8 && isPlaying) {
      setIsPeaking(true);
      if (peakHoldTimerRef.current !== null) {
        window.clearTimeout(peakHoldTimerRef.current);
      }
      peakHoldTimerRef.current = window.setTimeout(() => {
        setIsPeaking(false);
      }, 350);
    }
  }, [rmsDb, peakDb, isPlaying]);

  // Animation frame loop for analog ballistic needle spring physics
  useEffect(() => {
    let animId: number;

    const updatePhysics = () => {
      const target = targetAngleRef.current;
      const current = currentAngleRef.current;

      // Realistic d'Arsonval meter ballistics:
      // High attack speed with subtle overshoot, smooth damping return
      const isRising = target > current;
      const stiffness = isRising ? 0.28 : 0.14;
      const damping = isRising ? 0.72 : 0.82;

      const force = (target - current) * stiffness;
      velocityRef.current = (velocityRef.current + force) * damping;
      currentAngleRef.current += velocityRef.current;

      // Clamp mechanical stops (-45 to +40 deg)
      if (currentAngleRef.current < -45) {
        currentAngleRef.current = -45;
        velocityRef.current = 0;
      } else if (currentAngleRef.current > 40) {
        currentAngleRef.current = 40;
        velocityRef.current = 0;
      }

      setNeedleAngle(currentAngleRef.current);
      animId = requestAnimationFrame(updatePhysics);
    };

    animId = requestAnimationFrame(updatePhysics);
    return () => {
      cancelAnimationFrame(animId);
      if (peakHoldTimerRef.current !== null) {
        window.clearTimeout(peakHoldTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="relative w-44 sm:w-52 h-28 bg-[#121722] rounded-lg border-2 border-[#2b3547] p-1.5 shadow-lg shadow-black/60 flex flex-col items-center justify-between overflow-hidden select-none">
      {/* Outer Meter Bezel & Screws */}
      <div className="absolute top-1 left-1.5 text-[8px] font-mono text-slate-500 font-bold select-none">+</div>
      <div className="absolute top-1 right-1.5 text-[8px] font-mono text-slate-500 font-bold select-none">+</div>

      {/* Peak Clip LED */}
      <div className="absolute top-2 right-4 flex items-center gap-1 z-20">
        <span className="text-[7px] font-mono text-slate-400 font-bold">PEAK</span>
        <div
          className={`w-2 h-2 rounded-full border transition-all duration-75 ${
            isPeaking
              ? 'bg-red-500 border-red-300 shadow-[0_0_8px_#ef4444]'
              : 'bg-red-950/80 border-red-900/40'
          }`}
        />
      </div>

      {/* Meter Glass & Back-Lit Faceplate */}
      <div
        className="relative w-full h-full rounded bg-gradient-to-b from-[#ffefc2] via-[#fae3a0] to-[#ecd182] border border-[#a89052] overflow-hidden shadow-inner"
        style={{
          boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.35), inset 0 0 16px rgba(255,180,60,0.25)',
        }}
      >
        {/* Soft Backlight glow */}
        <div className="absolute inset-0 bg-radial from-amber-200/40 via-transparent to-black/20 pointer-events-none" />

        {/* SVG Scale Markings */}
        <svg viewBox="0 0 220 120" className="w-full h-full">
          <defs>
            <radialGradient id="lampGlow" cx="50%" cy="90%" r="80%">
              <stop offset="0%" stopColor="#fff5d0" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#fad77b" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#caa44b" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Background lamp glow */}
          <rect x="0" y="0" width="220" height="120" fill="url(#lampGlow)" />

          {/* Arc Lines: Black safe zone (-20 to 0 VU) and Red danger zone (0 to +3 VU) */}
          {/* Black Arc (-44 deg to +10 deg, radius 90 from center (110, 115)) */}
          <path
            d="M 45 60 A 92 92 0 0 1 126 23"
            fill="none"
            stroke="#1c1917"
            strokeWidth="1.8"
          />
          {/* Red Arc (+10 deg to +36 deg) */}
          <path
            d="M 126 23 A 92 92 0 0 1 176 40"
            fill="none"
            stroke="#dc2626"
            strokeWidth="3.2"
          />

          {/* Tick Marks: Black Zone */}
          {/* -20 VU */}
          <line x1="45" y1="60" x2="52" y2="64" stroke="#1c1917" strokeWidth="1.5" />
          <text x="40" y="74" fontSize="8" fontFamily="sans-serif" fontWeight="bold" fill="#1c1917">-20</text>

          {/* -10 VU */}
          <line x1="72" y1="41" x2="77" y2="47" stroke="#1c1917" strokeWidth="1.5" />
          <text x="67" y="38" fontSize="8" fontFamily="sans-serif" fontWeight="bold" fill="#1c1917">-10</text>

          {/* -7 VU */}
          <line x1="87" y1="33" x2="91" y2="39" stroke="#1c1917" strokeWidth="1.2" />
          <text x="85" y="29" fontSize="7" fontFamily="sans-serif" fontWeight="bold" fill="#1c1917">-7</text>

          {/* -5 VU */}
          <line x1="99" y1="28" x2="102" y2="35" stroke="#1c1917" strokeWidth="1.4" />
          <text x="98" y="24" fontSize="7.5" fontFamily="sans-serif" fontWeight="bold" fill="#1c1917">-5</text>

          {/* -3 VU */}
          <line x1="112" y1="24" x2="114" y2="32" stroke="#1c1917" strokeWidth="1.4" />
          <text x="110" y="20" fontSize="7.5" fontFamily="sans-serif" fontWeight="bold" fill="#1c1917">-3</text>

          {/* 0 VU (Boundary) */}
          <line x1="126" y1="23" x2="127" y2="33" stroke="#dc2626" strokeWidth="2.2" />
          <text x="124" y="18" fontSize="9" fontFamily="sans-serif" fontWeight="900" fill="#dc2626">0</text>

          {/* +1 VU */}
          <line x1="142" y1="26" x2="141" y2="34" stroke="#dc2626" strokeWidth="1.5" />
          <text x="141" y="22" fontSize="7.5" fontFamily="sans-serif" fontWeight="bold" fill="#dc2626">+1</text>

          {/* +2 VU */}
          <line x1="158" y1="31" x2="155" y2="39" stroke="#dc2626" strokeWidth="1.5" />
          <text x="159" y="27" fontSize="7.5" fontFamily="sans-serif" fontWeight="bold" fill="#dc2626">+2</text>

          {/* +3 VU */}
          <line x1="176" y1="40" x2="171" y2="47" stroke="#dc2626" strokeWidth="2.0" />
          <text x="178" y="38" fontSize="8.5" fontFamily="sans-serif" fontWeight="bold" fill="#dc2626">+3</text>

          {/* Central Meter Label */}
          <text
            x="110"
            y="70"
            textAnchor="middle"
            fontSize="12"
            fontFamily="'Plus Jakarta Sans', sans-serif"
            fontWeight="900"
            letterSpacing="2"
            fill="#292524"
          >
            VU
          </text>
          <text
            x="110"
            y="82"
            textAnchor="middle"
            fontSize="7"
            fontFamily="monospace"
            fontWeight="bold"
            fill="#57534e"
          >
            {label} · {subLabel}
          </text>

          {/* Moving Needle */}
          <g transform={`rotate(${needleAngle}, 110, 115)`}>
            {/* Needle Line */}
            <line
              x1="110"
              y1="115"
              x2="110"
              y2="15"
              stroke="#1c1917"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            {/* Red tip for visibility */}
            <line
              x1="110"
              y1="15"
              x2="110"
              y2="28"
              stroke="#dc2626"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            {/* Pivot Counterweight Shadow & Bulb */}
            <circle cx="110" cy="115" r="9" fill="#1c1917" />
            <circle cx="110" cy="115" r="4.5" fill="#57534e" />
          </g>
        </svg>

        {/* Vintage Glass Reflection Overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-25"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 45%)',
          }}
        />
      </div>

      {/* Meter Bottom Plate Label */}
      <div className="w-full flex items-center justify-between px-1.5 pt-0.5 text-[9px] font-mono">
        <span className="font-bold text-cyan-400 tracking-wider">{label}</span>
        <span className="text-slate-400 tabular-nums">
          {isPlaying ? (rmsDb > -60 ? `${rmsDb.toFixed(1)} dBFS` : '-inf') : 'STANDBY'}
        </span>
      </div>
    </div>
  );
};
