import Swiper from 'swiper/bundle';
import FullScroll from '../../src/fullscroll.js';

const root = document.querySelector('[fs]');
const routeStatus = document.querySelector('#route-status');
const fullscroll = new FullScroll(root, {
  Swiper,
  breakpoint: 0,
  dots: true,
  speed: 560,
  touchThreshold: 36,
  history: true,
});

function updateStatus() {
  routeStatus.textContent = `${fullscroll.state.currentIndex + 1} / ${fullscroll.state.total}`;
}

root.addEventListener('fullscroll:change', updateStatus);
document.querySelector('#restart').addEventListener('click', () => {
  fullscroll.moveTo('opening');
});

updateStatus();
window.fullscrollMobileDemo = fullscroll;
