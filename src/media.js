function iframeCommand(iframe, command) {
  const source = iframe.getAttribute('src') || '';
  if (!source) return;

  if (source.includes('player.vimeo.com')) {
    iframe.contentWindow?.postMessage({ method: command }, '*');
    return;
  }

  if (source.includes('youtube.com') || source.includes('youtu.be')) {
    iframe.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: command === 'play' ? 'playVideo' : 'pauseVideo', args: '' }),
      '*',
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
