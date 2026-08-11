import Swiper from 'swiper/bundle';
import FullScroll from '../../src/fullscroll.js';

const root = document.querySelector('[fs]');
const fullscroll = new FullScroll(root, {
  Swiper,
  breakpoint: 0,
  dots: true,
  speed: 560,
  touchThreshold: 36,
  history: true,
});
window.fullscrollMobileDemo = fullscroll;
