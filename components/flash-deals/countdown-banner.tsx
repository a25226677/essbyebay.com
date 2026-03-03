"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";

function useCountdown(targetDate: string) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const tick = () => {
      const target = targetDate ? new Date(targetDate).getTime() : NaN;
      if (!Number.isFinite(target)) {
        setTimeLeft("No timer");
        return;
      }

      const diff = target - Date.now();
      if (diff <= 0) {
        setTimeLeft("Expired");
        return;
      }

      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${d}d ${h}h ${m}m ${s}s`);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return timeLeft;
}

export function CountdownBanner({ endTime }: { endTime: string }) {
  const timeLeft = useCountdown(endTime);

  return (
    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-8 flex items-center justify-center gap-3">
      <Zap size={20} className="text-destructive" />
      <span className="text-sm font-medium">Hurry Up! Deals end in:</span>
      <span className="font-bold text-destructive text-lg font-mono">
        {timeLeft}
      </span>
    </div>
  );
}
