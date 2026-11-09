"use client";
import { useEffect, useRef, useState } from "react";
import "./reference-landing.css";
import { Brand } from "./brand";
const programs = [
  ["junior", "6"],
  ["junior", "7 8"],
  ["ssc", "9"],
  ["ssc", "10"],
  ["hsc", "hsc"],
  ["hsc", "hsc"],
];
export function ReferenceLanding() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"),
    [grade, setGrade] = useState(""),
    [menu, setMenu] = useState(false),
    [faq, setFaq] = useState(-1),
    [course, setCourse] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null),
    trigger = useRef<HTMLElement | null>(null);
  const visible = (category: string, grades: string) => {
    const match = grade
      ? grades.split(" ").includes(grade)
      : filter === "all" || category === filter;
    const terms: Record<string, string> = {
      "6": "class 6 sixth ষষ্ঠ ৬ষ্ঠ foundation academic",
      "7 8": "class 7 8 seventh eighth সপ্তম অষ্টম ৭ম ৮ম academic",
      "9": "class 9 science নবম ৯ম বিজ্ঞান ssc",
      "10": "class 10 ssc final দশম ১০ম এসএসসি",
      hsc: "hsc science 11 12 একাদশ দ্বাদশ বিজ্ঞান physics chemistry math এইচএসসি",
    };
    return (
      match &&
      (!search.trim() ||
        (terms[grades] || "").includes(search.trim().toLowerCase()))
    );
  };
  const count = programs.filter(([category, grades]) =>
    visible(category, grades),
  ).length;
  function chooseGrade(value: string) {
    setGrade(value);
    setFilter(value === "hsc" ? "hsc" : Number(value) < 9 ? "junior" : "ssc");
    document.getElementById("courses")?.scrollIntoView({ behavior: "smooth" });
  }
  useEffect(() => {
    if (!course) return;
    trigger.current = document.activeElement as HTMLElement;
    dialog.current?.showModal();
    return () => trigger.current?.focus();
  }, [course]);
  return (
    <div className="spark-landing">
      <div className="topline">
        🎉 <b>Admission Open!</b> Class 6–10 &amp; HSC Science Batch —{" "}
        <a href="#courses" style={{ textDecoration: "underline" }}>
          Explore Courses →
        </a>
      </div>
      <header>
        <div className="container nav">
          <Brand />
          <nav
            id="navlinks"
            className={`links ${menu ? "open" : ""}`}
            onClick={() => setMenu(false)}
          >
            <a href="#home">হোম</a>
            <a href="#courses">কোর্সসমূহ</a>
            <a href="#features">আমাদের সুবিধা</a>
            <a href="#how">কীভাবে কাজ করে</a>
            <a href="#app">মোবাইল ভিউ</a>
          </nav>
          <form
            className="program-search"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              document
                .getElementById("courses")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <button aria-label="Search programs" type="submit">
              ⌕
            </button>
            <input
              aria-label="Search academic programs"
              type="search"
              placeholder="কোর্স খুঁজুন…"
              value={search}
              maxLength={80}
              onChange={(e) => {
                setSearch(e.target.value);
                setGrade("");
                setFilter("all");
              }}
            />
          </form>
          <div className="nav-actions">
            <a className="btn outline" href="/login">
              লগইন
            </a>
            <a className="btn primary" href="#contact">
              ভর্তি হও →
            </a>
            <button
              className="menu-btn"
              aria-label="Open menu"
              onClick={() => setMenu((v) => !v)}
              aria-expanded={menu}
              aria-controls="navlinks"
            >
              ☰
            </button>
          </div>
        </div>
      </header>
      <main>
        <section className="hero" id="home">
          <div className="container">
            <div className="hero-grid">
              <div>
                <span className="eyebrow">
                  <span className="dot"></span> NEXT GENERATION LEARNING
                  PLATFORM
                </span>
                <h1>
                  নতুন শক্তিতে
                  <br />
                  <em>শেখার নতুন শুরু।</em>
                </h1>
                <p>
                  ক্লাস ৬ থেকে ১২—স্মার্ট ক্লাস, নিয়মিত পরীক্ষা, র‍্যাঙ্কিং,
                  নিজের অগ্রগতি ট্র্যাকিং এবং অভিজ্ঞ শিক্ষকের সাহায্য। সবকিছু
                  এখন এক প্ল্যাটফর্মে।
                </p>

                <div className="hero-facts">
                  <span>
                    <b className="tick">✓</b> নিয়মিত পরীক্ষা
                  </span>
                  <span>
                    <b className="tick">✓</b> প্রাইভেট ফিডব্যাক
                  </span>
                  <span>
                    <b className="tick">✓</b> ডাউট সলভিং
                  </span>
                </div>
              </div>
              <div
                className="hero-art"
                aria-label="Illustrative learning dashboard"
              >
                <div className="art-glow"></div>
                <div className="art-back"></div>
                <div className="art-card">
                  <div className="visual-head">
                    <span>⚡ Spark Academy</span>
                    <span>✦ Learn smarter</span>
                  </div>
                  <div className="book-scene">📚💡</div>
                  <strong>
                    একটি প্ল্যাটফর্মে
                    <br />
                    <span>পুরো প্রস্তুতি!</span>
                  </strong>
                  <div
                    style={{
                      height: "6px",
                      width: "65%",
                      background: "#b7cadb",
                      borderRadius: "20px",
                    }}
                  ></div>
                </div>
                <div className="mini-stat stat-one">
                  <i>🏆</i>
                  <span>
                    Weekly Exam
                    <br />
                    <b style={{ color: "var(--brand)" }}>Rank Tracker</b>
                  </span>
                </div>
                <div className="mini-stat stat-two">
                  <i>📈</i>
                  <span>
                    Your Progress
                    <br />
                    <b style={{ color: "var(--teal)" }}>Always Visible</b>
                  </span>
                </div>
              </div>
            </div>
            <div className="grade-wrap">
              <div className="grade-top">
                <h3>তুমি কোন ক্লাসে পড়ো?</h3>
                <span>তোমার ক্লাস বেছে নিয়ে পছন্দের কোর্স খুঁজে নাও</span>
              </div>
              <div className="grades">
                <button
                  data-grade="6"
                  onClick={() => chooseGrade("6")}
                  className={`grade ${grade === "6" ? "active" : ""}`}
                >
                  <div className="grade-icon">
                    <span className="tile-level">
                      CLASS<b>6</b>
                    </span>
                  </div>
                  <b>৬ষ্ঠ শ্রেণি</b>
                  <span>Class 6</span>
                </button>
                <button
                  data-grade="7"
                  onClick={() => chooseGrade("7")}
                  className={`grade ${grade === "7" ? "active" : ""}`}
                >
                  <div className="grade-icon">
                    <span className="tile-level">
                      CLASS<b>7</b>
                    </span>
                  </div>
                  <b>৭ম শ্রেণি</b>
                  <span>Class 7</span>
                </button>
                <button
                  data-grade="8"
                  onClick={() => chooseGrade("8")}
                  className={`grade ${grade === "8" ? "active" : ""}`}
                >
                  <div className="grade-icon">
                    <span className="tile-level">
                      CLASS<b>8</b>
                    </span>
                  </div>
                  <b>৮ম শ্রেণি</b>
                  <span>Class 8</span>
                </button>
                <button
                  data-grade="9"
                  onClick={() => chooseGrade("9")}
                  className={`grade ${grade === "9" ? "active" : ""}`}
                >
                  <div className="grade-icon">
                    <span className="tile-level">
                      CLASS<b>9</b>
                    </span>
                  </div>
                  <b>৯ম শ্রেণি</b>
                  <span>Class 9</span>
                </button>
                <button
                  data-grade="10"
                  onClick={() => chooseGrade("10")}
                  className={`grade ${grade === "10" ? "active" : ""}`}
                >
                  <div className="grade-icon">
                    <span className="tile-level">
                      CLASS<b>10</b>
                    </span>
                  </div>
                  <b>১০ম শ্রেণি</b>
                  <span>Class 10</span>
                </button>
                <button
                  data-grade="hsc"
                  onClick={() => chooseGrade("hsc")}
                  className={`grade ${grade === "hsc" ? "active" : ""}`}
                >
                  <div className="grade-icon">
                    <span className="tile-level">
                      HSC<b>11–12</b>
                    </span>
                  </div>
                  <b>HSC Science</b>
                  <span>Class 11–12</span>
                </button>
              </div>
            </div>
          </div>
          <div className="hero-cta">
            <a href="#courses" className="btn primary">
              আমাদের কোর্স দেখুন ↗
            </a>
            <a href="#features" className="btn outline">
              কী কী থাকছে? ▶
            </a>
          </div>
        </section>
        <section className="section gray" id="courses">
          <div className="container">
            <div className="section-head">
              <span className="kicker">EXPLORE OUR PROGRAMS</span>
              <h2>
                তোমার স্বপ্নের জন্য{" "}
                <span style={{ color: "var(--brand)" }}>সঠিক কোর্স</span>
              </h2>
              <p>
                স্কুল থেকে HSC Science পর্যন্ত, প্রতিটি ধাপে যত্ন নিয়ে সাজানো
                একাডেমিক প্রোগ্রাম।
              </p>
            </div>
            <div className="course-tools">
              <div className="pills">
                <button
                  data-filter="all"
                  onClick={() => {
                    setGrade("");
                    setFilter("all");
                  }}
                  className={`pill ${filter === "all" ? "active" : ""}`}
                >
                  সব কোর্স
                </button>
                <button
                  data-filter="junior"
                  onClick={() => {
                    setGrade("");
                    setFilter("junior");
                  }}
                  className={`pill ${filter === "junior" ? "active" : ""}`}
                >
                  ৬ষ্ঠ–৮ম
                </button>
                <button
                  data-filter="ssc"
                  onClick={() => {
                    setGrade("");
                    setFilter("ssc");
                  }}
                  className={`pill ${filter === "ssc" ? "active" : ""}`}
                >
                  ৯ম–১০ম
                </button>
                <button
                  data-filter="hsc"
                  onClick={() => {
                    setGrade("");
                    setFilter("hsc");
                  }}
                  className={`pill ${filter === "hsc" ? "active" : ""}`}
                >
                  HSC Science
                </button>
              </div>
              <span
                style={{ fontSize: "12px", color: "var(--muted)" }}
                id="count"
              >
                {count}টি প্রোগ্রাম দেখানো হচ্ছে
              </span>
            </div>
            <div className="course-grid" id="coursegrid">
              <article
                className="course"
                data-category="junior"
                data-grade="6"
                hidden={!visible("junior", "6")}
              >
                <div className="cover blue">
                  <p>FOUNDATION PROGRAM</p>
                  <h3>
                    Class 6<br />
                    Academic Care
                  </h3>
                  <span className="emoji">📘</span>
                </div>
                <div className="course-info">
                  <h4>ষষ্ঠ শ্রেণির একাডেমিক ব্যাচ</h4>
                  <p>
                    নিয়মিত ক্লাস, হোমওয়ার্ক, পরীক্ষা এবং ব্যক্তিগত অগ্রগতির
                    রিপোর্ট।
                  </p>
                  <div className="tags">
                    <span>Full Academic</span>
                    <span>Weekly Exam</span>
                  </div>
                  <div className="course-bottom">
                    <small>ব্যাচের তথ্য অ্যাডমিনের কাছে</small>
                    <button
                      type="button"
                      className="textlink"
                      onClick={() => setCourse("Class 6 Academic Care")}
                    >
                      বিস্তারিত ↗
                    </button>
                  </div>
                </div>
              </article>
              <article
                className="course"
                data-category="junior"
                data-grade="7 8"
                hidden={!visible("junior", "7 8")}
              >
                <div className="cover purple">
                  <p>JUNIOR ACADEMIC</p>
                  <h3>
                    Class 7–8
                    <br />
                    Master Batch
                  </h3>
                  <span className="emoji">🧠</span>
                </div>
                <div className="course-info">
                  <h4>সপ্তম–অষ্টম শ্রেণির প্রস্তুতি</h4>
                  <p>
                    কনসেপ্ট ক্লিয়ারিং, সাপ্তাহিক টেস্ট ও অধ্যায়ভিত্তিক রিভিশন।
                  </p>
                  <div className="tags">
                    <span>Class 7–8</span>
                    <span>Concept Focused</span>
                  </div>
                  <div className="course-bottom">
                    <small>ব্যাচের তথ্য অ্যাডমিনের কাছে</small>
                    <button
                      type="button"
                      className="textlink"
                      onClick={() => setCourse("Class 7\u20138 Master Batch")}
                    >
                      বিস্তারিত ↗
                    </button>
                  </div>
                </div>
              </article>
              <article
                className="course"
                data-category="ssc"
                data-grade="9"
                hidden={!visible("ssc", "9")}
              >
                <div className="cover red">
                  <p>SSC PREPARATION</p>
                  <h3>
                    Class 9<br />
                    Science Program
                  </h3>
                  <span className="emoji">🔬</span>
                </div>
                <div className="course-info">
                  <h4>নবম শ্রেণি — বিজ্ঞান বিভাগ</h4>
                  <p>
                    ফিজিক্স, কেমিস্ট্রি, ম্যাথ, বায়োলজি ও নিয়মিত মডেল টেস্ট।
                  </p>
                  <div className="tags">
                    <span>Science</span>
                    <span>Chapter Tests</span>
                  </div>
                  <div className="course-bottom">
                    <small>ব্যাচের তথ্য অ্যাডমিনের কাছে</small>
                    <button
                      type="button"
                      className="textlink"
                      onClick={() => setCourse("Class 9 Science Program")}
                    >
                      বিস্তারিত ↗
                    </button>
                  </div>
                </div>
              </article>
              <article
                className="course"
                data-category="ssc"
                data-grade="10"
                hidden={!visible("ssc", "10")}
              >
                <div className="cover orange">
                  <p>SSC EXAM READY</p>
                  <h3>
                    Class 10
                    <br />
                    Final Prep
                  </h3>
                  <span className="emoji">🎯</span>
                </div>
                <div className="course-info">
                  <h4>দশম শ্রেণি — SSC প্রস্তুতি</h4>
                  <p>
                    রিভিশন প্ল্যান, প্রশ্নব্যাংক, মডেল টেস্ট ও ফলাফল বিশ্লেষণ।
                  </p>
                  <div className="tags">
                    <span>SSC</span>
                    <span>Model Tests</span>
                  </div>
                  <div className="course-bottom">
                    <small>ব্যাচের তথ্য অ্যাডমিনের কাছে</small>
                    <button
                      type="button"
                      className="textlink"
                      onClick={() => setCourse("Class 10 Final Prep")}
                    >
                      বিস্তারিত ↗
                    </button>
                  </div>
                </div>
              </article>
              <article
                className="course"
                data-category="hsc"
                data-grade="hsc"
                hidden={!visible("hsc", "hsc")}
              >
                <div className="cover green">
                  <p>HSC SCIENCE</p>
                  <h3>
                    HSC 1st Year
                    <br />
                    Science
                  </h3>
                  <span className="emoji">⚗️</span>
                </div>
                <div className="course-info">
                  <h4>একাদশ শ্রেণি — বিজ্ঞান বিভাগ</h4>
                  <p>
                    অধ্যায়ভিত্তিক ক্লাস, সাবজেক্ট টেস্ট ও পারফরম্যান্স
                    ট্র্যাকিং।
                  </p>
                  <div className="tags">
                    <span>Physics</span>
                    <span>Chemistry</span>
                    <span>Math</span>
                  </div>
                  <div className="course-bottom">
                    <small>ব্যাচের তথ্য অ্যাডমিনের কাছে</small>
                    <button
                      type="button"
                      className="textlink"
                      onClick={() => setCourse("HSC 1st Year Science")}
                    >
                      বিস্তারিত ↗
                    </button>
                  </div>
                </div>
              </article>
              <article
                className="course"
                data-category="hsc"
                data-grade="hsc"
                hidden={!visible("hsc", "hsc")}
              >
                <div className="cover navy">
                  <p>HSC SCIENCE</p>
                  <h3>
                    HSC 2nd Year
                    <br />
                    Mastery
                  </h3>
                  <span className="emoji">🚀</span>
                </div>
                <div className="course-info">
                  <h4>দ্বাদশ শ্রেণি — বিজ্ঞান বিভাগ</h4>
                  <p>
                    বোর্ড পরীক্ষার প্রস্তুতি, সাপ্তাহিক পরীক্ষা ও শিক্ষক সহায়তা।
                  </p>
                  <div className="tags">
                    <span>Board Focused</span>
                    <span>Practice</span>
                  </div>
                  <div className="course-bottom">
                    <small>ব্যাচের তথ্য অ্যাডমিনের কাছে</small>
                    <button
                      type="button"
                      className="textlink"
                      onClick={() => setCourse("HSC 2nd Year Mastery")}
                    >
                      বিস্তারিত ↗
                    </button>
                  </div>
                </div>
              </article>
            </div>
            <div hidden={count > 0}>
              এই ক্লাসের জন্য কোনো কোর্স পাওয়া যায়নি।
            </div>
          </div>
        </section>
        <section className="section" id="features">
          <div className="container">
            <div className="section-head">
              <span className="kicker">WHY SPARK ACADEMY</span>
              <h2>
                শুধু পড়ানো নয়,{" "}
                <span style={{ color: "var(--brand)" }}>সম্পূর্ণ গাইডলাইন</span>
              </h2>
              <p>
                শিক্ষার্থী, শিক্ষক ও অ্যাডমিন—সবার জন্য এক জায়গায় প্রয়োজনীয় সব
                সুবিধা।
              </p>
            </div>
            <div className="features">
              <div className="feature">
                <div className="ico">📝</div>
                <h3>Exam &amp; Ranking</h3>
                <p>
                  পরীক্ষার সময়সূচি, নম্বর, ব্যাচে নিজের অবস্থান এবং আগের
                  পরীক্ষার সঙ্গে তুলনা।
                </p>
              </div>
              <div className="feature">
                <div className="ico">📊</div>
                <h3>Progress Analytics</h3>
                <p>
                  কোন বিষয়ে কত উন্নতি হচ্ছে আর কোথায় আরও পড়া দরকার—সহজ চার্টে
                  দেখা যাবে।
                </p>
              </div>
              <div className="feature">
                <div className="ico">✅</div>
                <h3>Smart Attendance</h3>
                <p>
                  শিক্ষক ক্লাসের উপস্থিতি রেকর্ড করবেন, শিক্ষার্থী মাসভিত্তিক
                  হিসাব দেখতে পারবে।
                </p>
              </div>
              <div className="feature">
                <div className="ico">👨‍👩‍👧</div>
                <h3>Private Teacher Feedback</h3>
                <p>
                  শিক্ষক সম্পর্কে মতামত দাও ব্যক্তিগতভাবে—শুধু তুমি ও অ্যাডমিন
                  দেখতে পারবে।
                </p>
              </div>
              <div className="feature">
                <div className="ico">💬</div>
                <h3>Anonymous Voice Q&amp;A</h3>
                <p>
                  পরিচয় গোপন রেখে লেখা বা রেকর্ড করা কণ্ঠে প্রশ্ন করো, শিক্ষকের
                  উত্তর পেয়ে শেখো।
                </p>
              </div>
              <div className="feature">
                <div className="ico">🔁</div>
                <h3>Smart Revision Tracker</h3>
                <p>
                  RED, YELLOW ও GREEN স্ট্যাটাস দিয়ে বিষয় বোঝার অবস্থা জানাও,
                  প্রয়োজন অনুযায়ী রিভিশন করো।
                </p>
              </div>
            </div>
          </div>
        </section>
        <div className="statband">
          <div className="container stat-grid">
            <div>
              <strong>6–12</strong>
              <p>Class Coverage</p>
            </div>
            <div>
              <strong>3</strong>
              <p>Student · Teacher · Admin</p>
            </div>
            <div>
              <strong>24/7</strong>
              <p>Result Access</p>
            </div>
            <div>
              <strong>100%</strong>
              <p>Digital Progress View</p>
            </div>
          </div>
        </div>
        <section className="section gray" id="how">
          <div className="container">
            <div className="section-head">
              <span className="kicker">HOW IT WORKS</span>
              <h2>
                পড়াশোনায় এগিয়ে যাওয়ার{" "}
                <span style={{ color: "var(--brand)" }}>সহজ পথ</span>
              </h2>
              <p>
                একটি অ্যাকাউন্ট থেকেই কোর্স, পরীক্ষা ও নিজের অগ্রগতির সব তথ্য
                পাওয়া যাবে।
              </p>
            </div>
            <div className="how">
              <div className="step">
                <div className="num">STEP 01</div>
                <h3>কোর্স বেছে নাও</h3>
                <p>
                  নিজের ক্লাস ও প্রয়োজন অনুযায়ী সঠিক ব্যাচ বা প্যাকেজ নির্বাচন।
                </p>
              </div>
              <div className="step">
                <div className="num">STEP 02</div>
                <h3>ক্লাস ও প্র্যাকটিস</h3>
                <p>
                  রুটিন দেখে ক্লাস করো, স্লাইড এবং YouTube lesson link ব্যবহার
                  করো।
                </p>
              </div>
              <div className="step">
                <div className="num">STEP 03</div>
                <h3>পরীক্ষা ও ফলাফল</h3>
                <p>নিয়মিত পরীক্ষার ফল, র‍্যাঙ্ক এবং শেখার অগ্রগতি দেখো।</p>
              </div>
              <div className="step">
                <div className="num">STEP 04</div>
                <h3>ডাউট ক্লিয়ার করো</h3>
                <p>
                  কঠিন প্রশ্ন লিখে বা কণ্ঠ রেকর্ড করে জমা দাও এবং শিক্ষকের
                  ব্যাখ্যা পড়ো বা শোনো।
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="app-section" id="app">
          <div className="container app-grid">
            <div>
              <span className="kicker">MOBILE-FIRST LEARNING</span>
              <h2>
                তোমার শেখার জগৎ
                <br />
                <span style={{ color: "var(--brand)" }}>এবার হাতের মুঠোয়</span>
              </h2>
              <p>
                ওয়েব ও মোবাইল ভিউে একই অ্যাকাউন্ট। ক্লাস রুটিন, পরীক্ষা, ফলাফল,
                প্রশ্ন ও প্রগ্রেস—সবকিছু নিজের মতো করে ম্যানেজ করো।
              </p>
              <div className="checks">
                <div>✅ Student, Teacher ও Admin Dashboard</div>
                <div>✅ Exam Schedule, Rank &amp; Attendance</div>
                <div>✅ Anonymous Text &amp; Recorded Voice Q&amp;A</div>
                <div>✅ Smart Revision &amp; Private Feedback</div>
              </div>
              <a className="btn dark" href="/login">
                📱 Open your dashboard ↗
              </a>
            </div>
            <div className="phone-wrap">
              <div className="phone">
                <div className="notch"></div>
                <div className="phone-content">
                  <div className="phone-bar">
                    <b>⚡ SPARK</b>
                    <span>🔔</span>
                  </div>
                  <small style={{ color: "#8a91a1" }}>
                    Illustrative dashboard preview
                  </small>
                  <div className="phone-card">
                    <small>UPCOMING EXAM</small>
                    <h4>Physics Weekly Test</h4>
                    <small>12 Nov • 10:00 AM</small>
                  </div>
                  <strong style={{ fontSize: "14px" }}>Your performance</strong>
                  <div className="phone-tiles" style={{ marginTop: "11px" }}>
                    <div>
                      <small>Exam Rank</small>
                      <b>#03 🏆</b>
                    </div>
                    <div>
                      <small>Attendance</small>
                      <b>85%</b>
                    </div>
                    <div>
                      <small>Last Result</small>
                      <b>84%</b>
                    </div>
                    <div>
                      <small>Pending Q&amp;A</small>
                      <b>08</b>
                    </div>
                  </div>
                  <div
                    style={{
                      marginTop: "25px",
                      padding: "15px",
                      borderRadius: "12px",
                      background: "#f8f9fb",
                    }}
                  >
                    <small>YOUR PROGRESS</small>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "end",
                        height: "70px",
                        gap: "10px",
                        marginTop: "8px",
                      }}
                    >
                      <span
                        style={{
                          height: "38%",
                          background: "#c0d3e3",
                          flex: "1",
                          borderRadius: "4px",
                        }}
                      ></span>
                      <span
                        style={{
                          height: "52%",
                          background: "#8baac2",
                          flex: "1",
                          borderRadius: "4px",
                        }}
                      ></span>
                      <span
                        style={{
                          height: "65%",
                          background: "#5e85a2",
                          flex: "1",
                          borderRadius: "4px",
                        }}
                      ></span>
                      <span
                        style={{
                          height: "83%",
                          background: "var(--brand)",
                          flex: "1",
                          borderRadius: "4px",
                        }}
                      ></span>
                      <span
                        style={{
                          height: "98%",
                          background: "#244b6d",
                          flex: "1",
                          borderRadius: "4px",
                        }}
                      ></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="section" id="faq">
          <div className="container">
            <div className="section-head">
              <span className="kicker">FAQ</span>
              <h2>
                কিছু সাধারণ{" "}
                <span style={{ color: "var(--brand)" }}>প্রশ্ন ও উত্তর</span>
              </h2>
            </div>
            <div className="faq-layout">
              <div className={`faq-item ${faq === 0 ? "open" : ""}`}>
                <button
                  className="faq-q"
                  onClick={() => setFaq((v) => (v === 0 ? -1 : 0))}
                  aria-expanded={faq === 0}
                >
                  কোন কোন ক্লাসের জন্য কোর্স আছে? <span>＋</span>
                </button>
                <div className="faq-a">
                  ষষ্ঠ থেকে দশম শ্রেণি এবং একাদশ-দ্বাদশ শ্রেণির বিজ্ঞান বিভাগের
                  জন্য কোর্স পরিকল্পনা করা হয়েছে।
                </div>
              </div>
              <div className={`faq-item ${faq === 1 ? "open" : ""}`}>
                <button
                  className="faq-q"
                  onClick={() => setFaq((v) => (v === 1 ? -1 : 1))}
                  aria-expanded={faq === 1}
                >
                  ব্যক্তিগত ফিডব্যাক কারা দেখতে পারবেন? <span>＋</span>
                </button>
                <div className="faq-a">
                  শুধু ফিডব্যাক জমা দেওয়া শিক্ষার্থী এবং অ্যাডমিন তা দেখতে
                  পারবেন। শিক্ষক বা অন্য শিক্ষার্থী দেখতে পারবেন না।
                </div>
              </div>
              <div className={`faq-item ${faq === 2 ? "open" : ""}`}>
                <button
                  className="faq-q"
                  onClick={() => setFaq((v) => (v === 2 ? -1 : 2))}
                  aria-expanded={faq === 2}
                >
                  ডাউট সলভিং কীভাবে কাজ করবে? <span>＋</span>
                </button>
                <div className="faq-a">
                  শিক্ষার্থীরা লেখা বা রেকর্ড করা কণ্ঠে প্রশ্ন জমা দিতে পারে।
                  নির্ধারিত বিষয়ের শিক্ষক উত্তর দেন। প্রোফাইল গোপন থাকে, তবে
                  নিজের কণ্ঠ পরিচয় প্রকাশ করতে পারে।
                </div>
              </div>
              <div className={`faq-item ${faq === 3 ? "open" : ""}`}>
                <button
                  className="faq-q"
                  onClick={() => setFaq((v) => (v === 3 ? -1 : 3))}
                  aria-expanded={faq === 3}
                >
                  কণ্ঠের প্রশ্ন কি সরাসরি কল? <span>＋</span>
                </button>
                <div className="faq-a">
                  না। প্রশ্ন ও উত্তর অডিও রেকর্ডিং হিসেবে জমা হয়। সুবিধামতো পরে
                  শোনা যায়।
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="container">
          <div className="cta">
            <h2>আজই শুরু হোক নতুন যাত্রা! ⚡</h2>
            <p>
              সঠিক গাইডলাইন, নিয়মিত প্র্যাকটিস আর নিজের অগ্রগতি দেখার স্মার্ট
              অভিজ্ঞতা।
            </p>
            <a className="btn" href="#contact">
              ভর্তির তথ্য জানতে চাই ↗
            </a>
          </div>
        </section>
      </main>
      <footer id="contact">
        <div className="container">
          <div className="footer-grid">
            <div>
              <Brand />
              <p>
                Smart Coaching, Better Learning.
                <br />
                Class 6–10 &amp; HSC Science.
              </p>
              <p>
                অ্যাকাউন্ট ও ভর্তি সংক্রান্ত তথ্যের জন্য নিজের কোচিং অ্যাডমিনের
                সঙ্গে যোগাযোগ করো।
              </p>
            </div>
            <div>
              <h4>Explore</h4>
              <a href="#home">Home</a>
              <a href="#courses">Courses</a>
              <a href="#features">Features</a>
              <a href="#app">Mobile View</a>
            </div>
            <div>
              <h4>Learning</h4>
              <a href="#features">Exam &amp; Result</a>
              <a href="#features">Doubt Solving</a>
              <a href="#features">Attendance</a>
              <a href="#features">Private Feedback</a>
            </div>
            <div>
              <h4>Contact</h4>
              <p>📍 Bangladesh</p>
              <p>ভর্তি ও সহায়তা: কোচিং অ্যাডমিন</p>
              <p>নিজের প্রতিষ্ঠানের যোগাযোগ মাধ্যম ব্যবহার করো</p>
            </div>
          </div>
          <div className="copyright">
            <span>© Spark Academy. All rights reserved.</span>
            <span>Learn • Grow • Shine</span>
          </div>
        </div>
      </footer>

      {course && (
        <dialog
          ref={dialog}
          className="program-dialog"
          aria-labelledby="program-title"
          onCancel={() => setCourse(null)}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              const r = e.currentTarget.getBoundingClientRect();
              if (
                e.clientX < r.left ||
                e.clientX > r.right ||
                e.clientY < r.top ||
                e.clientY > r.bottom
              )
                setCourse(null);
            }
          }}
        >
          <button
            className="modal-close"
            aria-label="Close course details"
            onClick={() => setCourse(null)}
          >
            ×
          </button>
          <span className="kicker">ACADEMIC PROGRAM</span>
          <h2 id="program-title">{course}</h2>
          <p>
            বিষয়ভিত্তিক লেসন, অধ্যায়ভিত্তিক পরীক্ষা, উপস্থিতি ও প্রগ্রেস
            ট্র্যাকিং। ব্যাচ, সময়সূচি ও ভর্তি সম্পর্কে জানতে নিজের কোচিং
            অ্যাডমিনের সঙ্গে যোগাযোগ করো।
          </p>
          <a className="btn primary" href="/login">
            অ্যাকাউন্টে লগইন করো →
          </a>
        </dialog>
      )}
    </div>
  );
}
