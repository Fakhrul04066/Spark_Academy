"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="wrap section">
      <div className="card">
        <h2>Something interrupted your learning space.</h2>
        <p className="my-4">
          Check the database connection and try again. Your saved work is
          preserved.
        </p>
        <button className="btn" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}
