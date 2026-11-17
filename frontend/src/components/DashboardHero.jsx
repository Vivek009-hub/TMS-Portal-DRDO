import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SLIDES = [
  {
    title: 'Training Management Portal',
    subtitle: 'Streamlining participant records, course scheduling and certification for the Defence R&D Organisation',
    cta: { label: '+ Add Participant', path: '/participants' },
    gradient: 'linear-gradient(120deg, var(--primary-900) 0%, var(--primary-700) 60%, var(--primary-500) 100%)',
  },
  {
    title: 'Course Management, Year-Wise',
    subtitle: 'Plan schedules, allocate seats by department and track course progress from a single dashboard',
    cta: { label: '+ Add Course', path: '/courses' },
    gradient: 'linear-gradient(120deg, var(--primary-800) 0%, #0f766e 60%, #059669 100%)',
  },
  {
    title: 'Certificates, Verified and Traceable',
    subtitle: 'Generate completion, participation and detention certificates with QR-based verification',
    cta: { label: '+ Generate Certificate', path: '/certificates' },
    gradient: 'linear-gradient(120deg, var(--primary-900) 0%, #7c2d12 60%, #d97706 100%)',
  },
];

const AUTOPLAY_MS = 5000;

export default function DashboardHero() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (paused) return undefined;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(timerRef.current);
  }, [paused]);

  const goTo = (i) => setIndex((i + SLIDES.length) % SLIDES.length);
  const slide = SLIDES[index];

  return (
    <div className="hero-carousel">
      <div className="hero-overlay" style={{ background: slide.gradient }} />

      <button type="button" className="hero-arrow hero-arrow-left" onClick={() => goTo(index - 1)} aria-label="Previous slide">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
      </button>

      <div className="hero-content">
        <div className="hero-caption">
          <h2>{slide.title}</h2>
          <p>{slide.subtitle}</p>
          <button type="button" className="btn btn-secondary btn-sm hero-cta" onClick={() => navigate(slide.cta.path)}>
            {slide.cta.label}
          </button>
        </div>
      </div>

      <button type="button" className="hero-arrow hero-arrow-right" onClick={() => goTo(index + 1)} aria-label="Next slide">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
      </button>

      <div className="hero-dots">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            className={`hero-dot ${i === index ? 'active' : ''}`}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      <button type="button" className="hero-pause-btn" onClick={() => setPaused((p) => !p)} aria-label={paused ? 'Play' : 'Pause'}>
        {paused ? (
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
        )}
      </button>
    </div>
  );
}
