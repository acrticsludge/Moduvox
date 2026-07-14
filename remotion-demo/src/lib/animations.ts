import { interpolate } from 'remotion';

export const fadeIn = (frame: number, duration: number = 20) => {
  return interpolate(frame, [0, duration], [0, 1], { extrapolateRight: 'clamp' });
};

export const fadeOut = (frame: number, start: number, duration: number = 20) => {
  return interpolate(frame, [start, start + duration], [1, 0], { extrapolateRight: 'clamp' });
};

// Ease-out animation (0.25s) matching actual Moduvox CSS: animation: slide-up 0.25s ease-out
export const easeOut = (frame: number, fps: number, delay: number = 0) => {
  const startFrame = delay * fps;
  const durationFrames = 0.25 * fps; // 0.25 seconds
  const progress = Math.min(Math.max((frame - startFrame) / durationFrames, 0), 1);
  // ease-out: 1 - (1 - x)^2
  return 1 - Math.pow(1 - progress, 2);
};

// Spring curve used ONLY on "Start free" button per actual site
export const springCurve = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

export const slideUp = (frame: number, fps: number, delay: number = 0) => {
  const startFrame = delay * fps;
  const durationFrames = 0.25 * fps; // 0.25s
  const progress = Math.min(Math.max((frame - startFrame) / durationFrames, 0), 1);
  // ease-out for vertical slide
  const eased = 1 - Math.pow(1 - progress, 2);
  return interpolate(eased, [0, 1], [30, 0]); // 30px offset
};

export const scaleIn = (frame: number, fps: number, delay: number = 0) => {
  const startFrame = delay * fps;
  const durationFrames = 0.25 * fps;
  const progress = Math.min(Math.max((frame - startFrame) / durationFrames, 0), 1);
  const eased = 1 - Math.pow(1 - progress, 2);
  return interpolate(eased, [0, 1], [0.95, 1]);
};

export const typingEffect = (text: string, frame: number, speed: number = 2) => {
  const chars = Math.floor(frame / speed);
  return text.slice(0, chars);
};

export const progressFill = (frame: number, start: number, duration: number, target: number) => {
  return interpolate(frame, [start, start + duration], [0, target], { extrapolateRight: 'clamp' });
};