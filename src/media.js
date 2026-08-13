const VIMEO_HOSTS = new Set(['player.vimeo.com']);
const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'youtu.be',
]);

function iframeCommand(iframe, command) {
  const source = iframe.getAttribute('src') || '';
  if (!source) return;

  let url;
  try {
    url = new URL(source, document.baseURI);
  } catch {
    return;
  }

  if (VIMEO_HOSTS.has(url.hostname)) {
    iframe.contentWindow?.postMessage({ method: command }, url.origin);
    return;
  }

  if (YOUTUBE_HOSTS.has(url.hostname)) {
    iframe.contentWindow?.postMessage(
      JSON.stringify({
        event: 'command',
        func: command === 'play' ? 'playVideo' : 'pauseVideo',
        args: [],
      }),
      url.origin,
    );
  }
}

function forEachRouteMedia(element, callback) {
  if (!element) return;
  element.querySelectorAll('video').forEach((video) => callback(video, 'video'));
  element.querySelectorAll('iframe').forEach((iframe) => callback(iframe, 'iframe'));
}

export function playRouteMedia(element) {
  forEachRouteMedia(element, (media, type) => {
    if (type === 'iframe') {
      iframeCommand(media, 'play');
      return;
    }
    media.play?.()?.catch?.(() => {});
  });
}

export function pauseRouteMedia(element) {
  forEachRouteMedia(element, (media, type) => {
    if (type === 'iframe') iframeCommand(media, 'pause');
    else media.pause?.();
  });
}
