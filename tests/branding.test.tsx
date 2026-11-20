import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SparkAcademyLogo } from "../src/components/branding/SparkAcademyLogo";
describe("Spark Academy brand variants", () => {
  it("renders the full accessible name and independent vector/text elements", () => {
    const html = renderToStaticMarkup(<SparkAcademyLogo />);
    expect(html).toContain('aria-label="Spark Academy"');
    expect(html).toContain('href="/"');
    expect(html).toContain("sa-icon__cloud");
    expect(html).toContain("sa-icon__bolt");
    expect(html).toContain("sa-icon__book");
    expect((html.match(/sa-logo__letter/g) || []).length).toBe(12);
  });
  it("renders a static large loading variant without a navigation link", () => {
    const html = renderToStaticMarkup(
      <SparkAcademyLogo size="large" variant="loader" animated={false} />,
    );
    expect(html).toContain("sa-logo--large");
    expect(html).toContain('data-animated="false"');
    expect(html).toContain('role="img"');
    expect(html).not.toContain("href=");
  });
  it("supports a small dark footer with unique SVG definition references", () => {
    const html = renderToStaticMarkup(
      <>
        <SparkAcademyLogo size="small" variant="footer" theme="dark" />
        <SparkAcademyLogo />
      </>,
    );
    expect(html).toContain("sa-logo--small");
    expect(html).toContain('data-theme="dark"');
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
