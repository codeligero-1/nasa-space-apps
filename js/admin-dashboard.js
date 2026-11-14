const dashboard = document.querySelector('#adminDashboard');
const dashboardStatus = document.querySelector('#adminDashboardStatus');
const logoutButton = document.querySelector('#adminLogoutButton');

function renderCrewResults() {
  const crew = window.VITAL_DATA?.crew || [];
  const statusLabels = { ok: 'Normal', warn: 'Review', low: 'Flagged' };
  document.querySelector('#adminCrewResults').innerHTML = crew.map((member) => {
    const [name, card, lastSample, statusType, orbitScore] = member;
    const row = document.createElement('tr');
    const values = [name, card, lastSample];

    for (const value of values) {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.appendChild(cell);
    }

    const statusCell = document.createElement('td');
    const statusChip = document.createElement('span');
    statusChip.className = `chip c-${statusType}`;
    statusChip.textContent = statusLabels[statusType] || 'Unknown';
    statusCell.appendChild(statusChip);
    row.appendChild(statusCell);

    const scoreCell = document.createElement('td');
    scoreCell.textContent = String(orbitScore);
    row.appendChild(scoreCell);
    return row.outerHTML;
  }).join('');
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
      throw new Error('Sign-out could not be completed.')
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
