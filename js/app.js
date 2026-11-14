const $ = (selector) => document.querySelector(selector);
const demo = window.VITAL_DEMO_DATA;
const metrics = window.VITAL_DATA.metrics;
const sections = window.VITAL_DATA.sections;

if (!demo?.profile || !Array.isArray(demo.records) || !Array.isArray(metrics)) {
  throw new Error('VITAL demo data or metric definitions are missing.');
}

const appState = {
  activeTab: 'overview',
  activeProfile: null,
  soundsEnabled: true,
  audioContext: null,
  selectedHistoryId: '',
  selectedHistoryMetric: 'heartRate',
  selectedHistoryCategory: 'vitals'
};

const latestRecord = (type) => demo.records
  .filter((record) => record.type === type)
  .sort((a, b) => b.date.localeCompare(a.date))[0] || null;
const baselineRecord = latestRecord('baseline');
const currentRecord = latestRecord('flight');
const flightRecords = demo.records
  .filter((record) => record.type === 'flight')
  .sort((a, b) => a.date.localeCompare(b.date));
const rangeFor = (metric) => metric.range ? demo.ranges[metric.range] || null : null;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function formatNumber(value, metric) {
  if (!Number.isFinite(value)) return 'Not Available';
  const decimals = Number.isInteger(metric.decimals) ? metric.decimals : 2;
  return Number(value.toFixed(decimals)).toLocaleString(undefined, { maximumFractionDigits: decimals });
}

function formatDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return 'Not Available';
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    .toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateWithTimeNote(record) {
  return record ? `${formatDate(record.date)} · Time not supplied` : 'Not Available';
}

function measurement(record, metric) {
  return record?.[metric.section]?.[metric.id];
}

function classify(metric, value) {
  const range = rangeFor(metric);
  if (!Number.isFinite(value) || !range) return 'na';

  if (metric.section === 'blood') {
    if (value < range.min) return value >= range.warningLow ? 'warn' : 'low';
    if (value > range.max) return value <= range.warningHigh ? 'warn' : 'high';
    return 'normal';
  }

  if (value < range.criticalLow || value > range.criticalHigh) return 'critical';
  if (value < range.min || value > range.max ||
      value < range.warningLow || value > range.warningHigh) return 'warning';
  return 'normal';
}

function statusLabel(status, section) {
  if (status === 'normal') return 'Normal';
  if (status === 'warn' || status === 'warning') return section === 'blood' ? 'Borderline' : 'Warning';
  if (status === 'low') return 'Low';
  if (status === 'high') return 'High';
  if (status === 'critical') return 'Critical';
  return 'Not Rated';
}

function statusClass(status) {
  if (status === 'normal') return 'c-ok';
  if (status === 'warn' || status === 'warning') return 'c-warn';
  if (status === 'critical') return 'c-critical';
  if (status === 'low' || status === 'high') return 'c-low';
  return 'c-na';
}

function toast(message) {
  const node = $('#toast');
  node.textContent = message;
  node.classList.add('on');
  window.setTimeout(() => node.classList.remove('on'), 2600);
}

function playTone(frequency, duration, volume, delay = 0) {
  if (!appState.soundsEnabled || !window.AudioContext) return;
  try {
    if (!appState.audioContext) appState.audioContext = new window.AudioContext();
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

function updateSoundToggle() {
  const button = $('#soundToggle');
  button.textContent = appState.soundsEnabled ? 'Sound on' : 'Sound off';
  button.setAttribute('aria-pressed', String(appState.soundsEnabled));
  button.setAttribute('aria-label', appState.soundsEnabled ? 'Turn sound effects off' : 'Turn sound effects on');
}

function show(screenId) {
  $('#s1').classList.toggle('hide', screenId !== 's1');
  $('#dash').classList.toggle('hide', screenId !== 'dash');
  $('#siteHeader').classList.toggle('hide', screenId === 's1');
}

function setCrewProfile(profile) {
  appState.activeProfile = profile;
  const initials = profile.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  $('#activeCrewName').textContent = profile.name;
  $('#crewInitials').textContent = initials;
  $('#activeCardId').textContent = [profile.astronautId, profile.missionCode].filter(Boolean).join(' · ');
}

function sectionMetrics(section) {
  return metrics.filter((metric) => metric.section === section);
}

function countsFor(section, record) {
  const counts = { normal: 0, warn: 0, low: 0, high: 0, warning: 0, critical: 0, na: 0, measured: 0 };
  const sectionList = sectionMetrics(section);
  sectionList.forEach((metric) => {
    const value = measurement(record, metric);
    if (!Number.isFinite(value)) return;
    counts.measured += 1;
    counts[classify(metric, value)] += 1;
  });
  counts.missing = sectionList.length - counts.measured;
  return counts;
}

function sectionAssessment(section, record) {
  const counts = countsFor(section, record);
  const rated = counts.measured - counts.na;
  if (!counts.measured) return { label: 'No measurements available', key: 'na', counts };
  if (counts.critical) return { label: 'Critical result(s) detected', key: 'critical', counts };
  if (counts.low || counts.high) return { label: 'Results outside reference range', key: 'low', counts };
  if (counts.warning || counts.warn) return { label: 'Warning results need review', key: 'warning', counts };
  if (!rated) return { label: 'Reference ranges not configured', key: 'na', counts };
  if (counts.na || counts.missing) return { label: 'Incomplete · some results missing or unrated', key: 'na', counts };
  return { label: 'All rated measurements within range', key: 'normal', counts };
}

function bloodAssessment(record) {
  const counts = countsFor('blood', record);
  if (!counts.measured) return { label: 'No blood measurements available', counts };
  if (counts.low || counts.high) return { label: 'Results outside configured reference ranges', counts };
  if (counts.warn) return { label: counts.missing ? 'Borderline results; some measurements unavailable' : 'Borderline results need review', counts };
  if (counts.na || counts.missing) return { label: 'Incomplete · some results missing or unrated', counts };
  return { label: 'All measured results within configured ranges', counts };
}

function assessmentChipLabel(assessment, section) {
  if (assessment.key === 'na') return assessment.counts.measured ? 'Partially Rated' : 'Not Available';
  return statusLabel(assessment.key, section);
}

function rangeMarkup(metric, value, state) {
  const range = rangeFor(metric);
  if (!range) return '<div class="range-unavailable">Reference range not configured.</div>';
  if (!Number.isFinite(value)) return '<div class="range-unavailable">Measurement not available.</div>';

  const spread = Math.max(range.max - range.min, Math.abs(range.max) * 0.01, 0.01);
  const scaleMin = range.min - spread * 0.6;
  const scaleMax = range.max + spread * 0.6;
  const position = (number) => Math.max(2, Math.min(98, ((number - scaleMin) / (scaleMax - scaleMin)) * 100));
  const left = position(range.min);
  const right = position(range.max);
  return `
    <div class="rg ${['low', 'high', 'critical'].includes(state) ? 'out-of-range' : ''}" aria-label="Reference range ${range.min} to ${range.max} ${escapeHtml(metric.unit)}">
      <i style="left:${left}%;width:${right - left}%"></i>
      <u style="left:${position(value)}%"></u>
    </div>
    <div class="r">
      <span>Min ${range.min} ${escapeHtml(metric.unit)}</span>
      <span>Nominal ${range.min}–${range.max}</span>
      <span>Max ${range.max} ${escapeHtml(metric.unit)}</span>
    </div>
  `;
}

function metricCard(metric, record) {
  const value = measurement(record, metric);
  const state = classify(metric, value);
  const hasValue = Number.isFinite(value);
  const label = !hasValue ? 'Not Available' : !rangeFor(metric) ? 'Not Rated' : statusLabel(state, metric.section);
  return `
    <article class="m metric-card">
      <div class="h">
        <span class="n">${escapeHtml(metric.name)} <small>(${escapeHtml(metric.abbreviation)})</small></span>
        <span class="chip ${statusClass(state)}">${label}</span>
      </div>
      <div class="v">${hasValue ? `${escapeHtml(formatNumber(value, metric))} <small>${escapeHtml(metric.unit)}</small>` : 'Not Available'}</div>
      ${rangeMarkup(metric, value, state)}
    </article>
  `;
}

function renderMetricGroups(section, targetId) {
  const grouped = new Map();
  sectionMetrics(section).forEach((metric) => {
    if (!grouped.has(metric.group)) grouped.set(metric.group, []);
    grouped.get(metric.group).push(metric);
  });
  $(`#${targetId}`).innerHTML = [...grouped.entries()].map(([groupName, groupMetrics]) => `
    <div class="grp">
      <h3>${escapeHtml(groupName)}</h3>
      <div class="rows">${groupMetrics.map((metric) => metricCard(metric, currentRecord)).join('')}</div>
    </div>
  `).join('');
}

function tile(label, value, detail = '') {
  return `<div class="tile-card"><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong>${detail ? `<span class="tile-detail">${escapeHtml(detail)}</span>` : ''}</div>`;
}

function renderBloodSummary() {
  const assessment = bloodAssessment(currentRecord);
  const counts = assessment.counts;
  const latest = currentRecord;
  const latestSampleId = latest?.sampleId || 'Not provided';
  $('#bloodSummaryTiles').innerHTML = [
    tile('Overall CBC Assessment', assessment.label),
    tile('Parameters Measured', String(counts.measured)),
    tile('Normal', String(counts.normal)),
    tile('Low', String(counts.low)),
    tile('High', String(counts.high)),
    tile('Borderline', String(counts.warn)),
    tile('Not Rated', String(counts.na)),
    tile('Not Available', String(counts.missing)),
    tile('Latest Blood Test', formatDateWithTimeNote(latest)),
    tile('Sample ID', latestSampleId)
  ].join('');
  $('#bloodMetadata').textContent = `AST-001 · ${latest?.label || 'Mission day not supplied'} · Sample ID: ${latestSampleId}`;
  $('#bloodUpdated').textContent = `Latest result: ${formatDateWithTimeNote(latest)}`;
}

function renderSectionSummary(section, targetId, record = currentRecord) {
  const assessment = sectionAssessment(section, record);
  const counts = assessment.counts;
  const label = sections.find((item) => item.id === section)?.title || section;
  const summary = section === 'vitals'
    ? [
      tile(`${label} Assessment`, assessment.label),
      tile('Normal', String(counts.normal)),
      tile('Warning', String(counts.warning)),
      tile('Critical', String(counts.critical)),
      tile('Not Rated', String(counts.na)),
      tile('Not Available', String(counts.missing)),
      tile('Latest Measurement', formatDateWithTimeNote(record))
    ]
    : [
      tile(`${label} Status`, assessment.label),
      tile('Normal', String(counts.normal)),
      tile('Warning', String(counts.warning)),
      tile('Critical', String(counts.critical)),
      tile('Not Rated', String(counts.na)),
      tile('Not Available', String(counts.missing)),
      tile('Latest Measurement', formatDateWithTimeNote(record))
    ];
  $(`#${targetId}`).innerHTML = summary.join('');
  return assessment;
}

function formatOverviewValue(metric, record) {
  const value = measurement(record, metric);
  if (!Number.isFinite(value)) return 'Not Available';
  return `${formatNumber(value, metric)} ${metric.unit}`;
}

function renderOverview() {
  const vital = sectionAssessment('vitals', currentRecord);
  const blood = bloodAssessment(currentRecord);
  const radiation = sectionAssessment('radiation', currentRecord);
  const bloodCounts = blood.counts;
  const bloodKey = bloodCounts.low || bloodCounts.high ? 'low' : bloodCounts.warn ? 'warning' : bloodCounts.na ? 'na' : 'normal';
  const bloodStatusLabel = bloodCounts.low || bloodCounts.high
    ? 'Outside Range'
    : bloodCounts.warn
      ? 'Borderline'
      : bloodCounts.na || bloodCounts.missing
        ? 'Not Rated'
        : 'Normal';
  $('#overviewUpdated').textContent = `Latest in-flight records: ${formatDate(currentRecord.date)} · Time not supplied`;
  $('#overviewCards').innerHTML = [
    tile('Vital Signs', vital.label, `${vital.counts.measured} readings · ${formatDate(currentRecord.date)}`),
    tile('Blood Analysis', blood.label, `${bloodCounts.measured} parameters · ${formatDate(currentRecord.date)}`),
    tile('Radiation Monitoring', radiation.label, `${radiation.counts.measured} indicators · ${formatDate(currentRecord.date)}`)
  ].join('');

  const summaries = [
    { id: 'vitals', title: 'Vital Signs', state: vital.key, stateLabel: assessmentChipLabel(vital, 'vitals'), metricIds: ['heartRate', 'systolic', 'diastolic', 'spo2'] },
    { id: 'blood', title: 'Blood Analysis', state: bloodKey, stateLabel: bloodStatusLabel, metricIds: ['rbc', 'wbc', 'hemoglobin', 'hematocrit', 'platelets'] },
    { id: 'radiation', title: 'Radiation Monitoring', state: radiation.key, stateLabel: assessmentChipLabel(radiation, 'radiation'), metricIds: ['dailyDose', 'cumulativeDose', 'gammaH2ax', 'dicentrics'] }
  ];
  $('#overviewDetails').innerHTML = summaries.map((summary) => {
    const rows = summary.metricIds.map((id) => {
      const metric = metrics.find((item) => item.id === id);
      return `<div class="overview-reading"><span>${escapeHtml(metric.name)}</span><strong>${escapeHtml(formatOverviewValue(metric, currentRecord))}</strong></div>`;
    }).join('');
    return `
      <article class="card overview-panel">
        <div class="card-head-row"><h3>${escapeHtml(summary.title)}</h3><span class="chip ${statusClass(summary.state)}">${escapeHtml(summary.stateLabel || statusLabel(summary.state, summary.id))}</span></div>
        ${rows}
        <button class="text-link" type="button" data-open-section="${summary.id}">View ${escapeHtml(summary.title.toLowerCase())}</button>
      </article>
    `;
  }).join('');
  $('#overviewDetails').querySelectorAll('[data-open-section]').forEach((button) => {
    button.onclick = () => setActiveTab(button.dataset.openSection);
  });

  const statuses = [
    ['Vitals', vital.key, assessmentChipLabel(vital, 'vitals')],
    ['Blood', bloodKey, bloodStatusLabel],
    ['Radiation', radiation.key, assessmentChipLabel(radiation, 'radiation')]
  ];
  $('#hc').innerHTML = statuses.map(([name, key, label]) =>
    `<span class="chip ${statusClass(key)}">${escapeHtml(name)} · ${escapeHtml(label)}</span>`
  ).join('');
  $('#hs').textContent = `Latest available data: ${formatDate(currentRecord.date)} · ${currentRecord.missionDay ? `Flight Day ${currentRecord.missionDay}` : 'Mission day not supplied'}.`;
  $('#rt').textContent = currentRecord.missionDay ? `FD ${currentRecord.missionDay}` : 'VITAL';
  $('#hn').textContent = 'Crew Health Overview';
}

function renderDashboard() {
  renderOverview();
  renderSectionSummary('vitals', 'vitalsSummary');
  $('#vitalsUpdated').textContent = `Latest measurement: ${formatDateWithTimeNote(currentRecord)}`;
  renderMetricGroups('vitals', 'vitalsGroups');
  renderBloodSummary();
  renderMetricGroups('blood', 'bloodGroups');
  renderSectionSummary('radiation', 'radiationSummary');
  $('#radiationUpdated').textContent = `Latest radiation data: ${formatDateWithTimeNote(currentRecord)}`;
  renderMetricGroups('radiation', 'radiationGroups');
  renderHistoryPanel();
  updateDashboardTab();
}

function setActiveTab(tab) {
  appState.activeTab = tab;
  updateDashboardTab();
  playTone(520, 0.045, 0.035);
}

function updateDashboardTab() {
  const sectionByTab = {
    overview: 'overviewSection',
    vitals: 'vitalsSection',
    blood: 'bloodSection',
    radiation: 'radiationSection',
    history: 'historySection'
  };
  Object.entries(sectionByTab).forEach(([tab, id]) => {
    $(`#${id}`).classList.toggle('hide', appState.activeTab !== tab);
  });
  document.querySelectorAll('.nav-item').forEach((button) => {
    const selected = button.dataset.tab === appState.activeTab;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

function openDemoProfile() {
  if (appState.activeProfile) return;
  playTone(660, 0.18, 0.07);
  playTone(880, 0.24, 0.07, 0.12);
  setCrewProfile(demo.profile);
  appState.activeTab = 'overview';
  renderDashboard();
  $('#log').innerHTML = '';
  say(`Hi, ${demo.profile.name}. I can help review your recorded vital signs, blood analysis, and radiation monitoring data. I report source values and configured ranges but do not diagnose.`);
  show('dash');
}

function signOut() {
  appState.activeProfile = null;
  appState.activeTab = 'overview';
  $('#activeCrewName').textContent = 'Crew member';
  $('#activeCardId').textContent = 'Mission profile';
  $('#crewInitials').textContent = 'AV';
  $('#log').innerHTML = '';
  $('#q').value = '';
  $('#authStatus').textContent = 'Demo profile closed.';
  show('s1');
}

function formatMeasurement(value, metric, record) {
  if (!Number.isFinite(value)) return 'Not Available';
  let unit = metric.unit;
  if (metric.id === 'cumulativeDose' && record?.type === 'baseline') unit = metric.baselineUnit || unit;
  return `${formatNumber(value, metric)} ${unit}`;
}

function formatChange(current, previous, metric, previousRecord) {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) {
    return { difference: 'Not Available', percent: 'Not Available', direction: 'No comparison' };
  }
  if (metric.compareBaseline === false && previousRecord?.type === 'baseline') {
    return { difference: 'Not comparable', percent: 'Not comparable', direction: 'Different exposure periods' };
  }
  const difference = current - previous;
  const rounded = Number(difference.toFixed(Number.isInteger(metric.decimals) ? metric.decimals : 2));
  const direction = difference > 0 ? 'Increased' : difference < 0 ? 'Decreased' : 'Unchanged';
  return {
    difference: `${rounded > 0 ? '+' : ''}${formatNumber(rounded, metric)} ${metric.unit}`,
    percent: previous === 0 ? 'Not meaningful (baseline is 0)' : `${((difference / Math.abs(previous)) * 100).toFixed(1)}%`,
    direction
  };
}

function historyMetricOptions() {
  return sectionMetrics(appState.selectedHistoryCategory);
}

function refreshHistoryMetricOptions() {
  const available = historyMetricOptions();
  if (!available.some((metric) => metric.id === appState.selectedHistoryMetric)) {
    appState.selectedHistoryMetric = available[0]?.id || '';
  }
  $('#historyMetric').innerHTML = available.map((metric) =>
    `<option value="${escapeHtml(metric.id)}">${escapeHtml(metric.name)} (${escapeHtml(metric.abbreviation)})</option>`
  ).join('');
  $('#historyMetric').value = appState.selectedHistoryMetric;
}

function renderHistoryPanel() {
  const categorySelect = $('#historyCategory');
  if (!categorySelect.options.length) {
    categorySelect.innerHTML = sections.map((section) =>
      `<option value="${escapeHtml(section.id)}">${escapeHtml(section.title)}</option>`
    ).join('');
    categorySelect.value = appState.selectedHistoryCategory;
  }
  refreshHistoryMetricOptions();

  const earlierRecords = flightRecords.filter((record) => record.id !== currentRecord.id);
  if (!earlierRecords.some((record) => record.id === appState.selectedHistoryId)) {
    appState.selectedHistoryId = earlierRecords[earlierRecords.length - 1]?.id || '';
  }
  $('#historyDate').innerHTML = earlierRecords.slice().reverse().map((record) =>
    `<option value="${escapeHtml(record.id)}">${escapeHtml(formatDate(record.date))} · Flight Day ${escapeHtml(record.missionDay)}</option>`
  ).join('');
  $('#historyDate').value = appState.selectedHistoryId;

  const metric = metrics.find((item) => item.id === appState.selectedHistoryMetric);
  const selectedRecord = earlierRecords.find((record) => record.id === appState.selectedHistoryId) || null;
  if (!metric) {
    $('#historyComparison').innerHTML = '';
    $('#trendChart').innerHTML = '';
    $('#historyEmpty').textContent = 'Historical measurements are not available.';
    return;
  }
  const currentValue = measurement(currentRecord, metric);
  const baselineValue = measurement(baselineRecord, metric);
  const selectedValue = measurement(selectedRecord, metric);
  const baselineChange = formatChange(currentValue, baselineValue, metric, baselineRecord);
  const selectedChange = formatChange(currentValue, selectedValue, metric, selectedRecord);

  const row = (label, earlier, earlierRecord, change) => `
    <div class="comparison-row">
      <strong>${escapeHtml(label)}</strong>
      <span>${escapeHtml(formatMeasurement(earlier, metric, earlierRecord))}</span>
      <span>${escapeHtml(formatMeasurement(currentValue, metric, currentRecord))}</span>
      <span>${escapeHtml(change.difference)}</span>
      <span>${escapeHtml(change.percent)}</span>
      <span>${escapeHtml(change.direction)}</span>
    </div>
  `;
  $('#historyComparison').innerHTML = `
    <div class="comparison-row comparison-head"><span>Comparison</span><span>Earlier value</span><span>Current value</span><span>Difference</span><span>Change</span><span>Trend</span></div>
    ${row(`Pre-flight baseline · ${formatDate(baselineRecord.date)}`, baselineValue, baselineRecord, baselineChange)}
    ${selectedRecord ? row(`Selected test · ${formatDate(selectedRecord.date)}`, selectedValue, selectedRecord, selectedChange) : ''}
  `;
  renderTrendChart(metric);
  $('#historyEmpty').textContent = flightRecords.some((record) => Number.isFinite(measurement(record, metric)))
    ? ''
    : 'No historical measurements are available for this parameter.';
}

function renderTrendChart(metric) {
  const points = flightRecords.filter((record) => Number.isFinite(measurement(record, metric)));
  if (!points.length) {
    $('#trendChart').innerHTML = '';
    return;
  }
  const values = points.map((record) => measurement(record, metric));
  const range = rangeFor(metric);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const low = range ? Math.min(dataMin, range.min) : dataMin;
  const high = range ? Math.max(dataMax, range.max) : dataMax;
  const padding = Math.max((high - low) * 0.12, Math.abs(high) * 0.03, 0.01);
  const min = low - padding;
  const max = high + padding;
  const span = max - min || 1;
  const x = (index) => 48 + (points.length === 1 ? 308 : index * 604 / (points.length - 1));
  const y = (value) => 142 - ((value - min) / span) * 112;
  const pointList = points.map((record, index) => `${x(index)},${y(measurement(record, metric))}`).join(' ');
  const circles = points.map((record, index) =>
    `<circle cx="${x(index)}" cy="${y(measurement(record, metric))}" r="5"><title>${escapeHtml(formatDate(record.date))}: ${escapeHtml(formatMeasurement(measurement(record, metric), metric, record))}</title></circle>`
  ).join('');
  const labels = points.map((record, index) =>
    `<text x="${x(index)}" y="169" text-anchor="middle">FD ${escapeHtml(record.missionDay)}</text>`
  ).join('');
  const referenceLines = range ? `
    <line x1="42" y1="${y(range.min)}" x2="658" y2="${y(range.min)}" class="chart-range"></line>
    <line x1="42" y1="${y(range.max)}" x2="658" y2="${y(range.max)}" class="chart-range"></line>
    <text x="4" y="${y(range.max) + 4}" class="chart-axis">${range.max}</text>
    <text x="4" y="${y(range.min) + 4}" class="chart-axis">${range.min}</text>
  ` : '';
  $('#trendChart').innerHTML = `
    <svg viewBox="0 0 700 180" role="img" aria-label="${escapeHtml(metric.name)} across mission days">
      ${referenceLines}
      <polyline points="${pointList}" class="chart-line"></polyline>
      ${circles}${labels}
    </svg>
  `;
}

function orbitAvatarSVG() {
  return `
    <svg viewBox="0 0 110 110" aria-hidden="true">
      <defs>
        <linearGradient id="helmetShell" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#FFFFFF"/><stop offset="100%" stop-color="#DCE4F5"/></linearGradient>
        <linearGradient id="visorGlass" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2A2B4A"/><stop offset="100%" stop-color="#141629"/></linearGradient>
      </defs>
      <line x1="55" y1="16" x2="55" y2="6" stroke="#F07C8A" stroke-width="3.5" stroke-linecap="round"/><circle cx="55" cy="5" r="4.5" fill="#FF5A67"/>
      <rect x="12" y="45" width="10" height="24" rx="5" fill="#8B1C1F"/><rect x="88" y="45" width="10" height="24" rx="5" fill="#8B1C1F"/>
      <rect x="19" y="16" width="72" height="72" rx="34" fill="url(#helmetShell)" stroke="#9BA4D9" stroke-width="2"/>
      <rect x="27" y="34" width="56" height="38" rx="18" fill="url(#visorGlass)"/>
      <path d="M35 41 Q55 37 73 42" stroke="rgba(255,255,255,0.35)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <ellipse class="eye blink" cx="43" cy="53" rx="5" ry="6.5" fill="#7FE3FF"/><ellipse class="eye blink" cx="67" cy="53" rx="5" ry="6.5" fill="#7FE3FF"/>
      <path d="M49 62 Q55 67 61 62" stroke="#7FE3FF" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M29 86 Q55 95 81 86 L77 96 Q55 103 33 96 Z" fill="#8B1C1F"/>
    </svg>
  `;
}

function say(message, isUserMessage = false) {
  const entry = document.createElement('div');
  entry.className = 'b ' + (isUserMessage ? 'u' : 'p');
  entry.textContent = message;
  $('#log').appendChild(entry);
  $('#log').scrollTop = 1e5;
}

function metricForQuestion(query) {
  const normalized = query.toLowerCase();
  const aliases = [
    ['blood pressure', ['blood pressure', 'systolic', 'diastolic', 'sbp', 'dbp']],
    ['heartRate', ['heart rate', 'pulse', 'bpm']],
    ['spo2', ['spo2', 'oxygen saturation', 'oxygen']],
    ['temperature', ['temperature', 'temp']],
    ['respiratoryRate', ['respiratory', 'breathing rate']],
    ['hrv', ['hrv', 'variability']],
    ['rbc', ['rbc', 'red blood']],
    ['wbc', ['wbc', 'white blood']],
    ['hemoglobin', ['hemoglobin', 'haemoglobin', 'hgb']],
    ['hematocrit', ['hematocrit', 'hct']],
    ['platelets', ['platelet', 'plt']],
    ['neutrophils', ['neutrophil']],
    ['lymphocytes', ['lymphocyte']],
    ['crp', ['crp', 'c-reactive']],
    ['ferritin', ['ferritin']],
    ['il6', ['il-6', 'interleukin']],
    ['tnfAlpha', ['tnf', 'tumor necrosis']],
    ['cortisol', ['cortisol']],
    ['troponin', ['troponin']],
    ['sodium', ['sodium', 'electrolyte']],
    ['potassium', ['potassium']],
    ['dailyDose', ['daily dose', 'radiation dose']],
    ['cumulativeDose', ['cumulative dose']],
    ['background', ['radiation background', 'space background']],
    ['gammaH2ax', ['gamma', 'h2ax']],
    ['dicentrics', ['dicentric']],
    ['micronuclei', ['micronuclei']],
    ['dnaRepair', ['dna repair']]
  ];
  const found = aliases.find(([, words]) => words.some((word) => normalized.includes(word)));
  return found?.[0] || '';
}

function answerForMetric(metricId) {
  if (metricId === 'blood pressure') {
    const systolic = metrics.find((metric) => metric.id === 'systolic');
    const diastolic = metrics.find((metric) => metric.id === 'diastolic');
    return `Latest blood pressure is ${formatNumber(measurement(currentRecord, systolic), systolic)}/${formatNumber(measurement(currentRecord, diastolic), diastolic)} mmHg, recorded ${formatDate(currentRecord.date)}. Systolic status: ${statusLabel(classify(systolic, measurement(currentRecord, systolic)), 'vitals')}; diastolic status: ${statusLabel(classify(diastolic, measurement(currentRecord, diastolic)), 'vitals')}.`;
  }
  const metric = metrics.find((item) => item.id === metricId);
  if (!metric) return '';
  const value = measurement(currentRecord, metric);
  const state = classify(metric, value);
  const range = rangeFor(metric);
  const rangeText = range ? `Configured nominal range: ${range.min}–${range.max} ${metric.unit}.` : 'A reference range is not configured for this measurement.';
  return `${metric.name} is ${formatMeasurement(value, metric, currentRecord)} (${statusLabel(state, metric.section)}), recorded ${formatDate(currentRecord.date)}. ${rangeText}`;
}

function askAssistant(query) {
  say(query, true);
  const normalized = query.toLowerCase();
  const metricId = metricForQuestion(normalized);
  let answer = metricId ? answerForMetric(metricId) : '';
  if (!answer && /radiation|dose|dosimetry/.test(normalized)) {
    const assessment = sectionAssessment('radiation', currentRecord);
    answer = `Radiation monitoring status: ${assessment.label}. Some exposure indicators do not have configured reference ranges, so their values are shown without a clinical status.`;
  } else if (!answer && /blood|cbc|biomarker|analysis/.test(normalized)) {
    const assessment = bloodAssessment(currentRecord);
    answer = `Blood analysis assessment: ${assessment.label}. ${assessment.counts.measured} parameters are present; ${assessment.counts.na} measured values have no configured range.`;
  } else if (!answer && /vital|health|overall/.test(normalized)) {
    const assessment = sectionAssessment('vitals', currentRecord);
    answer = `Vital signs assessment: ${assessment.label}. Results without configured thresholds are marked Not Rated.`;
  } else if (!answer && /baseline|trend|history|mission day/.test(normalized)) {
    answer = 'Open History & Trends to compare a selected mission-day measurement with the latest result and pre-flight baseline.';
  } else if (!answer && /test|follow|next/.test(normalized)) {
    answer = 'The demo data does not include personalized follow-up plans. Please review unusual or borderline results with your flight surgeon.';
  } else if (!answer && /doctor|surgeon|diagnos|serious|worry/.test(normalized)) {
    answer = 'I can explain recorded measurements and configured ranges, but I cannot diagnose or recommend treatment. Please review concerns with your flight surgeon.';
  }
  if (!answer) {
    answer = 'I can summarize the recorded vital signs, blood analysis, and radiation indicators. Ask about a named parameter or open History & Trends to compare mission days.';
  }
  window.setTimeout(() => say(answer), 250);
}

$('#reader').onclick = () => {
  if (!appState.activeProfile) openDemoProfile();
};
$('#out').onclick = signOut;
$('#themeToggle').onclick = () => {
  const root = document.documentElement;
  root.setAttribute('data-theme', root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
};
$('#soundToggle').onclick = () => {
  appState.soundsEnabled = !appState.soundsEnabled;
  updateSoundToggle();
  if (appState.soundsEnabled) playTone(520, 0.045, 0.035);
};

document.querySelectorAll('.nav-item').forEach((button) => {
  button.onclick = () => setActiveTab(button.dataset.tab);
});

$('#historyCategory').onchange = () => {
  appState.selectedHistoryCategory = $('#historyCategory').value;
  appState.selectedHistoryMetric = '';
  refreshHistoryMetricOptions();
  renderHistoryPanel();
};
$('#historyMetric').onchange = () => {
  appState.selectedHistoryMetric = $('#historyMetric').value;
  renderHistoryPanel();
};
$('#historyDate').onchange = () => {
  appState.selectedHistoryId = $('#historyDate').value;
  renderHistoryPanel();
};

$('#qs').innerHTML = [
  'Why is hemoglobin low?',
  'Explain my WBC count',
  'What tests should I do next?'
].map((question) => `<button type="button">${escapeHtml(question)}</button>`).join('');
$('#qs').querySelectorAll('button').forEach((button) => {
  button.onclick = () => askAssistant(button.textContent);
});
$('#f').onsubmit = (event) => {
  event.preventDefault();
  const query = $('#q').value.trim();
  if (!query) return;
  askAssistant(query);
  $('#q').value = '';
};

$('#petsvg').innerHTML = orbitAvatarSVG();
renderHistoryPanel();
updateSoundToggle();
if (!window.AudioContext) {
  $('#soundToggle').disabled = true;
  $('#soundToggle').textContent = 'Sound unavailable';
  $('#soundToggle').setAttribute('aria-label', 'Sound effects are not supported in this browser');
  $('#soundToggle').setAttribute('aria-pressed', 'false');
}
