document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.split("/").pop();

    // --- CORE & UTILS ---
    const AppState = {
        users: JSON.parse(localStorage.getItem('cyberUsers')) || [],
        session: JSON.parse(sessionStorage.getItem('cyberSession')) || JSON.parse(localStorage.getItem('cyberSession')),
        saveUsers: () => localStorage.setItem('cyberUsers', JSON.stringify(AppState.users)),
        theme: localStorage.getItem('theme') || 'dark',
    };

    // --- THEME LOGIC ---
    const applyTheme = () => {
        if (AppState.theme === 'light') {
            document.body.classList.add('light-theme');
            if (document.getElementById('theme-toggle')) document.getElementById('theme-toggle').checked = true;
        } else {
            document.body.classList.remove('light-theme');
            if (document.getElementById('theme-toggle')) document.getElementById('theme-toggle').checked = false;
        }
    };
    applyTheme();

    if (document.getElementById('theme-toggle')) {
        document.getElementById('theme-toggle').addEventListener('change', (e) => {
            AppState.theme = e.target.checked ? 'light' : 'dark';
            localStorage.setItem('theme', AppState.theme);
            applyTheme();
        });
    }

    // --- AUTH PAGE (index.html) ---
    if (currentPage === 'index.html' || currentPage === '') {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const showRegisterLink = document.getElementById('show-register');
        const showLoginLink = document.getElementById('show-login');
        const loginWrapper = document.getElementById('login-form');
        const registerWrapper = document.getElementById('register-form');
        
        // Redirect if already logged in
        if (AppState.session) {
            window.location.href = 'dashboard.html';
            return;
        }

        // Form switching
        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginWrapper.style.display = 'none';
            registerWrapper.style.display = 'block';
        });
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            registerWrapper.style.display = 'none';
            loginWrapper.style.display = 'block';
        });

        // Password visibility toggles
        const setupPasswordToggle = (inputId, toggleId) => {
            const passwordInput = document.getElementById(inputId);
            const toggle = document.getElementById(toggleId);
            toggle.addEventListener('click', () => {
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    toggle.classList.remove('bi-eye-slash');
                    toggle.classList.add('bi-eye');
                } else {
                    passwordInput.type = 'password';
                    toggle.classList.remove('bi-eye');
                    toggle.classList.add('bi-eye-slash');
                }
            });
        };
        setupPasswordToggle('loginPassword', 'toggleLoginPassword');
        setupPasswordToggle('registerPassword', 'toggleRegisterPassword');


        // --- REGISTRATION LOGIC ---
        if (registerForm) {
            const passwordInput = document.getElementById('registerPassword');
            const strengthBar = document.getElementById('strength-bar');
            const strengthText = document.getElementById('strength-text');

            passwordInput.addEventListener('input', () => {
                const password = passwordInput.value;
                let score = 0;
                if (password.length >= 8) score++;
                if (/[A-Z]/.test(password)) score++;
                if (/[a-z]/.test(password)) score++;
                if (/[0-9]/.test(password)) score++;
                if (/[^A-Za-z0-9]/.test(password)) score++;

                strengthBar.style.width = `${score * 20}%`;
                switch (score) {
                    case 0:
                    case 1:
                        strengthBar.style.backgroundColor = '#ff4757';
                        strengthText.textContent = 'Weak';
                        break;
                    case 2:
                        strengthBar.style.backgroundColor = '#ffa502';
                        strengthText.textContent = 'Fair';
                        break;
                    case 3:
                        strengthBar.style.backgroundColor = '#eccc68';
                        strengthText.textContent = 'Good';
                        break;
                    case 4:
                    case 5:
                        strengthBar.style.backgroundColor = '#2ed573';
                        strengthText.textContent = 'Strong';
                        break;
                }
            });

            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const username = document.getElementById('registerUsername').value;
                const email = document.getElementById('registerEmail').value;
                const password = passwordInput.value;
                const errorEl = document.getElementById('register-error');

                if (AppState.users.find(user => user.email === email)) {
                    errorEl.textContent = 'User with this email already exists.';
                    return;
                }
                // NOTE: In a real app, hash the password on the backend!
                AppState.users.push({ username, email, password, registeredAt: new Date().toISOString() });
                AppState.saveUsers();
                alert('Registration successful! Please log in.');
                showLoginLink.click();
                registerForm.reset();
            });
        }

        // --- LOGIN LOGIC ---
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const email = document.getElementById('loginEmail').value;
                const password = document.getElementById('loginPassword').value;
                const rememberMe = document.getElementById('rememberMe').checked;
                const errorEl = document.getElementById('login-error');
                const loader = document.getElementById('login-loader');

                loader.style.display = 'block';
                errorEl.textContent = '';

                setTimeout(() => { // Simulate network delay
                    const user = AppState.users.find(u => u.email === email && u.password === password);
                    loader.style.display = 'none';

                    if (user) {
                        const sessionData = {
                            email: user.email,
                            username: user.username,
                            loginTime: new Date().toISOString()
                        };
                        const storage = rememberMe ? localStorage : sessionStorage;
                        storage.setItem('cyberSession', JSON.stringify(sessionData));
                        window.location.href = 'dashboard.html';
                    } else {
                        errorEl.textContent = 'Invalid email or password.';
                    }
                }, 1500);
            });
        }
    }


    // --- DASHBOARD PAGE (dashboard.html) ---
    if (currentPage === 'dashboard.html') {
        // Auth Guard
        if (!AppState.session) {
            window.location.href = 'index.html';
            return;
        }

        // Display username
        document.getElementById('username-display').textContent = AppState.session.username;

        // Logout
        document.getElementById('logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('cyberSession');
            sessionStorage.removeItem('cyberSession');
            window.location.href = 'index.html';
        });

        // --- SESSION TIMEOUT LOGIC ---
        let sessionTimeout, warningTimeout;
        const TIMEOUT_DURATION = 15 * 60 * 1000; // 15 minutes
        const WARNING_DURATION = 60 * 1000; // 1 minute
        const modal = document.getElementById('session-timeout-modal');
        const countdownEl = document.getElementById('timeout-countdown');

        const logout = () => {
            document.getElementById('logout-btn').click();
        };

        const showWarning = () => {
            modal.style.display = 'flex';
            let countdown = WARNING_DURATION / 1000;
            countdownEl.textContent = countdown;
            const interval = setInterval(() => {
                countdown--;
                countdownEl.textContent = countdown;
                if (countdown <= 0) clearInterval(interval);
            }, 1000);
        };

        const resetTimers = () => {
            clearTimeout(warningTimeout);
            clearTimeout(sessionTimeout);
            modal.style.display = 'none';
            warningTimeout = setTimeout(showWarning, TIMEOUT_DURATION - WARNING_DURATION);
            sessionTimeout = setTimeout(logout, TIMEOUT_DURATION);
        };
        
        document.getElementById('stay-logged-in-btn').addEventListener('click', resetTimers);
        ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, resetTimers);
        });
        resetTimers(); // Initial start


        // --- CHART.JS & DATA VIZ ---
        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: AppState.theme === 'light' ? '#333' : '#e0e0e0' } } },
            scales: {
                x: { ticks: { color: AppState.theme === 'light' ? '#666' : '#999' }, grid: { color: 'rgba(128,128,128,0.2)' } },
                y: { ticks: { color: AppState.theme === 'light' ? '#666' : '#999' }, grid: { color: 'rgba(128,128,128,0.2)' } }
            }
        };

        // Mock Data
        const generateMockData = (count, min, max) => Array.from({ length: count }, () => Math.floor(Math.random() * (max - min + 1)) + min);

        // 1. Login Timestamps Chart
        new Chart('login-timestamps-chart', {
            type: 'line',
            data: {
                labels: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
                datasets: [{
                    label: 'Logins per Hour',
                    data: generateMockData(8, 0, 50),
                    borderColor: '#00ffff',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(0, 255, 255, 0.1)'
                }]
            },
            options: chartOptions
        });

        // 2. Session Durations Chart
        new Chart('session-durations-chart', {
            type: 'bar',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Avg. Duration',
                    data: generateMockData(7, 5, 60),
                    backgroundColor: '#ff00ff',
                    borderRadius: 4
                }]
            },
            options: chartOptions
        });
        
        // 3. Device/Browser Usage Chart
        const getBrowser = () => {
            const ua = navigator.userAgent;
            if (ua.indexOf("Firefox") > -1) return "Firefox";
            if (ua.indexOf("Chrome") > -1) return "Chrome";
            if (ua.indexOf("Safari") > -1) return "Safari";
            if (ua.indexOf("Opera") > -1 || ua.indexOf("OPR") > -1) return "Opera";
            if (ua.indexOf("Edge") > -1) return "Edge";
            return "Other";
        }
        
        new Chart('device-usage-chart', {
            type: 'doughnut',
            data: {
                labels: ['Chrome', 'Firefox', 'Safari', 'Edge', 'Other'],
                datasets: [{
                    label: 'Browser Usage',
                    data: [60, 15, 10, 10, 5], // Mock data, but could be dynamic
                    backgroundColor: ['#00ffff', '#ff00ff', '#2ed573', '#eccc68', '#ff4757'],
                    borderColor: 'var(--bg-color)',
                }]
            },
            options: { ...chartOptions, scales: {} }
        });

        // --- BONUS FEATURES ---
        // 4. Security Score
        const securityScore = 85; // Mock score
        const gaugeValue = document.getElementById('security-score-gauge-value');
        const gaugePathLength = gaugeValue.getTotalLength();
        gaugeValue.style.strokeDasharray = gaugePathLength;
        gaugeValue.style.strokeDashoffset = gaugePathLength * (1 - securityScore / 100);
        document.getElementById('security-score-text').textContent = `${securityScore}%`;
        
        // 5. Export to CSV
        document.getElementById('export-csv-btn').addEventListener('click', () => {
            const data = [
                { timestamp: '2025-07-22T10:00:00Z', user: 'admin', ip: '192.168.1.1', status: 'Success' },
                { timestamp: '2025-07-22T09:30:00Z', user: 'guest', ip: '10.0.0.5', status: 'Failed' },
                { timestamp: '2025-07-21T18:45:10Z', user: 'admin', ip: '192.168.1.1', status: 'Success' },
            ];
            const csvRows = [];
            const headers = Object.keys(data[0]);
            csvRows.push(headers.join(','));

            for (const row of data) {
                const values = headers.map(header => row[header]);
                csvRows.push(values.join(','));
            }
            const csvString = csvRows.join('\n');
            const blob = new Blob([csvString], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.setAttribute('hidden', '');
            a.setAttribute('href', url);
            a.setAttribute('download', 'login_activity.csv');
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });
    }
});