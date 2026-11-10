import Link from "next/link";
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Spark Academy home">
      <img src="/spark-mark.svg?v=5" width="42" height="42" alt="" />
      <span className="brand-name">
        <span className="brand-line">SPARK</span>
        <span className="brand-line brand-accent">ACADEMY</span>
      </span>
    </Link>
  );
}
