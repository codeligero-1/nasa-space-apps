const $ = (selector) => document.querySelector(selector);

const appState = {
  done: new Set(),
  loginInProgress: false
};

let D = window.VITAL_DATA.metrics;
const MIS = window.VITAL_DATA.missions;
const KB = window.VITAL_DATA.chatKnowledge;

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

function toast(message) {
  const toastNode = $('#toast');
  toastNode.textContent = message;
  toastNode.classList.add('on');
  setTimeout(() => toastNode.classList.remove('on'), 2500);
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
}

/* Onboarding 1: Crew NFC Card Tap */
function handleCardTap() {
  if (appState.loginInProgress) return;
  appState.loginInProgress = true;

  const reader = $('#reader');
  reader.classList.add('reading');
  $('#t1').textContent = 'NFC Card Verified • Welcome Aboard';

  setTimeout(() => {
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
  if (!file || typeof XLSX === 'undefined') return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const wb = XLSX.read(e.target.result, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      if (rows.length) {
        const flat = D.flatMap((g) => g[2]);
        rows.forEach((row) => {
          const name = String(row.Metric || row.Parameter || row.Component || '').toLowerCase();
          const val = parseFloat(row.Value ?? row.Result ?? row.Reading);
          if (name && !Number.isNaN(val)) {
            const target = flat.find((m) => m[0].toLowerCase().includes(name) || name.includes(m[0].toLowerCase()));
            if (target) target[2] = val;
          }
        });
        toast(`Loaded ${file.name} into sensor buffer`);
        prepareVialScreen();
        runVialCollection();
      }
    } catch (err) {
      toast('Could not parse spreadsheet format');
    }
  };
  reader.readAsArrayBuffer(file);
}

/* Dashboard Builder */
function buildDashboard() {
  let okCount = 0;
  let totalReadings = 0;
  const issues = [];

  D.forEach((group) => {
    group[2].forEach((reading) => {
      const [key] = status(reading[2], reading[3], reading[4]);
      totalReadings += 1;
      if (key === 'ok') okCount += 1;
      if (key === 'low') issues.push(`${reading[0]} (${reading[2] < reading[3] ? 'Low' : 'High'})`);
    });
  });

  const score = Math.round((okCount / totalReadings) * 100);
  $('#rt').textContent = score + '%';
  setTimeout(() => {
    $('#rc').style.strokeDashoffset = 314 * (1 - score / 100);
  }, 80);

  $('#hs').textContent = `${okCount} of ${totalReadings} blood biomarkers are within nominal crew range. ${issues.length} flagged for follow-up.`;
  $('#hc').innerHTML = issues.map((issue) => `<span class="chip c-low">${issue}</span>`).join('');
  $('#alertBadge').textContent = issues.length;

  $('#summaryTiles').innerHTML = `
    <div class="tile-card"><small>In-Range Biomarkers</small><strong>${okCount} / ${totalReadings}</strong></div>
    <div class="tile-card"><small>Flagged Indicators</small><strong>${issues.length} Alerts</strong></div>
    <div class="tile-card"><small>Cartridge Status</small><strong>Verified</strong></div>
  `;

  renderGroups();
  renderMissionList();

  $('#log').innerHTML = '';
  say("Hi! I'm Orbit. I analyzed your blood cartridge: Hemoglobin, Hematocrit, and Platelets sit slightly below baseline, while White Blood Cells are steady. Tap any card to inspect details or ask me a question!");
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
            const span = (reading[4] - reading[3]) * 2.2;
            const min = reading[3] - (reading[4] - reading[3]) * 0.6;
            const clamp = (v) => Math.max(2, Math.min(98, ((v - min) / span) * 100));

            return `
              <button class="m" type="button" aria-expanded="false">
                <div class="h">
                  <span class="n">${reading[0]}</span>
                  <span class="chip c-${resultKey}">${label}</span>
                </div>
                <div class="v">${reading[2]} <small>${reading[1]}</small></div>
                <div class="rg">
                  <i style="left:${clamp(reading[3])}%;width:${clamp(reading[4]) - clamp(reading[3])}%"></i>
                  <u style="left:${clamp(reading[2])}%"></u>
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

function renderMissionList() {
  $('#missionCountChip').textContent = `${appState.done.size} / ${MIS.length}`;
  $('#mis').innerHTML = MIS.map((mission, index) => {
    const isDone = appState.done.has(index);
    return `
      <li class="${isDone ? 'done' : ''}">
        <label>
          <input type="checkbox" data-i="${index}" ${isDone ? 'checked' : ''}>
          <span>
            ${mission[0]}
            <small>${mission[1]}</small>
          </span>
        </label>
      </li>
    `;
  }).join('');

  document.querySelectorAll('#mis input').forEach((checkbox) => {
    checkbox.onchange = () => {
      const idx = +checkbox.dataset.i;
      if (checkbox.checked && !appState.done.has(idx)) {
        appState.done.add(idx);
        toast(`Mission logged!`);
        say(`Logged "${MIS[idx][0]}" to your medical telemetry.`);
      } else {
        checkbox.checked = true;
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
$('#reader').onclick = handleCardTap;
$('#send').onclick = runVialCollection;
$('#xlsxInput').onchange = handleSpreadsheetUpload;
$('#rescanBtn').onclick = () => { prepareVialScreen(); show('s2'); };

$('#openRegister').onclick = () => {
  $('#registerDialog').showModal();
  $('#cardHolder').focus();
};
$('#closeRegister').onclick = () => $('#registerDialog').close();
$('#tapToRegister').onclick = () => {
  const name = $('#cardHolder').value.trim();
  if (!name) return ($('#registrationStatus').textContent = 'Enter a crew name first.');
  $('#registrationStatus').textContent = `Hold NFC card near reader for ${name}...`;
};
$('#simulateRegister').onclick = () => {
  const name = $('#cardHolder').value.trim();
  if (!name) return ($('#registrationStatus').textContent = 'Enter a crew name first.');
  const initials = name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  $('#activeCrewName').textContent = name;
  $('#crewInitials').textContent = initials || 'CR';
  $('#registrationStatus').textContent = `Registered ${name} to localized NFC profile.`;
  toast(`Credentials bound for ${name}`);
};

document.querySelectorAll('.nav-item').forEach((btn) => {
  btn.onclick = () => {
    document.querySelectorAll('.nav-item').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    appState.activeTab = btn.dataset.tab;
    $('#summaryTiles').classList.toggle('hide', appState.activeTab === 'alerts');
    renderGroups();
  };
});

$('#themeToggle').onclick = () => {
  const root = document.documentElement;
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
};

$('#out').onclick = () => show('s1');

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