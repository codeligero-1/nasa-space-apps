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
  missionSpeaking: false,
  astronautProfile: null,
  historyCategory: 'blood',
  historyMetric: 'hemoglobin',
  historyDate: '',
  importedFile: ''
};

const DEMO = window.VITAL_DEMO_DATA;
const metricDefinitions = window.VITAL_DATA.metrics;
const sections = window.VITAL_DATA.sections;
const MIS = window.VITAL_DATA.missions;
const KB = window.VITAL_DATA.chatKnowledge;

if (!DEMO?.profile || !Array.isArray(DEMO.records) || !Array.isArray(metricDefinitions)) {
  throw new Error('VITAL demo records or metric definitions are missing.');
}

if (DEMO.records.some((record) => record.astronautId && record.astronautId !== DEMO.profile.astronautId)) {
  throw new Error('VITAL demo records do not match the selected astronaut profile.');
}

function latestRecord(type) {
  return DEMO.records
    .filter((record) => record.type === type && /^\d{4}-\d{2}-\d{2}$/.test(record.date || ''))
    .sort((a, b) => a.date.localeCompare(b.date))
    .pop() || null;
}

const baselineRecord = latestRecord('baseline');
let currentRecord = latestRecord('flight');

if (!currentRecord) {
  throw new Error('VITAL demo data does not contain an in-flight record.');
}

let activeBloodRecord = currentRecord;

function metricLabel(metric) {
  return metric.name.toLowerCase() === metric.abbreviation.toLowerCase()
    ? metric.name
    : `${metric.name} (${metric.abbreviation})`;
}

function createMetricGroups(record, bloodRecord = record) {
  const groups = new Map();

  metricDefinitions.forEach((metric) => {
    const section = sections.find((item) => item.id === metric.section);
    const groupKey = `${metric.section}:${metric.group}`;
    if (!groups.has(groupKey)) {
      groups.set(groupKey, [metric.group, section?.description || '', [], metric.section]);
    }

    const range = metric.range ? DEMO.ranges[metric.range] || null : null;
    const recordForMetric = metric.section === 'blood' ? bloodRecord : record;
    const measured = recordForMetric?.[metric.section]?.[metric.id];
    const value = Number.isFinite(measured) ? measured : null;
    groups.get(groupKey)[2].push([
      metricLabel(metric),
      metric.unit,
      value,
      range?.min ?? null,
      range?.max ?? null,
      metric.name,
      metric.id,
      metric.section,
      range,
      metric
    ]);
  });

  return [...groups.values()];
}

let D = createMetricGroups(currentRecord);

function metricValue(record, metric) {
  const value = record?.[metric.section]?.[metric.id];
  return Number.isFinite(value) ? value : null;
}

function formatNumber(value, metric) {
  if (!Number.isFinite(value)) return 'Not Available';
  return Number(value.toFixed(metric.decimals)).toLocaleString(undefined, {
    maximumFractionDigits: metric.decimals
  });
}

function formatDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return 'Date not supplied';
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    .toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function timeNote(record) {
  if (!record?.date) return 'Date and time not supplied';
  return `${formatDate(record.date)} · ${record.time ? `Time ${record.time}` : 'Time not supplied'}`;
}

function currentTestMetadata(section = 'blood') {
  const record = section === 'blood' ? activeBloodRecord : currentRecord;
  if (section === 'blood' && appState.importedFile) {
    return `Imported file: ${appState.importedFile} · ${timeNote(record)} · Sample ID: ${record.sampleId || 'Not provided'}`;
  }
  return `${timeNote(record)} · Sample ID: ${record.sampleId || 'Not provided'}`;
}

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
  toggle.setAttribute('aria-pressed', String(appState.soundsEnabled));
  const label = appState.soundsEnabled ? 'Turn sound effects off' : 'Turn sound effects on';
  toggle.setAttribute('aria-label', label);
  toggle.title = label;
}

function updateThemeToggle() {
  const nextTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  const label = `Switch to ${nextTheme} theme`;
  const toggle = $('#themeToggle');
  toggle.setAttribute('aria-label', label);
  toggle.title = label;
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

function status(value, lo, hi, warningLow, warningHigh) {
  if (!Number.isFinite(value)) return ['na', 'Not Available'];
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) return ['na', 'Not Rated'];
  if (value < lo) {
    return Number.isFinite(warningLow) && value >= warningLow
      ? ['warn', 'Borderline']
      : ['low', 'Low'];
  }
  if (value > hi) {
    return Number.isFinite(warningHigh) && value <= warningHigh
      ? ['warn', 'Borderline']
      : ['low', 'High'];
  }
  return ['ok', 'Normal'];
}

function statusForReading(reading) {
  const range = reading[8];
  if (reading[7] === 'vitals' && Number.isFinite(reading[2]) &&
      Number.isFinite(range?.min) && Number.isFinite(range?.max) && range.max > range.min) {
    if ((Number.isFinite(range.criticalLow) && reading[2] < range.criticalLow) ||
        (Number.isFinite(range.criticalHigh) && reading[2] > range.criticalHigh)) {
      return ['low', 'Critical'];
    }
    if (reading[2] < range.min || reading[2] > range.max) return ['warn', 'Warning'];
    return ['ok', 'Normal'];
  }
  return status(reading[2], range?.min, range?.max, range?.warningLow, range?.warningHigh);
}

function displayValue(reading) {
  return formatNumber(reading[2], reading[9]);
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
async function handleCardTap() {
  if (appState.loginInProgress) return;
  appState.loginInProgress = true;
  playSound('click');

  const reader = $('#reader');
  reader.classList.add('reading');
  $('#t1').textContent = 'Reading NFC card…';

  // Check if Web NFC API is available
  if (!('NDEFReader' in window)) {
    $('#t1').textContent = 'NFC detected • Logging in';
    // Fallback to demo mode after a short delay
    setTimeout(() => {
      playSound('login');
      $('#s1').classList.add('leaving');
      setTimeout(() => {
        reader.classList.remove('reading');
        $('#s1').classList.remove('leaving');
        $('#t1').textContent = 'Tap your NFC card to start';
        // Use demo astronaut profile
        const demoAstronaut = {
          id: 'demo-1',
          name: 'Crew Member',
          role: 'Commander',
          mission: 'Artemis III',
          nfcCardId: 'DEMO-4821',
          avatarUrl: null,
          healthRecords: []
        };
        appState.astronautProfile = demoAstronaut;
        updateCrewProfile('Crew Member', 'DEMO-4821');
        prepareVialScreen();
        show('s2');
        appState.loginInProgress = false;
      }, 350);
    }, 1050);
    return;
  }

  // Use Web NFC API to read the card
  const controller = new AbortController();
  try {
    const nfcReader = new window.NDEFReader();
    nfcReader.onreading = async (event) => {
      const serialNumber = event.serialNumber || '';
      controller.abort();

      // Verify NFC card with backend
      try {
        const response = await fetch('/api/astronaut/verify-nfc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // Include session cookies
          body: JSON.stringify({ nfcCardId: serialNumber.toUpperCase() })
        });

        const data = await response.json();

        if (!response.ok || !data.ok) {
          // Unregistered card
          reader.classList.remove('reading');
          reader.classList.add('error');
          $('#t1').textContent = data.error || 'Unregistered NFC card • Access denied';
          playSound('error');

          setTimeout(() => {
            reader.classList.remove('error');
            $('#t1').textContent = 'Tap your NFC card to start';
            appState.loginInProgress = false;
          }, 3000);
          return;
        }

        // Success - got astronaut profile
        const astronaut = data.astronaut;
        appState.astronautProfile = astronaut;
        updateCrewProfile(astronaut.name, astronaut.nfcCardId);

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
      } catch (error) {
        console.error('NFC verification failed:', error);
        reader.classList.remove('reading');
        reader.classList.add('error');
        $('#t1').textContent = 'Verification failed • Try again';
        playSound('error');

        setTimeout(() => {
          reader.classList.remove('error');
          $('#t1').textContent = 'Tap your NFC card to start';
          appState.loginInProgress = false;
        }, 3000);
      }
    };

    nfcReader.onreadingerror = () => {
      controller.abort();
      reader.classList.remove('reading');
      reader.classList.add('error');
      $('#t1').textContent = 'Could not read card • Try again';
      playSound('error');

      setTimeout(() => {
        reader.classList.remove('error');
        $('#t1').textContent = 'Tap your NFC card to start';
        appState.loginInProgress = false;
      }, 3000);
    };

    await nfcReader.scan({ signal: controller.signal });
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('NFC scan failed:', error);
      reader.classList.remove('reading');
      reader.classList.add('error');
      $('#t1').textContent = 'NFC scan failed • Try again';
      playSound('error');

      setTimeout(() => {
        reader.classList.remove('error');
        $('#t1').textContent = 'Tap your NFC card to start';
        appState.loginInProgress = false;
      }, 3000);
    }
  }
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
    statusNode.textContent = `${name} registered as ${role}. The dashboard remains associated with ${DEMO.profile.name}'s demo data.`;
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
    statusNode.textContent = 'Use the demo button to register a card in this browser.';
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
  const flatMetrics = D
    .filter((group) => group[3] === 'blood')
    .flatMap((group) => group[2]);
  $('#live').innerHTML = flatMetrics.slice(0, 6).map((metric, index) => {
    return `<div id="l${index}"><span>${metric[0]}</span><b>Waiting…</b></div>`;
  }).join('');

  $('#fill').style.height = '0%';
  $('#rb').style.width = '0%';
  $('#pctLabel').textContent = '0%';
  $('#send').disabled = false;
  $('#send').textContent = 'Start Blood Analysis';
  $('#t2').textContent = 'Ready for Blood Analysis';
  $('#p2').textContent = 'Welcome, crew member! Start the analysis to process the available sample data and prepare your report.';
  $('#rs').textContent = 'Analysis ready • Source-backed demo data loaded';
}

function runVialCollection() {
  const flatMetrics = D
    .filter((group) => group[3] === 'blood')
    .flatMap((group) => group[2])
    .slice(0, 6);
  if (!flatMetrics.length) {
    toast('No blood measurements are available in this record.');
    return;
  }

  $('#send').disabled = true;
  $('#send').textContent = 'Analyzing...';
  $('#t2').textContent = 'Analyzing Blood Sample...';
  $('#p2').textContent = 'Processing the available sample data and preparing your report.';
  $('#rs').textContent = 'Demo analysis in progress • Preparing source-backed results';

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
        cell.querySelector('b').textContent = `${displayValue(item)} ${item[1]}`;
      }
      step += 1;
      return;
    }

    clearInterval(timer);
    $('#rs').textContent = 'Analysis complete • Source-backed results ready';
    setTimeout(() => {
      buildDashboard();
      show('dash');
      toast('Blood analysis complete');
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
      const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true });
      if (!wb.SheetNames.length) {
        toast('No worksheet was found in that spreadsheet.');
        return;
      }
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      if (!rows.length) {
        toast('No metric rows were found in that spreadsheet.');
        return;
      }

      const valueFrom = (row, keys) => {
        const key = keys.find((candidate) => row[candidate] !== undefined && row[candidate] !== null);
        return key ? row[key] : undefined;
      };
      const astronautIds = [...new Set(rows
        .map((row) => valueFrom(row, ['Astronaut ID', 'AstronautID', 'astronautId']))
        .filter((value) => value !== undefined)
        .map((value) => String(value).trim().toUpperCase()))];
      if (astronautIds.some((id) => id !== DEMO.profile.astronautId.toUpperCase())) {
        toast('This spreadsheet does not match the currently open demo profile.');
        return;
      }

      const parseTestDate = (value) => {
        if (value instanceof Date && Number.isFinite(value.getTime())) {
          const iso = value.toISOString();
          return {
            date: iso.slice(0, 10),
            time: iso.slice(11, 19) === '00:00:00' ? '' : iso.slice(11, 19)
          };
        }
        const match = String(value || '').trim().match(
          /^(\d{4}-\d{2}-\d{2})(?:[T\s]((?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?)(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):?[0-5]\d)?)?$/i
        );
        if (!match) return null;
        const date = match[1];
        const parsed = new Date(`${date}T00:00:00Z`);
        if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return null;
        return { date, time: match[2] || '' };
      };
      const normalizeTime = (value) => {
        const match = String(value || '').trim().match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
        return match ? `${match[1]}:${match[2]}${match[3] ? `:${match[3]}` : ''}` : '';
      };
      const testDates = rows.map((row) => {
        const rawDate = valueFrom(row, ['Test Date', 'Date', 'date']);
        const rawTime = valueFrom(row, ['Test Time', 'Time', 'time']);
        if ((rawDate === undefined || rawDate === '') && (rawTime === undefined || rawTime === '')) return null;
        const parsed = rawDate === undefined || rawDate === '' ? null : parseTestDate(rawDate);
        const time = rawTime === undefined || rawTime === '' ? parsed?.time || '' : normalizeTime(rawTime);
        return parsed && (rawTime === undefined || rawTime === '' || time)
          ? { date: parsed.date, time }
          : null;
      });
      const hasInvalidDate = rows.some((row, index) => {
        const rawDate = valueFrom(row, ['Test Date', 'Date', 'date']);
        const rawTime = valueFrom(row, ['Test Time', 'Time', 'time']);
        return ((rawDate !== undefined && rawDate !== '') || (rawTime !== undefined && rawTime !== '')) && !testDates[index];
      });
      const dates = [...new Set(testDates.filter(Boolean).map((item) => item.date))];
      const times = [...new Set(testDates.filter((item) => item?.time).map((item) => item.time))];
      if (hasInvalidDate || dates.length > 1 || times.length > 1) {
        toast('Use one valid test date and time per spreadsheet.');
        return;
      }

      const sampleIds = [...new Set(rows
        .map((row) => valueFrom(row, ['Sample ID', 'SampleID', 'sampleId']))
        .filter((value) => value !== undefined && value !== '')
        .map((value) => String(value).trim()))];
      if (sampleIds.length > 1) {
        toast('Use one sample ID per spreadsheet.');
        return;
      }

      const bloodDefinitions = metricDefinitions.filter((metric) => metric.section === 'blood');
      const bloodValues = Object.fromEntries(bloodDefinitions.map((metric) => [metric.id, null]));
      const normalizeUnit = (value) => String(value)
        .replace(/[\u00c2\u00e2]/g, '')
        .toLowerCase()
        .replace(/[µμ]/g, 'u')
        .replace(/\s/g, '');
      const seenMetrics = new Set();
      let updatedCount = 0;
      let skippedCount = 0;
      rows.forEach((row) => {
        const name = String(valueFrom(row, ['Metric', 'Parameter', 'Component', 'Name']) || '')
          .replace(/\s*\([^)]*\)\s*$/, '')
          .trim()
          .toLowerCase();
        const rawValue = valueFrom(row, ['Value', 'Result', 'Reading']);
        const unit = String(valueFrom(row, ['Unit', 'Units']) || '').trim();
        const metric = bloodDefinitions.find((definition) =>
          [definition.id, definition.name, definition.abbreviation]
            .some((candidate) => candidate.toLowerCase() === name)
        );
        const value = rawValue === undefined || String(rawValue).trim() === '' ? NaN : Number(rawValue);
        if (!metric || !Number.isFinite(value) ||
            (unit && normalizeUnit(unit) !== normalizeUnit(metric.unit)) ||
            seenMetrics.has(metric?.id)) {
          skippedCount += 1;
          return;
        }

        seenMetrics.add(metric.id);
        bloodValues[metric.id] = value;
        updatedCount += 1;
      });

      if (!updatedCount) {
        toast('No valid blood measurements matched the active profile and configured units.');
        return;
      }

      activeBloodRecord = {
        ...currentRecord,
        id: `imported-${Date.now()}`,
        label: 'Imported test',
        missionDay: null,
        date: dates[0] || null,
        time: times[0] || '',
        sampleId: sampleIds[0] || null,
        blood: bloodValues
      };
      appState.importedFile = file.name;
      D = createMetricGroups(currentRecord, activeBloodRecord);
      toast(`Loaded ${updatedCount} metric${updatedCount === 1 ? '' : 's'}${skippedCount ? `; skipped ${skippedCount} invalid or unsupported row${skippedCount === 1 ? '' : 's'}` : ''}.`);
      prepareVialScreen();
      runVialCollection();
    } catch (error) {
      toast(`Could not parse spreadsheet: ${error.message}`);
    }
  };
  reader.onerror = () => toast('Could not read the selected spreadsheet file.');
  reader.readAsArrayBuffer(file);
  event.target.value = '';
}

/* Dashboard Builder */
function buildDashboard() {
  const counts = { ok: 0, low: 0, high: 0, warn: 0, na: 0 };
  const issues = [];

  D.forEach((group) => {
    group[2].forEach((reading) => {
      const [key, label] = statusForReading(reading);
      counts[key] += 1;
      if (key === 'low' || key === 'warn') {
        issues.push({
          name: reading[0],
          status: label,
          key
        });
      }
    });
  });

  const ratedCount = counts.ok + counts.low + counts.high + counts.warn;
  const score = ratedCount ? Math.round((counts.ok / ratedCount) * 100) : null;
  $('#rt').textContent = score === null ? '—' : `${score}%`;
  setTimeout(() => {
    $('#rc').style.strokeDashoffset = score === null ? 314 : 314 * (1 - score / 100);
  }, 80);

  $('#hs').textContent = ratedCount
    ? `${counts.ok} of ${ratedCount} measurements with configured ranges are normal. ${issues.length} low, high, warning, critical, or borderline results.`
    : 'No measurements with configured reference ranges are available.';
  $('#hc').innerHTML = issues.map((issue) => `<span class="chip c-${issue.key}">${issue.name} (${issue.status})</span>`).join('');
  $('#alertBadge').textContent = issues.length;

  $('#summaryTiles').innerHTML = `
    <div class="tile-card"><small>Vital Measurements Available</small><strong>${D.filter((group) => group[3] === 'vitals').flatMap((group) => group[2]).filter((reading) => Number.isFinite(reading[2])).length}</strong></div>
    <div class="tile-card"><small>Flagged Results</small><strong>${issues.length}</strong></div>
    <div class="tile-card"><small>Latest Vital Record</small><strong>${timeNote(currentRecord)}</strong></div>
  `;

  renderBloodSummary();
  renderGroups();
  renderRadiationPanel();
  renderHistoryPanel();
  renderMissionList();
  updateDashboardTab();

  $('#log').innerHTML = '';
  say(`Welcome, crew member! I'm Orbit. This dashboard shows the available source-backed demo measurements. Some results may be missing or have no configured reference range. Tap a card to compare its history, or ask me about a measurement.`);
}

function getRangeIndicator(value, min, max) {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    return null;
  }
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

function renderMetricCard(reading, extraClass = '') {
  const metric = reading[9];
  const range = reading[8];
  const [resultKey, label] = statusForReading(reading);
  const hasRange = Number.isFinite(range?.min) && Number.isFinite(range?.max) && range.max > range.min;
  const indicator = hasRange ? getRangeIndicator(reading[2], range.min, range.max) : null;
  const currentRecordForMetric = metric.section === 'blood' ? activeBloodRecord : currentRecord;
  const baseline = metricValue(baselineRecord, metric);
  const current = metricValue(currentRecordForMetric, metric);
  const difference = Number.isFinite(current) && Number.isFinite(baseline) ? current - baseline : null;
  const percentChange = Number.isFinite(difference) && baseline !== 0
    ? (difference / baseline) * 100
    : null;
  const band = hasRange
    ? getRangeIndicator((range.min + range.max) / 2, range.min, range.max)
    : null;
  const trend = !Number.isFinite(difference)
    ? 'Not available'
    : difference > 0
      ? 'Increased'
      : difference < 0
        ? 'Decreased'
        : 'Unchanged';
  return `
    <button class="m ${extraClass}" type="button" aria-expanded="false">
      <div class="h">
        <span class="n">${reading[0]}</span>
        <span class="chip c-${resultKey}">${label}</span>
      </div>
      <div class="v">${displayValue(reading)} <small>${reading[1]}</small></div>
      ${hasRange ? `
        <div class="rg" aria-label="Reference range ${formatNumber(range.min, metric)} to ${formatNumber(range.max, metric)} ${metric.unit}">
          <i style="left:${band.left}%;width:${band.width}%"></i>
          ${indicator ? `<u style="left:${indicator.marker}%"></u>` : ''}
        </div>
        <div class="r">
          <span>Min ${formatNumber(range.min, metric)}</span>
          <span>Nominal range</span>
          <span>Max ${formatNumber(range.max, metric)}</span>
        </div>
      ` : '<div class="r"><span>Min —</span><span>Reference range not configured</span><span>Max —</span></div>'}
      <div class="d">
        <span>Pre-flight baseline: ${formatNumber(baseline, metric)} ${metric.unit}</span>
        <span>Current value: ${formatNumber(current, metric)} ${metric.unit}</span>
        <span>Difference from baseline: ${formatNumber(difference, metric)} ${metric.unit}</span>
        <span>Change: ${Number.isFinite(percentChange) ? `${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}%` : 'Not meaningful or unavailable'} · ${trend}</span>
        <span>${metric.section === 'radiation' ? 'Source measurement; interpretation requires mission-specific guidance.' : 'Compared with the latest available pre-flight measurement.'}</span>
      </div>
    </button>
  `;
}

function bindMetricCards(container) {
  container.querySelectorAll('.m').forEach((button) => {
    button.onclick = () => {
      const open = button.classList.toggle('open');
      button.setAttribute('aria-expanded', String(open));
    };
  });
}

function renderBloodSummary() {
  const readings = D
    .filter((group) => group[3] === 'blood')
    .flatMap((group) => group[2]);
  const counts = { normal: 0, low: 0, high: 0, borderline: 0, measured: 0 };
  readings.forEach((reading) => {
    if (Number.isFinite(reading[2])) counts.measured += 1;
    const [key, label] = statusForReading(reading);
    if (key === 'ok') counts.normal += 1;
    if (key === 'low' && label === 'Low') counts.low += 1;
    if (key === 'low' && label === 'High') counts.high += 1;
    if (key === 'warn') counts.borderline += 1;
  });

  let assessment = 'Not Available';
  let assessmentClass = 'na';
  if (counts.low || counts.high) {
    assessment = 'Range flags present';
    assessmentClass = 'low';
  } else if (counts.borderline) {
    assessment = 'Borderline results';
    assessmentClass = 'warn';
  } else if (counts.measured && counts.normal === counts.measured) {
    assessment = 'Within configured ranges';
    assessmentClass = 'ok';
  } else if (counts.measured) {
    assessment = 'Some results not rated';
  }

  $('#bloodAssessment').className = `chip c-${assessmentClass}`;
  $('#bloodAssessment').textContent = assessment;
  $('#bloodSummaryMeta').textContent = currentTestMetadata('blood');
  $('#bloodCounts').innerHTML = `
    <div class="blood-count"><small>Parameters measured</small><strong>${counts.measured} / ${readings.length}</strong></div>
    <div class="blood-count"><small>Normal</small><strong>${counts.normal}</strong></div>
    <div class="blood-count"><small>Low</small><strong>${counts.low}</strong></div>
    <div class="blood-count"><small>High</small><strong>${counts.high}</strong></div>
    <div class="blood-count"><small>Borderline</small><strong>${counts.borderline}</strong></div>
  `;
}

function renderGroups() {
  const filterAlertsOnly = appState.activeTab === 'alerts';
  const sectionFilter = appState.activeTab === 'overview'
    ? 'vitals'
    : appState.activeTab === 'analytics'
      ? 'blood'
      : null;

  $('#groups').innerHTML = D
    .filter((group) => !sectionFilter || group[3] === sectionFilter)
    .map((group) => {
      const filtered = group[2].filter((reading) => {
        if (!filterAlertsOnly) return true;
        const key = statusForReading(reading)[0];
        return key === 'low' || key === 'warn';
      });

      if (!filtered.length) return '';

      return `
        <div class="grp">
          <h3>${group[0]}</h3>
          <p>${group[1]}</p>
          <div class="rows">${filtered.map((reading) => renderMetricCard(reading)).join('')}</div>
        </div>
      `;
    }).join('');
  bindMetricCards($('#groups'));
}

function renderRadiationPanel() {
  const radiationGroups = D.filter((group) => group[3] === 'radiation');
  const physical = radiationGroups.filter((group) => group[0] === 'Radiation Exposure');
  const biological = radiationGroups.filter((group) => group[0] === 'Biological Response');
  const renderMetrics = (groups) => groups
    .flatMap((group) => group[2])
    .map((reading) => renderMetricCard(reading, 'radiation-metric'))
    .join('');

  $('#physicalRadiationMetrics').innerHTML = renderMetrics(physical);
  $('#bioRadiationMetrics').innerHTML = renderMetrics(biological);
  $('#radiationUpdatedAt').textContent = currentTestMetadata('radiation');

  const allReadings = radiationGroups.flatMap((group) => group[2]);
  const ratedReadings = allReadings.filter((reading) => statusForReading(reading)[0] !== 'na');
  const hasHigh = ratedReadings.some((reading) => statusForReading(reading)[0] === 'low');
  const flagged = hasHigh || ratedReadings.some((reading) => statusForReading(reading)[0] === 'warn');
  const statusNode = $('#radiationStatus');
  statusNode.className = `chip c-${hasHigh ? 'low' : flagged ? 'warn' : ratedReadings.length ? 'ok' : 'na'}`;
  statusNode.textContent = hasHigh ? 'High result' : flagged ? 'Warning' : ratedReadings.length ? 'Within configured ranges' : 'Not Rated';
  bindMetricCards($('#radiationPanel'));
}

function historyRecords(category) {
  const records = DEMO.records
    .filter((record) => record.date && record[category])
    .slice();
  if (category === 'blood' && activeBloodRecord.id.startsWith('imported-') && activeBloodRecord.date) {
    records.push(activeBloodRecord);
  }
  return records.sort((a, b) => a.date.localeCompare(b.date));
}

function renderHistoryPanel() {
  const categorySelect = $('#historyCategory');
  const metricSelect = $('#historyMetric');
  const category = categorySelect.value || appState.historyCategory;
  appState.historyCategory = category;
  const metrics = metricDefinitions.filter((metric) => metric.section === category);
  if (!metrics.some((metric) => metric.id === appState.historyMetric)) {
    appState.historyMetric = metrics[0]?.id || '';
  }

  metricSelect.innerHTML = '';
  metrics.forEach((metric) => {
    const option = document.createElement('option');
    option.value = metric.id;
    option.textContent = metricLabel(metric);
    metricSelect.appendChild(option);
  });
  metricSelect.value = appState.historyMetric;

  const records = historyRecords(category);
  const dateSelect = $('#historyDate');
  dateSelect.innerHTML = '';
  records.forEach((record) => {
    const option = document.createElement('option');
    option.value = record.id;
    const recordType = record.id.startsWith('imported-')
      ? 'Imported test'
      : Number.isFinite(record.missionDay)
        ? `Mission day ${record.missionDay}`
        : 'Pre-flight';
    option.textContent = `${timeNote(record)} · ${recordType}`;
    dateSelect.appendChild(option);
  });
  if (!records.some((record) => record.id === appState.historyDate)) {
    appState.historyDate = records[records.length - 1]?.id || '';
  }
  dateSelect.value = appState.historyDate;

  const metric = metrics.find((item) => item.id === appState.historyMetric);
  if (!metric || !records.length) {
    $('#historyComparison').textContent = 'No dated history is available for this category.';
    $('#historyChart').textContent = 'No historical measurements to chart.';
    return;
  }

  const selectedRecord = records.find((record) => record.id === appState.historyDate) || records[records.length - 1];
  const selectedValue = metricValue(selectedRecord, metric);
  const baseline = metricValue(baselineRecord, metric);
  const difference = Number.isFinite(selectedValue) && Number.isFinite(baseline) ? selectedValue - baseline : null;
  const percentChange = Number.isFinite(difference) && baseline !== 0 ? (difference / baseline) * 100 : null;
  const trend = !Number.isFinite(difference) ? 'Not available' : difference > 0 ? 'Increased' : difference < 0 ? 'Decreased' : 'Unchanged';
  $('#historyComparison').innerHTML = `
    <div><small>Selected test · ${timeNote(selectedRecord)}</small><strong>${formatNumber(selectedValue, metric)} ${metric.unit}</strong></div>
    <div><small>Pre-flight baseline · ${timeNote(baselineRecord)}</small><strong>${formatNumber(baseline, metric)} ${metric.unit}</strong></div>
    <div><small>Difference</small><strong>${formatNumber(difference, metric)} ${metric.unit}</strong></div>
    <div><small>Change from baseline</small><strong>${Number.isFinite(percentChange) ? `${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}%` : 'Not meaningful or unavailable'} · ${trend}</strong></div>
  `;

  const values = records.map((record, index) => ({
    record,
    index,
    value: metricValue(record, metric)
  }));
  const available = values.filter((point) => Number.isFinite(point.value));
  if (!available.length) {
    $('#historyChart').textContent = 'No recorded values for this measurement.';
    return;
  }

  const width = 720;
  const height = 220;
  const padding = { top: 20, right: 24, bottom: 42, left: 48 };
  let min = Math.min(...available.map((point) => point.value));
  let max = Math.max(...available.map((point) => point.value));
  if (min === max) {
    min -= Math.abs(min * 0.05) || 1;
    max += Math.abs(max * 0.05) || 1;
  }
  const x = (index) => padding.left + index * (width - padding.left - padding.right) / Math.max(1, values.length - 1);
  const y = (value) => padding.top + (max - value) * (height - padding.top - padding.bottom) / (max - min);
  const segments = [];
  let segment = [];
  values.forEach((point) => {
    if (Number.isFinite(point.value)) {
      segment.push(`${x(point.index)},${y(point.value)}`);
    } else if (segment.length) {
      segments.push(segment.join(' '));
      segment = [];
    }
  });
  if (segment.length) segments.push(segment.join(' '));

  $('#historyChart').innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${metric.name} history chart">
      <line x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}" class="history-axis"></line>
      ${segments.map((points) => `<polyline points="${points}" class="history-line"></polyline>`).join('')}
      ${available.map((point) => `<circle cx="${x(point.index)}" cy="${y(point.value)}" r="4" class="history-point"><title>${formatDate(point.record.date)}: ${formatNumber(point.value, metric)} ${metric.unit}</title></circle>`).join('')}
      ${values.map((point) => `<text x="${x(point.index)}" y="${height - 12}" text-anchor="middle" class="history-label">${point.record.label || formatDate(point.record.date)}</text>`).join('')}
    </svg>
  `;
}

function updateDashboardTab() {
  const overview = appState.activeTab === 'overview';
  const analytics = appState.activeTab === 'analytics';
  const history = appState.activeTab === 'history';
  const radiation = appState.activeTab === 'radiation';
  $('#summaryTiles').classList.toggle('hide', !overview);
  $('#bloodSummary').classList.toggle('hide', !analytics);
  $('#groups').classList.toggle('hide', history || radiation);
  $('#historyPanel').classList.toggle('hide', !history);
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
  const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normalizedQuery = normalize(query);
  const metric = metricDefinitions.find((definition) => {
    return [definition.id, definition.name, definition.abbreviation]
      .map(normalize)
      .some((alias) => alias.length > 2 && normalizedQuery.includes(alias));
  });
  const reading = metric
    ? D.flatMap((group) => group[2]).find((item) => item[6] === metric.id)
    : null;
  const baseline = metric ? metricValue(baselineRecord, metric) : null;
  let answer;
  if (metric && (!reading || !Number.isFinite(reading[2]))) {
    answer = `${metricLabel(metric)} is Not Available in the selected record. Missing measurements are not treated as normal.`;
  } else if (metric && reading) {
    const [key, label] = statusForReading(reading);
    const range = reading[8];
    const rangeText = Number.isFinite(range?.min) && Number.isFinite(range?.max)
      ? ` Configured reference range: ${formatNumber(range.min, metric)}–${formatNumber(range.max, metric)} ${metric.unit}.`
      : ' No reference range is configured, so this result is Not Rated.';
    const baselineText = Number.isFinite(baseline)
      ? ` Pre-flight baseline: ${formatNumber(baseline, metric)} ${metric.unit}.`
      : ' No pre-flight baseline is available.';
    answer = `${metricLabel(metric)}: ${displayValue(reading)} ${metric.unit}. Status: ${label}.${rangeText}${baselineText} This is informational, not a diagnosis.`;
  } else {
    const match = KB.find(([pattern]) => pattern.test(query.toLowerCase()));
    answer = match
      ? match[1]
      : 'I can explain recorded measurements, configured reference ranges, or the pre-flight comparison. Ask about a metric by name or abbreviation.';
  }
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
$('#openAnalysisGuide').onclick = () => $('#analysisGuideDialog').showModal();
$('#closeAnalysisGuide').onclick = () => $('#analysisGuideDialog').close();
$('#closeAnalysisGuideIcon').onclick = () => $('#analysisGuideDialog').close();
$('#analysisGuideDialog').addEventListener('click', (event) => {
  if (event.target === $('#analysisGuideDialog')) $('#analysisGuideDialog').close();
});
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

$('#historyCategory').onchange = () => {
  appState.historyCategory = $('#historyCategory').value;
  appState.historyMetric = '';
  appState.historyDate = '';
  renderHistoryPanel();
};

$('#historyMetric').onchange = () => {
  appState.historyMetric = $('#historyMetric').value;
  renderHistoryPanel();
};

$('#historyDate').onchange = () => {
  appState.historyDate = $('#historyDate').value;
  renderHistoryPanel();
};

$('#themeToggle').onclick = () => {
  const root = document.documentElement;
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  updateThemeToggle();
};
updateThemeToggle();

$('#dashboardHome').onclick = () => {
  appState.activeTab = 'overview';
  renderGroups();
  updateDashboardTab();
  show('dash');
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

$('#out').onclick = () => $('#signOutDialog').showModal();
$('#cancelSignOut').onclick = () => $('#signOutDialog').close();
$('#confirmSignOut').onclick = () => {
  $('#signOutDialog').close();
  resetToOnboarding();
};
$('#signOutDialog').addEventListener('click', (event) => {
  if (event.target === $('#signOutDialog')) $('#signOutDialog').close();
});

async function resetToOnboarding() {
  // Call backend logout API
  try {
    await fetch('/api/astronaut/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
  } catch (error) {
    console.warn('Backend logout failed:', error);
  }

  // Clear astronaut profile
  appState.astronautProfile = null;

  closeRegistration();
  activeBloodRecord = currentRecord;
  appState.importedFile = '';
  appState.activeTab = 'overview';
  appState.historyDate = '';
  D = createMetricGroups(currentRecord, activeBloodRecord);
  updateCrewProfile(DEMO.profile.name);
  $('#xlsxInput').value = '';
  $('#s1').classList.remove('leaving');
  $('#reader').classList.remove('reading');
  $('#t1').textContent = 'Tap your NFC card to start';
  $('#send').disabled = false;
  $('#send').textContent = 'Start Blood Analysis';
  $('#fill').style.height = '0%';
  $('#rb').style.width = '0%';
  $('#pctLabel').textContent = '0%';
  $('#t2').textContent = 'Ready for Blood Analysis';
  $('#p2').textContent = 'Start the analysis to process the available sample data and prepare the report.';
  $('#rs').textContent = 'Analysis ready • Source-backed demo data loaded';
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
  $('#soundToggle').setAttribute('aria-label', 'Sound effects are not supported in this browser');
  $('#soundToggle').title = 'Sound effects are not supported in this browser';
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