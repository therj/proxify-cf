import readme from '../../../../README.md?raw';
import development from '../../../../DEVELOPMENT.md?raw';
import deploy from '../../../../DEPLOY.md?raw';

/** Raw markdown from repo root — single source of truth with README.md, DEVELOPMENT.md, DEPLOY.md */
export const readmeMd = readme;
export const developmentMd = development;
export const deployMd = deploy;

/** Rewrite relative `./*.md` links so they jump to in-doc headings on `/docs`. */
export function normalizeDocLinks(md: string): string {
  return md
    .replace(/\]\(\.\/DEVELOPMENT\.md\)/gi, '](#local-development)')
    .replace(/\]\(\.\/DEPLOY\.md\)/gi, '](#deployment-guide)')
    .replace(/\]\(\.\/README\.md\)/gi, '](#proxify-cf)');
}

/** Single markdown document so `rehype-slug` assigns globally unique heading ids (fixes TOC hash targets). */
export const fullDocsMd = normalizeDocLinks(
  `${readme}\n\n---\n\n${development}\n\n---\n\n${deploy}`
);
