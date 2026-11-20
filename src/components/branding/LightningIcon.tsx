"use client";
import React, { useId } from "react";

export function LightningIcon() {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      className="sa-logo__icon"
      viewBox="0 0 80 80"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          id={`${id}-sky`}
          x1="5"
          y1="3"
          x2="75"
          y2="80"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#1C255B" />
          <stop offset="1" stopColor="#10153F" />
        </linearGradient>
        <linearGradient
          id={`${id}-bolt`}
          x1="45"
          y1="15"
          x2="31"
          y2="61"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#EAFBFF" />
          <stop offset=".4" stopColor="#34D8FF" />
          <stop offset="1" stopColor="#008CFF" />
        </linearGradient>
        <linearGradient
          id={`${id}-book`}
          x1="22"
          y1="56"
          x2="59"
          y2="70"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#B6C8FF" />
          <stop offset=".5" stopColor="#F4FBFF" />
          <stop offset="1" stopColor="#718EF0" />
        </linearGradient>
        <linearGradient id={`${id}-sheen`}>
          <stop stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset=".5" stopColor="#FFFFFF" stopOpacity=".22" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <rect x="2" y="2" width="76" height="76" rx="21" />
        </clipPath>
      </defs>
      <rect
        x="1"
        y="1"
        width="78"
        height="78"
        rx="22"
        fill={`url(#${id}-sky)`}
      />
      <rect
        x="1.5"
        y="1.5"
        width="77"
        height="77"
        rx="21.5"
        stroke="#6981DB"
        strokeOpacity=".45"
      />
      <g clipPath={`url(#${id}-clip)`}>
        <ellipse
          className="sa-icon__aura"
          cx="40"
          cy="39"
          rx="26"
          ry="23"
          fill="#4867E8"
          opacity=".15"
        />
        <g className="sa-icon__cloud sa-icon__cloud--back" fill="#29215D">
          <path d="M5 31c-3-8 5-15 12-12 2-11 19-13 25-4 9-3 17 4 16 12 9 0 12 9 6 13H14C7 40 3 36 5 31Z" />
        </g>
        <g
          className="sa-icon__cloud sa-icon__cloud--front"
          fill="#3D357D"
          opacity=".65"
        >
          <path d="M27 28c-2-7 5-12 11-9 3-8 15-8 19 0 8-2 14 3 13 10 8 1 10 9 4 13H35c-8 0-12-8-8-14Z" />
        </g>
        <path
          className="sa-icon__electric sa-icon__electric--left"
          d="m17 28 8 6-7 7 8 5-7 7"
          stroke="#74EDFF"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          className="sa-icon__electric sa-icon__electric--right"
          d="m61 25-7 9 8 3-7 9 7 5"
          stroke="#A993FF"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <g className="sa-icon__bolt">
          <path
            d="m46 13-23 29h15l-5 19 25-32H43l3-16Z"
            fill={`url(#${id}-bolt)`}
          />
          <path
            d="m44 19-15 20h12l-3 12 14-19H40l4-13Z"
            fill="#EAFBFF"
            opacity=".6"
          />
        </g>
        <g className="sa-icon__particles" fill="#9DEEFF">
          <circle
            className="sa-particle sa-particle--one"
            cx="17"
            cy="20"
            r="1.3"
          />
          <circle
            className="sa-particle sa-particle--two"
            cx="65"
            cy="17"
            r="1.1"
          />
          <circle
            className="sa-particle sa-particle--three"
            cx="62"
            cy="58"
            r="1.2"
          />
          <circle
            className="sa-particle sa-particle--four"
            cx="13"
            cy="49"
            r=".9"
          />
        </g>
        <g className="sa-icon__book">
          <path
            d="M18 57c8-2 15 0 22 5 7-5 14-7 22-5v12c-8-2-15 0-22 5-7-5-14-7-22-5V57Z"
            fill={`url(#${id}-book)`}
          />
          <path
            d="M40 63v9M23 61c4 0 8 1 12 3M45 64c4-2 8-3 12-3"
            stroke="#263E88"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </g>
        <rect
          className="sa-icon__sheen"
          x="-35"
          y="-15"
          width="25"
          height="110"
          transform="rotate(20 40 40)"
          fill={`url(#${id}-sheen)`}
        />
      </g>
    </svg>
  );
}
