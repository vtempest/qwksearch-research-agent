import { redirect } from 'next/navigation';

/**
 * `/workspace/demo` — no document specified. Plate is the default Reason
 * Editor engine (see the module comment in `react-reason-editor/docs-agent`),
 * so this bounces to a scratch document on it; the Tiptap control version
 * stays reachable at `/workspace/demo/tiptap/:id`, one click away via the
 * engine switcher in `DemoShell`.
 */
export default function DemoIndexPage() {
  redirect('/workspace/demo/plate/default');
}
