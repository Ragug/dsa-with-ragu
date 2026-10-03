// src/lib/pythonRuntime.ts

import type { PyodideInterface } from "pyodide";

let pyodidePromise: Promise<PyodideInterface> | null = null;

export function getPyodide() {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      const { loadPyodide } = await import("pyodide");

      return loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/",
      });
    })().catch((error) => {
      // Allow retry if initialization fails.
      pyodidePromise = null;
      throw error;
    });
  }

  return pyodidePromise;
}
