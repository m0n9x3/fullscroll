import { afterEach, describe, expect, it, vi } from 'vitest';
import { pauseRouteMedia, playRouteMedia } from '../src/media.js';

function mountIframe(source) {
  document.body.innerHTML = `<section><iframe src="${source}"></iframe></section>`;
  const section = document.querySelector('section');
  const iframe = section.querySelector('iframe');
  const postMessage = vi.spyOn(iframe.contentWindow, 'postMessage').mockImplementation(() => {});
  return { section, postMessage };
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('route media', () => {
  it('targets the exact Vimeo origin', () => {
    const { section, postMessage } = mountIframe('https://player.vimeo.com/video/123');

    playRouteMedia(section);
    pauseRouteMedia(section);

    expect(postMessage).toHaveBeenNthCalledWith(1, { method: 'play' }, 'https://player.vimeo.com');
    expect(postMessage).toHaveBeenNthCalledWith(2, { method: 'pause' }, 'https://player.vimeo.com');
  });

  it('supports privacy-enhanced YouTube embeds with an exact origin', () => {
    const { section, postMessage } = mountIframe('https://www.youtube-nocookie.com/embed/abc');

    playRouteMedia(section);

    const [payload, origin] = postMessage.mock.calls[0];
    expect(JSON.parse(payload)).toEqual({ event: 'command', func: 'playVideo', args: [] });
    expect(origin).toBe('https://www.youtube-nocookie.com');
  });

  it('does not message unrelated hosts containing a player name in their URL', () => {
    const { section, postMessage } = mountIframe('https://example.com/embed?next=youtube.com');

    playRouteMedia(section);

    expect(postMessage).not.toHaveBeenCalled();
  });
});
