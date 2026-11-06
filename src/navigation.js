import { formatLabel } from './config.js';

export function createNavigation({ root, pages, routes, horizons, labels, onNavigate }) {
  const generatedNodes = [];
  const verticalNav = document.createElement('nav');
  verticalNav.className = 'fs-nav fs-nav-vertical';
  verticalNav.setAttribute('fs-ignore', '');
  verticalNav.setAttribute('aria-label', formatLabel(labels.navigation));

  pages.forEach((page, pageIndex) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'fs-dot';
    button.setAttribute(
      'aria-label',
      formatLabel(labels.page, { index: pageIndex + 1, total: pages.length }),
    );
    button.addEventListener('click', () => {
      const route = routes.find((item) => item.pageIndex === pageIndex);
      onNavigate(route.index);
    });
    verticalNav.append(button);
  });

  root.append(verticalNav);
  generatedNodes.push(verticalNav);

  for (const horizon of horizons.values()) {
    const nav = document.createElement('nav');
    nav.className = 'fs-nav fs-nav-horizon';
    nav.setAttribute('fs-ignore', '');
    nav.setAttribute(
      'aria-label',
      formatLabel(labels.horizonNavigation, { index: horizon.pageIndex + 1 }),
    );

    horizon.slides.forEach((slide, slideIndex) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'fs-dot';
      button.setAttribute(
        'aria-label',
        formatLabel(labels.horizonPage, { index: slideIndex + 1, total: horizon.slides.length }),
      );
      button.addEventListener('click', () => {
        const route = routes.find(
          (item) => item.pageIndex === horizon.pageIndex && item.slideIndex === slideIndex,
        );
        onNavigate(route.index);
      });
      nav.append(button);
    });

    horizon.page.append(nav);
    horizon.nav = nav;
    generatedNodes.push(nav);
  }

  return generatedNodes;
}

export function syncNavigation(root, horizons, route) {
  root.querySelectorAll('.fs-nav-vertical .fs-dot').forEach((button, index) => {
    if (index === route.pageIndex) button.setAttribute('aria-current', 'true');
    else button.removeAttribute('aria-current');
  });

  for (const horizon of horizons.values()) {
    const buttons = horizon.nav?.querySelectorAll('.fs-dot') ?? [];
    buttons.forEach((button, index) => {
      if (horizon.pageIndex === route.pageIndex && index === route.slideIndex) {
        button.setAttribute('aria-current', 'true');
      } else {
        button.removeAttribute('aria-current');
      }
    });
  }
}
