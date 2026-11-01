"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { movedAddress } from "@/lib/saints/workMoves";

/**
 * An old link to a part that left this work lands where that part is now
 * (1.8, lib/saints/workMoves.ts): /saints/john-cassian/conferences#s503 opens
 * the same chapter of St John Cassian's On the Incarnation of the Lord. On
 * the page of a work that a part has left, as it opens and as its address
 * changes; the text is not waited for, so the move is immediate.
 */
export function MovedPlace() {
  const router = useRouter();
  useEffect(() => {
    function land() {
      const to = movedAddress(window.location.pathname, window.location.hash);
      if (to) router.replace(to);
    }
    land();
    window.addEventListener("hashchange", land);
    return () => window.removeEventListener("hashchange", land);
  }, [router]);
  return null;
}
