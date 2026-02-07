// ==================== 1. GLOBAL VARIABLES ====================
let currentPage = 1;
const itemsPerPage = 3;
let currentBrandFilter = 'all';
let searchTerm = '';
let carsData = []; 

// ==================== 2. API LOAD ====================
async function loadCarsData() {
    try {
        const response = await fetch('cars.json'); 
        const data = await response.json();
        carsData = data;
        renderFeaturedCars();
        renderInventoryCars();
        createBrandDropdown();
        updateStockDisplay();
        
        console.log("API Success: Data loaded successfully");
    } catch (error) {
        console.error("API Error: Could not load cars.", error);
        document.getElementById('inventoryGrid').innerHTML = '<p class="text-white text-center">Error loading inventory. Please try again later.</p>';
    }
}

// ==================== 3. PAGE NAVIGATION ====================
function showPage(pageName) {
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const targetPage = document.getElementById(pageName);
    if (targetPage) {
        targetPage.classList.add('active');
        setTimeout(checkScroll, 100); 
    }
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if(link.getAttribute('onclick') && link.getAttribute('onclick').includes(pageName)) {
            link.classList.add('active');
        }
    });
    
    window.scrollTo(0, 0);

    const navMenu = document.getElementById('navMenu');
    if (navMenu && navMenu.classList.contains('show')) {
        const bsCollapse = bootstrap.Collapse.getInstance(navMenu);
        if (bsCollapse) bsCollapse.hide();
    }
}

// ==================== 4. RENDERING & FILTERING ====================
function renderFeaturedCars() {
    const grid = document.getElementById('featuredCarsGrid');
    if (!grid) return;
    
    const featured = carsData.filter(car => car.featured);
    grid.innerHTML = featured.map(car => generateCarCard(car)).join('');
}

function renderInventoryCars() {
    const grid = document.getElementById('inventoryGrid');
    if (!grid) return;
    
    // 1. Start with all cars
    let filtered = carsData;
    
    // 2. Apply Brand/Category Filter
    if (currentBrandFilter !== 'all') {
        filtered = filtered.filter(car => 
            car.brand === currentBrandFilter || 
            car.category === currentBrandFilter
        );
    }
    
    // 3. Apply Search Filter
    if (searchTerm) {
        filtered = filtered.filter(car => 
            car.name.toLowerCase().includes(searchTerm)
        );
    }

    // 4. NEW: Remove Duplicates (Keep only unique names for the display)
    const shownNames = new Set();
    const uniqueCars = filtered.filter(car => {
        if (shownNames.has(car.name)) {
            return false; // Skip if we already have this car name in our list
        } else {
            shownNames.add(car.name);
            return true; // Keep this car
        }
    });
    
    // 5. Paginate based on UNIQUE cars (not total cars)
    const start = (currentPage - 1) * itemsPerPage;
    const paginated = uniqueCars.slice(start, start + itemsPerPage);
    
    // 6. Render
    if (paginated.length === 0) {
        grid.innerHTML = '<div class="col-12 text-center text-white"><p>No cars found matching your criteria.</p></div>';
    } else {
        grid.innerHTML = paginated.map(car => generateCarCard(car)).join('');
    }
    
    // 7. Update Pagination Controls based on unique count
    renderPagination(uniqueCars.length);
}

function generateCarCard(car) {
    // 1. CALCULATE STOCK (New Logic)
    const stockCount = getStockCount(car.name);
    
    // Create text based on the count
    let stockStatusText = '';
    let stockClass = '';

    if (stockCount > 1) {
        stockStatusText = `${stockCount} Units Available`;
        stockClass = 'text-success'; // Green text for plenty of stock
    } else {
        stockStatusText = '1 unit Available';
        stockClass = 'text-warning'; // Yellow text for low stock
    }

    // 2. LOGIC FOR COLORS (Existing)
    let colorDotsHTML = '';
    let displayImage = car.images[0]; 

    if (car.colors && car.colors.length > 0) {
        displayImage = car.colors[0].img;
        colorDotsHTML = `<div class="color-options d-flex gap-2 mb-3">`;
        car.colors.forEach((color, index) => {
            const isActive = index === 0 ? 'active' : '';
            colorDotsHTML += `
                <div class="color-dot ${isActive}" 
                     style="background-color: ${color.hex}; width: 20px; height: 20px; border-radius: 50%; cursor: pointer; border: 2px solid #333;" 
                     title="${color.name}"
                     onclick="changeCarImage(${car.id}, '${color.img}', this)">
                </div>`;
        });
        colorDotsHTML += `</div>`;
    }

    let imageContent = `<img id="car-img-${car.id}" src="${displayImage}" class="card-img-top" alt="${car.name}" style="height: 240px; object-fit: cover;">`;

   return `
        <div class="col-md-4">
            <div class="card car-card shadow h-100">
                <div class="img-wrapper position-relative">
                    <span class="car-badge">${car.badge}</span>
                    ${imageContent}
                </div>
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${car.name}</h5>
                    <p class="car-subtitle mb-2">${car.subtitle}</p>
                    
                    ${colorDotsHTML}

                    <div class="car-specs">
                        <div class="spec-item"><i class="bi bi-speedometer2"></i><span>${car.power}</span></div>
                        <div class="spec-item"><i class="bi bi-lightning-charge"></i><span>${car.acceleration}</span></div>
                    </div>
                    
                    <div class="car-price mt-3">${car.price}</div>
                    
                    <div class="card-footer-info mt-auto">
                        <span class="info-badge ${stockClass}">
                            <i class="bi bi-box-seam me-1"></i> ${stockStatusText}
                        </span>
                        <span class="info-badge"><i class="bi bi-calendar-check me-1"></i> ${car.year}</span>
                    </div>
                    
                    <div class="d-flex gap-2 mt-3">
                        <button class="btn btn-gradient flex-grow-1" onclick="openModal(${car.id})">
                            <i class="bi bi-eye me-2"></i>View Details
                        </button>
                        <button class="btn btn-outline-light" onclick="toggleCompare(${car.id}, this)" title="Add to Compare">
                            <i class="bi bi-arrow-left-right"></i>
                        </button>
                    </div>

                </div>
            </div>
        </div>
    `;
}

// ==================== 5. PAGINATION & FILTER LOGIC ====================
function filterCars(category) {
    currentBrandFilter = category;
    currentPage = 1;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if(btn.textContent.toLowerCase().includes(category) || (category === 'all' && btn.textContent.includes('All'))) {
            btn.classList.add('active');
        }
    });
    renderInventoryCars();
}

function renderPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const pagination = document.getElementById('inventoryPagination');
    if (!pagination) return;
    
    pagination.innerHTML = '';
    if (totalPages <= 1) return;

    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<button class="page-link" onclick="changePage(${currentPage - 1})">&laquo;</button>`;
    pagination.appendChild(prevLi);

    for (let i = 1; i <= totalPages; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === currentPage ? 'active' : ''}`;
        li.innerHTML = `<button class="page-link" onclick="changePage(${i})">${i}</button>`;
        pagination.appendChild(li);
    }

    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<button class="page-link" onclick="changePage(${currentPage + 1})">&raquo;</button>`;
    pagination.appendChild(nextLi);
}

function changePage(newPage) {
    if (newPage < 1) return;
    currentPage = newPage;
    renderInventoryCars();
    document.getElementById('inventory').scrollIntoView({ behavior: 'smooth' });
}

// ==================== 6. BRAND DROPDOWN LOGIC ====================
function getBrandInventoryCounts() {
    const brandCounts = {};
    carsData.forEach(car => {
        if (!brandCounts[car.brand]) brandCounts[car.brand] = 0;
        brandCounts[car.brand]++;
    });
    return brandCounts;
}

function getUniqueBrands() {
    const brands = [...new Set(carsData.map(car => car.brand))];
    return ['All Brands', ...brands];
}

function updateStockDisplay(brandName = 'All Brands') {
    const btn = document.getElementById('brandDropdownBtn');
    if (!btn) return;
    const brandCounts = getBrandInventoryCounts();
    if (brandName.includes('All') || brandName === 'all') {
        btn.innerHTML = `<i class="bi bi-funnel me-1"></i>All Brands (${carsData.length}) <i class="bi bi-chevron-down ms-1"></i>`;
    } else {
        const count = brandCounts[brandName] || 0;
        btn.innerHTML = `<i class="bi bi-car-front me-1"></i>${brandName} (${count}) <i class="bi bi-chevron-up ms-1"></i>`;
    }
}

// ==================== BRAND LOGO MAPPING (Local Storage) ====================
const brandLogoData = {
    "Bentley": "LOGOS/B_logo.jpg",
    "Mercedes-Benz": "LOGOS/Mercedes_Benz-Logo.png",
    "Porsche": "LOGOS/PORSCHE_LOGO.webp",
    "Ferrari": "LOGOS/Ferrari_Logo.jpg",
    "Rolls-Royce": "LOGOS/ROLLS_ROYCE_LOGO.webp",
    "Range Rover": "LOGOS/RANGE_ROVER_LOGO.webp",
    "BMW": "LOGOS/BMW_LOGO.webp",
};
localStorage.setItem('edelhausBrandLogos', JSON.stringify(brandLogoData));

function createBrandDropdown() {
    const brands = getUniqueBrands();
    const brandCounts = getBrandInventoryCounts();
    const brandList = document.getElementById('brandList');
    const storedLogos = JSON.parse(localStorage.getItem('edelhausBrandLogos')) || {};

    if (!brandList) return;
    
    let html = `<a href="#" class="dropdown-item brand-item active" data-brand="all">
                    <i class="bi bi-grid-3x3-gap me-2"></i> All Brands (${carsData.length})
                </a>`;
    
    brands.slice(1).forEach(brand => {
        const count = brandCounts[brand] || 0;
        const logoPath = storedLogos[brand];
        let iconHtml = logoPath ? `<img src="${logoPath}" class="dropdown-logo" alt="${brand}">` : `<i class="bi bi-car-front me-2"></i>`;

        html += `<a href="#" class="dropdown-item brand-item" data-brand="${brand}">
                    ${iconHtml}
                    ${brand} 
                    <span class="badge bg-secondary ms-2" style="font-size: 0.7em;">${count}</span>
                 </a>`;
    });
    
    brandList.innerHTML = html;
    
    document.querySelectorAll('.brand-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const brand = this.dataset.brand;
            document.querySelectorAll('.brand-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            filterCars(brand); 
            updateStockDisplay(brand === 'all' ? 'All Brands' : brand);
            document.getElementById('brandDropdownMenu').style.display = 'none';
        });
    });
}

document.getElementById('brandDropdownBtn')?.addEventListener('click', function(e) {
    e.stopPropagation();
    const dropdown = document.getElementById('brandDropdownMenu');
    if (dropdown) dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
});

document.addEventListener('click', function(e) {
    const searchContainer = document.querySelector('.search-brand-container');
    const dropdown = document.getElementById('brandDropdownMenu');
    if (dropdown && searchContainer && !searchContainer.contains(e.target)) {
        dropdown.style.display = 'none';
    }
});

// ==================== 7. SEARCH & MODAL & SCROLL ====================
document.addEventListener('DOMContentLoaded', function() {
    const carSearch = document.getElementById('carSearch');
    if (carSearch) {
        carSearch.addEventListener('input', function() {
            searchTerm = this.value.toLowerCase();
            renderInventoryCars(); 
        });
    }
});

function openModal(carId) {
    const car = carsData.find(c => c.id === carId);
    if (!car) return;
    updateRecentQueue(car.name);
    document.getElementById("carTitle").innerText = car.name;
    const modalBody = document.getElementById("carBody");
    modalBody.innerHTML = `
        <img src="${car.images[0]}" class="img-fluid rounded mb-3 w-100" style="max-height:300px; object-fit:cover;">
        <h4>${car.price}</h4>
        <div class="row mt-3">
            <div class="col-6"><p><strong>Engine:</strong> ${car.engine}</p></div>
            <div class="col-6"><p><strong>Power:</strong> ${car.power}</p></div>
            <div class="col-6"><p><strong>0-100:</strong> ${car.acceleration}</p></div>
            <div class="col-6"><p><strong>Year:</strong> ${car.year}</p></div>
        </div>
        <p class="mt-2 text-muted">${car.description}</p>
        <button class="btn btn-gradient mt-3 w-100" onclick="alert('Test drive booked for ${car.name}!')">Book Test Drive</button>
    `;
    new bootstrap.Modal(document.getElementById("carModal")).show();
}

function checkScroll() {
    const reveals = document.querySelectorAll('.reveal');
    const windowHeight = window.innerHeight;
    const elementVisible = 100;
    reveals.forEach((reveal) => {
        const elementTop = reveal.getBoundingClientRect().top;
        if (elementTop < windowHeight - elementVisible) {
            reveal.classList.add('active');
        }
    });
    
    const backBtn = document.getElementById('backToTop');
    if (backBtn) {
        if (window.scrollY > 300) backBtn.style.display = 'block';
        else backBtn.style.display = 'none';
    }
    
    const header = document.querySelector('.header-custom');
    if (header) {
        if (window.scrollY > 50) header.classList.add('scrolled');
        else header.classList.remove('scrolled');
    }
}

window.addEventListener('scroll', checkScroll);

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        alert('Thank you for your message! We will get back to you soon.');
        this.reset();
    });
}

window.addEventListener('load', function() {
    loadCarsData();
    checkScroll();
});

// ==================== 8. ANIMATIONS & INTERACTIONS ====================

// --- Counter Animation ---
const counters = document.querySelectorAll('.counter');
let hasAnimated = false; 

function animateCounters() {
    counters.forEach(counter => {
        const target = +counter.getAttribute('data-target');
        const count = +counter.innerText;
        const increment = target / 50; 

        if (count < target) {
            counter.innerText = Math.ceil(count + increment);
            setTimeout(animateCounters, 500); 
        } else {
            counter.innerText = target;
        }
    });
}

window.addEventListener('scroll', () => {
    const statsSection = document.querySelector('.stat-card');
    if(!statsSection) return;
    const sectionPos = statsSection.getBoundingClientRect().top;
    const screenPos = window.innerHeight / 1.3;

    if (sectionPos < screenPos && !hasAnimated) {
        animateCounters();
        hasAnimated = true; 
    }
});

// --- NEW FUNCTION: Change Image on Color Dot Click ---
window.changeCarImage = function(carId, imgUrl, dotElement) {
    // 1. Change the Image Source
    const imgTag = document.getElementById(`car-img-${carId}`);
    if(imgTag) {
        imgTag.style.opacity = 0.5; // Start fade out
        
        // Wait 200ms then swap image and fade in
        setTimeout(() => {
            imgTag.src = imgUrl;
            imgTag.style.opacity = 1; 
        }, 200);
    }

    // 2. Update Active Dot Styling
    const parentCard = dotElement.closest('.car-card');
    if (parentCard) {
        const allDots = parentCard.querySelectorAll('.color-dot');
        allDots.forEach(dot => {
            dot.classList.remove('active');
            dot.style.borderColor = '#333'; 
        });
        
        dotElement.classList.add('active');
        dotElement.style.borderColor = '#fff'; 
    }
};
// Function to count how many cars exist with the same name
function getStockCount(modelName) {
    // Filter the global carsData array for matching names
    const matchingCars = carsData.filter(car => car.name === modelName);
    return matchingCars.length;
}
// ==================== COMPARE CARS LOGIC ====================

// 1. Global List to store selected IDs
let compareList = [];

// 2. Function to Add/Remove Car from Compare
function toggleCompare(id, btnElement) {
    // Check if car is already in the list
    if (compareList.includes(id)) {
        // REMOVE IT
        compareList = compareList.filter(carId => carId !== id);
        
        // Reset Button Style (Gray)
        btnElement.classList.remove('btn-check-active');
        btnElement.innerHTML = '<i class="bi bi-arrow-left-right"></i>';
    } else {
        // ADD IT (Check max limit 3)
        if (compareList.length >= 3) {
            alert("You can only compare up to 3 cars.");
            return;
        }
        compareList.push(id);
        
        // Set Button Style (Blue/Active)
        btnElement.classList.add('btn-check-active');
        btnElement.innerHTML = '<i class="bi bi-check-lg"></i>';
    }
    
    updateCompareBar();
}

// 3. Show/Hide the Floating Bottom Bar
function updateCompareBar() {
    const bar = document.getElementById('compareBar');
    const countSpan = document.getElementById('compareCount');
    
    if (compareList.length > 0) {
        bar.style.display = 'block'; // Show bar
        countSpan.innerText = compareList.length;
    } else {
        bar.style.display = 'none'; // Hide bar
    }
}

// 4. Clear All Selections
function clearCompare() {
    compareList = [];
    updateCompareBar();
    
    // Reset all compare buttons on the screen
    document.querySelectorAll('[onclick^="toggleCompare"]').forEach(btn => {
        btn.classList.remove('btn-check-active');
        btn.innerHTML = '<i class="bi bi-arrow-left-right"></i>';
    });
}

// 5. Build & Show the Comparison Modal
function showCompareModal() {
    if (compareList.length < 2) {
        alert("Please select at least 2 cars to compare.");
        return;
    }

    // Get the full car objects
    const selectedCars = carsData.filter(car => compareList.includes(car.id));
    
    const headerRow = document.getElementById('compareHeader');
    const bodyObj = document.getElementById('compareBody');
    
    // A. Build Header (Images & Names)
    let headerHTML = '<tr><th class="bg-dark text-secondary" style="width:15%">Specs</th>';
    selectedCars.forEach(car => {
        headerHTML += `
            <th class="py-4" style="width: ${85 / selectedCars.length}%">
                <img src="${car.images[0]}" class="img-fluid rounded mb-2" style="height:80px; object-fit:cover;">
                <h5 class="mb-0 text-white fs-6">${car.name}</h5>
            </th>`;
    });
    headerHTML += '</tr>';
    headerRow.innerHTML = headerHTML;

    // B. Build Specs Rows
    const specs = [
        { label: "Price", key: "price" },
        { label: "Engine", key: "engine" },
        { label: "Power", key: "power" },
        { label: "0-100", key: "acceleration" },
        { label: "Year", key: "year" }
    ];

    let bodyHTML = '';
    specs.forEach(spec => {
        bodyHTML += `<tr><td class="fw-bold text-secondary text-start ps-4">${spec.label}</td>`;
        
        selectedCars.forEach(car => {
            let val = car[spec.key] || '-';
            if(spec.key === 'price') val = `<span class="text-primary fw-bold">${val}</span>`;
            bodyHTML += `<td class="text-white">${val}</td>`;
        });
        
        bodyHTML += `</tr>`;
    });
    bodyObj.innerHTML = bodyHTML;
    
    // Open Bootstrap Modal
    new bootstrap.Modal(document.getElementById('compareModal')).show();
}
// ==================== 9. BRAND CARD CLICK LOGIC ====================

function filterByBrandRedirect(brandName) {
    // 1. Go to the Inventory Page
    showPage('inventory');

    // 2. Wait a split second for the page to switch, then filter
    setTimeout(() => {
        // Set the filter
        filterCars(brandName);
        
        // Update the visual dropdown text to match
        updateStockDisplay(brandName);
        
        // Scroll slightly down to the cars so the user sees them
        const grid = document.getElementById('inventoryGrid');
        if (grid) {
            grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 100);
}
// ==================== 10. COMING SOON LOGIC ====================
function showComingSoon(brandName) {
    // 1. Set the Title
    document.getElementById("carTitle").innerText = brandName;
    
    // 2. Set the Body Content (Icon + Message)
    const modalBody = document.getElementById("carBody");
    modalBody.innerHTML = `
        <div class="text-center py-5">
            <i class="bi bi-cone-striped display-1 text-warning mb-4"></i>
            <h3 class="text-white fw-bold">Stock Currently Unavailable</h3>
            <p class="text-muted fs-5 mt-3">
                We are currently sourcing the finest examples of 
                <span class="text-white fw-bold">${brandName}</span> for our showroom.
            </p>
            <div class="mt-4">
                <span class="badge bg-dark border border-secondary p-2">Status: Coming Soon</span>
            </div>
            <button class="btn btn-outline-light mt-4 px-4" data-bs-dismiss="modal">Close</button>
        </div>
    `;

    // 3. Show the Modal
    new bootstrap.Modal(document.getElementById("carModal")).show();
}
// ==================== 11. AUTHENTICATION & VALIDATION ====================

document.addEventListener('DOMContentLoaded', function() {
    const forms = [document.getElementById('authLoginForm'), document.getElementById('authSignupForm')];

    forms.forEach(form => {
        if (!form) return;

        form.addEventListener('submit', function(event) {
            // Check Bootstrap validation
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            } else {
                event.preventDefault();
                
                // Simulate Success
                const submitBtn = form.querySelector('button[type="submit"]');
                const originalText = submitBtn.innerText;
                
                submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Verifying...`;
                submitBtn.disabled = true;

                setTimeout(() => {
                    alert(form.id === 'authLoginForm' ? "Welcome back to Edelhaus!" : "Account created successfully!");
                    bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
                    
                    // Reset form
                    submitBtn.innerText = originalText;
                    submitBtn.disabled = false;
                    form.reset();
                    form.classList.remove('was-validated');
                }, 1500);
            }
            form.classList.add('was-validated');
        }, false);
    });
});
// ==================== RECENTLY VIEWED QUEUE LOGIC ====================
function updateRecentQueue(carName) {
    let recentQueue = JSON.parse(sessionStorage.getItem('edelhausRecent')) || [];

    if (recentQueue[0] === carName) return;

    recentQueue.unshift(carName);

    // --- ADD THIS LOGIC ---
    if (recentQueue.length > 3) {
        const removedCar = recentQueue.pop(); // Remove and store the name
        console.warn(`Queue Full! Popping oldest car: ${removedCar}`);
    } else {
        console.log(`Added to Queue: ${carName}. Current Size: ${recentQueue.length}`);
    }
    // ----------------------

    sessionStorage.setItem('edelhausRecent', JSON.stringify(recentQueue));
    displayRecentCars();
}
function displayRecentCars() {
    const container = document.getElementById('recentViewedContainer');
    const section = document.getElementById('recentSection');
    const recentQueue = JSON.parse(sessionStorage.getItem('edelhausRecent')) || [];

    if (!container) return;

    if (recentQueue.length === 0) {
        section.style.display = 'none'; // Hide section if empty
        return;
    }

    section.style.display = 'block';
    container.innerHTML = recentQueue.map(name => `
        <div class="col-4">
            <div class="p-2 border border-secondary rounded text-center bg-dark">
                <small class="text-white-50 d-block">Previously Viewed</small>
                <span class="text-white fw-bold" style="font-size: 0.8rem;">${name}</span>
            </div>
        </div>
    `).join('');
}