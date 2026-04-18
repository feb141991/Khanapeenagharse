const yearNode = document.querySelector("#year");
if (yearNode) {
  yearNode.textContent = new Date().getFullYear();
}

const motionNodes = document.querySelectorAll(".hero-stage-card, .route-card, .landing-intro");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function setupPointerMotion() {
  if (reduceMotion) return;

  window.addEventListener("mousemove", (event) => {
    const x = (event.clientX / window.innerWidth) - 0.5;
    const y = (event.clientY / window.innerHeight) - 0.5;

    motionNodes.forEach((node, index) => {
      const depth = (index + 1) * 8;
      const rotateX = y * -6;
      const rotateY = x * 6;
      node.style.transform = `translate3d(${x * depth}px, ${y * depth}px, 0) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    document.documentElement.style.setProperty("--pointer-x", `${event.clientX}px`);
    document.documentElement.style.setProperty("--pointer-y", `${event.clientY}px`);
  });
}

function setupHeroCanvas() {
  const canvas = document.querySelector("#hero-canvas");
  if (!canvas || reduceMotion) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const particles = Array.from({ length: 42 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: Math.random() * 2 + 0.8,
    dx: (Math.random() - 0.5) * 0.0009,
    dy: (Math.random() - 0.5) * 0.0009,
    alpha: Math.random() * 0.7 + 0.2
  }));

  let pointer = { x: 0.7, y: 0.25 };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * window.devicePixelRatio));
    canvas.height = Math.max(1, Math.floor(rect.height * window.devicePixelRatio));
    ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  }

  function draw() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      p.x += p.dx + (pointer.x - 0.5) * 0.0002;
      p.y += p.dy + (pointer.y - 0.5) * 0.0002;

      if (p.x < 0 || p.x > 1) p.dx *= -1;
      if (p.y < 0 || p.y > 1) p.dy *= -1;

      const px = p.x * width;
      const py = p.y * height;

      ctx.beginPath();
      ctx.fillStyle = `rgba(247, 240, 223, ${p.alpha})`;
      ctx.arc(px, py, p.r, 0, Math.PI * 2);
      ctx.fill();

      for (let j = i + 1; j < particles.length; j += 1) {
        const q = particles[j];
        const qx = q.x * width;
        const qy = q.y * height;
        const distance = Math.hypot(px - qx, py - qy);
        if (distance < 160) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(211, 164, 81, ${0.14 * (1 - distance / 160)})`;
          ctx.lineWidth = 1;
          ctx.moveTo(px, py);
          ctx.lineTo(qx, qy);
          ctx.stroke();
        }
      }
    }

    const gradient = ctx.createRadialGradient(pointer.x * width, pointer.y * height, 0, pointer.x * width, pointer.y * height, 220);
    gradient.addColorStop(0, "rgba(211, 164, 81, 0.18)");
    gradient.addColorStop(1, "rgba(211, 164, 81, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(pointer.x * width, pointer.y * height, 220, 0, Math.PI * 2);
    ctx.fill();

    window.requestAnimationFrame(draw);
  }

  window.addEventListener("mousemove", (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer = {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height
    };
  });

  window.addEventListener("resize", resize);
  resize();
  draw();
}

setupPointerMotion();
setupHeroCanvas();
