document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const domainInput = document.getElementById('domain-input');
    const limitSlider = document.getElementById('limit-slider');
    const limitVal = document.getElementById('limit-val');
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const resetBtn = document.getElementById('reset-btn');
    const errorMsg = document.getElementById('error-msg');
    
    const configSection = document.getElementById('config-section');
    const statusPanel = document.getElementById('status-panel');
    const resultsPanel = document.getElementById('results-panel');
    const resultBody = document.getElementById('result-body');
    const currentTargetText = document.getElementById('current-target');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    const activeFoundText = document.getElementById('active-found');
    
    // Checkboxes
    const ruleTld = document.getElementById('rule-tld');
    const ruleTypo = document.getElementById('rule-typo');
    const ruleKeyword = document.getElementById('rule-keyword');

    // Global state
    let isScanning = false;
    let scanQueue = [];
    let completedCount = 0;
    let activeCount = 0;
    const CONCURRENCY_LIMIT = 5; // Max concurrent DoH requests

    // --- Utility Functions --- //
    limitSlider.addEventListener('input', (e) => {
        limitVal.textContent = e.target.value;
    });

    function isValidDomain(domain) {
        return domain && domain.includes('.') && domain.length > 3;
    }

    function extractNameAndTld(url) {
        let domain = url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
        const parts = domain.split('.');
        const name = parts[0];
        const tld = '.' + parts.slice(1).join('.');
        return { name, tld, full: domain };
    }

    // --- Permutation Generators --- //
    const COMMON_TLDS = ['.com', '.net', '.org', '.info', '.xyz', '.top', '.online', '.site', '.tk', '.pw', '.club', '.vip', '.co.id', '.id'];
    const PREFIXES = ['login-', 'secure-', 'update-', 'verify-', 'auth-', 'account-', 'my-', 'portal-'];
    const SUFFIXES = ['-login', '-secure', '-update', '-verify', '-support'];
    const VOWELS = ['a', 'e', 'i', 'o', 'u'];

    function generatePermutations(baseName, baseTld, options) {
        let results = new Set();
        
        // 1. TLD Swap
        if (options.tld) {
            COMMON_TLDS.forEach(tld => {
                if (tld !== baseTld) {
                    results.add({ domain: baseName + tld, type: 'TLD Swap' });
                }
            });
        }
        
        // 2. Typosquatting
        if (options.typo) {
            // Character Omission
            for (let i = 0; i < baseName.length; i++) {
                const omitted = baseName.slice(0, i) + baseName.slice(i + 1);
                if (omitted.length > 0) results.add({ domain: omitted + baseTld, type: 'Penghilangan Huruf' });
            }
            // Character Duplication
            for (let i = 0; i < baseName.length; i++) {
                const duplicated = baseName.slice(0, i) + baseName[i] + baseName.slice(i);
                results.add({ domain: duplicated + baseTld, type: 'Huruf Ganda' });
            }
            // Vowel Swap
            for (let i = 0; i < baseName.length; i++) {
                if (VOWELS.includes(baseName[i].toLowerCase())) {
                    VOWELS.forEach(v => {
                        if (v !== baseName[i].toLowerCase()) {
                            const swapped = baseName.slice(0, i) + v + baseName.slice(i + 1);
                            results.add({ domain: swapped + baseTld, type: 'Pelesetan Vokal' });
                        }
                    });
                }
            }
        }

        // 3. Keyword Insertions
        if (options.keyword) {
            PREFIXES.forEach(pref => {
                results.add({ domain: pref + baseName + baseTld, type: 'Penambahan Prefix' });
            });
            SUFFIXES.forEach(suff => {
                results.add({ domain: baseName + suff + baseTld, type: 'Penambahan Suffix' });
            });
        }

        return Array.from(results);
    }

    // --- Main Logic --- //
    startBtn.addEventListener('click', startScan);
    stopBtn.addEventListener('click', stopScan);
    resetBtn.addEventListener('click', resetApp);

    function resetApp() {
        configSection.classList.remove('hidden');
        statusPanel.classList.add('hidden');
        resultsPanel.classList.add('hidden');
        resultBody.innerHTML = '';
        domainInput.focus();
    }

    function stopScan() {
        isScanning = false;
        document.querySelector('.radar-mini').style.animationPlayState = 'paused';
        currentTargetText.textContent = "Dihentikan";
    }

    async function startScan() {
        const rawInput = domainInput.value.trim().toLowerCase();
        if (!isValidDomain(rawInput)) {
            errorMsg.classList.add('show');
            setTimeout(() => errorMsg.classList.remove('show'), 3000);
            return;
        }

        const maxLimit = parseInt(limitSlider.value);
        const { name, tld, full } = extractNameAndTld(rawInput);
        
        let targetList = generatePermutations(name, tld, {
            tld: ruleTld.checked,
            typo: ruleTypo.checked,
            keyword: ruleKeyword.checked
        });
        
        // Exclude the original domain if it was accidentally generated
        targetList = targetList.filter(item => item.domain !== full);
        
        // Shuffle and limit
        targetList.sort(() => Math.random() - 0.5);
        if (targetList.length > maxLimit) {
            targetList = targetList.slice(0, maxLimit);
        }

        if (targetList.length === 0) {
            alert('Tidak ada variasi yang dapat di-generate dengan parameter yang dipilih.');
            return;
        }

        // Prepare UI
        isScanning = true;
        scanQueue = [...targetList];
        completedCount = 0;
        activeCount = 0;
        
        configSection.classList.add('hidden');
        statusPanel.classList.remove('hidden');
        resultsPanel.classList.remove('hidden');
        resultBody.innerHTML = '';
        document.querySelector('.radar-mini').style.animationPlayState = 'running';
        
        updateProgressUI(targetList.length);
        
        // Start Concurrency Pool
        const workers = [];
        for (let i = 0; i < CONCURRENCY_LIMIT; i++) {
            workers.push(processQueue(targetList.length));
        }
        
        await Promise.all(workers);
        
        if(isScanning) {
            currentTargetText.textContent = "Pemindaian Selesai";
            document.querySelector('.radar-mini').style.animationPlayState = 'paused';
            isScanning = false;
        }
    }

    async function processQueue(totalTargets) {
        while (isScanning && scanQueue.length > 0) {
            const item = scanQueue.shift();
            currentTargetText.textContent = item.domain;
            
            // Add initial row as 'Pending'
            const rowId = 'row-' + Math.random().toString(36).substr(2, 9);
            addRowToTable(rowId, completedCount + scanQueue.length + 1, item.domain, item.type);
            
            // Perform DNS Lookup
            const result = await checkDNS(item.domain);
            
            completedCount++;
            
            // Update Row and Progress Mode
            updateRow(rowId, item.domain, item.type, result);
            updateProgressUI(totalTargets);
            
            // Small delay to prevent complete browser freeze
            await new Promise(r => setTimeout(r, 50));
        }
    }

    // Ping Google DoH API
    async function checkDNS(domain) {
        try {
            const response = await fetch(`https://dns.google/resolve?name=${domain}&type=A`);
            const data = await response.json();
            
            // Google DoH Status 0 means NOERROR (Record Exists). Answer array contains IPs.
            if (data.Status === 0 && data.Answer && data.Answer.length > 0) {
                // Filter out CNAMEs, keep A records
                const ips = data.Answer.filter(ans => ans.type === 1).map(ans => ans.data);
                if (ips.length > 0) {
                    return { isActive: true, ip: ips[0] };
                }
            }
            return { isActive: false, ip: '-' };
        } catch (error) {
            // Failed to fetch or error
            return { isActive: false, ip: 'Error' };
        }
    }

    // --- UI Updaters --- //
    function updateProgressUI(total) {
        const percent = Math.round((completedCount / total) * 100);
        progressFill.style.width = `${percent}%`;
        progressText.textContent = `${completedCount} / ${total} Selesai`;
        activeFoundText.textContent = `${activeCount} Aktif`;
    }

    function addRowToTable(id, index, domain, type) {
        const tr = document.createElement('tr');
        tr.id = id;
        tr.innerHTML = `
            <td>${index}</td>
            <td class="highlight-text">${domain}</td>
            <td>${type}</td>
            <td class="col-ip">-</td>
            <td class="col-status"><span class="status-badge badge-pending">Mengecek...</span></td>
        `;
        resultBody.insertBefore(tr, resultBody.firstChild); // prepend
    }

    function updateRow(rowId, domain, type, result) {
        const tr = document.getElementById(rowId);
        if(!tr) return;
        
        tr.querySelector('.col-ip').textContent = result.ip;
        
        const statusCol = tr.querySelector('.col-status');
        if (result.isActive) {
            activeCount++;
            statusCol.innerHTML = `<span class="status-badge badge-danger">Aktif (Bahaya)</span>`;
            tr.classList.add('row-danger');
        } else {
            if(result.ip === 'Error') {
                statusCol.innerHTML = `<span class="status-badge badge-safe">Time out</span>`;
            } else {
                statusCol.innerHTML = `<span class="status-badge badge-safe">Belum Dibeli</span>`;
            }
        }
    }
});
