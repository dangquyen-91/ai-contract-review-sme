"use client";

import { useEffect } from "react";

// Enhance server-rendered content without hiding it before JS loads or if JS fails.
export function LandingMotion() {
  useEffect(() => {
    const root = document.getElementById("top");
    if (!root || !("IntersectionObserver" in window)) return;

    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const targets = root.querySelectorAll<HTMLElement>(
      ".how-section, .features-main, .feature-list li, .collaboration-section, " +
      "[data-reveal], .faq-section, .cta-section > div",
    );
    const revealed = new WeakSet<Element>();
    const animations = new Set<Animation>();
    let observer: IntersectionObserver | undefined;

    function observe() {
      observer?.disconnect();
      animations.forEach((animation) => animation.cancel());
      animations.clear();
      if (preference.matches) return;

      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || revealed.has(entry.target)) return;
          revealed.add(entry.target);
          observer?.unobserve(entry.target);
          const animation = entry.target.animate(
            [{ opacity: 0, transform: "translateY(16px)" }, { opacity: 1, transform: "translateY(0)" }],
            {
              duration: 600,
              delay: Number(entry.target.getAttribute("data-reveal-delay") ?? 0),
              easing: "cubic-bezier(0.22, 1, 0.36, 1)",
              fill: "backwards",
            },
          );
          animations.add(animation);
          animation.onfinish = () => animations.delete(animation);
        });
      }, { threshold: 0.08 });

      targets.forEach((target) => {
        // Do not fade the content already visible at load, or above a deep link.
        if (target.getBoundingClientRect().top < window.innerHeight) revealed.add(target);
        if (!revealed.has(target)) observer?.observe(target);
      });
    }

    observe();
    preference.addEventListener("change", observe);
    return () => {
      observer?.disconnect();
      preference.removeEventListener("change", observe);
      animations.forEach((animation) => animation.cancel());
    };
  }, []);

  return null;
}
