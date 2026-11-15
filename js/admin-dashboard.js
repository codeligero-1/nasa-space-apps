const dashboard = document.querySelector('#adminDashboard');
const dashboardStatus = document.querySelector('#adminDashboardStatus');
const logoutButton = document.querySelector('#adminLogoutButton');
const crewResults = document.querySelector('#adminCrewResults');
const crewSearch = document.querySelector('#adminCrewSearch');
const crewEmptyState = document.querySelector('#adminCrewEmpty');
const themeToggle = document.querySelector('#adminDashboardThemeToggle');
const findingsDialog = document.querySelector('#adminFindingsDialog');
const findingsHeading = document.querySelector('#adminFindingsHeading');
const findingsContent = document.querySelector('#adminFindingsContent');
const findingsClose = document.querySelector('#adminFindingsClose');
const themeStorageKey = 'vital.admin.theme';
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
const dashboardHealthData = window.VITAL_DEMO_DATA;
const healthSummary = window.VITAL_HEALTH_SUMMARY;

const fallbackCrewMembers = [
  { name: 'Alex Vance', card: 'NFC-4821', lastSample: 'Today, 09:14', status: 'low', orbitScore: 72 },
  { name: 'Maya Chen', card: 'NFC-1934', lastSample: 'Today, 08:42', status: 'low', orbitScore: 84 },
  { name: 'Noah Patel', card: 'NFC-2806', lastSample: 'Yesterday, 16:20', status: 'warn', orbitScore: 81 },
  { name: 'Lena Ortiz', card: 'NFC-7710', lastSample: 'Today, 07:55', status: 'ok', orbitScore: 94 },
  { name: 'Ravi Singh', card: 'NFC-5218', lastSample: 'Nov 13, 11:32', status: 'low', orbitScore: 76 },
  { name: 'Talia Brooks', card: 'NFC-6315', lastSample: 'Nov 12, 14:06', status: 'ok', orbitScore: 92 }
];

const crewMembers = Array.isArray(window.VITAL_DATA?.crew) && window.VITAL_DATA.crew.length
  ? window.VITAL_DATA.crew.map(([name, card, lastSample, status, orbitScore]) => ({
    name,
    card,
    lastSample,
    status,
    orbitScore
  }))
  : fallbackCrewMembers;

let hasThemeOverride = false;

function setTheme(theme, save = false) {
  document.documentElement.dataset.adminTheme = theme;
  themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
  themeToggle.setAttribute(
    'aria-label',
    theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
  );

  if (save) {
    try {
      localStorage.setItem(themeStorageKey, theme);
    } catch {
      dashboardStatus.textContent = 'Theme changed for this session, but the preference could not be saved.';
    }
  }
}

function initializeTheme() {
  let savedTheme = null;
  try {
    savedTheme = localStorage.getItem(themeStorageKey);
  } catch {
    dashboardStatus.textContent = 'Theme preference could not be loaded; using your device setting.';
  }
  hasThemeOverride = savedTheme === 'light' || savedTheme === 'dark';
  setTheme(hasThemeOverride ? savedTheme : (systemTheme.matches ? 'dark' : 'light'));
}

function createTextCell(value) {
  const cell = document.createElement('td');
  cell.textContent = value;
  return cell;
}

function maskCardNumber(card) {
  const lastFour = String(card).replace(/\D/g, '').slice(-4);
  return lastFour ? `•••• ${lastFour}` : '••••';
}

function formatFindingValue(value, decimals) {
  return Number(value.toFixed(decimals)).toLocaleString(undefined, {
    maximumFractionDigits: decimals
  });
}

function formatFindingDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function appendFindingCount(container, label, value) {
  const count = document.createElement('article');
  count.className = 'admin-findings-count';
  const number = document.createElement('strong');
  number.textContent = String(value);
  const caption = document.createElement('span');
  caption.textContent = label;
  count.append(number, caption);
  container.append(count);
}

function appendFindingRow(container, finding) {
  const row = document.createElement('li');
  const details = document.createElement('div');
  details.className = 'admin-finding-details';
  const name = document.createElement('strong');
  name.textContent = finding.name;
  const value = document.createElement('span');
  value.textContent = `${formatFindingValue(finding.value, finding.decimals)} ${finding.unit}`;
  details.append(name, value);

  if (Number.isFinite(finding.baselineValue)) {
    const baseline = document.createElement('small');
    baseline.textContent = `Pre-flight baseline: ${formatFindingValue(finding.baselineValue, finding.decimals)} ${finding.unit}`;
    details.append(baseline);
  }

  const statusChip = document.createElement('span');
  statusChip.className = `admin-status-chip ${finding.statusKey === 'low' ? 'is-flagged' : 'is-warn'}`;
  statusChip.textContent = finding.statusLabel;
  row.append(details, statusChip);
  container.append(row);
}

function renderFindingsSummary(name) {
  findingsHeading.textContent = `${name} — dashboard findings`;
  findingsContent.replaceChildren();

  const profileName = dashboardHealthData?.profile?.name;
  if (!profileName || profileName.toLocaleLowerCase() !== name.toLocaleLowerCase()) {
    const unavailable = document.createElement('p');
    unavailable.className = 'admin-findings-unavailable';
    unavailable.textContent = `No user dashboard findings are linked to ${name}.`;
    findingsContent.append(unavailable);
    findingsDialog.showModal();
    return;
  }

  const summary = healthSummary.summarize(
    dashboardHealthData.profile,
    dashboardHealthData.records,
    window.VITAL_DATA.metrics,
    dashboardHealthData.ranges
  );
  if (!summary) {
    const unavailable = document.createElement('p');
    unavailable.className = 'admin-findings-unavailable';
    unavailable.textContent = 'No flight findings are available in the user dashboard.';
    findingsContent.append(unavailable);
    findingsDialog.showModal();
    return;
  }

  const meta = document.createElement('p');
  meta.className = 'admin-findings-meta';
  meta.textContent = `Latest record: ${summary.recordLabel} · ${formatFindingDate(summary.recordDate)}`;

  const overview = document.createElement('p');
  overview.className = 'admin-findings-overview';
  overview.textContent = `${summary.counts.normal} of ${summary.counts.rated} rated measurements are within configured ranges. ${summary.findings.length} findings need review.`;

  const counts = document.createElement('div');
  counts.className = 'admin-findings-counts';
  appendFindingCount(counts, 'Rated', summary.counts.rated);
  appendFindingCount(counts, 'Within range', summary.counts.normal);
  appendFindingCount(counts, 'Findings', summary.findings.length);
  appendFindingCount(counts, 'Not rated', summary.counts.notRated);

  const bloodHeading = document.createElement('h3');
  bloodHeading.textContent = 'Blood analysis';
  const bloodSummary = document.createElement('div');
  bloodSummary.className = 'admin-findings-blood';
  const bloodAssessment = document.createElement('span');
  bloodAssessment.textContent = summary.bloodAssessment;
  if (summary.bloodAssessmentKey !== 'na') {
    bloodAssessment.className = `admin-status-chip ${summary.bloodAssessmentKey === 'ok' ? 'is-ok' : summary.bloodAssessmentKey === 'low' ? 'is-flagged' : 'is-warn'}`;
  }
  const bloodCounts = document.createElement('p');
  const blood = summary.bloodCounts;
  bloodCounts.textContent = `${blood.measured} parameters measured · ${blood.normal} normal · ${blood.low} low · ${blood.high} high · ${blood.borderline} borderline`;
  bloodSummary.append(bloodAssessment, bloodCounts);

  const findingsHeadingNode = document.createElement('h3');
  findingsHeadingNode.textContent = 'Findings to review';
  const findingsList = document.createElement('ul');
  findingsList.className = 'admin-findings-list';
  if (summary.findings.length) {
    summary.findings.forEach((finding) => appendFindingRow(findingsList, finding));
  } else {
    const noFindings = document.createElement('li');
    noFindings.textContent = 'No results are outside configured ranges.';
    findingsList.append(noFindings);
  }

  const disclaimer = document.createElement('p');
  disclaimer.className = 'admin-findings-disclaimer';
  disclaimer.textContent = 'Metrics without a recorded value are omitted. Summary is informational, not a diagnosis.';

  findingsContent.append(
    meta,
    overview,
    counts,
    bloodHeading,
    bloodSummary,
    findingsHeadingNode,
    findingsList,
    disclaimer
  );
  findingsDialog.showModal();
}

function renderCrewResults() {
  const searchTerm = crewSearch.value.trim().toLocaleLowerCase();
  const visibleCrew = crewMembers.filter((member) => {
    return `${member.name} ${member.card} ${member.lastSample}`.toLocaleLowerCase().includes(searchTerm);
  });

  crewResults.replaceChildren();
  for (const member of visibleCrew) {
    const row = document.createElement('tr');
    row.dataset.crewName = member.name;
    const nameCell = document.createElement('td');
    const findingsButton = document.createElement('button');
    findingsButton.type = 'button';
    findingsButton.className = 'admin-crew-findings-link';
    findingsButton.dataset.findingsName = member.name;
    findingsButton.setAttribute('aria-label', `View user dashboard findings for ${member.name}`);
    findingsButton.textContent = member.name;
    nameCell.append(findingsButton);
    row.append(
      nameCell,
      createTextCell(maskCardNumber(member.card)),
      createTextCell(member.lastSample)
    );

    const statusCell = document.createElement('td');
    const statusChip = document.createElement('span');
    statusChip.className = `admin-status-chip ${member.status === 'low' ? 'is-flagged' : `is-${member.status}`}`;
    statusChip.textContent = { ok: 'Normal', warn: 'Review', low: 'Warning' }[member.status];
    statusCell.append(statusChip);
    row.append(statusCell, createTextCell(String(member.orbitScore)));

    crewResults.append(row);
  }
  crewEmptyState.hidden = visibleCrew.length > 0;
}

initializeTheme();
systemTheme.addEventListener('change', (event) => {
  if (!hasThemeOverride) {
    setTheme(event.matches ? 'dark' : 'light');
  }
});
themeToggle.addEventListener('click', () => {
  const nextTheme = document.documentElement.dataset.adminTheme === 'dark' ? 'light' : 'dark';
  hasThemeOverride = true;
  setTheme(nextTheme, true);
});

crewSearch.addEventListener('input', renderCrewResults);
crewResults.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-findings-name]');
  if (button) renderFindingsSummary(button.dataset.findingsName);
});
findingsClose.addEventListener('click', () => findingsDialog.close());

async function verifyAdministratorSession() {
  try {
    const response = await fetch('/api/admin/session', {
      credentials: 'same-origin',
      cache: 'no-store'
    });
    if (!response.ok) {
      throw new Error('The session could not be verified.');
    }

    const session = await response.json();
    if (!session.authenticated) {
      window.location.replace('/admin/login');
      return;
    }

    renderCrewResults();
    dashboardStatus.textContent = '';
    dashboard.classList.remove('hide');
  } catch {
    dashboard.classList.add('hide');
    dashboardStatus.textContent = 'Administrator access could not be verified. Reload the page or sign in again.';
  }
}

logoutButton.addEventListener('click', async () => {
  logoutButton.disabled = true;
  dashboardStatus.textContent = 'Signing out…';
  try {
    const response = await fetch('/api/admin/logout', {
      method: 'POST',
      credentials: 'same-origin'
    });
    if (!response.ok) {
      throw new Error('Sign-out could not be completed.');
    }
    window.location.replace('/admin/login');
  } catch {
    logoutButton.disabled = false;
    dashboardStatus.textContent = 'Sign-out could not be completed. Please try again.';
  }
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    void verifyAdministratorSession();
  }
});
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    void verifyAdministratorSession();
  }
});

void verifyAdministratorSession();
