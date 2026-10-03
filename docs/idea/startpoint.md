
# DSA With Ragu

## 1. Overview

DSA With Ragu is a personal, lightweight platform for learning and practising Data Structures and Algorithms (DSA).

The goal is to understand algorithms by implementing them in Python, running test cases, debugging failures, and improving solutions.

The platform will run Python code locally in the browser using WebAssembly, without requiring a backend server.

## 2. Functional Requirements

### FR-01: Algorithm List

* Display a list of DSA problems.
* Organize problems by topic, such as sorting, searching, arrays, linked lists, trees, and graphs.
* Show the problem title and difficulty.

### FR-02: Problem Description

* Display the problem statement, constraints, and expected function signature.
* Show two sample input/output examples for each problem.
* Provide starter code for the user to implement.

### FR-03: Code Editor

* Provide a Python code editor with syntax highlighting.
* Allow users to edit and reset the starter code.
* Keep the editor simple and lightweight.

### FR-04: Run Code

* Execute the user's code locally in the browser.
* Run only the visible sample test cases.
* Display actual output, expected output, and runtime errors.

### FR-05: Submit Code

* Run the solution against all configured test cases, including edge cases.
* Display the number of passed and failed test cases.
* Show useful failure details to help the user debug the solution.

### FR-06: Local Progress

* Save the user's code and completed-problem status locally.
* Restore saved work when the user revisits a problem.
* Do not require user accounts or cloud storage.

## 3. Non-Functional Requirements

### NFR-01: Lightweight

* Minimize initial JavaScript bundle size.
* Load the code editor and Python runtime only when needed.
* Avoid unnecessary dependencies.

### NFR-02: Client-Side Execution

* Execute Python code directly in the browser using Pyodide.
* Do not require a backend for code execution.
* Support offline usage after the application and required runtime assets have been downloaded.

### NFR-03: Execution Control

* Execute user code in a Web Worker so the UI remains responsive.
* Detect excessive execution time and terminate/recreate the worker when necessary.
* Handle syntax errors, runtime errors, infinite loops, and excessive recursion.

### NFR-04: Test Accuracy

* Use a common test-case format for all problems.
* Support multiple arguments and different expected return values.
* Include normal cases, edge cases, empty inputs, and boundary conditions.
* Reset mutable test inputs between executions.

### NFR-05: Maintainability

* Keep problem definitions separate from application logic.
* Reuse one test runner for all problems.
* Use TypeScript types for problem definitions and test results.

## 4. Technology Stack

| Component                   | Technology               | Purpose                                    |
| --------------------------- | ------------------------ | ------------------------------------------ |
| UI                          | React                    | Build the application interface            |
| Build tooling               | Vite                     | Development server and production bundling |
| Language                    | TypeScript               | Type safety                                |
| Code editor                 | CodeMirror 6             | Lightweight Python editor                  |
| Python runtime              | Pyodide                  | Execute Python using WebAssembly           |
| Execution isolation from UI | Web Worker               | Keep code execution off the main thread    |
| Problem definitions         | JSON                     | Store descriptions, samples, and tests     |
| Local persistence           | localStorage / IndexedDB | Save solutions and progress                |
| Documentation               | Markdown + Mermaid       | Document the architecture and workflows    |


## 5. Execution Workflow

1. The user selects a DSA problem.
2. The application loads its description, examples, and starter code.
3. The user writes a Python solution.
4. The user clicks **Run** to execute the visible sample tests.
5. The user clicks **Submit** to execute all configured tests.
6. The application displays the results and allows the user to improve the solution.

## 7. Constraints and Limitations

* Pyodide provides a Python runtime compiled to WebAssembly, but not every native Python package is supported.
* A Web Worker protects UI responsiveness; it is not, by itself, a complete security boundary.
* Browser-side hidden tests are not secret because users can inspect downloaded application assets.
* Browser execution limits differ from operating-system-level CPU and memory enforcement.
* Offline execution requires the Pyodide runtime and all required dependencies to be available locally.


