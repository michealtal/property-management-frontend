import { useState } from 'react';
import { thumbUrl } from '../lib/image';

const SIZES = { sm: 'h-9 w-9 text-sm', md: 'h-12 w-12 text-lg', lg: 'h-20 w-20 text-3xl' };
const PX = { sm: 36, md: 48, lg: 80 };

// Photo when there is one, the first letter of the name otherwise.
// It tries a small thumbnail first, then the original link, then the letter.
// A new `src` starts over, so a fixed link is never stuck on the letter.
export default function Avatar({ src, name = '', size = 'sm' }) {
  const [attempt, setAttempt] = useState({ src, level: 0 });
  const level = attempt.src === src ? attempt.level : 0;
  const thumb = src ? thumbUrl(src, PX[size]) : '';
  // Skip the thumbnail step when the link has no thumbnail form.
  const url = level === 0 && thumb !== src ? thumb : level <= 1 ? src : '';

  if (url) {
    return (
      <img
        src={url}
        alt={name ? `Photo of ${name}` : ''}
        loading="lazy"
        decoding="async"
        onError={() => setAttempt({ src, level: level === 0 && thumb !== src ? 1 : 2 })}
        className={`${SIZES[size].split(' ').slice(0, 2).join(' ')} shrink-0 rounded-full object-cover`}
      />
    );
  }
  return (
    <span
      className={`grid ${SIZES[size]} shrink-0 place-items-center rounded-full bg-brand-100 font-display font-bold text-brand-800`}
    >
      {name.trim()[0]?.toUpperCase() || '?'}
    </span>
  );
}
