"use client";
import { useEffect } from "react";
import { mountReferenceLanding } from "./reference-interactions";

export function LandingInteractions() {
  useEffect(() => {
    const root = document.getElementById("spark-landing-root");
    return root instanceof HTMLDivElement ? mountReferenceLanding(root) : undefined;
  }, []);
  return null;
}
