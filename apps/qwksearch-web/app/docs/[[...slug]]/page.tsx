import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/page';
import { source, type HelpDocPageData } from 'user-help-docs';

import { docsCompiler } from '@/lib/docs/compiler';
import { getMDXComponents } from '@/lib/docs/mdx-components';

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await props.params;
  const page = source.getPage(slug);
  if (!page) notFound();

  const data = page.data as HelpDocPageData;
  const compiled = await docsCompiler.compile({
    source: data.content,
    filePath: page.path,
  });
  const MDX = compiled.body;

  return (
    <DocsPage toc={compiled.toc}>
      <DocsTitle>{data.title}</DocsTitle>
      {data.description ? <DocsDescription>{data.description}</DocsDescription> : null}
      <DocsBody>
        <MDX components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const page = source.getPage(slug);
  if (!page) notFound();

  const data = page.data as HelpDocPageData;
  return {
    title: data.title,
    description: data.description,
  };
}
