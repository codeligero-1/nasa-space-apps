const $ = (selector) => document.querySelector(selector);

const appState = {
  done: new Set(),
  loginInProgress: false,
  activeTab: 'overview',
  xp: 40,
  registrationReader: null,
  registrationAbortController: null,
  soundsEnabled: true,
  audioContext: null,
  assistantVisible: false,
  voiceEnabled: false,
  speechRecognition: null,
  voiceQueryActive: false,
  missionSpeaking: false
};

let D = window.VITAL_DATA.metrics;
const MIS = window.VITAL_DATA.missions;
const KB = window.VITAL_DATA.chatKnowledge;

function playTone(frequency, duration, volume, delay = 0) {
  if (!appState.soundsEnabled || !window.AudioContext) return;

  try {
    if (!appState.audioContext) {
      appState.audioContext = new window.AudioContext();
    }
    const context = appState.audioContext;
    if (context.state === 'suspended') {
      context.resume().catch((error) => console.warn('Could not resume sound effects:', error));
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + delay;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration);
  } catch (error) {
    console.warn('Could not play sound effect:', error);
  }
}

function playSound(name, progress = 0) {
  if (name === 'click') {
    playTone(520, 0.045, 0.07);
  } else if (name === 'fill') {
    playTone(440 + progress * 150, 0.12, 0.11);
  } else if (name === 'login') {
    playTone(523, 0.28, 0.11);
    playTone(659, 0.28, 0.11, 0.11);
    playTone(784, 0.38, 0.11, 0.22);
  } else if (name === 'assistant') {
    playTone(740, 0.14, 0.07);
    playTone(988, 0.2, 0.07, 0.09);
  }
}

function updateSoundToggle() {
  const toggle = $('#soundToggle');
  toggle.textContent = appState.soundsEnabled ? 'Sound on' : 'Sound off';
  toggle.setAttribute('aria-pressed', String(appState.soundsEnabled));
  toggle.setAttribute(
    'aria-label',
    appState.soundsEnabled ? 'Turn sound effects off' : 'Turn sound effects on'
  );
}

function updateOrbitVoiceToggle() {
  const toggle = $('#orbitVoiceToggle');
  toggle.textContent = appState.voiceEnabled ? 'Voice on' : 'Voice off';
  toggle.setAttribute('aria-pressed', String(appState.voiceEnabled));
  toggle.setAttribute(
    'aria-label',
    appState.voiceEnabled ? 'Turn Orbit voice off' : 'Turn Orbit voice on'
  );
}

function updateOrbitMicToggle() {
  const toggle = $('#orbitMicToggle');
  toggle.textContent = appState.voiceQueryActive ? 'Stop' : 'Speak';
  toggle.setAttribute('aria-pressed', String(appState.voiceQueryActive));
  toggle.setAttribute(
    'aria-label',
    appState.voiceQueryActive ? 'Stop listening to your voice query' : 'Ask Orbit by voice'
  );
}

function setupOrbitSpeechRecognition() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const toggle = $('#orbitMicToggle');
  if (!Recognition) {
    toggle.disabled = true;
    toggle.textContent = 'Unavailable';
    toggle.setAttribute('aria-label', 'Voice input is not supported in this browser');
    return;
  }

  let recognition;
  try {
    recognition = new Recognition();
  } catch (error) {
    console.warn('Could not initialize voice input:', error);
    toggle.disabled = true;
    toggle.textContent = 'Unavailable';
    toggle.setAttribute('aria-label', 'Voice input could not be initialized');
    return;
  }
  recognition.lang = navigator.language || 'en-US';
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.onstart = () => {
    appState.voiceQueryActive = true;
    updateOrbitMicToggle();
  };
  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .slice(event.resultIndex)
      .filter((result) => result.isFinal)
      .map((result) => result[0].transcript.trim())
      .join(' ');
    if (transcript) {
      $('#q').value = transcript;
      askAssistant(transcript);
      $('#q').value = '';
    }
  };
  recognition.onerror = (event) => {
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      toast('Microphone access was denied. Allow microphone access to use voice input.');
    } else if (event.error === 'no-speech') {
      toast('No speech detected. Tap Speak and try again.');
    } else if (event.error === 'network') {
      toast(
        'Voice service could not connect. Check your internet/VPN, allow microphone access, and use Chrome or Edge on localhost or HTTPS. You can type your question instead.',
        9000
      );
    } else if (event.error !== 'aborted') {
      toast(`Voice input failed: ${event.error}. Please try again.`);
    }
  };
  recognition.onend = () => {
    appState.voiceQueryActive = false;
    updateOrbitMicToggle();
  };
  appState.speechRecognition = recognition;
}

function stopMissionSpeech() {
  if (appState.missionSpeaking && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  appState.missionSpeaking = false;
  updateMissionSpeechButton();
}

function updateMissionSpeechButton() {
  const button = $('#readMissionInstructions');
  button.textContent = appState.missionSpeaking ? 'Stop reading' : 'Read aloud';
  button.setAttribute('aria-pressed', String(appState.missionSpeaking));
}

function openMissionGuide(index) {
  const [title, summary, , instructions] = MIS[index];
  $('#missionDialogTitle').textContent = title;
  $('#missionDialogSummary').textContent = summary;
  $('#missionInstructions').replaceChildren(
    ...instructions.map((instruction) => {
      const item = document.createElement('li');
      item.textContent = instruction;
      return item;
    })
  );
  stopMissionSpeech();
  $('#missionDialog').showModal();
}

function readMissionGuide() {
  if (!('speechSynthesis' in window) || !window.SpeechSynthesisUtterance) return;
  if (appState.missionSpeaking) {
    stopMissionSpeech();
    return;
  }

  const instructions = Array.from($('#missionInstructions').children)
    .map((item) => item.textContent)
    .join(' ');

  try {
    window.speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(
      `${$('#missionDialogTitle').textContent}. ${$('#missionDialogSummary').textContent}. ${instructions}`
    );
    utterance.rate = 1;
    utterance.onend = () => {
      appState.missionSpeaking = false;
      updateMissionSpeechButton();
    };
    utterance.onerror = (event) => {
      appState.missionSpeaking = false;
      updateMissionSpeechButton();
      if (event.error !== 'interrupted' && event.error !== 'canceled') {
        console.warn('Could not read mission instructions:', event.error);
        toast('Could not read these instructions aloud. Please try again.');
      }
    };
    appState.missionSpeaking = true;
    updateMissionSpeechButton();
    window.speechSynthesis.speak(utterance);
  } catch (error) {
    appState.missionSpeaking = false;
    updateMissionSpeechButton();
    console.warn('Could not read mission instructions:', error);
    toast('Could not read these instructions aloud. Please try again.');
  }
}

function speakOrbitMessage(message) {
  if (!appState.voiceEnabled || !('speechSynthesis' in window) || !window.SpeechSynthesisUtterance) return;

  try {
    window.speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(message);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onerror = (event) => {
      if (event.error !== 'interrupted' && event.error !== 'canceled') {
        console.warn('Could not read Orbit message:', event.error);
      }
    };
    window.speechSynthesis.speak(utterance);
  } catch (error) {
    console.warn('Could not read Orbit message:', error);
  }
}

function watchAssistantVisibility() {
  if (!('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.intersectionRatio >= 0.45) {
        if (!appState.assistantVisible) playSound('assistant');
        appState.assistantVisible = true;
      } else if (entry.intersectionRatio <= 0.15) {
        appState.assistantVisible = false;
      }
    });
  }, { threshold: [0, 0.15, 0.45] });

  observer.observe($('#orbitCard'));
}

function show(screenId) {
  ['s1', 's2', 'dash'].forEach((id) => {
    $('#' + id).classList.toggle('hide', id !== screenId);
  });
  $('#siteHeader').classList.toggle('hide', screenId === 's1' || screenId === 's2');
}

/* Cute Cartoon Floating Astronaut Head ("Orbit") */
function orbitAvatarSVG() {
  return `
    <svg viewBox="0 0 110 110" aria-hidden="true">
      <defs>
        <linearGradient id="helmetShell" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#FFFFFF"/>
          <stop offset="100%" stop-color="#DCE4F5"/>
        </linearGradient>
        <linearGradient id="visorGlass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#2A2B4A"/>
          <stop offset="100%" stop-color="#141629"/>
        </linearGradient>
      </defs>
      <line x1="55" y1="16" x2="55" y2="6" stroke="#F07C8A" stroke-width="3.5" stroke-linecap="round"/>
      <circle cx="55" cy="5" r="4.5" fill="#FF5A67"/>
      <rect x="12" y="45" width="10" height="24" rx="5" fill="#8B1C1F"/>
      <rect x="88" y="45" width="10" height="24" rx="5" fill="#8B1C1F"/>
      <rect x="19" y="16" width="72" height="72" rx="34" fill="url(#helmetShell)" stroke="#9BA4D9" stroke-width="2"/>
      <rect x="27" y="34" width="56" height="38" rx="18" fill="url(#visorGlass)"/>
      <path d="M35 41 Q55 37 73 42" stroke="rgba(255,255,255,0.35)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <ellipse class="eye blink" cx="43" cy="53" rx="5" ry="6.5" fill="#7FE3FF"/>
      <ellipse class="eye blink" cx="67" cy="53" rx="5" ry="6.5" fill="#7FE3FF"/>
      <path d="M49 62 Q55 67 61 62" stroke="#7FE3FF" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M29 86 Q55 95 81 86 L77 96 Q55 103 33 96 Z" fill="#8B1C1F"/>
    </svg>
  `;
}

function toast(message, duration = 2500) {
  const toastNode = $('#toast');
  toastNode.textContent = message;
  toastNode.classList.add('on');
  setTimeout(() => toastNode.classList.remove('on'), duration);
}

function status(value, lo, hi) {
  if (value < lo) return ['low', 'Low'];
  if (value > hi) return ['low', 'High'];
  if ((value - lo) < (hi - lo) * 0.08 || (hi - value) < (hi - lo) * 0.08) {
    return ['warn', 'Borderline'];
  }
  return ['ok', 'In range'];
}

function say(message, isUserMessage = false) {
  const entry = document.createElement('div');
  entry.className = 'b ' + (isUserMessage ? 'u' : 'p');
  entry.textContent = message;
  $('#log').appendChild(entry);
  $('#log').scrollTop = 1e5;
  if (!isUserMessage) speakOrbitMessage(message);
}

/* Onboarding 1: Crew NFC Card Tap */
function handleCardTap() {
  if (appState.loginInProgress) return;
  appState.loginInProgress = true;
  playSound('click');

  const reader = $('#reader');
  reader.classList.add('reading');
  $('#t1').textContent = 'NFC Card Verified • Welcome Aboard';

  setTimeout(() => {
    playSound('login');
    $('#s1').classList.add('leaving');
    setTimeout(() => {
      reader.classList.remove('reading');
      $('#s1').classList.remove('leaving');
      $('#t1').textContent = 'Tap your NFC card to start';
      prepareVialScreen();
      show('s2');
      appState.loginInProgress = false;
    }, 350);
  }, 1050);
}

function updateCrewProfile(name, cardId = '') {
  const initials = name.split(/\s+/).map((word) => word[0]).join('').slice(0, 2).toUpperCase();
  $('#activeCrewName').textContent = name;
  $('#crewInitials').textContent = initials || 'CR';
  $('#activeCardId').textContent = cardId ? `NFC •••• ${cardId.slice(-4)}` : 'NFC •••• DEMO';
}

function openRegistration() {
  $('#registrationStatus').textContent = 'Enter a name, then tap a card to register.';
  $('#registerDialog').showModal();
  $('#cardHolder').focus();
}

function saveRegistration(name, role, serialNumber = '') {
  const statusNode = $('#registrationStatus');

  try {
    const storedCards = JSON.parse(localStorage.getItem('vital.registeredCards') || '[]');
    if (!Array.isArray(storedCards)) {
      statusNode.textContent = 'Could not save this card: the saved card list is invalid.';
      return;
    }

    const cardId = serialNumber || `demo-${Date.now()}`;
    storedCards.push({
      name,
      role,
      cardId,
      registeredAt: new Date().toISOString()
    });
    localStorage.setItem('vital.registeredCards', JSON.stringify(storedCards));
    updateCrewProfile(name, serialNumber);
    statusNode.textContent = `${name} registered as ${role}.`;
  } catch (error) {
    statusNode.textContent = `Card read, but registration could not be saved: ${error.message}`;
  }
}

async function startCardRegistration() {
  const name = $('#cardHolder').value.trim();
  const statusNode = $('#registrationStatus');
  if (!name) {
    statusNode.textContent = 'Enter the card holder’s name first.';
    $('#cardHolder').focus();
    return;
  }

  if (!('NDEFReader' in window)) {
    statusNode.textContent = 'NFC is unavailable in this browser. Use the demo button to register a card.';
    return;
  }

  if (appState.registrationAbortController) {
    statusNode.textContent = 'NFC scanning is already active. Tap a card or close this dialog to stop.';
    return;
  }

  const controller = new AbortController();
  appState.registrationAbortController = controller;
  statusNode.textContent = 'Waiting for an NFC card…';
  try {
    const reader = new window.NDEFReader();
    appState.registrationReader = reader;
    reader.onreading = (event) => {
      const textRecord = event.message.records.find((record) => record.recordType === 'text');
      const cardText = textRecord
        ? new TextDecoder(textRecord.encoding || 'utf-8').decode(textRecord.data)
        : '';
      const role = /admin/i.test(cardText) ? 'admin' : 'crew';

      saveRegistration(name, role, event.serialNumber || '');
      controller.abort();
      appState.registrationReader = null;
      appState.registrationAbortController = null;
    };
    reader.onreadingerror = () => {
      statusNode.textContent = 'The card could not be read. Hold it near the reader and try again.';
    };

    await reader.scan({ signal: controller.signal });
    if (!controller.signal.aborted) {
      statusNode.textContent = 'NFC reader ready. Tap the card to register it.';
    }
  } catch (error) {
    stopCardRegistration();
    if (error.name !== 'AbortError') {
      statusNode.textContent = `Could not start NFC scanning: ${error.message}`;
    }
  }
}

function stopCardRegistration() {
  appState.registrationAbortController?.abort();
  appState.registrationReader = null;
  appState.registrationAbortController = null;
}

function closeRegistration() {
  stopCardRegistration();
  if ($('#registerDialog').open) {
    $('#registerDialog').close();
  }
}

function simulateCardRegistration() {
  const name = $('#cardHolder').value.trim();
  if (!name) {
    $('#registrationStatus').textContent = 'Enter the card holder’s name first.';
    $('#cardHolder').focus();
    return;
  }
  saveRegistration(name, 'crew');
}

function handleNfcLogin() {
  if (!$('#s1').classList.contains('hide')) {
    handleCardTap();
  }
}

/* Onboarding 2: Vial Fill & Sensor Read */
function prepareVialScreen() {
  const flatMetrics = D.flatMap((group) => group[2]);
  $('#live').innerHTML = flatMetrics.slice(0, 6).map((metric, index) => {
    return `<div id="l${index}"><span>${metric[0]}</span><b>Waiting…</b></div>`;
  }).join('');

  $('#fill').style.height = '0%';
  $('#rb').style.width = '0%';
  $('#pctLabel').textContent = '0%';
  $('#send').disabled = false;
  $('#t2').textContent = 'Waiting for blood cartridge...';
  $('#rs').textContent = 'Sensor status: Standby — Ready for microfluidic input';
}

function runVialCollection() {
  const flatMetrics = D.flatMap((group) => group[2]).slice(0, 6);
  $('#send').disabled = true;
  $('#t2').textContent = 'Collecting & analyzing blood sample...';
  $('#p2').textContent = 'Microfluidic optical sensors are reading cellular components.';
  $('#rs').textContent = 'Sensor status: Blood detected • Spectroscopic scan active';

  let step = 0;
  const totalSteps = flatMetrics.length;

  const timer = setInterval(() => {
    if (step < totalSteps) {
      const item = flatMetrics[step];
      const pct = Math.round(((step + 1) / totalSteps) * 100);
      playSound('fill', step);
      $('#fill').style.height = Math.min(88, pct * 0.88) + '%';
      $('#rb').style.width = pct + '%';
      $('#pctLabel').textContent = pct + '%';

      const cell = $('#l' + step);
      if (cell) {
        cell.classList.add('done');
        cell.querySelector('b').textContent = `${item[2]} ${item[1]}`;
      }
      step += 1;
      return;
    }

    clearInterval(timer);
    $('#rs').textContent = 'Analysis complete • Generating crew telemetry report';
    setTimeout(() => {
      buildDashboard();
      show('dash');
      toast('Blood sample analyzed');
    }, 650);
  }, 420);
}

/* Optional .XLSX Spreadsheet Loader */
function handleSpreadsheetUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (typeof XLSX === 'undefined') {
    toast('Spreadsheet support is unavailable. Try reloading the page.');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const wb = XLSX.read(e.target.result, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      if (!rows.length) {
        toast('No metric rows were found in that spreadsheet.');
        return;
      }

      const flat = D.flatMap((group) => group[2]);
      let updatedCount = 0;
      rows.forEach((row) => {
        const name = String(row.Metric || row.Parameter || row.Component || '').toLowerCase();
        const value = parseFloat(row.Value ?? row.Result ?? row.Reading);
        if (name && !Number.isNaN(value)) {
          const target = flat.find((metric) => metric[0].toLowerCase().includes(name) || name.includes(metric[0].toLowerCase()));
          if (target) {
            target[2] = value;
            updatedCount += 1;
          }
        }
      });

      if (!updatedCount) {
        toast('No spreadsheet rows matched the known blood metrics.');
        return;
      }

      toast(`Loaded ${updatedCount} metric${updatedCount === 1 ? '' : 's'} from ${file.name}`);
      prepareVialScreen();
      runVialCollection();
    } catch (error) {
      toast(`Could not parse spreadsheet: ${error.message}`);
    }
  };
  reader.onerror = () => toast('Could not read the selected spreadsheet file.');
  reader.readAsArrayBuffer(file);
}

/* Dashboard Builder */
function buildDashboard() {
  let okCount = 0;
  let totalReadings = 0;
  const issues = [];

  D.forEach((group) => {
    group[2].forEach((reading) => {
      const [key, label] = status(reading[2], reading[3], reading[4]);
      totalReadings += 1;
      if (key === 'ok') okCount += 1;
      if (key !== 'ok') {
        issues.push({
          name: reading[0],
          status: label,
          key
        });
      }
    });
  });

  const score = Math.round((okCount / totalReadings) * 100);
  $('#rt').textContent = score + '%';
  setTimeout(() => {
    $('#rc').style.strokeDashoffset = 314 * (1 - score / 100);
  }, 80);

  $('#hs').textContent = `${okCount} of ${totalReadings} blood biomarkers are within nominal crew range. ${issues.length} flagged for follow-up.`;
  $('#hc').innerHTML = issues.map((issue) => `<span class="chip c-${issue.key}">${issue.name} (${issue.status})</span>`).join('');
  $('#alertBadge').textContent = issues.length;

  $('#summaryTiles').innerHTML = `
    <div class="tile-card"><small>In-Range Biomarkers</small><strong>${okCount} / ${totalReadings}</strong></div>
    <div class="tile-card"><small>Flagged Indicators</small><strong>${issues.length} Alerts</strong></div>
    <div class="tile-card"><small>Cartridge Status</small><strong>Verified</strong></div>
  `;

  renderGroups();
  renderRadiationPanel();
  renderMissionList();
  updateDashboardTab();

  $('#log').innerHTML = '';
  say("Hi! I'm Orbit. I analyzed your blood cartridge: Hemoglobin, Hematocrit, and Platelets sit slightly below baseline, while White Blood Cells are steady. Tap any card to inspect details or ask me a question!");
}

function getRangeIndicator(value, min, max) {
  const range = max - min;
  const scaleMin = min - range * 0.6;
  const scaleSpan = range * 2.2;
  const clamp = (number) => Math.max(2, Math.min(98, ((number - scaleMin) / scaleSpan) * 100));

  return {
    left: clamp(min),
    width: clamp(max) - clamp(min),
    marker: clamp(value)
  };
}

function renderGroups() {
  const filterAlertsOnly = appState.activeTab === 'alerts';

  $('#groups').innerHTML = D.map((group) => {
    const filtered = group[2].filter((reading) => {
      if (!filterAlertsOnly) return true;
      return status(reading[2], reading[3], reading[4])[0] !== 'ok';
    });

    if (!filtered.length) return '';

    return `
      <div class="grp">
        <h3>${group[0]}</h3>
        <p>${group[1]}</p>
        <div class="rows">
          ${filtered.map((reading) => {
            const [resultKey, label] = status(reading[2], reading[3], reading[4]);
            const range = getRangeIndicator(reading[2], reading[3], reading[4]);

            return `
              <button class="m" type="button" aria-expanded="false">
                <div class="h">
                  <span class="n">${reading[0]}</span>
                  <span class="chip c-${resultKey}">${label}</span>
                </div>
                <div class="v">${reading[2]} <small>${reading[1]}</small></div>
                <div class="rg">
                  <i style="left:${range.left}%;width:${range.width}%"></i>
                  <u style="left:${range.marker}%"></u>
                </div>
                <div class="r">
                  <span>Min ${reading[3]}</span>
                  <span>Nominal Range</span>
                  <span>Max ${reading[4]}</span>
                </div>
                <div class="d">${reading[5]}</div>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');

  document.querySelectorAll('.m').forEach((button) => {
    button.onclick = () => {
      const open = button.classList.toggle('open');
      button.setAttribute('aria-expanded', open);
    };
  });
}

function renderRadiationPanel() {
  const renderMetrics = (metrics) => metrics.map((metric) => {
    const reference = metric.reference;
    const observedRange = metric.observedRange;
    const value = Number(metric.value);
    let indicator = ['warn', 'No range', 'No range is available for this reading.'];

    if (reference) {
      if (value > reference.criticalMin) {
        indicator = ['low', 'Critical', 'This reading is above the critical level.'];
      } else if (value > reference.warningMin && value <= reference.warningMax) {
        indicator = ['warn', 'Warning', 'This reading is in the warning range.'];
      } else if (value >= reference.normalMin && value <= reference.normalMax) {
        indicator = ['ok', 'In range', 'This reading is within the usual range.'];
      } else {
        indicator = ['warn', 'Out of range', 'This reading is outside the usual range.'];
      }
    } else if (observedRange) {
      if (value >= observedRange.min && value <= observedRange.max) {
        indicator = ['ok', 'In range', 'This example is within the range shown.'];
      } else {
        indicator = ['warn', 'Outside range', 'This example is outside the range shown.'];
      }
    }

    const barRange = reference
      ? { min: reference.normalMin, max: reference.normalMax, label: 'Usual range' }
      : observedRange
        ? { min: observedRange.min, max: observedRange.max, label: 'Sample range' }
        : null;

    const rangeMarkup = barRange
      ? (() => {
          const range = getRangeIndicator(value, barRange.min, barRange.max);
          return `
            <div class="rg" aria-hidden="true">
              <i style="left:${range.left}%;width:${range.width}%"></i>
              <u style="left:${range.marker}%"></u>
            </div>
            <div class="r">
              <span>Min ${barRange.min}</span>
              <span>${barRange.label}</span>
              <span>Max ${barRange.max}</span>
            </div>
          `;
        })()
      : '<div class="r"><span>No range available</span></div>';

    const referenceDetails = reference
      ? `
          <span>Usual range: ${reference.normalMin}–${reference.normalMax} ${metric.unit}.</span>
          <span>Warning: ${reference.warningMin}–${reference.warningMax} ${metric.unit}.</span>
          <span>Critical: above ${reference.criticalMin} ${metric.unit}.</span>
        `
      : observedRange
        ? `
            <span>Sample range: ${observedRange.min}–${observedRange.max} ${metric.unit}.</span>
            <span>This is an example range, not a medical limit.</span>
          `
        : '<span>No range is available for this reading.</span>';

    return `
      <button class="m radiation-metric" type="button" aria-expanded="false">
        <div class="h">
          <span class="n">${metric.label}</span>
          <span class="chip c-${indicator[0]}">${indicator[1]}</span>
        </div>
        <div class="v">${metric.value} <small>${metric.unit}</small></div>
        ${rangeMarkup}
        <div class="d">
          <span>${metric.meaning}</span>
          <span>${indicator[2]}</span>
          ${referenceDetails}
        </div>
      </button>
    `;
  }).join('');

  $('#physicalRadiationMetrics').innerHTML = renderMetrics(VITAL_DATA.radiation.physical);
  $('#bioRadiationMetrics').innerHTML = renderMetrics(VITAL_DATA.radiation.biological);
  document.querySelectorAll('.radiation-metric').forEach((button) => {
    button.onclick = () => {
      const open = button.classList.toggle('open');
      button.setAttribute('aria-expanded', String(open));
    };
  });
}

function updateDashboardTab() {
  const overview = appState.activeTab === 'overview';
  const radiation = appState.activeTab === 'radiation';
  $('#summaryTiles').classList.toggle('hide', !overview);
  $('#groups').classList.toggle('hide', overview || radiation);
  $('#radiationPanel').classList.toggle('hide', !radiation);

  document.querySelectorAll('.nav-item').forEach((button) => {
    const isActive = button.dataset.tab === appState.activeTab;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

function renderMissionList() {
  $('#missionCountChip').textContent = `${appState.done.size} / ${MIS.length}`;
  $('#mis').innerHTML = MIS.map((mission, index) => {
    const isDone = appState.done.has(index);
    return `
      <li class="${isDone ? 'done' : ''}">
        <input type="checkbox" data-i="${index}" aria-label="Mark ${mission[0]} complete" ${isDone ? 'checked' : ''}>
        <button class="mission-open" type="button" data-mission="${index}" aria-label="View instructions for ${mission[0]}">
          <strong>
            ${mission[0]}
          </strong>
          <small>${mission[1]}</small>
        </button>
      </li>
    `;
  }).join('');

  document.querySelectorAll('#mis .mission-open').forEach((button) => {
    button.onclick = () => openMissionGuide(+button.dataset.mission);
  });

  document.querySelectorAll('#mis input').forEach((checkbox) => {
    checkbox.onchange = () => {
      const idx = +checkbox.dataset.i;
      if (checkbox.checked && !appState.done.has(idx)) {
        appState.done.add(idx);
        appState.xp += MIS[idx][2];
        toast('Mission logged');
        say(`Logged "${MIS[idx][0]}" to your medical telemetry.`);
      } else if (!checkbox.checked && appState.done.has(idx)) {
        appState.done.delete(idx);
        appState.xp -= MIS[idx][2];
        toast('Mission unchecked');
        say(`Removed "${MIS[idx][0]}" from your medical telemetry.`);
      }
      renderMissionList();
    };
  });
}

function askAssistant(query) {
  say(query, true);
  const match = KB.find(([pattern]) => pattern.test(query.toLowerCase()));
  const answer = match
    ? match[1]
    : 'I can break down your Hemoglobin, Hematocrit, White Blood Cells, Platelets, or recommend follow-up tests. What would you like to inspect?';
  setTimeout(() => say(answer), 420);
}

/* Event Bindings */
$('#soundToggle').onclick = () => {
  appState.soundsEnabled = !appState.soundsEnabled;
  updateSoundToggle();
  if (appState.soundsEnabled) playSound('click');
};

$('#orbitVoiceToggle').onclick = () => {
  appState.voiceEnabled = !appState.voiceEnabled;
  if (!appState.voiceEnabled && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  updateOrbitVoiceToggle();
  if (appState.voiceEnabled) {
    const messages = document.querySelectorAll('#log .b.p');
    const latestMessage = messages[messages.length - 1];
    if (latestMessage) speakOrbitMessage(latestMessage.textContent);
  }
};

$('#orbitMicToggle').onclick = () => {
  if (!appState.speechRecognition) return;
  if (appState.voiceQueryActive) {
    appState.speechRecognition.stop();
    return;
  }

  try {
    appState.speechRecognition.start();
  } catch (error) {
    console.warn('Could not start voice input:', error);
    toast('Could not start voice input. Please try again.');
  }
};

$('#closeMissionDialog').onclick = () => $('#missionDialog').close();
$('#missionDialog').addEventListener('click', (event) => {
  if (event.target === $('#missionDialog')) $('#missionDialog').close();
});
$('#missionDialog').addEventListener('close', stopMissionSpeech);
$('#readMissionInstructions').onclick = readMissionGuide;
if (!('speechSynthesis' in window) || !window.SpeechSynthesisUtterance) {
  $('#readMissionInstructions').disabled = true;
  $('#readMissionInstructions').textContent = 'Voice unavailable';
}

document.addEventListener('click', (event) => {
  const control = event.target.closest('button, a, input[type="checkbox"]');
  if (control && control !== $('#soundToggle') && control !== $('#reader') && !control.disabled) {
    playSound('click');
  }
});

$('#send').onclick = runVialCollection;
$('#xlsxInput').onchange = handleSpreadsheetUpload;
$('#rescanBtn').onclick = () => {
  appState.activeTab = 'overview';
  prepareVialScreen();
  show('s2');
};

document.querySelectorAll('.nav-item').forEach((btn) => {
  btn.onclick = () => {
    appState.activeTab = btn.dataset.tab;
    renderGroups();
    updateDashboardTab();
  };
});

$('#themeToggle').onclick = () => {
  const root = document.documentElement;
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
};

$('#out').onclick = () => resetToOnboarding();

function resetToOnboarding() {
  closeRegistration();
  $('#s1').classList.remove('leaving');
  $('#reader').classList.remove('reading');
  $('#t1').textContent = 'Tap your NFC card to start';
  $('#send').disabled = false;
  $('#fill').style.height = '0%';
  $('#rb').style.width = '0%';
  $('#pctLabel').textContent = '0%';
  $('#t2').textContent = 'Waiting for blood cartridge...';
  $('#p2').textContent = 'Insert your sample cartridge into the reader bay, or trigger a live sensor feed below.';
  $('#rs').textContent = 'Sensor status: Standby — Ready for microfluidic input';
  $('#live').innerHTML = '';
  show('s1');
}

function handleRegisterDialogClick(event) {
  if (event.target === $('#registerDialog')) {
    closeRegistration();
  }
}

$('#qs').innerHTML = [
  'Why is hemoglobin low?',
  'Explain my WBC count',
  'What tests should I do next?'
].map((q) => `<button type="button">${q}</button>`).join('');

document.querySelectorAll('#qs button').forEach((btn) => {
  btn.onclick = () => askAssistant(btn.textContent);
});

$('#f').onsubmit = (e) => {
  e.preventDefault();
  const val = $('#q').value.trim();
  if (val) {
    askAssistant(val);
    $('#q').value = '';
  }
};

$('#petsvg').innerHTML = orbitAvatarSVG();
watchAssistantVisibility();
setupOrbitSpeechRecognition();
if ('speechSynthesis' in window && window.SpeechSynthesisUtterance) {
  updateOrbitVoiceToggle();
} else {
  $('#orbitVoiceToggle').disabled = true;
  $('#orbitVoiceToggle').textContent = 'Voice unavailable';
  $('#orbitVoiceToggle').setAttribute('aria-label', 'Voice output is not supported in this browser');
}
if (!window.AudioContext) {
  $('#soundToggle').disabled = true;
  $('#soundToggle').textContent = 'Sound unavailable';
  $('#soundToggle').setAttribute('aria-label', 'Sound effects are not supported in this browser');
  $('#soundToggle').setAttribute('aria-pressed', 'false');
}

$('#registerForm').onsubmit = (event) => event.preventDefault();
$('#reader').onclick = handleCardTap;
$('#openRegister').onclick = openRegistration;
$('#closeRegister').onclick = closeRegistration;
$('#registerDialog').addEventListener('click', handleRegisterDialogClick);
$('#tapToRegister').onclick = startCardRegistration;
$('#simulateRegister').onclick = simulateCardRegistration;
window.addEventListener('vital:nfc-read', handleNfcLogin);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !$('#s1').classList.contains('hide') && !$('#registerDialog').open) {
    if (event.target === document.body || event.target === document.documentElement) {
      event.preventDefault();
      handleCardTap();
    }
  }
});