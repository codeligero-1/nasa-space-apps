const dashboard = document.querySelector('#adminDashboard');
const dashboardStatus = document.querySelector('#adminDashboardStatus');
const logoutButton = document.querySelector('#adminLogoutButton');
let crewRecords = [];

function renderCrewResults() {
  const results = document.querySelector('#adminCrewResults');
  results.replaceChildren();
  for (const member of crewRecords) {
    const row = document.createElement('tr');
    const latestRecord = member.healthRecords[0];
    const values = [
      `${member.name} · ${member.role}`,
      member.mission,
      latestRecord ? new Date(latestRecord.recordedAt).toLocaleString() : 'No records',
      String(member.healthRecords.length)
    ];

    for (const value of values) {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.appendChild(cell);
    }

    const detailsCell = document.createElement('td');
    if (member.healthRecords.length) {
      const details = document.createElement('details');
      const summary = document.createElement('summary');
      summary.textContent = 'View records';
      details.appendChild(summary);
      for (const record of member.healthRecords) {
        const entry = document.createElement('section');
        const heading = document.createElement('h3');
        const timestamp = document.createElement('p');
        const data = document.createElement('pre');
        heading.textContent = record.type;
        timestamp.textContent = new Date(record.recordedAt).toLocaleString();
        data.textContent = JSON.stringify(record.data, null, 2);
        entry.append(heading, timestamp, data);
        details.appendChild(entry);
      }
      detailsCell.appendChild(details);
    } else {
      detailsCell.textContent = 'No health records';
    }
    row.appendChild(detailsCell);
    row.dataset.search = `${member.name} ${member.role} ${member.mission}`.toLowerCase();
    results.appendChild(row);
  }

  const recordCount = crewRecords.reduce((count, member) => count + member.healthRecords.length, 0);
  document.querySelector('#adminCrewCount').textContent = String(crewRecords.length);
  document.querySelector('#adminRecordCount').textContent = String(recordCount);
  document.querySelector('#adminCrewWithRecords').textContent = String(
    crewRecords.filter((member) => member.healthRecords.length).length
  );
  document.querySelector('#adminMissionCount').textContent = String(
    new Set(crewRecords.map((member) => member.mission)).size
  );
  filterCrewResults();
}

function filterCrewResults() {
  const query = document.querySelector('#adminCrewSearch').value.trim().toLowerCase();
  const rows = [...document.querySelectorAll('#adminCrewResults tr')];
  const visibleRows = rows.filter((row) => {
    const matches = row.dataset.search.includes(query);
    row.hidden = !matches;
    return matches;
  });
  document.querySelector('#adminCrewEmpty').hidden = visibleRows.length !== 0;
}

async function loadCrewRecords() {
  const response = await fetch('/api/admin/astronauts', {
    credentials: 'same-origin',
    cache: 'no-store'
  });
  if (response.status === 401) {
    window.location.replace('/admin/login');
    return false;
  }
  if (!response.ok) {
    throw new Error('Authorized crew records could not be loaded.');
  }

  const result = await response.json();
  if (!Array.isArray(result.astronauts) || result.astronauts.some((member) => (
    typeof member.id !== 'string' || typeof member.name !== 'string' ||
    !Array.isArray(member.healthRecords) || member.healthRecords.some((record) => (
      record.astronautId !== member.id || typeof record.id !== 'string' ||
      typeof record.type !== 'string' || typeof record.recordedAt !== 'string'
    ))
  ))) {
    throw new Error('The crew record response was invalid.');
  }
  crewRecords = result.astronauts;
  renderCrewResults();
  return true;
}

async function verifyAdministratorSession() {
  try {
    const response = await fetch('/api/admin/session', {
      credentials: 'same-origin',
      cache: 'no-store'
    });
    if (!response.ok) {
      throw new Error('The session could not be verified.')
    }

    const session = await response.json();
    if (!session.authenticated) {
      window.location.replace('/admin/login');
      return;
    }

    document.querySelector('#adminEmail').textContent = session.email;
    if (!await loadCrewRecords()) return;
    dashboardStatus.textContent = '';
    dashboard.classList.remove('hide');
  } catch (error) {
    dashboard.classList.add('hide');
    dashboardStatus.textContent = error instanceof Error
      ? error.message
      : 'Administrator access and crew records could not be verified.';
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
      throw new Error('Sign-out could not be completed.')
    }
    window.location.replace('/admin/login');
  } catch {
    logoutButton.disabled = false;
    dashboardStatus.textContent = 'Sign-out could not be completed. Please try again.';
  }
});

document.querySelector('#adminCrewSearch').addEventListener('input', filterCrewResults);

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
