
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownUp,
  Brain,
  BookOpen,
  CheckCircle2,
  Code2,
  GitBranch,
  GitFork,
  Globe,
  House,
  Info,
  Layers,
  LayoutGrid,
  Link,
  Network,
  Search,
  Target,
  Text,
  Trash2,
} from "lucide-react";

import ProblemWorkspace from "./components/ProblemWorkspace";
import About from "./components/About";
import Playground from "./components/Playground";
import { problems } from "./data/problems";
import type { Problem } from "./types/problem";

import {
  isProblemSolved,
  readTheme,
  resetAllProgress,
  saveTheme,
  type AppTheme,
} from "./storage/progress";

type AppPage = "home" | "about" | "playground" | "problem";

const topicIcons: Record<string, typeof Brain> = {
  "All Problems": LayoutGrid,
  Arrays: Layers,
  Searching: Search,
  "Stack & Queue": Layers,
  "Linked List": GitBranch,
  "Dynamic Programming": Brain,
  Sorting: ArrowDownUp,
  Strings: Text,
  Trees: GitFork,
  Graphs: Network,
  "Two Pointers": ArrowDownUp,
  "Hash Table": Link,
  "Sliding Window": Target,
};

function LinkedInIcon({ size = 15 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.35V9h3.414v1.561h.049c.476-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0-4.125zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function getProblemIdFromPath(): string | null {
  const match = window.location.pathname.match(/^\/problems\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function getPageFromPath(): AppPage {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";

  if (path === "/about") return "about";
  if (path === "/playground") return "playground";
  if (getProblemIdFromPath()) return "problem";

  return "home";
}

function getProblemPath(problem: Problem): string {
  return `/problems/${encodeURIComponent(problem.id)}/`;
}

function getThemeClass(theme: AppTheme): string {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "theme-dark"
      : "theme-light";
  }

  return theme === "dark" ? "theme-dark" : "theme-light";
}

function SiteHeader({
  currentPage,
  onNavigate,
}: {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
}) {
  return (
    <header className="site-header">
      <button
        className="site-brand"
        onClick={() => onNavigate("home")}
        aria-label="DSA With Ragu home"
      >
        <span className="brand-mark">
          <Brain size={21} />
        </span>
        <span>DSA With Ragu</span>
      </button>

      <nav className="site-nav" aria-label="Main navigation">
        <button
          className={
            currentPage === "home" || currentPage === "problem" ? "active" : ""
          }
          onClick={() => onNavigate("home")}
        >
          <House size={16} />
          Home
        </button>

        <button
          className={currentPage === "about" ? "active" : ""}
          onClick={() => onNavigate("about")}
        >
          <Info size={16} />
          About
        </button>

        <button
          className={currentPage === "playground" ? "active" : ""}
          onClick={() => onNavigate("playground")}
        >
          <Code2 size={16} />
          Playground
        </button>
      </nav>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <span className="site-footer-copy">
        © 2026 <strong>Ragu</strong>. All rights reserved.
      </span>

      <span className="site-footer-tagline">
        Practice consistently. Progress steadily.
      </span>

      <nav className="site-footer-links" aria-label="Social links">
        <a href="https://www.ragug.com/" target="_blank" rel="noopener noreferrer">
          <Globe size={15} />
          Website
        </a>

        <a
          href="https://ragug.medium.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <BookOpen size={15} />
          Medium
        </a>

        <a
          href="https://linkedin.com/in/ragug/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <LinkedInIcon size={15} />
          LinkedIn
        </a>
      </nav>
    </footer>
  );
}

export default function App() {
  const [activeTopic, setActiveTopic] = useState("All Problems");
  const [search, setSearch] = useState("");

  const [currentPage, setCurrentPage] = useState<AppPage>(() =>
    getPageFromPath(),
  );

  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(
    () => getProblemIdFromPath(),
  );

  const [theme, setTheme] = useState<AppTheme>(() => readTheme());
  const [progressVersion, setProgressVersion] = useState(0);

  const topics = useMemo(
    () => [
      "All Problems",
      ...Array.from(new Set(problems.map((problem) => problem.topic))).sort(),
    ],
    [],
  );

  const selectedProblem = problems.find(
    (problem) => problem.id === selectedProblemId,
  );

  const filteredProblems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return problems.filter((problem) => {
      const matchesTopic =
        activeTopic === "All Problems" || problem.topic === activeTopic;

      const matchesSearch =
        !query ||
        problem.title.toLowerCase().includes(query) ||
        problem.topic.toLowerCase().includes(query) ||
        problem.description.toLowerCase().includes(query);

      return matchesTopic && matchesSearch;
    });
  }, [activeTopic, search]);

  const completedCount = useMemo(
    () => problems.filter((problem) => isProblemSolved(problem.id)).length,
    [progressVersion],
  );

  const navigateToPage = useCallback((page: AppPage) => {
    const paths: Record<AppPage, string> = {
      home: "/",
      about: "/about",
      playground: "/playground",
      problem: "/",
    };

    const path = paths[page];

    if (window.location.pathname !== path) {
      window.history.pushState({}, "", path);
    }

    setCurrentPage(page);
    setSelectedProblemId(null);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  const navigateToProblem = useCallback((problem: Problem) => {
    const path = getProblemPath(problem);

    if (window.location.pathname !== path) {
      window.history.pushState({}, "", path);
    }

    setCurrentPage("problem");
    setSelectedProblemId(problem.id);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  const goToList = useCallback(() => {
    navigateToPage("home");
  }, [navigateToPage]);

  useEffect(() => {
    function syncFromUrl() {
      const page = getPageFromPath();
      const problemId = getProblemIdFromPath();

      if (problemId && problems.some((problem) => problem.id === problemId)) {
        setSelectedProblemId(problemId);
        setCurrentPage("problem");
        return;
      }

      setSelectedProblemId(null);

      if (problemId) {
        window.history.replaceState({}, "", "/");
        setCurrentPage("home");
        return;
      }

      setCurrentPage(page);
    }

    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  useEffect(() => {
    void import("./runtime/pythonRuntime")
      .then(({ warmPythonRuntime }) => warmPythonRuntime())
      .catch(() => {});
  }, []);

  useEffect(() => {
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const update = () => {
      document.documentElement.dataset.theme = getThemeClass(theme);
    };

    update();

    if (theme !== "system") return;

    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [theme]);

  const selectedIndex = selectedProblem
    ? problems.findIndex((problem) => problem.id === selectedProblem.id)
    : -1;

  function handleResetAll() {
    const confirmed = window.confirm(
      "Reset all saved code and solved progress for every problem? This cannot be undone.",
    );

    if (!confirmed) return;

    resetAllProgress();
    setProgressVersion((version) => version + 1);
  }

  if (currentPage === "problem" && selectedProblem) {
    return (
      <div className="app-shell site-layout">
        <SiteHeader currentPage={currentPage} onNavigate={navigateToPage} />

        <ProblemWorkspace
          key={selectedProblem.id}
          problem={selectedProblem}
          previousProblem={
            selectedIndex > 0 ? problems[selectedIndex - 1] : undefined
          }
          nextProblem={
            selectedIndex >= 0 && selectedIndex < problems.length - 1
              ? problems[selectedIndex + 1]
              : undefined
          }
          onBack={goToList}
          onPrevious={() => {
            if (selectedIndex > 0) {
              navigateToProblem(problems[selectedIndex - 1]);
            }
          }}
          onNext={() => {
            if (selectedIndex >= 0 && selectedIndex < problems.length - 1) {
              navigateToProblem(problems[selectedIndex + 1]);
            }
          }}
          theme={theme}
          onThemeChange={setTheme}
          onProgressChange={() =>
            setProgressVersion((version) => version + 1)
          }
        />

        <SiteFooter />
      </div>
    );
  }

  if (currentPage === "about") {
    return (
      <div className="app-shell site-layout">
        <SiteHeader currentPage={currentPage} onNavigate={navigateToPage} />
        <main className="simple-page-content">
          <About />
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (currentPage === "playground") {
    return (
      <div className="app-shell site-layout">
        <SiteHeader currentPage={currentPage} onNavigate={navigateToPage} />
        <main className="simple-page-content">
          <Playground />
        </main>
        <SiteFooter />
      </div>
    );
  }

  const solvedCount = filteredProblems.filter((problem) =>
    isProblemSolved(problem.id),
  ).length;

  return (
    <div className="app-shell app-home site-layout">
      <SiteHeader currentPage={currentPage} onNavigate={navigateToPage} />

      <div className="home-layout">
        <aside className="sidebar">
          <div className="sidebar-section-label">LEARN</div>

          <nav className="topic-navigation" aria-label="Problem topics">
            {topics.map((topic) => {
              const Icon = topicIcons[topic] ?? Layers;
              const active = activeTopic === topic;

              const count =
                topic === "All Problems"
                  ? problems.length
                  : problems.filter((problem) => problem.topic === topic).length;

              return (
                <button
                  className={`topic-button ${active ? "active" : ""}`}
                  key={topic}
                  onClick={() => {
                    setActiveTopic(topic);
                    setCurrentPage("home");
                    if (window.location.pathname !== "/") {
                      window.history.pushState({}, "", "/");
                    }
                  }}
                >
                  <Icon size={17} />
                  <span>{topic}</span>
                  <small>{count}</small>
                </button>
              );
            })}
          </nav>

          <div className="sidebar-bottom">
            <div className="theme-control">
              <label htmlFor="home-theme">Appearance</label>
              <select
                id="home-theme"
                value={theme}
                onChange={(event) =>
                  setTheme(event.target.value as AppTheme)
                }
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
          </div>
        </aside>

        <main className="main-content">
          <header className="home-header">
            <div>
              <p className="eyebrow">YOUR PRACTICE SPACE</p>
              <h1>Problem library</h1>
              <p className="page-subtitle">
                Build your problem-solving skills, one challenge at a time.
              </p>
            </div>

            <div className="header-progress">
              <div className="header-progress-icon">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <strong>
                  {completedCount} / {problems.length}
                </strong>
                <span>Problems solved</span>
              </div>
            </div>
          </header>

          <section className="stats-grid">
            <div className="stat-card">
              <span>Total problems</span>
              <strong>{problems.length}</strong>
              <small>Available to practice</small>
            </div>

            <div className="stat-card">
              <span>Topics</span>
              <strong>{topics.length - 1}</strong>
              <small>Areas to explore</small>
            </div>

            <div className="stat-card">
              <span>Completed</span>
              <strong>{completedCount}</strong>
              <small>All tests passed</small>
            </div>

            <div className="stat-card">
              <span>Remaining</span>
              <strong>{problems.length - completedCount}</strong>
              <small>Keep going</small>
            </div>
          </section>

          <section className="problem-list-section">
            <div className="problem-list-heading">
              <div>
                <h2>
                  {activeTopic === "All Problems"
                    ? "All problems"
                    : activeTopic}
                </h2>
                <p>
                  Showing {filteredProblems.length} problems · {solvedCount}{" "}
                  solved in this view
                </p>
              </div>

              <div className="problem-list-tools">
                <label className="problem-search">
                  <Search size={17} />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search problems..."
                  />
                </label>

                <button
                  className="reset-progress-button reset-progress-toolbar"
                  onClick={handleResetAll}
                >
                  <Trash2 size={15} />
                  Reset progress
                </button>
              </div>
            </div>

            <div className="problem-list">
              {filteredProblems.map((problem, index) => {
                const solved = isProblemSolved(problem.id);

                return (
                  <article className="problem-card" key={problem.id}>
                    <div className="problem-number">
                      {solved ? (
                        <CheckCircle2 size={19} className="solved-icon" />
                      ) : (
                        <span>{String(index + 1).padStart(2, "0")}</span>
                      )}
                    </div>

                    <div className="problem-card-main">
                      <button
                        className="problem-title-button"
                        onClick={() => navigateToProblem(problem)}
                      >
                        {problem.title}
                      </button>

                      <div className="problem-card-meta">
                        <span>{problem.topic}</span>

                        <span
                          className={`difficulty ${problem.difficulty.toLowerCase()}`}
                        >
                          {problem.difficulty}
                        </span>

                        <span
                          className={solved ? "solved-text" : "unsolved-text"}
                        >
                          {solved ? "Solved" : "Unsolved"}
                        </span>
                      </div>
                    </div>

                    <button
                      className="solve-button"
                      onClick={() => navigateToProblem(problem)}
                    >
                      {solved ? "Review" : "Solve"}
                      <ArrowDownUp size={14} />
                    </button>
                  </article>
                );
              })}

              {filteredProblems.length === 0 && (
                <div className="empty-state">
                  <Search size={25} />
                  <h3>No problems found</h3>
                  <p>Try another search term or select a different topic.</p>

                  <button
                    className="secondary-button"
                    onClick={() => {
                      setSearch("");
                      setActiveTopic("All Problems");
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>

      <SiteFooter />
    </div>
  );
}
