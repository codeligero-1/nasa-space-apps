const dashboard = document.querySelector('#adminDashboard');
const dashboardStatus = document.querySelector('#adminDashboardStatus');
const logoutButton = document.querySelector('#adminLogoutButton');
const crewResults = document.querySelector('#adminCrewResults');
const analyzerResults = document.querySelector('#adminAnalyzerResults');
const crewSearch = document.querySelector('#adminCrewSearch');
const crewEmptyState = document.querySelector('#adminCrewEmpty');
const sidebar = document.querySelector('#adminSidebar');
const menuToggle = document.querySelector('#adminMenuToggle');
const themeToggle = document.querySelector('#adminDashboardThemeToggle');
const themeStorageKey = 'vital.admin.theme';
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');

const fallbackCrewMembers = [
  { name: 'Alex Vance', card: 'NFC-4821', lastSample: 'Today, 09:14', status: 'low', orbitScore: 72, sampledToday: true, needsCalibration: false },
  { name: 'Maya Chen', card: 'NFC-1934', lastSample: 'Today, 08:42', status: 'low', orbitScore: 84, sampledToday: true, needsCalibration: false },
  { name: 'Noah Patel', card: 'NFC-2806', lastSample: 'Yesterday, 16:20', status: 'warn', orbitScore: 81, sampledToday: false, needsCalibration: true },
  { name: 'Lena Ortiz', card: 'NFC-7710', lastSample: 'Today, 07:55', status: 'ok', orbitScore: 94, sampledToday: true, needsCalibration: false },
  { name: 'Ravi Singh', card: 'NFC-5218', lastSample: 'Nov 13, 11:32', status: 'low', orbitScore: 76, sampledToday: false, needsCalibration: false },
  { name: 'Talia Brooks', card: 'NFC-6315', lastSample: 'Nov 12, 14:06', status: 'ok', orbitScore: 92, sampledToday: false, needsCalibration: false }
];

const crewMembers = Array.isArray(window.VITAL_DATA?.crew) && window.VITAL_DATA.crew.length
  ? window.VITAL_DATA.crew.map(([name, card, lastSample, status, orbitScore, sampledToday, needsCalibration]) => ({
    name,
    card,
    lastSample,
    status,
    orbitScore,
    sampledToday: typeof sampledToday === 'boolean' ? sampledToday : /\btoday\b/i.test(String(lastSample)),
    needsCalibration: Boolean(needsCalibration)
  }))
  : fallbackCrewMembers;

const activeFilters = new Set();
let acknowledgedFlags = new Set();
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

function renderCrewResults() {
  const searchTerm = crewSearch.value.trim().toLocaleLowerCase();
  const visibleCrew = crewMembers.filter((member) => {
    const matchesSearch = `${member.name} ${member.card} ${member.lastSample}`.toLocaleLowerCase().includes(searchTerm);
    const matchesFlagged = !activeFilters.has('flagged') || (member.status === 'low' && !acknowledgedFlags.has(member.name));
    const matchesCalibration = !activeFilters.has('calibration') || member.needsCalibration;
    const matchesToday = !activeFilters.has('today') || member.sampledToday;
    return matchesSearch && matchesFlagged && matchesCalibration && matchesToday;
  });

  crewResults.replaceChildren();
  for (const member of visibleCrew) {
    const row = document.createElement('tr');
    row.dataset.crewName = member.name;
    row.append(
      createTextCell(member.name),
      createTextCell(member.card),
      createTextCell(member.lastSample)
    );

    const statusCell = document.createElement('td');
    const statusChip = document.createElement('span');
    const isAcknowledged = acknowledgedFlags.has(member.name);
    statusChip.className = `admin-status-chip ${member.status === 'low' && !isAcknowledged ? 'is-flagged' : `is-${member.status}`}`;
    statusChip.textContent = isAcknowledged ? 'Acknowledged' : { ok: 'Normal', warn: 'Review', low: 'Warning' }[member.status];
    statusCell.append(statusChip);
    row.append(statusCell, createTextCell(String(member.orbitScore)));

    const actionsCell = document.createElement('td');
    actionsCell.className = 'admin-row-actions';
    if (member.status === 'low') {
      const acknowledgeButton = document.createElement('button');
      acknowledgeButton.type = 'button';
      acknowledgeButton.className = 'admin-action-pill admin-acknowledge';
      acknowledgeButton.dataset.action = 'acknowledge';
      acknowledgeButton.dataset.crewName = member.name;
      acknowledgeButton.textContent = isAcknowledged ? 'Acknowledged' : 'Acknowledge';
      acknowledgeButton.disabled = isAcknowledged;
      actionsCell.append(acknowledgeButton);
    }

    const askButton = document.createElement('button');
    askButton.type = 'button';
    askButton.className = 'admin-action-pill admin-ask-orbit';
    askButton.dataset.action = 'ask-orbit';
    askButton.dataset.crewName = member.name;
    askButton.dataset.orbitScore = String(member.orbitScore);
    askButton.dataset.crewStatus = isAcknowledged ? 'acknowledged' : member.status;
    askButton.textContent = 'Ask Orbit';
    actionsCell.append(askButton);
    row.append(actionsCell);
    crewResults.append(row);
  }
  crewEmptyState.hidden = visibleCrew.length > 0;
}

function renderAnalyzerSearch() {
  const searchTerm = crewSearch.value.trim().toLocaleLowerCase();
  for (const row of analyzerResults.rows) {
    row.hidden = !row.textContent.toLocaleLowerCase().includes(searchTerm);
  }
}

function setSidebarOpen(isOpen) {
  sidebar.classList.toggle('is-open', isOpen);
  document.body.classList.toggle('admin-sidebar-open', isOpen);
  menuToggle.setAttribute('aria-expanded', String(isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
}

function openOrbitForCrew(name, score, status) {
  const orbitWindow = window.open('/', '_blank');
  if (!orbitWindow) {
    dashboardStatus.textContent = 'Allow pop-ups to open Orbit for this crew member.';
    return;
  }

  orbitWindow.addEventListener('load', () => {
    const toggle = orbitWindow.document.querySelector('#orbitChatToggle');
    const prompt = orbitWindow.document.querySelector('#q');
    const panel = orbitWindow.document.querySelector('#orbitCard');
    if (!toggle || !prompt || !panel) {
      dashboardStatus.textContent = 'Orbit could not be opened. Open the VITAL dashboard and try again.';
      return;
    }

    if (panel.hidden) {
      toggle.click();
    }
    prompt.value = `Please explain ${name}'s admin summary: Orbit score ${score}/100, status ${status}. Explain only what these summary values mean and do not infer missing measurements.`;
    prompt.focus();
  }, { once: true });
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

crewSearch.addEventListener('input', () => {
  renderCrewResults();
  renderAnalyzerSearch();
});

document.querySelectorAll('[data-crew-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    const filter = button.dataset.crewFilter;
    if (filter === 'all') {
      activeFilters.clear();
    } else if (activeFilters.has(filter)) {
      activeFilters.delete(filter);
    } else {
      activeFilters.add(filter);
    }

    document.querySelectorAll('[data-crew-filter]').forEach((filterButton) => {
      filterButton.setAttribute(
        'aria-pressed',
        String(filterButton.dataset.crewFilter === 'all' ? activeFilters.size === 0 : activeFilters.has(filterButton.dataset.crewFilter))
      );
    });
    renderCrewResults();
  });
});

crewResults.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) {
    return;
  }

  const name = button.dataset.crewName;
  if (button.dataset.action === 'acknowledge') {
    acknowledgedFlags.add(name);
    renderCrewResults();
    return;
  }

  if (button.dataset.action === 'ask-orbit') {
    openOrbitForCrew(name, button.dataset.orbitScore, button.dataset.crewStatus);
  }
});

menuToggle.addEventListener('click', () => {
  setSidebarOpen(!sidebar.classList.contains('is-open'));
});

sidebar.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => setSidebarOpen(false));
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && sidebar.classList.contains('is-open')) {
    setSidebarOpen(false);
    menuToggle.focus();
  }
});

document.addEventListener('click', (event) => {
  if (sidebar.classList.contains('is-open')
    && !sidebar.contains(event.target)
    && !menuToggle.contains(event.target)) {
    setSidebarOpen(false);
  }
});

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
    renderAnalyzerSearch();
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
