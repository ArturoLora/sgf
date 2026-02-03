"use client";

import { useEffect, useState } from "react";

export function useShiftCheck() {
  const [hasActiveShift, setHasActiveShift] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkActiveShift();
  }, []);

  const checkActiveShift = async () => {
    try {
      const res = await fetch("/api/shifts/active");
      if (!res.ok) {
        setHasActiveShift(false);
        return;
      }
      const data = await res.json();
      setHasActiveShift(!!data);
    } catch {
      setHasActiveShift(false);
    } finally {
      setLoading(false);
    }
  };

  return { hasActiveShift, loading, recheckShift: checkActiveShift };
}
