function waitForSwiper(swiper, duration, start) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(fallback);
      swiper.off?.('transitionEnd', finish);
      callback(value);
    };
    const finish = () => settle(resolve);
    const fallback = setTimeout(finish, duration + 180);

    try {
      swiper.once?.('transitionEnd', finish);
      start();
    } catch (error) {
      settle(reject, error);
    }
  });
}

export function transitionToIndex(swiper, index, duration, flowOffset = null) {
  if (!swiper) return Promise.resolve();

  if (flowOffset !== null && typeof swiper.translateTo === 'function') {
    swiper.slideTo(index, 0, false);
    return transitionToOffset(swiper, flowOffset, duration);
  }

  if (duration === 0 || swiper.activeIndex === index) {
    swiper.slideTo(index, 0, false);
    return Promise.resolve();
  }

  return waitForSwiper(swiper, duration, () => swiper.slideTo(index, duration, true));
}

export function transitionToOffset(swiper, offset, duration) {
  const translate = -offset;
  if (duration === 0) {
    swiper.translateTo(translate, 0, false, false);
    return Promise.resolve();
  }

  return waitForSwiper(swiper, duration, () =>
    swiper.translateTo(translate, duration, true, false),
  );
}
