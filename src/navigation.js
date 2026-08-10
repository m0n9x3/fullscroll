export function createNavigation({ root, pages, routes, horizons, onNavigate }) {
  const generatedNodes = [];
  const verticalNav = document.createElement('nav');
  verticalNav.className = 'fs-nav fs-nav-vertical';
  verticalNav.setAttribute('fs-ignore', '');
  verticalNav.setAttribute('aria-label', '페이지 이동');

  pages.forEach((page, pageIndex) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'fs-dot';
    button.setAttribute('aria-label', `${pageIndex + 1}번째 페이지`);
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
    nav.setAttribute('aria-label', `${horizon.pageIndex + 1}번째 페이지의 가로 이동`);

    horizon.slides.forEach((slide, slideIndex) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'fs-dot';
      button.setAttribute('aria-label', `${slideIndex + 1}번째 가로 페이지`);
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
