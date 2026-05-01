import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Scroll the window and any app scroll containers to top on client-side navigation. */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    for (const el of document.querySelectorAll<HTMLElement>('[data-scroll-root]')) {
      el.scrollTop = 0;
    }
  }, [pathname]);

  return null;
}
