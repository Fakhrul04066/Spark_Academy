import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  ChartNoAxesCombined,
  ClipboardCheck,
  Headphones,
  CalendarClock,
  CalendarDays,
  ShieldCheck,
  GraduationCap,
  Files,
  Check,
  ArrowRight,
} from "lucide-react";
const features = [
  [
    "YouTube learning",
    "Chapter-by-chapter lessons from your assigned teachers.",
    BookOpen,
  ],
  [
    "Chapter-wise exams",
    "Focused practice, timed tests and clear result summaries.",
    ClipboardCheck,
  ],
  [
    "Results & ranking",
    "Understand your performance and your next learning goal.",
    ChartNoAxesCombined,
  ],
  [
    "Smart revision",
    "A schedule that adapts to how well you understand a topic.",
    CalendarClock,
    CalendarDays,
  ],
  [
    "Anonymous voice Q&A",
    "Ask with text or recorded audio. Learn at your own pace.",
    Headphones,
  ],
  [
    "Study resources",
    "Your notes, slides and learning links, organized.",
    Files,
  ],
  [
    "Academic progress",
    "See completed lessons, chapter progress and topics that need more practice.",
    ChartNoAxesCombined,
  ],
  [
    "Attendance",
    "Keep track of your class attendance and saved daily records.",
    CalendarDays,
  ],
] as const;
export default function Home() {
  return (
    <>
      <header className="bg-white border-b border-slate-100">
        <div className="wrap public-nav">
          <Link href="/" className="brand">
            <img src="/spark-mark.svg" alt="" />
            Spark Academy
          </Link>
          <nav className="public-links">
            <a href="#features">Features</a>
            <a href="#courses">Courses</a>
            <a href="#about">About us</a>
            <a href="#contact">Contact</a>
          </nav>
          <Link className="btn" href="/login">
            Log in <ArrowUpRight size={15} />
          </Link>
        </div>
      </header>
      <main>
        <section className="hero">
          <div className="wrap hero-grid">
            <div>
              <span className="pill">
                <span>●</span> A LITTLE SPARK. A BRIGHTER FUTURE.
              </span>
              <h1>
                Your learning journey,
                <br />
                <em>smarter and better.</em>
              </h1>
              <p>
                Learn with structured lessons, practice with chapter-wise exams,
                track your progress, and improve through smart revision.
              </p>
              <div className="flex">
                <Link href="/login" className="btn">
                  Start learning <ArrowRight size={16} />
                </Link>
                <a href="#features" className="btn secondary">
                  Explore features
                </a>
              </div>
              <div className="flex footnote">
                <span>✓ Structured learning</span>
                <span>✓ Meaningful progress</span>
                <span>✓ Private by design</span>
              </div>
            </div>
            <div
              className="hero-visual"
              aria-label="Illustrative progress dashboard, not live student data"
            >
              <div className="row">
                <div>
                  <span className="eyebrow">YOUR LEARNING, CONNECTED</span>
                  <h3 className="mt-2">Small steps. Real progress.</h3>
                </div>
                <span className="feature-icon">
                  <GraduationCap size={24} />
                </span>
              </div>
              <div className="mini-chart">
                {[35, 55, 45, 70, 65, 88, 100].map((n, i) => (
                  <span key={i} style={{ height: `${n}%` }} />
                ))}
              </div>
              <p className="footnote mt-2">Illustrative learning journey</p>
              <div className="grid two mt-5">
                <div className="card">
                  <BookOpen size={20} color="#059669" />
                  <h4 className="mt-2">Learn with clarity</h4>
                  <p className="footnote">One chapter at a time</p>
                </div>
                <div className="card">
                  <CalendarClock size={20} color="#059669" />
                  <h4 className="mt-2">Revise with purpose</h4>
                  <p className="footnote">Build lasting understanding</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="section" id="features">
          <div className="wrap">
            <div className="section-heading">
              <span className="eyebrow">BUILT AROUND THE WAY YOU LEARN</span>
              <h2>
                Everything you need.
                <br />
                One place to grow.
              </h2>
              <p>
                From your first lesson to your next breakthrough, keep your
                learning organized and moving forward.
              </p>
            </div>
            <div className="grid four">
              {features.map(([title, text, Icon]) => (
                <article className="card feature" key={title}>
                  <span className="feature-icon">
                    <Icon size={23} />
                  </span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="section bg-white" id="courses">
          <div className="wrap">
            <div className="section-heading">
              <span className="eyebrow">YOUR ACADEMIC COMPANION</span>
              <h2>
                A stronger foundation.
                <br />A clearer path ahead.
              </h2>
              <p>
                Academic programs for school and HSC learners. Contact your
                coaching administrator for available batches and admission
                details.
              </p>
            </div>
            <div className="grid three">
              {["Physics & Chemistry", "Mathematics", "Biology"].map(
                (name, i) => (
                  <div className="card" key={name}>
                    <span className="eyebrow">
                      0{i + 1} / ACADEMIC LEARNING
                    </span>
                    <h3 className="mt-4 mb-3">{name}</h3>
                    <p>
                      Structured chapters, teacher-curated lessons, practice
                      exams and regular revision.
                    </p>
                    <Link href="/login" className="btn secondary mt-6">
                      Access assigned courses <ArrowUpRight size={14} />
                    </Link>
                  </div>
                ),
              )}
            </div>
          </div>
        </section>
        <section className="section" id="about">
          <div className="wrap grid two">
            <div>
              <span className="eyebrow">HOW SPARK WORKS</span>
              <h2 className="mt-3 mb-5">
                Better habits.
                <br />
                Brighter possibilities.
              </h2>
              <p>
                Spark Academy connects learners, teachers and coaching
                administrators with a focused academic workspace.
              </p>
              <div className="flex mt-6">
                <ShieldCheck color="#059669" />
                <span>Role-based access. Private student information.</span>
              </div>
            </div>
            <div className="card stack">
              {[
                "Learn with teacher-curated lessons",
                "Practice and take a chapter exam",
                "Analyze your results and progress",
                "Revise, reflect and improve",
              ].map((t, i) => (
                <div className="flex" key={t}>
                  <span className="pill">0{i + 1}</span>
                  <strong>{t}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="wrap">
          <div className="dark-band row">
            <div>
              <span className="eyebrow">READY FOR YOUR NEXT CHAPTER?</span>
              <h2 className="mt-3 mb-3">Let your potential shine.</h2>
              <p>Your courses, progress and revision plan are waiting.</p>
            </div>
            <Link href="/login" className="btn">
              Open your learning space <ArrowRight size={16} />
            </Link>
          </div>
        </section>
        <section className="section">
          <div className="wrap">
            <div className="section-heading">
              <span className="eyebrow">A FEW THINGS TO KNOW</span>
              <h2>Questions? Start here.</h2>
            </div>
            <div className="stack max-w-3xl mx-auto">
              {[
                [
                  "How do I get an account?",
                  "Your coaching administrator creates your account and assigns your batches.",
                ],
                [
                  "Can I watch lessons on YouTube?",
                  "Yes. Teachers add actual YouTube lesson links, grouped by subject and chapter. Completion is marked by you.",
                ],
                [
                  "Is voice Q&A live?",
                  "No. Questions and answers use asynchronous recordings. Profiles are hidden, but a natural voice may reveal identity.",
                ],
                [
                  "How does smart revision work?",
                  "Red topics schedule reviews after 1, 2, 4, 7 and 21 days. Yellow topics after 1, 4 and 7 days. Green topics need no new scheduled reminders.",
                ],
              ].map(([q, a]) => (
                <details className="card" key={q}>
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
        <section className="wrap pb-12" aria-labelledby="sample-perspective">
          <div className="card">
            <span className="eyebrow">ILLUSTRATIVE LEARNER PERSPECTIVE</span>
            <h3 id="sample-perspective" className="mt-3">
              A learning routine to make your own.
            </h3>
            <blockquote className="text-xl my-5">
              “One place for lessons, practice and revision makes planning a
              study week easier.”
            </blockquote>
            <p className="footnote">
              Sample content — not a real learner testimonial. Real feedback
              will be added with permission.
            </p>
          </div>
        </section>
        <section id="contact" className="wrap pb-12">
          <div className="card row">
            <div>
              <h3>Let’s talk about your learning.</h3>
              <p className="mt-2">
                Bangladesh · Ask your coaching administrator for enrollment and
                support.
              </p>
            </div>
            <Link className="btn secondary" href="/login">
              Account access <ArrowUpRight size={15} />
            </Link>
          </div>
        </section>
      </main>
      <footer className="footer">
        <div className="wrap row">
          <Link href="/" className="brand">
            <img src="/spark-mark.svg" alt="" />
            Spark Academy
          </Link>
          <p className="footnote">© Spark Academy. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}
