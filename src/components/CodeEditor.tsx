
import { useEffect, useRef, useState } from "react";
import {
  Compartment,
  EditorState,
  Prec,
  RangeSetBuilder,
} from "@codemirror/state";
import {
  Decoration,
  EditorView,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import {
  defaultHighlightStyle,
  indentUnit,
  syntaxHighlighting,
} from "@codemirror/language";
import { oneDark } from "@codemirror/theme-one-dark";
import type { AppTheme } from "../storage/progress";

type CodeEditorProps = {
  /** The editable part of the code. */
  value: string;
  onChange: (value: string) => void;
  theme: AppTheme;
  onRun?: () => void;
  onSubmit?: () => void;
  /** Read-only code shown above the editable part (HackerRank style). */
  lockedPrefix?: string;
  /** Read-only code shown below the editable part. */
  lockedSuffix?: string;
};

const lockedLine = Decoration.line({ class: "ws-locked-line" });

function useResolvedDark(theme: AppTheme): boolean {
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemDark(media.matches);

    media.addEventListener("change", update);

    return () => media.removeEventListener("change", update);
  }, []);

  return theme === "dark" || (theme === "system" && systemDark);
}

export default function CodeEditor({
  value,
  onChange,
  theme,
  onRun,
  onSubmit,
  lockedPrefix = "",
  lockedSuffix = "",
}: CodeEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  const [themeCompartment] = useState(() => new Compartment());

  // The locked parts never change while an editor is open (the workspace is
  // re-created for every problem), so they are read once.
  const lockRef = useRef({
    prefix: lockedPrefix,
    suffix: lockedSuffix,
  });

  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRun);
  const onSubmitRef = useRef(onSubmit);

  const isDark = useResolvedDark(theme);

  useEffect(() => {
    onChangeRef.current = onChange;
    onRunRef.current = onRun;
    onSubmitRef.current = onSubmit;
  }, [onChange, onRun, onSubmit]);

  // Create the editor once. Do not include `value` here:
  // recreating the editor on every keystroke breaks typing.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const { prefix, suffix } = lockRef.current;
    const locked = prefix.length > 0 || suffix.length > 0;
    const editableEnd = (length: number) => length - suffix.length;

    const state = EditorState.create({
      doc: prefix + value + suffix,
      extensions: [
        lineNumbers(),
        history(),
        python(),

        // Use four spaces for each indentation level.
        indentUnit.of("    "),
        EditorState.tabSize.of(4),

        // Only the editable range may change. Everything else is read-only.
        ...(locked
          ? [
              EditorState.transactionFilter.of((transaction) => {
                if (!transaction.docChanged) return transaction;

                const end = editableEnd(transaction.startState.doc.length);
                let allowed = true;

                transaction.changes.iterChangedRanges((fromA, toA) => {
                  if (fromA < prefix.length || toA > end) allowed = false;
                });

                return allowed ? transaction : [];
              }),

              // Grey background for the locked lines.
              EditorView.decorations.compute(["doc"], (state) => {
                const end = editableEnd(state.doc.length);
                const builder = new RangeSetBuilder<Decoration>();

                for (let n = 1; n <= state.doc.lines; n++) {
                  const line = state.doc.line(n);

                  if (line.from < prefix.length || line.from > end) {
                    builder.add(line.from, line.from, lockedLine);
                  }
                }

                return builder.finish();
              }),

              // Ctrl+A selects only the part you may edit.
              Prec.highest(
                keymap.of([
                  {
                    key: "Mod-a",
                    run: (view) => {
                      view.dispatch({
                        selection: {
                          anchor: prefix.length,
                          head: editableEnd(view.state.doc.length),
                        },
                      });
                      return true;
                    },
                  },
                ]),
              ),
            ]
          : []),

        Prec.highest(
          keymap.of([
            {
              key: "Mod-Enter",
              run: () => {
                onRunRef.current?.();
                return true;
              },
            },
            {
              key: "Mod-Shift-Enter",
              run: () => {
                onSubmitRef.current?.();
                return true;
              },
            },
          ]),
        ),

        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          indentWithTab,
        ]),

        syntaxHighlighting(defaultHighlightStyle, {
          fallback: true,
        }),

        themeCompartment.of(isDark ? oneDark : []),

        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(
              update.state.doc.sliceString(
                prefix.length,
                editableEnd(update.state.doc.length),
              ),
            );
          }
        }),

        EditorView.theme({
          "&": {
            height: "100%",
            fontSize: "14px",
          },
          "&.cm-focused": {
            outline: "none",
          },
          ".cm-scroller": {
            overflow: "auto",
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, monospace",
          },
          ".cm-content": {
            padding: "10px 0",
          },
          ".cm-gutters": {
            border: "none",
          },
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: host,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Intentionally initialize only once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeCompartment]);

  // Apply theme changes without recreating the editor.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    view.dispatch({
      effects: themeCompartment.reconfigure(isDark ? oneDark : []),
    });
  }, [isDark, themeCompartment]);

  // Synchronize external changes (for example, Reset code).
  // Avoid dispatching when the document already matches.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const { prefix, suffix } = lockRef.current;
    const end = view.state.doc.length - suffix.length;
    const currentValue = view.state.doc.sliceString(prefix.length, end);

    if (currentValue !== value) {
      view.dispatch({
        changes: { from: prefix.length, to: end, insert: value },
      });
    }
  }, [value]);

  return <div className="ws-editor-host" ref={hostRef} />;
}
