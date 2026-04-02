document.addEventListener('DOMContentLoaded', () => {

    const API_URL = 'http://localhost:5000/api/jobs';

    // 1. Job State
    let initialJobs = [];
    let jobs = [];
    let favorites = JSON.parse(localStorage.getItem('savedJobs')) || [];

    // Fetch jobs from backend
    async function fetchJobs() {
        try {
            const response = await fetch(API_URL);
            initialJobs = await response.json();
            jobs = [...initialJobs];
            renderJobs(initialJobs);
        } catch (err) {
            console.error("Failed to fetch jobs:", err);
            jobContainer.innerHTML = `<div class="error-state text-center" style="grid-column: 1/-1;">Error loading jobs. Please check API status.</div>`;
        }
    }

    // 2. DOM Elements
    const jobContainer = document.getElementById('job-container');
    const searchInput = document.getElementById('job-search');
    const searchBtn = document.getElementById('search-btn');
    const catChips = document.querySelectorAll('.cat-chip');
    const resultsCount = document.getElementById('results-count');
    const applyModal = document.getElementById('apply-modal');
    const modalJobTitle = document.getElementById('modal-job-title');
    const modalCompany = document.getElementById('modal-company-name');
    const closeModalBtns = document.querySelectorAll('.close-modal, .close-btn');
    const toast = document.getElementById('toast');

    // 3. Render Functions
    function renderJobs(jobsToRender) {
        jobContainer.innerHTML = '';
        
        if (jobsToRender.length === 0) {
            jobContainer.innerHTML = `
                <div class="empty-state text-center" style="grid-column: 1/-1; padding: 100px 0;">
                    <i class="fas fa-search" style="font-size: 3rem; color: #ccc; margin-bottom: 20px;"></i>
                    <h3>No jobs found matching your criteria.</h3>
                    <p style="color: #666;">Try searching for a different keyword or category.</p>
                </div>
            `;
            resultsCount.textContent = '0 jobs found';
            return;
        }

        resultsCount.textContent = `Showing ${jobsToRender.length} jobs`;

        jobsToRender.forEach(job => {
            const isFavorite = favorites.includes(job.id);
            const card = document.createElement('div');
            card.className = 'job-card reveal-up';
            card.innerHTML = `
                <div class="job-head">
                    <div class="comp-logo">${job.company.charAt(0)}</div>
                    <i class="fas fa-heart fav-btn ${isFavorite ? 'active' : ''}" data-id="${job.id}"></i>
                </div>
                <h3 class="job-title">${job.title}</h3>
                <span class="job-comp">${job.company}</span>
                <div class="job-meta">
                    <div class="meta-item"><i class="fas fa-location-dot"></i> ${job.location}</div>
                    <div class="meta-item"><i class="fas fa-briefcase"></i> ${job.type}</div>
                    <div class="meta-item"><i class="fas fa-folder"></i> ${job.category}</div>
                </div>
                <p class="job-desc">${job.desc}</p>
                <div class="job-footer">
                    <div class="job-salary">${job.salary}</div>
                    <button class="btn-primary apply-btn" data-id="${job.id}" data-title="${job.title}" data-company="${job.company}">Apply Now</button>
                </div>
            `;
            jobContainer.appendChild(card);
        });

        // Add event listeners to buttons
        attachJobListeners();
    }

    function attachJobListeners() {
        // Apply Buttons
        document.querySelectorAll('.apply-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const title = e.target.getAttribute('data-title');
                const company = e.target.getAttribute('data-company');
                const jobId = e.target.getAttribute('data-id');
                openApplyModal(title, company, jobId);
            });
        });

        // Favorite Buttons
        document.querySelectorAll('.fav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.getAttribute('data-id'));
                toggleFavorite(id, e.target);
            });
        });
    }

    // 4. Action Handlers
    let currentJob = null;

    async function openApplyModal(title, company, jobId) {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) {
            alert('Please login as a Jobseeker to apply!');
            window.location.href = 'login.html';
            return;
        }

        if (user.role === 'admin') {
            alert('Admins cannot apply for jobs.');
            return;
        }

        currentJob = { id: jobId, title, company };
        modalJobTitle.textContent = title;
        modalCompany.textContent = company;
        applyModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    const applyForm = document.getElementById('apply-form');
    if (applyForm) {
        applyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = JSON.parse(localStorage.getItem('user'));
            const fileInput = document.getElementById('app-resume');
            const file = fileInput.files[0];
            
            // Helper to read file as base64
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64Resume = reader.result;
                const payload = {
                    jobId: currentJob.id,
                    jobTitle: currentJob.title,
                    company: currentJob.company,
                    applicantName: user.name,
                    applicantEmail: user.email,
                    phone: document.getElementById('app-phone').value,
                    experience: document.getElementById('app-exp').value,
                    resume: base64Resume, // Base64 data
                    resumeName: file.name
                };

                const res = await fetch('http://localhost:5000/api/apply', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    applyForm.style.display = 'none';
                    document.getElementById('apply-success-msg').style.display = 'block';
                } else {
                    alert('Submission failed. Try again.');
                }
            };
        });
    }

    function closeModals() {
        applyModal.style.display = 'none';
        document.body.style.overflow = '';
        if (applyForm) {
            applyForm.reset();
            applyForm.style.display = 'block';
            document.getElementById('apply-success-msg').style.display = 'none';
        }
    }

    function toggleFavorite(id, element) {
        if (favorites.includes(id)) {
            favorites = favorites.filter(favId => favId !== id);
            element.classList.remove('active');
            showToast('Job removed from favorites');
        } else {
            favorites.push(id);
            element.classList.add('active');
            showToast('Job saved to favorites!');
        }
        localStorage.setItem('savedJobs', JSON.stringify(favorites));
    }

    function showToast(message) {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // 5. Filter Logic
    function filterJobs() {
        const query = searchInput.value.toLowerCase();
        const activeCat = document.querySelector('.cat-chip.active').getAttribute('data-category');

        const filtered = initialJobs.filter(job => {
            const matchesSearch = job.title.toLowerCase().includes(query) || 
                                job.company.toLowerCase().includes(query) || 
                                job.desc.toLowerCase().includes(query);
            
            const matchesCat = activeCat === 'all' || job.category === activeCat;
            
            return matchesSearch && matchesCat;
        });

        renderJobs(filtered);
    }

    // 6. Event Listeners Initialization
    searchBtn.addEventListener('click', filterJobs);
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') filterJobs();
    });

    catChips.forEach(chip => {
        chip.addEventListener('click', () => {
            catChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            filterJobs();
        });
    });

    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', closeModals);
    });

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target === applyModal) closeModals();
    });

    // 7. Auth State Header
    const authLink = document.getElementById('auth-nav-link');
    const regLink = document.getElementById('reg-nav-link');
    const user = JSON.parse(localStorage.getItem('user'));
    const postJobBtn = document.querySelector('.btn-post');

    function updateAuthHeader() {
        if (user) {
            authLink.innerHTML = `<i class="fas fa-user-circle"></i> Logout (${user.role})`;
            authLink.href = "#";
            authLink.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('user');
                window.location.reload();
            });

            if (regLink) regLink.style.display = 'none';

            // Hide post job button for admin on home page
            if (user.role === 'admin') {
                postJobBtn.style.display = 'none';
            } else {
                postJobBtn.textContent = 'My Profile';
            }
        } else {
            authLink.textContent = 'Login';
            authLink.href = 'login.html';
            if (regLink) regLink.style.display = 'block';
        }
    }

    updateAuthHeader();

    // Mobile Menu Toggle
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    
    mobileBtn.addEventListener('click', () => {
        navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
        if (navLinks.style.display === 'flex') {
            navLinks.style.flexDirection = 'column';
            navLinks.style.position = 'absolute';
            navLinks.style.top = '80px';
            navLinks.style.left = '0';
            navLinks.style.width = '100%';
            navLinks.style.background = 'white';
            navLinks.style.padding = '20px';
            navLinks.style.borderBottom = '1px solid #ddd';
        }
    });

    // Initial Load
    fetchJobs();
});
