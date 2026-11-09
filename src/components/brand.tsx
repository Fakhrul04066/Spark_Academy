import Link from "next/link";
export function Brand() {
  return (
    <Link href="/" className="brand">
      <img src="/spark-mark.svg" width="40" height="40" alt="" />
      <span className="brand-name">
        Spark <span className="brand-accent">Academy</span>
        <small>LEARN • GROW • SHINE</small>
      </span>
    </Link>
  );
}
