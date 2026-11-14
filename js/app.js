// Shared DOM helper and app state.
const $ = (selector) => document.querySelector(selector);

const appState = {
  mode: 'local',
  xp: 40,
  done: new Set()
};

const D = window.HEMODECK_DATA.metrics;
const MIS = window.HEMODECK_DATA.missions;
const C = window.HEMODECK_DATA.crew;
const KB = window.HEMODECK_DATA.chatKnowledge;

// Toggle the visible screen while keeping the UI state centralized.
function show(screenId) {
  ['s1', 's2', 'dash', 'admin'].forEach((id) => {
    $('#' + id).classList.toggle('hide', id !== screenId);
  });
}

// Visual helper used by the health assistant card.
function pet(color = '#FFB84D') {
  return `
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <line x1="50" y1="12" x2="50" y2="2" stroke="${color}" stroke-width="3"/>
      <circle cx="50" cy="4" r="4" fill="#E5361B"/>
      <ellipse cx="50" cy="60" rx="36" ry="34" fill="${color}"/>
      <rect x="26" y="40" width="48" height="30" rx="15" fill="#0F1B3D"/>
      <ellipse class="eye blink" cx="40" cy="55" rx="5" ry="6" fill="#7FE3FF"/>
      <ellipse class="eye blink" cx="60" cy="55" rx="5" ry="6" fill="#7FE3FF"/>
      <path d="M45 64q5 4 10 0" stroke="#7FE3FF" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <circle cx="20" cy="66" r="7" fill="${color}"/>
      <circle cx="80" cy="66" r="7" fill="${color}"/>
    </svg>
  `;
}

function toast(message) {
  const toastNode = $('#toast');
  toastNode.textContent = message;
  toastNode.classList.add('on');
  setTimeout(() => toastNode.classList.remove('on'), 2400);
}

function status(value, lo, hi) {
  if (value < lo) {
    return ['low', 'Low'];
  }
  if (value > hi) {
    return ['low', 'High'];
  }
  if ((value - lo) < (hi - lo) * .08 || (hi - value) < (hi - lo) * .08) {
    return ['warn', 'Near edge'];
  }
  return ['ok', 'In range'];
}

function level() {
  return 1 + Math.floor(appState.xp / 150);
}

function setXP() {
  $('#lvl').textContent = 'Level ' + level();
  $('#xpb').style.width = (appState.xp % 150) / 150 * 100 + '%';
  $('#xpt').textContent = appState.xp + ' XP';
}

function say(message, isUserMessage = false) {
  const entry = document.createElement('div');
  entry.className = 'b ' + (isUserMessage ? 'u' : 'p');
  entry.textContent = message;
  $('#log').appendChild(entry);
  $('#log').scrollTop = 1e5;
}

function setMode(mode) {
  appState.mode = mode;
  $('#mLocal').setAttribute('aria-pressed', mode === 'local');
  $('#mAdmin').setAttribute('aria-pressed', mode === 'admin');

  if (mode === 'local') {
    $('#p1').textContent = 'Hold your NFC card on the reader. Your personal blood profile loads on this device only.';
    document.querySelector('.nfc').firstChild.textContent = 'NASA CREW';
    return;
  }

  $('#p1').textContent = 'Hold your admin card on the reader to open the mainframe and see all crew data.';
  document.querySelector('.nfc').firstChild.textContent = 'NASA ADMIN';
}

function tap() {
  const reader = $('#reader');

  if (reader.classList.contains('ok')) {
    return;
  }

  reader.classList.add('ok');
  $('#t1').textContent = 'Card read. Welcome aboard';

  setTimeout(() => {
    reader.classList.remove('ok');
    $('#t1').textContent = 'Tap your card to start';

    if (appState.mode === 'admin') {
      show('admin');
      $('#out').classList.remove('hide');
      return;
    }

    show('s2');
  }, 1200);
}

function renderMissionList() {
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
          <em>+${mission[2]} XP</em>
        </label>
      </li>
    `;
  }).join('');

  document.querySelectorAll('#mis input').forEach((checkbox) => {
    checkbox.onchange = () => {
      const missionIndex = +checkbox.dataset.i;

      if (checkbox.checked && !appState.done.has(missionIndex)) {
        appState.done.add(missionIndex);
        const previousLevel = level();
        appState.xp += MIS[missionIndex][2];
        toast(`Mission complete. +${MIS[missionIndex][2]} XP`);

        if (level() > previousLevel) {
          setTimeout(() => toast(`Level up! You’re now level ${level()}`), 2600);
        }

        say('Nice work. I added that to your record.');
      } else {
        checkbox.checked = true;
      }

      renderMissionList();
      setXP();
    };
  });
}

// Build the dashboard cards and calculate the combined orbit score.
function buildDashboard() {
  let okCount = 0;
  let totalReadings = 0;
  const issues = [];

  $('#groups').innerHTML = D.map((group) => {
    return `
      <div class="grp">
        <h3>${group[0]}</h3>
        <p>${group[1]}</p>
        <div class="rows">
          ${group[2].map((reading) => {
            const [resultKey, label] = status(reading[2], reading[3], reading[4]);
            totalReadings += 1;

            if (resultKey === 'ok') {
              okCount += 1;
            }

            if (resultKey === 'low') {
              issues.push(reading[0] + ' ' + (reading[2] < reading[3] ? 'low' : 'high'));
            }

            const span = (reading[4] - reading[3]) * 2.2;
            const min = reading[3] - (reading[4] - reading[3]) * .6;
            const clampPercentage = (value) => Math.max(2, Math.min(98, (value - min) / span * 100));

            return `
              <button class="m" aria-expanded="false">
                <div class="h">
                  <span class="n">${reading[0]}</span>
                  <span class="chip c-${resultKey}">${label}</span>
                </div>
                <div class="v">${reading[2]} <small>${reading[1]}</small></div>
                <div class="rg">
                  <i style="left:${clampPercentage(reading[3])}%;width:${clampPercentage(reading[4]) - clampPercentage(reading[3])}%"></i>
                  <u style="left:${clampPercentage(reading[2])}%"></u>
                </div>
                <div class="r">
                  <span>${reading[3]}</span>
                  <span>Healthy range</span>
                  <span>${reading[4]}</span>
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
      const isOpen = button.classList.toggle('open');
      button.setAttribute('aria-expanded', isOpen);
    };
  });

  const score = Math.round(okCount / totalReadings * 100);
  $('#rt').textContent = score;
  setTimeout(() => $('#rc').style.strokeDashoffset = 314 * (1 - score / 100), 100);

  $('#hs').textContent = `${okCount} of ${totalReadings} readings are in range. ${issues.length} need a closer look.`;
  $('#hc').innerHTML = issues.map((issue) => `<span class="chip c-low">${issue}</span>`).join('');
  $('#hn').textContent = 'Your Orbit score';

  renderMissionList();
  setXP();
  $('#log').innerHTML = '';
  say('Hi, I’m Orbi. I read your sample: hemoglobin, hematocrit and platelets sit below range, while the rest looks steady. Tap a question or ask me anything.');
}

// Keep the assistant responses readable and maintainable by centralizing the keyword lookup.
function askAssistant(query) {
  say(query, true);

  const match = KB.find(([pattern]) => pattern.test(query.toLowerCase()));
  const answer = match ? match[1] : 'I can help with hemoglobin, platelets, white cells, your score or what test to do next. Which would you like?';

  setTimeout(() => say(answer), 500);
}

// Simulate the blood sample workflow and animate the sensor reading.
function simulateSampleRead() {
  const flatMetrics = D.flatMap((group) => group[2]);
  $('#live').innerHTML = flatMetrics.slice(0, 8).map((metric, index) => {
    return `<div id="l${index}"><span>${metric[0]}</span><b>…</b></div>`;
  }).join('');

  let sending = false;

  $('#send').onclick = () => {
    if (sending) {
      return;
    }

    sending = true;
    $('#send').disabled = true;
    $('#t2').textContent = 'Reading your sample';
    $('#p2').textContent = 'Keep the cartridge in place.';
    $('#rs').textContent = 'Sensor status: blood detected';
    $('#fill').style.height = '85%';

    let index = 0;
    const timer = setInterval(() => {
      if (index < 8) {
        const item = flatMetrics[index];
        $('#l' + index).classList.add('done');
        $('#l' + index + ' b').textContent = item[2] + ' ' + item[1];
        index += 1;
        $('#rb').style.width = (index / 8 * 100) + '%';
        return;
      }

      clearInterval(timer);
      $('#rs').textContent = 'Sample read. Building your report';
      $('#rb').style.width = '100%';

      setTimeout(() => {
        buildDashboard();
        show('dash');
        $('#xpbox').classList.remove('hide');
        $('#out').classList.remove('hide');
        sending = false;
        setTimeout(() => toast('First scan complete. +40 XP'), 400);
      }, 900);
    }, 450);
  };
}

function bindQuickQuestions() {
  $('#qs').innerHTML = [
    'Why is my hemoglobin low?',
    'What about platelets?',
    'What should I test next?'
  ].map((question) => `<button type="button">${question}</button>`).join('');

  document.querySelectorAll('#qs button').forEach((button) => {
    button.onclick = () => askAssistant(button.textContent);
  });

  $('#f').onsubmit = (event) => {
    event.preventDefault();
    const value = $('#q').value.trim();
    if (value) {
      askAssistant(value);
      $('#q').value = '';
    }
  };
}

function populateAdminTable() {
  $('#crew').innerHTML = C.map((crewMember) => {
    const [name, card, lastSample, statusType, orbitScore] = crewMember;
    const lab = { ok: 'Normal', warn: 'Review', low: 'Flagged' };
    return `
      <tr>
        <td>${name}</td>
        <td>${card}</td>
        <td>${lastSample}</td>
        <td><span class="chip c-${statusType}">${lab[statusType]}</span></td>
        <td>${orbitScore}</td>
      </tr>
    `;
  }).join('');
}

function resetToOnboarding() {
  $('#xpbox').classList.add('hide');
  $('#out').classList.add('hide');
  $('#send').disabled = false;
  $('#rb').style.width = '0';
  $('#fill').style.height = '0';
  $('#t2').textContent = 'Waiting for your blood sample';
  $('#p2').textContent = 'Insert the cartridge into the analyzer. HemoDeck starts reading when the sensors detect blood.';
  $('#rs').textContent = 'Sensor status: idle';

  document.querySelectorAll('#live div').forEach((entry) => {
    entry.classList.remove('done');
    entry.lastChild.textContent = '…';
  });

  show('s1');
}

// ---------- Initial app startup ----------
$('#mLocal').onclick = () => setMode('local');
$('#mAdmin').onclick = () => setMode('admin');
$('#tap').onclick = tap;
$('#reader').onclick = tap;

document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !$('#s1').classList.contains('hide') && document.activeElement === document.body) {
    tap();
  }
});

$('#petsvg').innerHTML = pet();
$('#out').onclick = resetToOnboarding;

bindQuickQuestions();
populateAdminTable();
simulateSampleRead();
setMode('local');
setXP();
