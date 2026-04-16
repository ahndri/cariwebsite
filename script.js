document.addEventListener('DOMContentLoaded', () => {
    const urlInput = document.getElementById('url-input');
    const scanBtn = document.getElementById('scan-btn');
    const resetBtn = document.getElementById('reset-btn');
    const errorMsg = document.getElementById('error-msg');
    
    const resultSection = document.getElementById('result-section');
    const featuresSection = document.getElementById('features-section');
    const scanningAnimation = document.getElementById('scanning-animation');
    const resultContent = document.getElementById('result-content');
    
    // UI Elements for Scanning
    const btnText = document.querySelector('.btn-text');
    const btnLoader = document.querySelector('.btn-loader');
    const scanStepText = document.getElementById('scan-step-text');
    const progressFill = document.getElementById('progress-fill');
    
    // UI Elements for Result
    const scoreMeter = document.getElementById('score-meter');
    const scoreValue = document.getElementById('score-value');
    const statusBadge = document.getElementById('status-badge');
    const statusText = document.getElementById('status-text');
    const targetDomain = document.getElementById('target-domain');
    
    const tldFactor = document.getElementById('tld-factor');
    const keywordFactor = document.getElementById('keyword-factor');
    const formatFactor = document.getElementById('format-factor');

    // Heuristic Rules
    const SUSPICIOUS_TLDS = ['.xyz', '.tk', '.pw', '.ml', '.ga', '.cf', '.gq', '.top', '.site', '.club', '.online', '.vip'];
    const SUSPICIOUS_KEYWORDS = ['login', 'secure', 'verify', 'update', 'account', 'banking', 'support', 'service', 'free', 'auth', 'signin', 'wallet', 'bonus'];
    
    scanBtn.addEventListener('click', handleScan);
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleScan();
    });
    
    resetBtn.addEventListener('click', () => {
        resultSection.classList.add('hidden');
        featuresSection.classList.remove('hidden');
        urlInput.value = '';
        urlInput.focus();
    });

    function isValidInput(input) {
        return input.trim().length > 3 && input.includes('.');
    }

    function extractDomain(input) {
        let domain = input.trim().toLowerCase();
        // Remove http:// or https://
        if (domain.indexOf('://') > -1) {
            domain = domain.split('/')[2];
        } else {
            domain = domain.split('/')[0];
        }
        // Remove port number
        domain = domain.split(':')[0];
        return domain;
    }

    function isIPAddress(domain) {
        const ipv4Regex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
        return ipv4Regex.test(domain);
    }

    async function handleScan() {
        const rawInput = urlInput.value;
        if (!isValidInput(rawInput)) {
            errorMsg.classList.add('show');
            setTimeout(() => errorMsg.classList.remove('show'), 3000);
            return;
        }

        const domain = extractDomain(rawInput);
        
        // Reset UI State for scanning
        errorMsg.classList.remove('show');
        featuresSection.classList.add('hidden');
        resultSection.classList.remove('hidden');
        scanningAnimation.classList.remove('hidden');
        resultContent.classList.add('hidden');
        resetBtn.classList.add('hidden');
        
        btnText.classList.add('hidden');
        btnLoader.classList.remove('hidden');
        scanBtn.disabled = true;

        // Start simulation steps
        await simulateScanningProcess();
        
        // Run analysis
        const analysis = performHeuristicAnalysis(domain);
        
        // Display results
        displayResults(domain, analysis);
        
        // Reset button state
        btnText.classList.remove('hidden');
        btnLoader.classList.add('hidden');
        scanBtn.disabled = false;
        
        scanningAnimation.classList.add('hidden');
        resultContent.classList.remove('hidden');
        resetBtn.classList.remove('hidden');
    }

    function performHeuristicAnalysis(domain) {
        let score = 0; // 0 = Safe, 100 = Highly Dangerous
        let tldDesc = 'TLD Normal.';
        let keywordDesc = 'Tidak ada kata kunci mencurigakan.';
        let formatDesc = 'Struktur URL standar.';
        
        // 1. Check IP Address
        if (isIPAddress(domain)) {
            score += 80;
            formatDesc = 'Peringatan: Menggunakan IP Address, indikasi kuat phishing/malware.';
        } else {
            // 2. Check TLD
            const parts = domain.split('.');
            const tld = '.' + parts[parts.length - 1];
            
            if (SUSPICIOUS_TLDS.includes(tld)) {
                score += 40;
                tldDesc = `Domain menggunakan ekstensi gratis/murah (${tld}) yang sering disalahgunakan.`;
            } else {
                tldDesc = `Ekstensi domain (${tld}) tergolong umum dan relatif aman.`;
            }

            // 3. Check Keywords
            let foundKeywords = [];
            SUSPICIOUS_KEYWORDS.forEach(kw => {
                if (domain.includes(kw)) foundKeywords.push(kw);
            });
            
            if (foundKeywords.length > 0) {
                score += (30 * foundKeywords.length);
                keywordDesc = `Terdeteksi kata manipulatif: "${foundKeywords.join(', ')}".`;
            }

            // 4. Check Format & Length (hyphens, subdomains)
            const hyphens = (domain.match(/-/g) || []).length;
            if (hyphens > 2) {
                score += 20;
                formatDesc = `Terlalu banyak tanda hubung (${hyphens}), sering dipakai untuk menipu struktur domain asli.`;
            }
            if (parts.length > 4) {
                score += 20;
                formatDesc = `Terlalu banyak subdomain. Taktik umum phishing.`;
            }
            if (domain.length > 30) {
                score += 10;
            }
        }

        // Cap score at 100
        score = Math.min(score, 100);
        
        return {
            score,
            tldDesc,
            keywordDesc,
            formatDesc
        };
    }

    function displayResults(domain, analysis) {
        targetDomain.textContent = domain;
        
        // Animate Score Counter
        let currentScore = 0;
        const duration = 1500; // ms
        const steps = 60;
        const scoreIncrement = analysis.score / steps;
        const timeIncrement = duration / steps;
        
        const counterInterval = setInterval(() => {
            currentScore += scoreIncrement;
            if (currentScore >= analysis.score) {
                currentScore = analysis.score;
                clearInterval(counterInterval);
            }
            scoreValue.textContent = Math.round(currentScore);
        }, timeIncrement);

        // Responsive Stroke Dash Array handling based on window width
        const isMobile = window.innerWidth <= 640;
        const radius = isMobile ? 35 : 45;
        const circumference = 2 * Math.PI * radius;
        
        // Update SVG circle styling if mobile
        if(isMobile) {
            document.querySelector('.score-circle .bg').setAttribute('r', '35');
            scoreMeter.setAttribute('r', '35');
            scoreMeter.style.strokeDasharray = circumference;
        }

        // Calculate offset (0% = full circumference, 100% = 0 offset)
        const offset = circumference - (analysis.score / 100) * circumference;
        
        // Delay drawing the circle slightly for visual effect
        setTimeout(() => {
            scoreMeter.style.strokeDashoffset = offset;
        }, 100);

        // Set Status Colors and Labels
        statusBadge.className = 'status-badge'; // Reset
        let strokeColor = '';
        
        if (analysis.score < 30) {
            statusBadge.classList.add('status-safe');
            statusText.textContent = 'Risiko Rendah / Aman';
            strokeColor = 'var(--status-safe)';
        } else if (analysis.score < 70) {
            statusBadge.classList.add('status-warn');
            statusText.textContent = 'Mencurigakan (Waspada)';
            strokeColor = 'var(--status-warn)';
        } else {
            statusBadge.classList.add('status-danger');
            statusText.textContent = 'Sangat Berbahaya (Phishing!)';
            strokeColor = 'var(--status-danger)';
        }
        
        scoreMeter.style.stroke = strokeColor;
        document.querySelector('.score-text').style.color = strokeColor;

        // Set Details
        tldFactor.querySelector('.info-desc').textContent = analysis.tldDesc;
        keywordFactor.querySelector('.info-desc').textContent = analysis.keywordDesc;
        formatFactor.querySelector('.info-desc').textContent = analysis.formatDesc;
        
        // Color code detail boxes if risk is found
        [tldFactor, keywordFactor, formatFactor].forEach(factor => {
            factor.style.borderLeft = '3px solid transparent';
            const text = factor.querySelector('.info-desc').textContent;
            if (text.includes('Berbahaya') || text.includes('gratis') || text.includes('manipulatif') || text.includes('Terlalu')) {
                factor.style.borderLeftColor = 'var(--status-warn)';
                if(text.includes('IP Address')) factor.style.borderLeftColor = 'var(--status-danger)';
            } else {
                factor.style.borderLeftColor = 'var(--status-safe)';
            }
        });
    }

    // Simulate scanning process with promises
    function simulateScanningProcess() {
        return new Promise(resolve => {
            progressFill.style.width = '0%';
            
            const steps = [
                { text: "Mengekstrak host dan koneksi...", progress: 20, delay: 600 },
                { text: "Menganalisis TLD (Top Level Domain)...", progress: 45, delay: 800 },
                { text: "Memindai kata manipulatif (Spoofing)...", progress: 75, delay: 1000 },
                { text: "Mengkalkulasi skor probabilitas...", progress: 100, delay: 600 }
            ];
            
            let totalDelay = 0;
            
            steps.forEach((step, index) => {
                setTimeout(() => {
                    scanStepText.textContent = step.text;
                    progressFill.style.width = `${step.progress}%`;
                    
                    if (index === steps.length - 1) {
                        setTimeout(resolve, step.delay); // Resolve after the last step's delay
                    }
                }, totalDelay);
                totalDelay += step.delay;
            });
        });
    }
});
