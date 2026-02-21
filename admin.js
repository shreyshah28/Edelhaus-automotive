// ==========================================
// EDELHAUS ADMIN PANEL — admin.js
// Fully connected to main site data sources:
//   localStorage  → edelhaus_users, currentUser, allTestDrives
//   IndexedDB     → EdelhausTestDriveDB / bookings
//   IndexedDB     → EdelhausServiceDB   / serviceAppointments
//   localStorage  → edelhaus_admin_inventory (admin-managed)
//   localStorage  → edelhaus_enquiries       (admin-managed)
// ==========================================

// ===== ADMIN CREDENTIALS =====
let ADMIN_CREDS = JSON.parse(localStorage.getItem('edelhaus_admin_creds')) || {
    username: 'admin',
    password: 'edelhaus2026'
};

// ===== ADMIN-MANAGED INVENTORY =====
let adminInventory = JSON.parse(localStorage.getItem('edelhaus_admin_inventory')) || [
    { name: 'Ferrari SF90 Stradale',   brand: 'Ferrari',      price: 7.8,  category: 'Supercar',     status: 'Available', featured: true,  description: 'Hybrid V8 Ferrari flagship.' },
    { name: 'Lamborghini Urus S',      brand: 'Lamborghini',  price: 4.2,  category: 'SUV',          status: 'Available', featured: false, description: 'Super SUV with 666hp.' },
    { name: 'Porsche 911 GT3 RS',      brand: 'Porsche',      price: 3.1,  category: 'Sports Car',   status: 'Reserved',  featured: true,  description: 'Track-focused 911.' },
    { name: 'Bugatti Chiron',          brand: 'Bugatti',      price: 25.0, category: 'Hypercar',     status: 'Available', featured: true,  description: '1500hp W16 masterpiece.' },
    { name: 'McLaren 720S',            brand: 'McLaren',      price: 5.4,  category: 'Supercar',     status: 'Sold',      featured: false, description: 'Twin-turbo V8 precision.' },
    { name: 'Rolls-Royce Ghost',       brand: 'Rolls-Royce',  price: 8.5,  category: 'Luxury Sedan', status: 'Available', featured: true,  description: 'The pinnacle of luxury.' },
    { name: 'Pagani Huayra',           brand: 'Pagani',       price: 18.0, category: 'Hypercar',     status: 'Reserved',  featured: false, description: 'Italian hand-crafted art.' },
    { name: 'Mercedes-AMG GT Black',   brand: 'Mercedes-Benz',price: 3.9,  category: 'Grand Tourer', status: 'Available', featured: false, description: "AMG's track-bred GT." },
    { name: 'Ferrari Purosangue',      brand: 'Ferrari',      price: 9.5,  category: 'SUV',          status: 'Available', featured: true,  description: "Ferrari's first SUV." },
    { name: 'Lamborghini Revuelto',    brand: 'Lamborghini',  price: 12.0, category: 'Supercar',     status: 'Available', featured: true,  description: 'Hybrid V12 successor.' },
];

// ===== ADMIN-MANAGED ENQUIRIES =====
let adminEnquiries = JSON.parse(localStorage.getItem('edelhaus_enquiries')) || [
    { name: 'Rajesh Mehta',  email: 'rajesh@gmail.com',  message: 'Interested in the Bugatti Chiron.',       date: '2026-02-10', status: 'Pending' },
    { name: 'Priya Sharma',  email: 'priya@gmail.com',   message: 'Looking to visit for the Rolls-Royce.',   date: '2026-02-12', status: 'Pending' },
    { name: 'Arjun Kapoor',  email: 'arjun@hotmail.com', message: 'Delivery timeline for Ferrari SF90?',     date: '2026-02-14', status: 'Read'    },
];

// ===== CHART INSTANCES =====
let enquiryChartInst, brandChartInst, visitorsChartInst;

// ===== MERGED TEST DRIVE ROWS =====
let allTestDriveRows = [];

// ==========================================
//  1. LOGIN
// ==========================================
document.getElementById('adminLoginForm')?.addEventListener('submit', function (e) {
    e.preventDefault();
    const username = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value;
    const err      = document.getElementById('loginError');
    const btnTxt   = document.getElementById('loginBtnText');
    const spin     = document.getElementById('loginSpinner');

    err.classList.add('d-none');
    btnTxt.classList.add('d-none');
    spin.classList.remove('d-none');

    setTimeout(() => {
        if (username === ADMIN_CREDS.username && password === ADMIN_CREDS.password) {
            sessionStorage.setItem('edelhaus_admin_auth', '1');
            document.getElementById('adminLoginScreen').classList.add('d-none');
            document.getElementById('adminDashboard').classList.remove('d-none');
            initDashboard();
        } else {
            err.textContent = 'Invalid username or password.';
            err.classList.remove('d-none');
        }
        btnTxt.classList.remove('d-none');
        spin.classList.add('d-none');
    }, 900);
});

// Password visibility toggle
document.getElementById('togglePassword')?.addEventListener('click', function () {
    const inp  = document.getElementById('adminPassword');
    const icon = this.querySelector('i');
    if (inp.type === 'password') {
        inp.type = 'text';
        icon.className = 'bi bi-eye-slash text-white-50';
    } else {
        inp.type = 'password';
        icon.className = 'bi bi-eye text-white-50';
    }
});

// Auto-login if session still active
window.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('edelhaus_admin_auth') === '1') {
        const loginScreen = document.getElementById('adminLoginScreen');
        const adminDash = document.getElementById('adminDashboard');
        if (loginScreen) loginScreen.classList.add('d-none');
        if (adminDash) adminDash.classList.remove('d-none');
        initDashboard();
    }
    startClock();
});

function adminLogout() {
    sessionStorage.removeItem('edelhaus_admin_auth');
    location.reload();
}

// ==========================================
//  2. INIT
// ==========================================
function initDashboard() {
    updateStatCards();
    renderInventoryTable();
    renderUsersTable();
    renderEnquiriesTable();
    loadTestDrivesFromAllSources();
    renderServiceAppointments();
    renderAnalytics();
    initCharts();
}

// ==========================================
//  3. SECTION NAVIGATION
// ==========================================
function showSection(name) {
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));

    const sec = document.getElementById('section-' + name);
    if (sec) sec.classList.add('active');

    document.querySelectorAll('.sidebar-link').forEach(l => {
        if (l.getAttribute('onclick') && l.getAttribute('onclick').includes(`'${name}'`)) {
            l.classList.add('active');
        }
    });

    const titles = {
        dashboard:  'Dashboard',
        inventory:  'Inventory Management',
        users:      'User Management',
        enquiries:  'Enquiries',
        testdrives: 'Test Drive Bookings',
        services:   'Service Appointments',
        analytics:  'Analytics',
        settings:   'Settings'
    };
    const titleEl = document.getElementById('sectionTitle');
    if (titleEl) titleEl.textContent = titles[name] || name;

    if (window.innerWidth <= 768) {
        document.getElementById('adminSidebar')?.classList.remove('mobile-open');
    }
}

// ==========================================
//  4. SIDEBAR TOGGLE
// ==========================================
function toggleSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    const main    = document.querySelector('.admin-main');
    if (window.innerWidth <= 768) {
        sidebar.classList.toggle('mobile-open');
    } else {
        sidebar.classList.toggle('collapsed');
        main.classList.toggle('expanded');
    }
}

// ==========================================
//  5. CLOCK
// ==========================================
function startClock() {
    const tick = () => {
        const el = document.getElementById('currentDateTime');
        if (el) el.textContent = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    };
    tick();
    setInterval(tick, 60000);
}

// ==========================================
//  6. STAT CARDS
// ==========================================
function updateStatCards() {
    const users = JSON.parse(localStorage.getItem('edelhaus_users')) || [];
    const allTD = JSON.parse(localStorage.getItem('allTestDrives')) || [];

    const totalCars = document.getElementById('statTotalCars');
    const totalUsers = document.getElementById('statTotalUsers');
    const statEnq = document.getElementById('statEnquiries');
    const statTD = document.getElementById('statTestDrives');

    if (totalCars) totalCars.textContent = adminInventory.length;
    if (totalUsers) totalUsers.textContent = users.length;
    if (statEnq) statEnq.textContent = adminEnquiries.length;
    if (statTD) statTD.textContent = allTD.length;

    const pending = adminEnquiries.filter(e => e.status === 'Pending').length;
    const badge = document.getElementById('enquiryBadge');
    if (badge) {
        badge.textContent = pending;
        badge.style.display = pending > 0 ? 'inline' : 'none';
    }
}

// ==========================================
//  7. INVENTORY TABLE
// ==========================================
function renderInventoryTable() { filterInventoryTable(); }

function filterInventoryTable() {
    const search  = (document.getElementById('invSearch')?.value || '').toLowerCase();
    const brand   = document.getElementById('invBrandFilter')?.value  || '';
    const status  = document.getElementById('invStatusFilter')?.value || '';

    const filtered = adminInventory.filter(car => {
        const mS = !search || car.name.toLowerCase().includes(search) || car.brand.toLowerCase().includes(search);
        const mB = !brand  || car.brand === brand;
        const mSt = !status || car.status === status;
        return mS && mB && mSt;
    });

    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody) return;

    tbody.innerHTML = filtered.map((car, i) => `
        <tr>
            <td class="text-muted">${i + 1}</td>
            <td>
                <div class="fw-semibold text-white">${car.name}</div>
                <small class="text-muted">${car.description || ''}</small>
            </td>
            <td>${car.brand}</td>
            <td>&#8377;${car.price} Cr</td>
            <td><small class="text-muted">${car.category}</small></td>
            <td><span class="status-badge status-${car.status.toLowerCase()}">${car.status}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-secondary border-0 me-1 py-0"
                    onclick="editCar(${adminInventory.indexOf(car)})" title="Edit">
                    <i class="bi bi-pencil text-info"></i>
                </button>
                <button class="btn btn-sm btn-outline-secondary border-0 py-0"
                    onclick="confirmDelete('car', ${adminInventory.indexOf(car)})" title="Delete">
                    <i class="bi bi-trash text-danger"></i>
                </button>
            </td>
        </tr>
    `).join('');

    const cnt = document.getElementById('inventoryCount');
    if (cnt) cnt.textContent = `Showing ${filtered.length} of ${adminInventory.length} cars`;
}

function saveCarEntry() {
    const name        = document.getElementById('carName').value.trim();
    const brand       = document.getElementById('carBrand').value;
    const price       = parseFloat(document.getElementById('carPrice').value);
    const category    = document.getElementById('carCategory').value;
    const status      = document.getElementById('carStatus').value;
    const featured    = document.getElementById('carFeatured').value === 'true';
    const description = document.getElementById('carDescription').value.trim();
    const editIdx     = document.getElementById('editCarIndex').value;

    if (!name || !brand || isNaN(price) || !category) {
        showToast('Please fill all required fields.', 'danger'); return;
    }

    const carObj = { name, brand, price, category, status, featured, description };

    if (editIdx !== '') {
        adminInventory[parseInt(editIdx)] = carObj;
        showToast('Car updated successfully!', 'success');
    } else {
        adminInventory.push(carObj);
        showToast('Car added successfully!', 'success');
    }

    localStorage.setItem('edelhaus_admin_inventory', JSON.stringify(adminInventory));
    bootstrap.Modal.getInstance(document.getElementById('addCarModal'))?.hide();
    document.getElementById('addCarForm').reset();
    document.getElementById('editCarIndex').value = '';
    document.getElementById('carModalLabel').textContent = 'Add New Car';
    renderInventoryTable();
    updateStatCards();
    refreshBrandChart();
}

function editCar(idx) {
    const car = adminInventory[idx];
    if (!car) return;
    document.getElementById('carName').value        = car.name;
    document.getElementById('carBrand').value       = car.brand;
    document.getElementById('carPrice').value       = car.price;
    document.getElementById('carCategory').value    = car.category;
    document.getElementById('carStatus').value      = car.status;
    document.getElementById('carFeatured').value    = car.featured ? 'true' : 'false';
    document.getElementById('carDescription').value = car.description || '';
    document.getElementById('editCarIndex').value   = idx;
    document.getElementById('carModalLabel').textContent = 'Edit Car';
    new bootstrap.Modal(document.getElementById('addCarModal')).show();
}

// ==========================================
//  8. USERS TABLE — reads edelhaus_users (written by first.js)
// ==========================================
function renderUsersTable() {
    const users   = JSON.parse(localStorage.getItem('edelhaus_users')) || [];
    const current = JSON.parse(localStorage.getItem('currentUser'));
    const search  = (document.getElementById('userSearch')?.value || '').toLowerCase();
    const tbody   = document.getElementById('usersTableBody');
    if (!tbody) return;

    const filtered = users.filter(u =>
        !search || u.email.toLowerCase().includes(search) || (u.name || '').toLowerCase().includes(search)
    );

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">
            No registered users yet. Users who sign up on the main site will appear here.
        </td></tr>`;
    } else {
        tbody.innerHTML = filtered.map((user, i) => {
            const isOnline = current && current.email === user.email;
            return `
            <tr>
                <td class="text-muted">${i + 1}</td>
                <td class="text-white fw-semibold">
                    ${user.name || '&mdash;'}
                    ${isOnline ? `<span class="badge bg-success ms-1" style="font-size:0.65rem">Online</span>` : ''}
                </td>
                <td>${user.email}</td>
                <td><small class="text-muted">&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;</small></td>
                <td><span class="status-badge status-pending">Customer</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-secondary border-0 py-0"
                        onclick="confirmDelete('user', ${users.indexOf(user)})" title="Delete User">
                        <i class="bi bi-trash text-danger"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');
    }

    const cnt = document.getElementById('usersCount');
    if (cnt) cnt.textContent = `${filtered.length} of ${users.length} user(s)`;
    const totalUsers = document.getElementById('statTotalUsers');
    if (totalUsers) totalUsers.textContent = users.length;
}

// ==========================================
//  9. ENQUIRIES TABLE — reads edelhaus_enquiries
// ==========================================
function renderEnquiriesTable() {
    const tbody = document.getElementById('enquiriesTableBody');
    if (!tbody) return;

    if (adminEnquiries.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No enquiries yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = adminEnquiries.map((enq, i) => `
        <tr>
            <td class="text-muted">${i + 1}</td>
            <td class="text-white">${enq.name}</td>
            <td>${enq.email}</td>
            <td><small class="text-muted">${enq.message.substring(0, 60)}${enq.message.length > 60 ? '&hellip;' : ''}</small></td>
            <td><small>${enq.date}</small></td>
            <td><span class="status-badge status-${enq.status.toLowerCase()}">${enq.status}</span></td>
            <td>
                ${enq.status === 'Pending'
                    ? `<button class="btn btn-sm btn-outline-secondary border-0 py-0 me-1" title="Mark Read"
                           onclick="markEnquiryRead(${i})"><i class="bi bi-check2 text-success"></i></button>`
                    : ''}
                <button class="btn btn-sm btn-outline-secondary border-0 py-0"
                    onclick="confirmDelete('enquiry', ${i})" title="Delete">
                    <i class="bi bi-trash text-danger"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function markEnquiryRead(idx) {
    adminEnquiries[idx].status = 'Read';
    localStorage.setItem('edelhaus_enquiries', JSON.stringify(adminEnquiries));
    renderEnquiriesTable();
    updateStatCards();
    showToast('Enquiry marked as read.', 'success');
}

// ==========================================
// 10. TEST DRIVES
// ==========================================
function loadTestDrivesFromAllSources() {
    const lsData = JSON.parse(localStorage.getItem('allTestDrives')) || [];

    const req = indexedDB.open('EdelhausTestDriveDB', 1);

    req.onsuccess = function (e) {
        const db = e.target.result;

        if (!db.objectStoreNames.contains('bookings')) {
            allTestDriveRows = lsData.map(normalizeTestDrive);
            renderTestDrivesTable();
            updateStatCards();
            return;
        }

        const tx     = db.transaction('bookings', 'readonly');
        const store  = tx.objectStore('bookings');
        const getAll = store.getAll();

        getAll.onsuccess = function () {
            const idbData      = getAll.result || [];
            const idbTimestamps = new Set(idbData.map(r => r.timestamp));
            const lsOnly       = lsData.filter(r => !idbTimestamps.has(r.timestamp));

            allTestDriveRows = [...idbData, ...lsOnly]
                .map(normalizeTestDrive)
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            renderTestDrivesTable();
            updateStatCards();
        };

        getAll.onerror = function () {
            allTestDriveRows = lsData.map(normalizeTestDrive);
            renderTestDrivesTable();
        };
    };

    req.onerror = function () {
        allTestDriveRows = lsData.map(normalizeTestDrive);
        renderTestDrivesTable();
        updateStatCards();
    };
}

function normalizeTestDrive(td) {
    return {
        name:      td.name      || '&mdash;',
        email:     td.email     || '&mdash;',
        phone:     td.phone     || '&mdash;',
        car:       td.car       || '&mdash;',
        date:      td.date      || '&mdash;',
        timestamp: td.timestamp || '',
    };
}

function renderTestDrivesTable() {
    const tbody = document.getElementById('testDrivesTableBody');
    if (!tbody) return;

    const savedStatuses = JSON.parse(localStorage.getItem('edelhaus_td_statuses')) || {};

    if (allTestDriveRows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">
            No test drives booked yet. Bookings from the main site will appear here automatically.
        </td></tr>`;
        return;
    }

    tbody.innerHTML = allTestDriveRows.map((td, i) => {
        const status = savedStatuses[td.timestamp] || 'Pending';
        return `
        <tr>
            <td class="text-muted">${i + 1}</td>
            <td class="text-white">${td.name}</td>
            <td>${td.car}</td>
            <td>${td.date}</td>
            <td>
                <small>${td.email}</small><br>
                <small class="text-muted">${td.phone}</small>
            </td>
            <td><span class="status-badge status-${status.toLowerCase()}">${status}</span></td>
            <td>
                ${status === 'Pending'
                    ? `<button class="btn btn-sm btn-outline-secondary border-0 py-0 me-1" title="Confirm"
                           onclick="setTDStatus('${td.timestamp}','Confirmed')">
                           <i class="bi bi-check-lg text-success"></i></button>
                       <button class="btn btn-sm btn-outline-secondary border-0 py-0" title="Cancel"
                           onclick="setTDStatus('${td.timestamp}','Cancelled')">
                           <i class="bi bi-x-lg text-danger"></i></button>`
                    : `<button class="btn btn-sm btn-outline-secondary border-0 py-0" title="Reset to Pending"
                           onclick="setTDStatus('${td.timestamp}','Pending')">
                           <i class="bi bi-arrow-counterclockwise text-warning"></i></button>`
                }
            </td>
        </tr>`;
    }).join('');
}

function setTDStatus(timestamp, status) {
    const statuses = JSON.parse(localStorage.getItem('edelhaus_td_statuses')) || {};
    statuses[timestamp] = status;
    localStorage.setItem('edelhaus_td_statuses', JSON.stringify(statuses));
    renderTestDrivesTable();
    showToast(`Test drive ${status.toLowerCase()}.`, status === 'Confirmed' ? 'success' : 'danger');
}

// ==========================================
// 11. SERVICE APPOINTMENTS
// ==========================================
function renderServiceAppointments() {
    const tbody = document.getElementById('serviceTableBody');
    if (!tbody) return;

    const req = indexedDB.open('EdelhausServiceDB', 1);

    req.onsuccess = function (e) {
        const db = e.target.result;

        if (!db.objectStoreNames.contains('serviceAppointments')) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">
                No service appointments yet.
            </td></tr>`;
            return;
        }

        const tx     = db.transaction('serviceAppointments', 'readonly');
        const store  = tx.objectStore('serviceAppointments');
        const getAll = store.getAll();

        getAll.onsuccess = function () {
            const rows = getAll.result || [];

            if (rows.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">
                    No service appointments yet. Submissions from the main site appear here.
                </td></tr>`;
                return;
            }

            const savedStatuses = JSON.parse(localStorage.getItem('edelhaus_svc_statuses')) || {};

            tbody.innerHTML = rows.map((svc, i) => {
                const status = savedStatuses[svc.timestamp] || 'Pending';
                return `
                <tr>
                    <td class="text-muted">${i + 1}</td>
                    <td class="text-white">${svc.name || '&mdash;'}</td>
                    <td>${svc.car || '&mdash;'}</td>
                    <td><small class="text-muted">${svc.serviceType || '&mdash;'}</small></td>
                    <td>${svc.date || '&mdash;'}</td>
                    <td>${svc.phone || '&mdash;'}</td>
                    <td><small class="text-muted">${svc.message ? svc.message.substring(0, 40) + '&hellip;' : '&mdash;'}</small></td>
                    <td><span class="status-badge status-${status.toLowerCase()}">${status}</span></td>
                    <td>
                        ${status === 'Pending'
                            ? `<button class="btn btn-sm btn-outline-secondary border-0 py-0 me-1" title="Confirm"
                                   onclick="setSvcStatus('${svc.timestamp}','Confirmed')">
                                   <i class="bi bi-check-lg text-success"></i></button>`
                            : `<button class="btn btn-sm btn-outline-secondary border-0 py-0" title="Reset"
                                   onclick="setSvcStatus('${svc.timestamp}','Pending')">
                                   <i class="bi bi-arrow-counterclockwise text-warning"></i></button>`}
                    </td>
                </tr>`;
            }).join('');
        };
    };

    req.onerror = function () {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">Could not read service database.</td></tr>`;
    };
}

function setSvcStatus(timestamp, status) {
    const statuses = JSON.parse(localStorage.getItem('edelhaus_svc_statuses')) || {};
    statuses[timestamp] = status;
    localStorage.setItem('edelhaus_svc_statuses', JSON.stringify(statuses));
    renderServiceAppointments();
    showToast(`Appointment ${status.toLowerCase()}.`, 'success');
}

// ==========================================
// 12. ANALYTICS
// ==========================================
function renderAnalytics() {
    const users = JSON.parse(localStorage.getItem('edelhaus_users')) || [];
    const allTD = JSON.parse(localStorage.getItem('allTestDrives')) || [];

    const kpiUsers = document.getElementById('kpiUsers');
    const kpiTD    = document.getElementById('kpiTD');
    const kpiEnq   = document.getElementById('kpiEnq');
    if (kpiUsers) kpiUsers.textContent = users.length;
    if (kpiTD)    kpiTD.textContent    = allTD.length;
    if (kpiEnq)   kpiEnq.textContent   = adminEnquiries.length;

    const topViewedList = document.getElementById('topViewedList');
    if (!topViewedList) return;

    const sampleTop = [
        { name: 'Bugatti Chiron',         views: 145 },
        { name: 'Ferrari SF90 Stradale',  views: 128 },
        { name: 'Lamborghini Revuelto',   views: 112 },
        { name: 'Rolls-Royce Ghost',      views: 98  },
        { name: 'Porsche 911 GT3 RS',     views: 87  },
    ];

    const maxV = sampleTop[0].views;
    topViewedList.innerHTML = sampleTop.map(item => `
        <div class="top-viewed-item">
            <div style="flex:1">
                <div class="text-white small">${item.name}</div>
                <div class="top-viewed-bar mt-1" style="width:${(item.views / maxV * 100).toFixed(0)}%"></div>
            </div>
            <span class="text-muted ms-3 small">${item.views}</span>
        </div>
    `).join('');
}

// ==========================================
// 13. CHARTS
// ==========================================
function initCharts() {
    const gridColor  = 'rgba(255,255,255,0.05)';
    const tickColor  = '#777';
    const fontOpts   = { family: 'Montserrat', size: 11 };

    const scaleOpts = {
        x: { ticks: { color: tickColor, font: fontOpts }, grid: { color: gridColor } },
        y: { ticks: { color: tickColor, font: fontOpts }, grid: { color: gridColor } }
    };
    const legendOpts = { labels: { color: '#aaa', font: fontOpts } };

    // Enquiry bar chart
    const eCtx = document.getElementById('enquiryChart');
    if (eCtx) {
        if (enquiryChartInst) enquiryChartInst.destroy();
        enquiryChartInst = new Chart(eCtx, {
            type: 'bar',
            data: {
                labels: ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'],
                datasets: [{
                    label: 'Enquiries',
                    data: [2, 5, 3, 8, 6, adminEnquiries.length],
                    backgroundColor: 'rgba(52,152,219,0.5)',
                    borderColor: '#3498db',
                    borderWidth: 1,
                    borderRadius: 6
                }]
            },
            options: { responsive: true, plugins: { legend: legendOpts }, scales: scaleOpts }
        });
    }

    refreshBrandChart();

    // Visitors line chart
    const vCtx = document.getElementById('visitorsChart');
    if (vCtx) {
        if (visitorsChartInst) visitorsChartInst.destroy();
        visitorsChartInst = new Chart(vCtx, {
            type: 'line',
            data: {
                labels: ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'],
                datasets: [{
                    label: 'Unique Visitors',
                    data: [320, 580, 410, 720, 650, 480],
                    borderColor: '#2ecc71',
                    backgroundColor: 'rgba(46,204,113,0.08)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#2ecc71'
                }]
            },
            options: { responsive: true, plugins: { legend: legendOpts }, scales: scaleOpts }
        });
    }
}

function refreshBrandChart() {
    const brandCounts = {};
    adminInventory.forEach(c => { brandCounts[c.brand] = (brandCounts[c.brand] || 0) + 1; });

    const bCtx = document.getElementById('brandChart');
    if (!bCtx) return;
    if (brandChartInst) brandChartInst.destroy();

    brandChartInst = new Chart(bCtx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(brandCounts),
            datasets: [{
                data: Object.values(brandCounts),
                backgroundColor: ['#3498db','#e74c3c','#2ecc71','#f1c40f','#9b59b6','#e67e22','#1abc9c','#e91e63'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { labels: { color: '#aaa', font: { family: 'Montserrat', size: 10 } } } }
        }
    });
}

// ==========================================
// 14. DELETE
// ==========================================
let pendingDelete = null;

function confirmDelete(type, idx) {
    pendingDelete = { type, idx };
    const msgs = {
        car:     'Remove this car from inventory?',
        user:    'Delete this user? They will no longer be able to log in to the main site.',
        enquiry: 'Delete this enquiry permanently?',
    };
    const msgEl = document.getElementById('confirmDeleteMsg');
    if (msgEl) msgEl.textContent = msgs[type] || 'Delete this item?';
    
    const modalEl = document.getElementById('confirmDeleteModal');
    if (modalEl) new bootstrap.Modal(modalEl).show();
}

document.getElementById('confirmDeleteBtn')?.addEventListener('click', function () {
    if (!pendingDelete) return;
    const { type, idx } = pendingDelete;

    if (type === 'car') {
        adminInventory.splice(idx, 1);
        localStorage.setItem('edelhaus_admin_inventory', JSON.stringify(adminInventory));
        renderInventoryTable();
        refreshBrandChart();
    } else if (type === 'user') {
        const users   = JSON.parse(localStorage.getItem('edelhaus_users')) || [];
        const current = JSON.parse(localStorage.getItem('currentUser'));
        if (current && current.email === users[idx]?.email) {
            localStorage.removeItem('currentUser');
        }
        users.splice(idx, 1);
        localStorage.setItem('edelhaus_users', JSON.stringify(users));
        renderUsersTable();
    } else if (type === 'enquiry') {
        adminEnquiries.splice(idx, 1);
        localStorage.setItem('edelhaus_enquiries', JSON.stringify(adminEnquiries));
        renderEnquiriesTable();
    }

    updateStatCards();
    bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal'))?.hide();
    showToast('Deleted successfully.', 'danger');
    pendingDelete = null;
});

// ==========================================
// 15. SETTINGS
// ==========================================
document.getElementById('changePasswordForm')?.addEventListener('submit', function (e) {
    e.preventDefault();
    const current = document.getElementById('currentPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmPassword').value;
    const msg     = document.getElementById('passwordMsg');

    if (current !== ADMIN_CREDS.password) {
        msg.textContent = 'Current password is incorrect.';
        msg.className = 'small text-danger mb-2'; return;
    }
    if (newPass !== confirm) {
        msg.textContent = 'New passwords do not match.';
        msg.className = 'small text-danger mb-2'; return;
    }
    if (newPass.length < 6) {
        msg.textContent = 'Password must be at least 6 characters.';
        msg.className = 'small text-danger mb-2'; return;
    }

    ADMIN_CREDS.password = newPass;
    localStorage.setItem('edelhaus_admin_creds', JSON.stringify(ADMIN_CREDS));
    msg.textContent = 'Password updated and saved!';
    msg.className = 'small text-success mb-2';
    this.reset();
});

function clearAllUsers() {
    if (!confirm('This permanently deletes ALL users from the main site. They will be logged out. Proceed?')) return;
    localStorage.removeItem('edelhaus_users');
    localStorage.removeItem('currentUser');
    renderUsersTable();
    updateStatCards();
    showToast('All users cleared.', 'danger');
}

function clearTestDrives() {
    if (!confirm('This clears all test drive records. Proceed?')) return;
    localStorage.removeItem('allTestDrives');
    localStorage.removeItem('latestTestDrive');
    localStorage.removeItem('edelhaus_td_statuses');
    allTestDriveRows = [];
    renderTestDrivesTable();
    updateStatCards();
    showToast('Test drives cleared.', 'warning');
}

// ==========================================
// 16. TOAST
// ==========================================
function showToast(message, type = 'success') {
    const toastEl = document.getElementById('adminToast');
    const msgEl   = document.getElementById('adminToastMsg');
    
    if (!toastEl || !msgEl) return;

    const icons = {
        success: '<i class="bi bi-check-circle-fill text-success me-2"></i>',
        danger:  '<i class="bi bi-x-circle-fill text-danger me-2"></i>',
        warning: '<i class="bi bi-exclamation-triangle-fill text-warning me-2"></i>',
    };

    msgEl.innerHTML = (icons[type] || '') + message;
    bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 3000 }).show();
}

// ==========================================
//  17. GO TO WEBSITE AS ADMIN
// ==========================================
function goToWebsite() {
    // 1. Create a mock profile so the website recognizes you
    const adminProfile = {
        name: 'Edelhaus Admin',
        email: 'admin@edelhaus.com',
        country: 'India',
        phone: 'System Admin'
    };
    
    // 2. Inject it into the local storage keys used by first.js
    localStorage.setItem('edelhausActiveUser', JSON.stringify(adminProfile));
    localStorage.setItem('currentUser', JSON.stringify(adminProfile));
    
    // 3. Redirect to the main site
    window.location.href = 'help.html';
}