const dashboard = document.querySelector('#adminDashboard');
const dashboardStatus = document.querySelector('#adminDashboardStatus');
const logoutButtons = [
  document.querySelector('#adminSidebarLogout'),
  document.querySelector('#adminDropdownLogout'),
  document.querySelector('#adminSettingsLogout')
];
const themeStorageKey = 'vital.admin.theme';
const notificationStorageKey = 'vital.admin.notifications';
const statusDetails = {
  ok: { key: 'normal', label: 'Normal', className: 'normal' },
  warn: { key: 'review', label: 'Under Review', className: 'review' },
  low: { key: 'flagged', label: 'Flagged', className: 'flagged' }
};

let crewRecords = [];
let currentPage = 'crew';
let currentCrew = null;
let currentSort = { key: 'name', direction: 'asc' };
let adminEmail = '';

function normalizeCrewRecords() {
  return (window.VITAL_DATA?.crew || []).map((member, index) => {
    const [name, card, sample, status] = member;
    const score = Number(member[4]);
    return {
      id: String(index),
      name: String(name || 'Unknown crew member'),
      card: String(card || 'Not available'),
      sample: String(sample || 'Not available'),
      sampleAge: sampleAge(String(sample || '')),
      status: statusDetails[status] ? status : 'warn',
      score: Number.isFinite(score) ? score : null
    };
  });
}

function sampleAge(label) {
  const normalized = label.trim().toLowerCase();
  if (normalized === 'today') return 0;
  if (normalized === 'yesterday') return 1;
  const daysAgo = normalized.match(/^(\d+)\s+days?\s+ago$/);
  if (daysAgo) return Number(daysAgo[1]);
  return Number.POSITIVE_INFINITY;
}

function createSvgIcon(paths) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  for (const [tag, attributes] of paths) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [attribute, value] of Object.entries(attributes)) {
      element.setAttribute(attribute, value);
    }
    svg.appendChild(element);
  }
  return svg;
}

function metricIcon(kind) {
  const icons = {
    crew: [
      ['path', { d: 'M16 20v-1.5a4.5 4.5 0 0 0-4.5-4.5h-5A4.5 4.5 0 0 0 2 18.5V20' }],
      ['circle', { cx: '9', cy: '7', r: '4' }],
      ['path', { d: 'M17 11a4 4 0 0 0 0-8m5 17v-1.5a4.5 4.5 0 0 0-3.5-4.4' }]
    ],
    normal: [
      ['circle', { cx: '12', cy: '12', r: '9' }],
      ['path', { d: 'm8 12 2.5 2.5L16.5 9' }]
    ],
    review: [
      ['circle', { cx: '12', cy: '12', r: '9' }],
      ['path', { d: 'M12 7v5l3 2' }]
    ],
    flagged: [
      ['path', { d: 'M12 3 2.7 19h18.6L12 3Z' }],
      ['path', { d: 'M12 9v4m0 3h.01' }]
    ]
  };
  return createSvgIcon(icons[kind]);
}

function createStatusBadge(record, compact = false) {
  const status = statusDetails[record.status];
  const badge = document.createElement('span');
  badge.className = `admin-status-badge admin-status-${status.className}${compact ? ' is-compact' : ''}`;
  badge.textContent = status.label;
  return badge;
}

function createCell(text, className = '') {
  const cell = document.createElement('td');
  if (className) cell.className = className;
  cell.textContent = text;
  return cell;
}

function renderMetrics() {
  const counts = crewRecords.reduce((summary, record) => {
    summary.total += 1;
    summary[statusDetails[record.status].key] += 1;
    return summary;
  }, { total: 0, normal: 0, review: 0, flagged: 0 });

  const metrics = [
    { key: 'crew', label: 'Total Crew', count: counts.total },
    { key: 'normal', label: 'Normal', count: counts.normal },
    { key: 'review', label: 'Under Review', count: counts.review },
    { key: 'flagged', label: 'Flagged', count: counts.flagged }
  ];
  const grid = document.querySelector('#adminMetricGrid');
  grid.replaceChildren();

  for (const metric of metrics) {
    const card = document.createElement('article');
    card.className = `admin-metric-card admin-metric-${metric.key}`;
    const icon = document.createElement('span');
    icon.className = 'admin-metric-icon';
    icon.appendChild(metricIcon(metric.key));
    const content = document.createElement('span');
    content.className = 'admin-metric-content';
    const count = document.createElement('strong');
    count.textContent = String(metric.count);
    const label = document.createElement('span');
    label.textContent = metric.label;
    content.append(count, label);
    card.append(icon, content);
    grid.appendChild(card);
  }
}

function compareCrewRecords(first, second, key) {
  if (key === 'score') {
    return (first.score ?? Number.NEGATIVE_INFINITY) - (second.score ?? Number.NEGATIVE_INFINITY);
  }
  if (key === 'sample') {
    return second.sampleAge - first.sampleAge;
  }
  return first.name.localeCompare(second.name, undefined, { sensitivity: 'base' });
}

function getVisibleCrewRecords() {
  const search = document.querySelector('#adminCrewSearch').value.trim().toLocaleLowerCase();
  const statusFilter = document.querySelector('#adminStatusFilter').value;
  return crewRecords
    .filter((record) => {
      const matchesSearch = !search
        || record.name.toLocaleLowerCase().includes(search)
        || record.card.toLocaleLowerCase().includes(search);
      const matchesStatus = statusFilter === 'all'
        || statusDetails[record.status].key === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((first, second) => compareCrewRecords(first, second, currentSort.key)
      * (currentSort.direction === 'asc' ? 1 : -1));
}

function renderCrewTable() {
  const records = getVisibleCrewRecords();
  const tbody = document.querySelector('#adminCrewResults');
  const fragment = document.createDocumentFragment();

  for (const record of records) {
    const row = document.createElement('tr');
    row.appendChild(createCell(record.name, 'admin-crew-name'));
    row.appendChild(createCell(record.card, 'admin-crew-card'));
    row.appendChild(createCell(record.sample));
    const statusCell = document.createElement('td');
    statusCell.appendChild(createStatusBadge(record, true));
    row.appendChild(statusCell);
    row.appendChild(createCell(record.score === null ? '—' : String(record.score), 'admin-score-cell'));

    const actionCell = document.createElement('td');
    actionCell.className = 'admin-actions-cell';
    const viewButton = document.createElement('button');
    viewButton.className = 'admin-view-button';
    viewButton.type = 'button';
    viewButton.dataset.crewId = record.id;
    viewButton.textContent = 'View';
    const arrow = document.createElement('span');
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '›';
    viewButton.appendChild(arrow);
    actionCell.appendChild(viewButton);
    row.appendChild(actionCell);
    fragment.appendChild(row);
  }

  tbody.replaceChildren(fragment);
  document.querySelector('#adminTableEmpty').hidden = records.length > 0;
  document.querySelector('#adminCrewCount').textContent =
    `${records.length} ${records.length === 1 ? 'member' : 'members'}`;
  updateSortHeaders();
}

function updateSortHeaders() {
  document.querySelectorAll('.admin-sort-button').forEach((button) => {
    const heading = button.closest('th');
    const active = button.dataset.sort === currentSort.key;
    heading.setAttribute('aria-sort', active
      ? currentSort.direction === 'asc' ? 'ascending' : 'descending'
      : 'none');
    button.querySelector('span').textContent = active
      ? currentSort.direction === 'asc' ? '↑' : '↓'
      : '';
  });
}

function renderCrewDetail(record) {
  currentCrew = record;
  document.querySelector('#crewDetailTitle').textContent = record.name;
  document.querySelector('#adminDetailAvatar').textContent = record.name
    .split(/\s+/)
    .map((part) => part.replace(/[^A-Za-z0-9]/g, '').slice(0, 1))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  document.querySelector('#adminDetailCard').textContent = `Card ${record.card}`;
  document.querySelector('#adminDetailSample').textContent = record.sample;
  document.querySelector('#adminDetailScore').textContent = record.score === null
    ? 'Not available'
    : String(record.score);
  const statusContainer = document.querySelector('#adminDetailStatus');
  statusContainer.replaceWith(createStatusBadge(record));
  const newStatus = document.querySelector('#adminPage-detail .admin-status-badge');
  newStatus.id = 'adminDetailStatus';
}

function showPage(page) {
  const validPages = ['crew', 'analytics', 'alerts', 'settings', 'detail'];
  if (!validPages.includes(page)) return;
  currentPage = page;
  document.querySelectorAll('[data-page-panel]').forEach((panel) => {
    const isCurrent = panel.dataset.pagePanel === page;
    panel.hidden = !isCurrent;
    panel.classList.toggle('is-visible', isCurrent);
  });
  document.querySelectorAll('.admin-nav-item[data-page]').forEach((button) => {
    const isActive = page === 'detail'
      ? button.dataset.page === 'crew'
      : button.dataset.page === page;
    button.classList.toggle('is-active', isActive);
    if (isActive) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  const pageLabels = {
    crew: 'Crew',
    detail: 'Crew Profile',
    analytics: 'Analytics',
    alerts: 'Alerts',
    settings: 'Settings'
  };
  const breadcrumb = document.querySelector('#adminBreadcrumb');
  breadcrumb.replaceChildren();
  const root = document.createElement('span');
  root.textContent = 'Dashboard';
  const divider = document.createElement('span');
  divider.className = 'admin-breadcrumb-divider';
  divider.textContent = '/';
  const current = document.createElement('strong');
  current.textContent = pageLabels[page];
  breadcrumb.append(root, divider, current);
  closeMobileNavigation();
}

function renderStatusDistribution() {
  const totals = crewRecords.reduce((summary, record) => {
    summary[statusDetails[record.status].key] += 1;
    return summary;
  }, { normal: 0, review: 0, flagged: 0 });
  const rows = [
    { key: 'normal', label: 'Normal', count: totals.normal },
    { key: 'review', label: 'Under Review', count: totals.review },
    { key: 'flagged', label: 'Flagged', count: totals.flagged }
  ];
  const container = document.querySelector('#adminStatusDistribution');
  container.replaceChildren();
  for (const row of rows) {
    const item = document.createElement('div');
    item.className = `admin-distribution-row admin-distribution-${row.key}`;
    const labelRow = document.createElement('div');
    labelRow.className = 'admin-distribution-label';
    const label = document.createElement('span');
    label.textContent = row.label;
    const value = document.createElement('strong');
    value.textContent = `${row.count} (${crewRecords.length ? Math.round(row.count / crewRecords.length * 100) : 0}%)`;
    labelRow.append(label, value);
    const track = document.createElement('div');
    track.className = 'admin-distribution-track';
    const bar = document.createElement('span');
    bar.style.width = `${crewRecords.length ? row.count / crewRecords.length * 100 : 0}%`;
    track.appendChild(bar);
    item.append(labelRow, track);
    container.appendChild(item);
  }
  document.querySelector('#adminAnalyticsTotal').textContent =
    `${crewRecords.length} ${crewRecords.length === 1 ? 'record' : 'records'}`;
}

function renderScoreDistribution() {
  const groups = [
    { label: '60–69', minimum: 60, maximum: 69 },
    { label: '70–79', minimum: 70, maximum: 79 },
    { label: '80–89', minimum: 80, maximum: 89 },
    { label: '90–100', minimum: 90, maximum: 100 }
  ].map((group) => ({
    ...group,
    count: crewRecords.filter((record) =>
      record.score !== null && record.score >= group.minimum && record.score <= group.maximum
    ).length
  }));
  const maxCount = Math.max(1, ...groups.map((group) => group.count));
  const chart = document.querySelector('#adminScoreDistribution');
  chart.replaceChildren();

  for (const group of groups) {
    const column = document.createElement('div');
    column.className = 'admin-score-column';
    const count = document.createElement('span');
    count.className = 'admin-score-column-count';
    count.textContent = String(group.count);
    const track = document.createElement('div');
    track.className = 'admin-score-column-track';
    const bar = document.createElement('span');
    bar.style.height = `${group.count ? Math.max(12, group.count / maxCount * 100) : 0}%`;
    track.appendChild(bar);
    const label = document.createElement('span');
    label.className = 'admin-score-column-label';
    label.textContent = group.label;
    column.append(count, track, label);
    chart.appendChild(column);
  }
}

function renderAlerts() {
  const alerts = crewRecords
    .filter((record) => record.status === 'low' || record.status === 'warn')
    .sort((first, second) => {
      if (first.status !== second.status) return first.status === 'low' ? -1 : 1;
      return first.sampleAge - second.sampleAge;
    });
  const container = document.querySelector('#adminAlertList');
  container.replaceChildren();
  document.querySelector('#adminAlertCount').textContent = String(alerts.length);
  document.querySelector('#adminAlertsCount').textContent =
    `${alerts.length} ${alerts.length === 1 ? 'record' : 'records'}`;

  if (!alerts.length) {
    const empty = document.createElement('p');
    empty.className = 'admin-history-empty';
    empty.textContent = 'There are no current records requiring attention.';
    container.appendChild(empty);
    return;
  }

  for (const record of alerts) {
    const item = document.createElement('article');
    item.className = `admin-alert-item admin-alert-${statusDetails[record.status].className}`;
    const indicator = document.createElement('span');
    indicator.className = 'admin-alert-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    const copy = document.createElement('div');
    copy.className = 'admin-alert-copy';
    const title = document.createElement('strong');
    title.textContent = record.name;
    const metadata = document.createElement('span');
    metadata.textContent = `Latest sample: ${record.sample}`;
    copy.append(title, metadata);
    const badge = createStatusBadge(record, true);
    const view = document.createElement('button');
    view.className = 'admin-view-button';
    view.type = 'button';
    view.dataset.crewId = record.id;
    view.textContent = 'View';
    const arrow = document.createElement('span');
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '›';
    view.appendChild(arrow);
    item.append(indicator, copy, badge, view);
    container.appendChild(item);
  }
}

function setTheme(theme, save = true) {
  if (theme !== 'light' && theme !== 'dark') return;
  document.documentElement.dataset.adminTheme = theme;
  document.querySelectorAll('[data-theme-choice]').forEach((button) => {
    const selected = button.dataset.themeChoice === theme;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  if (save) {
    try {
      localStorage.setItem(themeStorageKey, theme);
    } catch (error) {
      console.warn('Could not save dashboard theme preference:', error);
    }
  }
}

function initializePreferences() {
  let theme = 'light';
  let notificationsEnabled = false;
  try {
    const storedTheme = localStorage.getItem(themeStorageKey);
    if (storedTheme === 'light' || storedTheme === 'dark') theme = storedTheme;
    notificationsEnabled = localStorage.getItem(notificationStorageKey) === 'true';
  } catch (error) {
    console.warn('Could not load dashboard preferences:', error);
  }
  setTheme(theme, false);
  document.querySelector('#adminNotificationsToggle').checked = notificationsEnabled;
}

function openMobileNavigation() {
  document.body.classList.add('admin-nav-open');
  document.querySelector('#adminMobileMenu').setAttribute('aria-expanded', 'true');
}

function closeMobileNavigation() {
  document.body.classList.remove('admin-nav-open');
  document.querySelector('#adminMobileMenu').setAttribute('aria-expanded', 'false');
}

function setAccountMenuOpen(open) {
  const trigger = document.querySelector('#adminAccountTrigger');
  const dropdown = document.querySelector('#adminAccountDropdown');
  trigger.setAttribute('aria-expanded', String(open));
  dropdown.hidden = !open;
}

async function logout() {
  logoutButtons.forEach((button) => { button.disabled = true; });
  dashboardStatus.textContent = 'Signing out…';
  try {
    const response = await fetch('/api/admin/logout', {
      method: 'POST',
      credentials: 'same-origin'
    });
    if (!response.ok) throw new Error('Sign-out could not be completed.');
    window.location.replace('/admin/login');
  } catch (error) {
    logoutButtons.forEach((button) => { button.disabled = false; });
    dashboardStatus.textContent = 'Sign-out could not be completed. Please try again.';
    console.error('Administrator sign-out failed:', error);
  }
}

async function verifyAdministratorSession() {
  try {
    const response = await fetch('/api/admin/session', {
      credentials: 'same-origin',
      cache: 'no-store'
    });
    if (!response.ok) throw new Error('The session could not be verified.');

    const session = await response.json();
    if (!session.authenticated) {
      window.location.replace('/admin/login');
      return;
    }

    adminEmail = String(session.email || '');
    document.querySelector('#adminEmail').textContent = adminEmail;
    document.querySelector('#adminSettingsEmail').textContent = adminEmail;
    crewRecords = normalizeCrewRecords();
    renderMetrics();
    renderCrewTable();
    renderStatusDistribution();
    renderScoreDistribution();
    renderAlerts();
    initializePreferences();
    dashboardStatus.textContent = '';
    dashboard.classList.remove('hide');
  } catch (error) {
    dashboard.classList.add('hide');
    dashboardStatus.textContent = 'Administrator access could not be verified. Reload the page or sign in again.';
    console.error('Administrator session verification failed:', error);
  }
}

document.querySelectorAll('.admin-nav-item[data-page]').forEach((button) => {
  button.addEventListener('click', () => showPage(button.dataset.page));
});

document.querySelector('#adminCrewSearch').addEventListener('input', renderCrewTable);
document.querySelector('#adminStatusFilter').addEventListener('change', renderCrewTable);

document.querySelectorAll('.admin-sort-button').forEach((button) => {
  button.addEventListener('click', () => {
    const key = button.dataset.sort;
    currentSort = currentSort.key === key
      ? { key, direction: currentSort.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: key === 'name' ? 'asc' : 'desc' };
    renderCrewTable();
  });
});

document.querySelector('#adminCrewResults').addEventListener('click', (event) => {
  const viewButton = event.target.closest('[data-crew-id]');
  if (!viewButton) return;
  const record = crewRecords.find((member) => member.id === viewButton.dataset.crewId);
  if (!record) return;
  renderCrewDetail(record);
  showPage('detail');
});

document.querySelector('#adminAlertList').addEventListener('click', (event) => {
  const viewButton = event.target.closest('[data-crew-id]');
  if (!viewButton) return;
  const record = crewRecords.find((member) => member.id === viewButton.dataset.crewId);
  if (!record) return;
  renderCrewDetail(record);
  showPage('detail');
});

document.querySelector('#adminBackToCrew').addEventListener('click', () => showPage('crew'));
document.querySelectorAll('[data-theme-choice]').forEach((button) => {
  button.addEventListener('click', () => setTheme(button.dataset.themeChoice));
});

document.querySelector('#adminNotificationsToggle').addEventListener('change', (event) => {
  try {
    localStorage.setItem(notificationStorageKey, String(event.target.checked));
  } catch (error) {
    event.target.checked = !event.target.checked;
    console.error('Could not save notification preference:', error);
  }
});

document.querySelector('#adminAccountTrigger').addEventListener('click', () => {
  const expanded = document.querySelector('#adminAccountTrigger').getAttribute('aria-expanded') === 'true';
  setAccountMenuOpen(!expanded);
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('.admin-account-menu')) setAccountMenuOpen(false);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    setAccountMenuOpen(false);
    closeMobileNavigation();
  }
});

document.querySelector('#adminDropdownSettings').addEventListener('click', () => {
  showPage('settings');
  setAccountMenuOpen(false);
});

document.querySelector('#adminMobileMenu').addEventListener('click', () => {
  const isOpen = document.body.classList.contains('admin-nav-open');
  if (isOpen) closeMobileNavigation();
  else openMobileNavigation();
});
document.querySelector('#adminMobileOverlay').addEventListener('click', closeMobileNavigation);
logoutButtons.forEach((button) => button.addEventListener('click', logout));

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) void verifyAdministratorSession();
});
window.addEventListener('pageshow', (event) => {
  if (event.persisted) void verifyAdministratorSession();
});

void verifyAdministratorSession();
