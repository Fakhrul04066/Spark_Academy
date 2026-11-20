"use client";
import Link from "next/link";
import React, { useEffect, useRef, type CSSProperties } from "react";
import { LightningIcon } from "./LightningIcon";
import "./SparkAcademyLogo.css";

const STRIKE_DURATION_MS = 720;
const STRIKE_MIN_DELAY_MS = 6000;
const STRIKE_JITTER_MS = 5280;

export type SparkAcademyLogoProps = {
  size?: "small" | "medium" | "large";
  animated?: boolean;
  variant?: "navbar" | "loader" | "footer";
  theme?: "auto" | "light" | "dark";
  className?: string;
  style?: CSSProperties;
};

export function SparkAcademyLogo({
  size = "medium",
  animated = true,
  variant = "navbar",
  theme = "auto",
  className = "",
  style,
}: SparkAcademyLogoProps) {
  const root = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let next: ReturnType<typeof setTimeout> | undefined;
    let release: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    const clear = () => {
      clearTimeout(next);
      clearTimeout(release);
      delete node.dataset.striking;
    };
    const schedule = () => {
      if (
        disposed ||
        !animated ||
        variant === "loader" ||
        document.hidden ||
        motion.matches
      )
        return;
      next = setTimeout(
        pulse,
        STRIKE_MIN_DELAY_MS + Math.random() * STRIKE_JITTER_MS,
      );
    };
    const pulse = () => {
      if (
        disposed ||
        !animated ||
        variant === "loader" ||
        document.hidden ||
        motion.matches
      )
        return;
      clear();
      node.dataset.striking = "true";
      release = setTimeout(() => {
        delete node.dataset.striking;
        schedule();
      }, STRIKE_DURATION_MS);
    };
    const hover = (event: PointerEvent) => {
      if (event.pointerType === "mouse") pulse();
    };
    const sync = () => {
      clear();
      node.dataset.paused = String(
        document.hidden || motion.matches || !animated,
      );
      schedule();
    };
    sync();
    node.addEventListener("pointerenter", hover);
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", sync);
    return () => {
      disposed = true;
      clear();
      node.removeEventListener("pointerenter", hover);
      document.removeEventListener("visibilitychange", sync);
      motion.removeEventListener("change", sync);
    };
  }, [animated, variant]);

  const contents = (
    <span
      ref={root}
      className="sa-logo__content"
      data-animated={animated}
      data-variant={variant}
    >
      <span className="sa-logo__icon-frame">
        <LightningIcon />
      </span>
      <span className="sa-logo__wordmark" aria-hidden="true">
        <span className="sa-logo__spark">
          {Array.from("SPARK").map((letter, index) => (
            <span
              className="sa-logo__letter"
              style={{ "--sa-index": index } as CSSProperties}
              key={index}
            >
              {letter}
            </span>
          ))}
        </span>
        <span className="sa-logo__academy">
          {Array.from("ACADEMY").map((letter, index) => (
            <span
              className="sa-logo__letter"
              style={{ "--sa-index": index } as CSSProperties}
              key={index}
            >
              {letter}
            </span>
          ))}
        </span>
      </span>
    </span>
  );
  const classes = `brand sa-logo sa-logo--${size} ${className}`;
  return variant === "loader" ? (
    <div
      className={classes}
      data-theme={theme}
      data-logo-variant={variant}
      role="img"
      aria-label="Spark Academy"
      style={style}
    >
      {contents}
    </div>
  ) : (
    <Link
      className={classes}
      data-theme={theme}
      data-logo-variant={variant}
      href="/"
      aria-label="Spark Academy"
      style={style}
    >
      {contents}
    </Link>
  );
}
