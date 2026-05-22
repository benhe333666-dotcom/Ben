import { gsap } from "gsap";

export const mountTimelineMotion = (root: HTMLElement) => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => undefined;

  const context = gsap.context(() => {
    gsap.from(".timeline-group", {
      opacity: 0,
      y: 28,
      duration: 0.55,
      stagger: 0.08,
      ease: "power3.out"
    });

    gsap.from(".news-card", {
      opacity: 0,
      y: 18,
      duration: 0.45,
      stagger: 0.035,
      ease: "power2.out",
      delay: 0.08
    });

    gsap.fromTo(
      ".fresh-dot",
      { scale: 0.82, opacity: 0.65 },
      {
        scale: 1.18,
        opacity: 1,
        duration: 0.7,
        repeat: 2,
        yoyo: true,
        ease: "sine.inOut"
      }
    );
  }, root);

  return () => context.revert();
};
