// src/components/About.tsx

import {
  BookOpen,
  Code2,
  Gauge,
  Monitor,
  Save,
} from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "Practice DSA",
    description:
      "Solve coding problems across arrays, linked lists, searching, sorting, dynamic programming, and more.",
  },
  {
    icon: Code2,
    title: "Run Python in your browser",
    description:
      "Write Python, run examples, inspect output, and iterate without setting up a local Python environment.",
  },
  {
    icon: Save,
    title: "Track your progress",
    description:
      "Keep track of solved problems and revisit topics as you work through the problem set.",
  },
  {
    icon: Monitor,
    title: "No backend execution required",
    description:
      "Python runs locally in your browser through Pyodide. Your code is not sent to a server for execution by this feature.",
  },
];

export default function About() {
  return (
    <main className="main-content about-page">
      <header className="about-hero">
        <span className="eyebrow">ABOUT THE PROJECT</span>
        <h1>DSA With Ragu</h1>
        <p className="about-tagline">
          Practice. Learn. Improve.
        </p>
        <p className="about-description">
          A simple place to practice data structures and algorithms,
          write Python, test your ideas, and build problem-solving
          skills one question at a time.
        </p>

        <div className="about-joke">
          <Gauge size={18} />
          <span>Faster than LeetCode or HackerRank LOL</span>
        </div>
      </header>

      <section className="about-feature-grid">
        {features.map(({ icon: Icon, title, description }) => (
          <article className="about-feature panel" key={title}>
            <div className="about-feature-icon">
              <Icon size={20} />
            </div>
            <h2>{title}</h2>
            <p>{description}</p>
          </article>
        ))}
      </section>

      <section className="about-how panel">
        <h2>How it works</h2>
        <ol>
          <li>Choose a topic and open a problem.</li>
          <li>Read the statement, examples, and constraints.</li>
          <li>Write your Python solution in the editor.</li>
          <li>Run your code, inspect the results, and improve it.</li>
          <li>Use the Playground to experiment with Python separately.</li>
        </ol>
        <p className="muted-text">
          Python execution uses Pyodide and WebAssembly in your browser.
          First-time initialization may take a little while.
        </p>
      </section>
    </main>
  );
}
