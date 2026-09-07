import type { ReactNode } from 'react';

import { DocsLayout } from 'fumadocs-ui/layouts/notebook';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { source } from 'user-help-docs';

import { docsLayoutOptions } from './layout.config';

export default function DocsRootLayout({ children }: { children: ReactNode }) {
  return (
    <RootProvider>
      <DocsLayout tree={source.pageTree} {...docsLayoutOptions}>
        {children}
      </DocsLayout>
    </RootProvider>
  );
}
