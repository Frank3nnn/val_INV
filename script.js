// ======== Setup ========
const start = Date.now();
const startEl = document.getElementById('startTime');
if (startEl) startEl.value = String(start);

const form = document.getElementById('rsvpForm');
const statusEl = document.getElementById('form-status');
const submitBtn = document.getElementById('submitBtn');
const replyTo = document.getElementById('replyTo');

const yesBtn = document.getElementById('yesBtn');
const noBtn  = document.getElementById('noBtn');
const rsvpSection = document.getElementById('rsvp');
const fxCanvas = document.getElementById('fxCanvas');
const ctx = fxCanvas.getContext('2d');

// Resize canvas
function resizeCanvas(){
  fxCanvas.width  = window.innerWidth;
  fxCanvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ======== UX helpers ========
function showStatus(message, type){
  statusEl.textContent = message || '';
  statusEl.className = type ? type : '';
}

// Smooth scroll to RSVP
function openRSVP(){
  rsvpSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ======== No button evasive behavior ========
let evadeCount = 0;
function moveNoButton(ev){
  // Make it "run away" to a random offset within the hero area
  const hero = document.querySelector('.hero');
  const rect = hero.getBoundingClientRect();

  const maxX = rect.width - noBtn.offsetWidth - 16;
  const maxY = rect.height - noBtn.offsetHeight - 16;

  const randomX = Math.max(0, Math.min(maxX, Math.random() * maxX));
  const randomY = Math.max(0, Math.min(maxY, Math.random() * maxY));

  noBtn.classList.add('moving');
  noBtn.style.transform = `translate(${randomX - (noBtn.offsetLeft - rect.left)}px, ${randomY - (noBtn.offsetTop - rect.top)}px)`;

  // Make YES subtly grow to encourage acceptance
  evadeCount++;
  const scale = Math.min(1 + evadeCount * 0.03, 1.25);
  yesBtn.style.transform = `scale(${scale})`;
}

// Desktop hover + click, mobile touch
noBtn.addEventListener('mouseenter', moveNoButton);
noBtn.addEventListener('click', moveNoButton);
noBtn.addEventListener('touchstart', (e) => { e.preventDefault(); moveNoButton(e); }, {passive:false});

// ======== Confetti hearts on "Yes" ========
function launchHearts(durationMs = 1200, count = 60){
  const particles = [];
  const colors = ['#ef476f', '#e11d48', '#fb7185', '#fca5a5'];

  for (let i = 0; i < count; i++){
    particles.push({
      x: window.innerWidth/2,
      y: window.innerHeight/3,
      vx: (Math.random() - 0.5) * 6,
      vy: - (Math.random() * 8 + 6),
      g: 0.25 + Math.random() * 0.15,
      size: 10 + Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: durationMs + Math.random() * 300
    });
  }

  const t0 = performance.now();
  function heartPath(ctx, x, y, s){
    ctx.beginPath();
    const k = s/2;
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x - k, y - k, x - s, y + k, x, y + s);
    ctx.bezierCurveTo(x + s, y + k, x + k, y - k, x, y);
    ctx.closePath();
  }

  function draw(now){
    const dt = Math.min(32, now - (draw._last || now));
    draw._last = now;
    ctx.clearRect(0,0,fxCanvas.width, fxCanvas.height);

    particles.forEach(p => {
      p.vy += p.g * (dt/16);
      p.x += p.vx * (dt/16);
      p.y += p.vy * (dt/16);
      p.life -= dt;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.x + p.y) * 0.01);
      ctx.fillStyle = p.color;
      heartPath(ctx, 0, 0, p.size);
      ctx.fill();
      ctx.restore();
    });

    // Keep those still alive
    for (let i = particles.length - 1; i >= 0; i--){
      if (particles[i].life <= 0 || particles[i].y > window.innerHeight + 80) {
        particles.splice(i,1);
      }
    }

    if (particles.length > 0) requestAnimationFrame(draw);
    else ctx.clearRect(0,0,fxCanvas.width, fxCanvas.height);
  }

  requestAnimationFrame(draw);
}

yesBtn.addEventListener('click', () => {
  launchHearts();
  openRSVP();
});

// ======== Formspree AJAX submit ========
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Simple human check: at least 1.5s on page
  const elapsed = Date.now() - start;
  if (elapsed < 1500) {
    showStatus('Please take a moment to fill out the form 😊', 'error');
    return;
  }

  // Set Reply-To header for your email threading
  const emailInput = form.querySelector('input[name="email"]');
  if (emailInput && emailInput.value) replyTo.value = emailInput.value;

  submitBtn.disabled = true;
  showStatus('Sending your RSVP…', null);

  try {
    const formData = new FormData(form);
    const res = await fetch(form.action, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: formData
    });

    if (res.ok) {
      form.reset();
      showStatus('Got it! 💌 Check your email for confirmation.', 'success');
    } else {
      const data = await res.json().catch(() => ({}));
      const msg = data.errors?.map(e => e.message).join(', ') ||
                  'Sorry, something went wrong. Please try again.';
      showStatus(msg, 'error');
    }
  } catch (err) {
    showStatus('Network error. Please try again.', 'error');
  } finally {
    submitBtn.disabled = false;
  }
});