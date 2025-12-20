(function () {
  const form = document.getElementById('planEventForm');
  if (!form) return;

  const messageEl = document.getElementById('planEventMessage');
  const authNotice = document.getElementById('planAuthNotice');
  const fileInput = document.getElementById('clientUpload');
  const fileLabel = document.getElementById('clientUploadLabel');
  const { apiFetch, getToken, clearAuth, syncAuthNav } = window.PlanityAPI || {};
  const steps = Array.from(document.querySelectorAll('[data-plan-step]'));
  const stepDots = Array.from(document.querySelectorAll('[data-step-dot]'));
  const prevBtn = document.getElementById('planPrevBtn');
  const nextBtn = document.getElementById('planNextBtn');
  const submitBtn = document.getElementById('planSubmitBtn');
  const stepHint = document.getElementById('planStepHint');
  const uploadPreview = document.getElementById('planUploadPreview');
  const authAction = document.getElementById('planAuthAction');
  const authNoticeText = document.querySelector('#planAuthNotice span');
  let fileQueue = [];
  let stepIndex = 0;
  const UPLOAD_URL = '/api/v1/upload';

  if (typeof syncAuthNav === 'function') {
    syncAuthNav();
  }

  const setMessage = (text, tone = 'info') => {
    if (!messageEl) return;
    messageEl.textContent = text || '';
    messageEl.className = `plan-event-message${tone && tone !== 'info' ? ' ' + tone : ''}`;
  };

  const clampStep = (idx) => {
    if (!steps.length) return 0;
    return Math.max(0, Math.min(idx, steps.length - 1));
  };

  const syncStepUI = () => {
    if (!steps.length) {
      submitBtn?.classList.remove('hidden');
      return;
    }

    stepIndex = clampStep(stepIndex);
    steps.forEach((step, idx) => {
      const isActive = idx === stepIndex;
      step.classList.toggle('is-active', isActive);
      step.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    });
    stepDots.forEach((dot, idx) => {
      dot.classList.toggle('is-active', idx === stepIndex);
      dot.classList.toggle('is-complete', idx < stepIndex);
    });
    const isLast = stepIndex === steps.length - 1;
    if (prevBtn) prevBtn.disabled = stepIndex === 0;
    if (nextBtn) nextBtn.classList.toggle('hidden', isLast);
    if (submitBtn) submitBtn.classList.toggle('hidden', !isLast);
    if (stepHint) stepHint.textContent = `Step ${stepIndex + 1} of ${steps.length}`;
    if (nextBtn) {
      const nextLabel = steps[stepIndex + 1]?.dataset.stepLabel;
      nextBtn.textContent = nextLabel ? `Next: ${nextLabel}` : 'Next step';
    }
  };

  const validateStep = () => {
    if (!steps.length) return true;
    const step = steps[stepIndex];
    if (!step) return true;
    const fields = Array.from(step.querySelectorAll('input, select, textarea'));
    const firstInvalid = fields.find((f) => !f.checkValidity());
    if (firstInvalid) {
      firstInvalid.reportValidity();
      return false;
    }
    return true;
  };

  const goToStep = (idx) => {
    if (!steps.length) return;
    stepIndex = clampStep(idx);
    syncStepUI();
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  syncStepUI();

  nextBtn?.addEventListener('click', () => {
    if (!validateStep()) return;
    goToStep(stepIndex + 1);
  });

  prevBtn?.addEventListener('click', () => goToStep(stepIndex - 1));

  const getVal = (id) => document.getElementById(id)?.value?.trim() || '';

  const toggleFormLocked = (locked) => {
    const controls = Array.from(form.querySelectorAll('input, select, textarea, button'));
    controls.forEach((el) => {
      el.disabled = locked;
    });
    form.classList.toggle('is-locked', locked);
  };

  const updateAuthAction = (authed) => {
    if (!authAction) return;
    if (authed) {
      authAction.textContent = 'Log Out';
      authAction.href = '#';
      authAction.onclick = (e) => {
        e.preventDefault();
        if (typeof clearAuth === 'function') clearAuth();
        form.reset();
        fileQueue = [];
        syncFileInputFromQueue();
        renderPreview();
        stepIndex = 0;
        syncStepUI();
        toggleFormLocked(true);
        ensureAuthNotice();
        if (typeof syncAuthNav === 'function') syncAuthNav();
      };
    } else {
      authAction.textContent = 'Log In';
      authAction.href = 'login.html';
      authAction.onclick = null;
    }
  };

  const ensureAuthNotice = () => {
    if (!authNotice) return;
    const authed = typeof getToken === 'function' && !!getToken();
    if (authNoticeText) {
      authNoticeText.textContent = authed
        ? 'You are logged in. You can submit your event or log out.'
        : 'Log in so we can save and track this request for you.';
    }
    authNotice.classList.toggle('is-authed', authed);
    toggleFormLocked(!authed);
    updateAuthAction(authed);
  };

  const syncFileInputFromQueue = () => {
    if (!fileInput) return;
    const dt = new DataTransfer();
    fileQueue.forEach((f) => dt.items.add(f));
    fileInput.files = dt.files;
  };

  const renderPreview = () => {
    if (fileLabel) {
      if (!fileQueue.length) {
        fileLabel.textContent = 'No file chosen';
      } else if (fileQueue.length === 1) {
        fileLabel.textContent = fileQueue[0].name;
      } else {
        fileLabel.textContent = `${fileQueue.length} files selected`;
      }
    }

    if (!uploadPreview) return;
    if (!fileQueue.length) {
      uploadPreview.innerHTML = '';
      return;
    }

    const html = fileQueue
      .map(
        (file, idx) => `
        <div class="plan-upload-chip" data-upload-idx="${idx}">
          <span>${file.name}</span>
          <button type="button" aria-label="Remove ${file.name}">Remove</button>
        </div>
      `
      )
      .join('');
    uploadPreview.innerHTML = html;
  };

  fileInput?.addEventListener('change', () => {
    const files = Array.from(fileInput.files || []);
    if (files.length) {
      fileQueue = fileQueue.concat(files);
      syncFileInputFromQueue();
    }
    renderPreview();
  });

  uploadPreview?.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const chip = btn.closest('[data-upload-idx]');
    const idx = parseInt(chip?.dataset?.uploadIdx || '-1', 10);
    if (Number.isNaN(idx) || idx < 0) return;
    fileQueue.splice(idx, 1);
    syncFileInputFromQueue();
    renderPreview();
  });

  const uploadImages = async (files) => {
    const list = Array.from(files || []);
    if (!list.length) return [];
    const token = typeof getToken === 'function' ? getToken() : null;
    if (!token) throw new Error('Please log in to upload an image.');
    const fd = new FormData();
    list.forEach((f) => fd.append('images', f));
    const res = await fetch(UPLOAD_URL, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token
      },
      body: fd
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      const msg = data?.message || data?.error || `Upload failed (${res.status})`;
      throw new Error(msg);
    }
    return Array.isArray(data.data) ? data.data : [];
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (steps.length && stepIndex < steps.length - 1) {
      if (validateStep()) {
        goToStep(stepIndex + 1);
      }
      return;
    }

    if (typeof apiFetch !== 'function' || typeof getToken !== 'function') {
      setMessage('Unable to submit right now. Please refresh and try again.', 'error');
      return;
    }

    if (!getToken()) {
      setMessage('Please log in to create an event.', 'warn');
      ensureAuthNotice();
      return;
    }

    const clientName = getVal('clientName');
    const clientEmail = getVal('clientEmail');
    const clientPhone = getVal('clientPhone');
    const clientDesignation = getVal('clientDesignation');
    const eventName = getVal('eventName');
    const eventDetails = getVal('eventDetails');
    const eventDate = getVal('eventDate');
    const eventTime = getVal('eventTime') || '00:00';
    const venueName = getVal('venueName');
    const eventType = document.getElementById('eventType')?.value || '';
    const eventStatus = document.getElementById('eventStatus')?.value || '';
    const guests = parseInt(getVal('totalSeat') || '0', 10);
    const budget = parseFloat(getVal('ticketPrice') || '0');

    if (!eventType || !eventDate || !venueName || Number.isNaN(guests) || guests < 1 || Number.isNaN(budget) || budget <= 0) {
      setMessage('Please fill all required fields (type, date, venue, seats, and ticket price).', 'error');
      return;
    }

    const dateInput = `${eventDate}T${eventTime || '00:00'}`;
    const isoDate = new Date(dateInput);
    if (Number.isNaN(isoDate.getTime())) {
      setMessage('Enter a valid date and time.', 'error');
      return;
    }

    const notesBlocks = [];
    if (eventDetails) notesBlocks.push(eventDetails);
    const contactLines = [
      clientName ? `Client: ${clientName}` : '',
      clientEmail ? `Email: ${clientEmail}` : '',
      clientPhone ? `Phone: ${clientPhone}` : '',
      clientDesignation ? `Designation: ${clientDesignation}` : '',
      eventStatus ? `Requested status: ${eventStatus}` : ''
    ].filter(Boolean);
    if (contactLines.length) notesBlocks.push(contactLines.join('\n'));

    const selectedFiles = Array.from(fileQueue);
    let uploadedPaths = [];
    if (selectedFiles.length) {
      setMessage('Uploading your images...', 'info');
      try {
        uploadedPaths = await uploadImages(selectedFiles);
        if (uploadedPaths.length) notesBlocks.push(`Client images: ${uploadedPaths.join(', ')}`);
      } catch (err) {
        // keep going but surface the warning
        setMessage(err?.message || 'Image upload failed; submitting without images.', 'warn');
      }
    }

    const payload = {
      type: eventType,
      theme: eventName || undefined,
      date: isoDate.toISOString(),
      budget,
      guests,
      location: venueName,
      notes: notesBlocks.join('\n\n') || undefined
    };

    setMessage('Saving your event request...', 'info');
    try {
      await apiFetch('/events', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setMessage('Event created! We will confirm details with you shortly.', 'success');
      form.reset();
      fileQueue = [];
      syncFileInputFromQueue();
      renderPreview();
      if (fileLabel) fileLabel.textContent = 'No file chosen';
      if (steps.length) {
        stepIndex = 0;
        syncStepUI();
      }
    } catch (err) {
      setMessage(err?.message || 'Could not create the event right now.', 'error');
    }
  });

  ensureAuthNotice();
})();
