
import { useEffect, useRef, useState } from "react";
import { Compartment, EditorState, Prec } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
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
  value: string;
  onChange: (value: string) => void;
  theme: AppTheme;
  onRun?: () => void;
  onSubmit?: () => void;
};

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
}: CodeEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  const [themeCompartment] = useState(() => new Compartment());

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

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        history(),
        python(),

        // Use four spaces for each indentation level.
        indentUnit.of("    "),
        EditorState.tabSize.of(4),

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
            onChangeRef.current(update.state.doc.toString());
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

    const currentValue = view.state.doc.toString();

    if (currentValue !== value) {
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: value,
        },
      });
    }
  }, [value]);

  return <div className="ws-editor-host" ref={hostRef} />;
}
