import { useEffect, useRef, useState } from "react";

interface Props {
  fullScreen?: boolean;
  message?: string;
  onFinish?: () => void;
  autoDismissMs?: number;
}

interface Spark {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export function ForgeAnvilLoader({
  fullScreen = false,
  message = "Forging Workspace...",
  onFinish,
  autoDismissMs,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [strikeCycle, setStrikeCycle] = useState(0);

  useEffect(() => {
    if (autoDismissMs && onFinish) {
      const timer = setTimeout(onFinish, autoDismissMs);
      return () => clearTimeout(timer);
    }
  }, [autoDismissMs, onFinish]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let frame = 0;
    const sparks: Spark[] = [];
    let sparkIdCounter = 0;

    const SPARK_COLORS = ["#FF6B00", "#FFAA00", "#FF4500", "#FFE6A3", "#FFFFFF"];

    const spawnSparks = (count: number) => {
      const originX = canvas.width / 2;
      const originY = canvas.height / 2 + 10;
      for (let i = 0; i < count; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.2;
        const speed = 3 + Math.random() * 8;
        sparks.push({
          id: sparkIdCounter++,
          x: originX + (Math.random() - 0.5) * 16,
          y: originY + (Math.random() - 0.5) * 6,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.5,
          color: SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)],
          size: 1.5 + Math.random() * 2.5,
          life: 0,
          maxLife: 20 + Math.random() * 25,
        });
      }
    };

    let hasStruckInCycle = false;

    const render = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cycleLength = 80;
      const cycleProgress = (frame % cycleLength) / cycleLength; // 0 to 1

      // Maces strike timing:
      // 0 - 0.35: swing down rapidly
      // 0.35: collision strike on anvil
      // 0.35 - 0.6: recoil bounce back
      // 0.6 - 1.0: return to raised ready position

      let swingAngle = 0;
      let strikeGlow = 0;

      if (cycleProgress < 0.35) {
        // Accelerating downward swing
        const t = cycleProgress / 0.35;
        swingAngle = (1 - Math.cos(t * Math.PI * 0.5)) * 48;
        hasStruckInCycle = false;
      } else if (cycleProgress < 0.45) {
        // Collision moment & initial recoil
        swingAngle = 48 - (cycleProgress - 0.35) * 120;
        strikeGlow = 1 - (cycleProgress - 0.35) / 0.1;
        if (!hasStruckInCycle) {
          spawnSparks(42);
          hasStruckInCycle = true;
          setStrikeCycle((c) => c + 1);
        }
      } else {
        // Return to ready position
        const t = (cycleProgress - 0.45) / 0.55;
        swingAngle = 36 * (1 - t);
      }

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Draw Anvil (Silhouette with heated forge glow)
      ctx.save();
      ctx.translate(centerX, centerY + 30);

      // Anvil base
      ctx.fillStyle = "#1e2230";
      ctx.beginPath();
      ctx.moveTo(-45, 30);
      ctx.lineTo(45, 30);
      ctx.lineTo(35, 12);
      ctx.lineTo(-35, 12);
      ctx.closePath();
      ctx.fill();

      // Anvil waist / waist column
      ctx.fillStyle = "#151824";
      ctx.beginPath();
      ctx.moveTo(-25, 12);
      ctx.quadraticCurveTo(-12, 0, -28, -12);
      ctx.lineTo(28, -12);
      ctx.quadraticCurveTo(12, 0, 25, 12);
      ctx.closePath();
      ctx.fill();

      // Anvil top / horn / face
      ctx.fillStyle = "#252b3d";
      ctx.beginPath();
      ctx.moveTo(-55, -12); // left horn tip
      ctx.quadraticCurveTo(-35, -15, -28, -22);
      ctx.lineTo(38, -22); // right face
      ctx.lineTo(48, -15);
      ctx.lineTo(28, -12);
      ctx.closePath();
      ctx.fill();

      // Heated Anvil Face Glow
      const glowGrad = ctx.createLinearGradient(-25, -22, 25, -22);
      glowGrad.addColorStop(0, "rgba(255, 107, 0, 0.4)");
      glowGrad.addColorStop(0.5, "rgba(255, 200, 50, 0.9)");
      glowGrad.addColorStop(1, "rgba(255, 107, 0, 0.4)");

      ctx.fillStyle = glowGrad;
      ctx.fillRect(-22, -23, 44, 3);

      // Flash glow on strike
      if (strikeGlow > 0) {
        ctx.shadowColor = "#FF6B00";
        ctx.shadowBlur = 30 * strikeGlow;
        ctx.fillStyle = `rgba(255, 255, 255, ${strikeGlow * 0.8})`;
        ctx.beginPath();
        ctx.arc(0, -22, 12 * strikeGlow, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.restore();

      // Draw Left Mace (Striking from Top Left)
      ctx.save();
      ctx.translate(centerX - 65, centerY - 55);
      ctx.rotate(((swingAngle - 15) * Math.PI) / 180);

      // Shaft
      ctx.fillStyle = "#3f465c";
      ctx.fillRect(-3, 0, 6, 65);

      // Mace Flanged Head
      ctx.fillStyle = "#1b1e2c";
      ctx.beginPath();
      ctx.arc(0, 68, 14, 0, Math.PI * 2);
      ctx.fill();

      // Mace Flanges
      ctx.fillStyle = "#FF6B00";
      ctx.fillRect(-17, 65, 34, 6);
      ctx.fillRect(-5, 53, 10, 30);
      ctx.restore();

      // Draw Right Mace (Striking from Top Right)
      ctx.save();
      ctx.translate(centerX + 65, centerY - 55);
      ctx.rotate(((-swingAngle + 15) * Math.PI) / 180);

      // Shaft
      ctx.fillStyle = "#3f465c";
      ctx.fillRect(-3, 0, 6, 65);

      // Mace Flanged Head
      ctx.fillStyle = "#1b1e2c";
      ctx.beginPath();
      ctx.arc(0, 68, 14, 0, Math.PI * 2);
      ctx.fill();

      // Mace Flanges
      ctx.fillStyle = "#FF6B00";
      ctx.fillRect(-17, 65, 34, 6);
      ctx.fillRect(-5, 53, 10, 30);
      ctx.restore();

      // Update and Draw Sparks
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.22; // gravity
        s.vx *= 0.98; // drag
        s.life++;

        const alpha = Math.max(0, 1 - s.life / s.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = s.color;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * (1 - (s.life / s.maxLife) * 0.5), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (s.life >= s.maxLife) {
          sparks.splice(i, 1);
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div
      className={`flex flex-col items-center justify-center select-none ${
        fullScreen
          ? "fixed inset-0 z-[10020] bg-[#0d0f17]/95 backdrop-blur-xl animate-in fade-in duration-300"
          : "p-6"
      }`}
    >
      <div className="relative flex flex-col items-center">
        {/* Ambient background aura */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#FF6B00]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Canvas Animation */}
        <canvas
          ref={canvasRef}
          width={280}
          height={200}
          className="relative z-10 drop-shadow-[0_10px_25px_rgba(0,0,0,0.5)]"
        />

        {/* Message and status */}
        <div className="mt-4 text-center z-10 space-y-1">
          <div className="flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B00] animate-ping" />
            <h3 className="text-sm font-bold text-white tracking-wide uppercase font-mono">
              {message}
            </h3>
          </div>
          <p className="text-[11px] text-zinc-400 font-mono">
            Strikes: {strikeCycle} | Engine ready
          </p>
        </div>
      </div>
    </div>
  );
}
