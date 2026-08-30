export const triggerConfetti = (options?: {
  particleCount?: number;
  spread?: number;
  origin?: { x: number; y: number };
}) => {
  const {
    particleCount = 120,
    spread = 80,
    origin = { x: 0.5, y: 0.5 },
  } = options || {};

  const colors = ["#6B38C3", "#8A4FFF", "#10B981", "#FFD700", "#F59E0B", "#EF4444", "#3B82F6", "#EC4899"];
  const shapes = ["circle", "square", "star"];

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement("div");
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const size = Math.random() * 10 + 4;
    const color = colors[Math.floor(Math.random() * colors.length)];

    let borderRadius = "50%";
    if (shape === "square") borderRadius = "2px";
    if (shape === "star") borderRadius = "0";

    particle.style.cssText = `
      position: fixed;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: ${borderRadius};
      pointer-events: none;
      z-index: 9999;
      left: ${origin.x * 100}vw;
      top: ${origin.y * 100}vh;
      box-shadow: 0 0 ${size}px ${color}40;
    `;
    document.body.appendChild(particle);

    const angle = (Math.random() * spread - spread / 2) * (Math.PI / 180);
    const velocity = Math.random() * 400 + 200;
    const vx = Math.cos(angle) * velocity;
    const vy = Math.sin(angle) * velocity - 200;
    const rotation = Math.random() * 720 - 360;

    const startTime = Date.now();
    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const x = vx * elapsed;
      const y = vy * elapsed + 600 * elapsed * elapsed;
      const opacity = Math.max(0, 1 - elapsed / 1.8);
      const rot = rotation * elapsed;

      particle.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`;
      particle.style.opacity = String(opacity);

      if (opacity > 0) {
        requestAnimationFrame(animate);
      } else {
        particle.remove();
      }
    };

    requestAnimationFrame(animate);
  }
};

export const triggerSlotMachine = (
  element: HTMLElement,
  targetValue: number,
  duration: number = 1500
) => {
  const startTime = Date.now();
  const animate = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const currentValue = Math.round(targetValue * eased);

    if (element) {
      element.textContent = currentValue.toLocaleString();
    }

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };
  requestAnimationFrame(animate);
};
