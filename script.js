// Fill timestamp trap as soon as possible
const start = Date.now();
const startEl = document.getElementById('startTime');
if (startEl) startEl.value = String(start);

const form = document.getElementById('rsvpForm');
const statusEl = document.getElementById('form-status');
const submitBtn = document.getElementById('submitBtn');
const replyTo = document.getElementById('replyTo');

function showStatus(message, type){
  statusEl.textContent = message || '';
  statusEl.className = type ? type : '';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Simple human check: at least 1.5s on page
  const elapsed = Date.now() - start;
  if (elapsed < 1500) {
    showStatus('Please take a moment to fill out the form 😊', 'error');
    return;
  }

  // Set Reply-To header for your email client threading
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