import React from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import btnStyles from '../components/ui/Button.module.css';
import { fullDocsMd } from '../docs/sources';
import styles from './Docs.module.css';

const remarkPlugins = [remarkGfm];
const rehypePlugins = [rehypeSlug];

/** Renders README.md, DEVELOPMENT.md, and DEPLOY.md from the repo (single source of truth). */
export const Docs: React.FC = () => {
  return (
    <article className={styles.article}>
      <header className={styles.header}>
        <h1 className={styles.title}>Documentation</h1>
        <p className={styles.intro}>
          Built from the repo root Markdown files (<strong>README.md</strong>, <strong>DEVELOPMENT.md</strong>,{' '}
          <strong>DEPLOY.md</strong>) — same content as in git; edit them to update this page. Covers architecture,
          D1/KV caching and purge, local HMR, and deploy steps.
        </p>
        <Link className={clsx(btnStyles.button, btnStyles.primary, btnStyles.md)} to="/admin">
          Go to admin console
        </Link>
      </header>

      <nav className={styles.toc} aria-label="On this page">
        <span className={styles.tocLabel}>Jump to</span>
        <a className={styles.tocLink} href="#proxify-cf">
          README · Overview
        </a>
        <a className={styles.tocLink} href="#architecture">
          Architecture
        </a>
        <a className={styles.tocLink} href="#local-development">
          Local development
        </a>
        <a className={styles.tocLink} href="#kv-caching-local">
          KV caching (local)
        </a>
        <a className={styles.tocLink} href="#deployment-guide">
          Deployment
        </a>
        <a className={styles.tocLink} href="#kv-cache-runtime">
          KV cache (runtime)
        </a>
      </nav>

      <section className={styles.docSection}>
        <div className={styles.markdownBody}>
          <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins}>
            {fullDocsMd}
          </ReactMarkdown>
        </div>
      </section>
    </article>
  );
};
