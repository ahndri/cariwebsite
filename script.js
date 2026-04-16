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
    const ruleRegion = document.getElementById('rule-region');

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
    // Daftar kota/daerah besar untuk target penipuan
    const REGIONS = ['jakarta', 'bandung', 'surabaya', 'bali', 'medan', 'makassar', 'semarang', 'jogja', 'yogyakarta', 'palembang', 'batam', 'malang', 'pekanbaru', 'pontianak', 'samarinda', 'tangerang', 'bekasi', 'depok', 'bogor'];

    // DATABASE DITJENIM 2026: Daftar URL Resmi Imigrasi
    const OFFICIAL_SITES = [
        "kanwilsumbar.imigrasi.go.id", "sibolga.imigrasi.go.id", "kualalumpur.imigrasi.go.id", "singapura.imigrasi.go.id", 
        "soekarnohatta.imigrasi.go.id", "palopo.imigrasi.go.id", "kotawaringinbarat.imigrasi.go.id", "rudenimmanado.imigrasi.go.id", 
        "morowali.imigrasi.go.id", "kulonprogo.imigrasi.go.id", "padangsidimpuan.imigrasi.go.id", "banggai.imigrasi.go.id", 
        "bagansiapiapi.imigrasi.go.id", "agam.imigrasi.go.id", "tanjunguban.imigrasi.go.id", "pontianak.imigrasi.go.id", 
        "kanwilbanten.imigrasi.go.id", "ternate.imigrasi.go.id", "kanwilpapuabarat.imigrasi.go.id", "sabang.imigrasi.go.id", 
        "sampit.imigrasi.go.id", "blora.imigrasi.go.id", "kupang.imigrasi.go.id", "manado.imigrasi.go.id", 
        "kanwiljabar.imigrasi.go.id", "jambi.imigrasi.go.id", "tarakan.imigrasi.go.id", "kanwilsulteng.imigrasi.go.id", 
        "tanjungpriok.imigrasi.go.id", "tanjungredeb.imigrasi.go.id", "kanwilkepri.imigrasi.go.id", "berlin.imigrasi.go.id", 
        "muaraenim.imigrasi.go.id", "surakarta.imigrasi.go.id", "ketapang.imigrasi.go.id", "pohuwato.imigrasi.go.id", 
        "mandailingnatal.imigrasi.go.id", "kanwilsultra.imigrasi.go.id", "biak.imigrasi.go.id", "tangerang.imigrasi.go.id", 
        "tanjungpandan.imigrasi.go.id", "klungkung.imigrasi.go.id", "ranai.imigrasi.go.id", "wonosobo.imigrasi.go.id", 
        "jakartaselatan.imigrasi.go.id", "sambas.imigrasi.go.id", "nunukan.imigrasi.go.id", "mimika.imigrasi.go.id", 
        "kanwilsumsel.imigrasi.go.id", "kanwilriau.imigrasi.go.id", "samarinda.imigrasi.go.id", "bangkok.imigrasi.go.id", 
        "mamuju.imigrasi.go.id", "rudenimpekanbaru.imigrasi.go.id", "jember.imigrasi.go.id", "manokwari.imigrasi.go.id", 
        "jayapura.imigrasi.go.id", "kanwilntt.imigrasi.go.id", "mempawah.imigrasi.go.id", "dili.imigrasi.go.id", 
        "kanwilsulut.imigrasi.go.id", "tapanuliutara.imigrasi.go.id", "tokyo.imigrasi.go.id", "kanwilkalteng.imigrasi.go.id", 
        "cilacap.imigrasi.go.id", "tanjungjbalaikarimun.imigrasi.go.id", "pematangsiantar.imigrasi.go.id", "tabanan.imigrasi.go.id", 
        "baubau.imigrasi.go.id", "banyuwangi.imigrasi.go.id", "lhokseumawe.imigrasi.go.id", "medan.imigrasi.go.id", 
        "tembilahan.imigrasi.go.id", "pasuruan.imigrasi.go.id", "purworejo.imigrasi.go.id", "pamekasan.imigrasi.go.id", 
        "cilegon.imigrasi.go.id", "bandarlampung.imigrasi.go.id", "sorong.imigrasi.go.id", "siak.imigrasi.go.id", 
        "makassar.imigrasi.go.id", "belakangpadang.imigrasi.go.id", "bengkulu.imigrasi.go.id", "tasikmalaya.imigrasi.go.id", 
        "pemalang.imigrasi.go.id", "guangzhou.imigrasi.go.id", "kalianda.imigrasi.go.id", "batam.imigrasi.go.id", 
        "rudenimpontianak.imigrasi.go.id", "rudenimbalikpapan.imigrasi.go.id", "tanjungbalaiasahan.imigrasi.go.id", "losangeles.imigrasi.go.id", 
        "bekasi.imigrasi.go.id", "jakartapusat.imigrasi.go.id", "kanwiljakarta.imigrasi.go.id", "rudenimdenpasar.imigrasi.go.id", 
        "bungo.imigrasi.go.id", "singaraja.imigrasi.go.id", "kanwilsulbar.imigrasi.go.id", "nias.imigrasi.go.id", 
        "penang.imigrasi.go.id", "tobelo.imigrasi.go.id", "atambua.imigrasi.go.id", "mataram.imigrasi.go.id", 
        "kanwilmaluku.imigrasi.go.id", "tegal.imigrasi.go.id", "kanwiljatim.imigrasi.go.id", "ambon.imigrasi.go.id", 
        "palembang.imigrasi.go.id", "batulicin.imigrasi.go.id", "cirebon.imigrasi.go.id", "kotabumi.imigrasi.go.id", 
        "labuanbajo.imigrasi.go.id", "bogor.imigrasi.go.id", "bandung.imigrasi.go.id", "lomboktimur.imigrasi.go.id", 
        "jakartatimur.imigrasi.go.id", "blitar.imigrasi.go.id", "kanwillampung.imigrasi.go.id", "yogyakarta.imigrasi.go.id", 
        "kanwilbali.imigrasi.go.id", "rudenimsurabaya.imigrasi.go.id", "kendari.imigrasi.go.id", "merauke.imigrasi.go.id", 
        "rudenimjayapura.imigrasi.go.id", "polonia.imigrasi.go.id", "hongkong.imigrasi.go.id", "kanwilbabel.imigrasi.go.id", 
        "tanjungpinang.imigrasi.go.id", "balikpapan.imigrasi.go.id", "kanwiljambi.imigrasi.go.id", "rudenimsemarang.imigrasi.go.id", 
        "kanwilbengkulu.imigrasi.go.id", "garut.imigrasi.go.id", "pati.imigrasi.go.id", "kanwiljateng.imigrasi.go.id", 
        "serang.imigrasi.go.id", "palangkaraya.imigrasi.go.id", "kanwilkalbar.imigrasi.go.id", "singkawang.imigrasi.go.id", 
        "denpasar.imigrasi.go.id", "polewalimandar.imigrasi.go.id", "kanwilntb.imigrasi.go.id", "rudenimmedan.imigrasi.go.id", 
        "taipei.imigrasi.go.id", "madiun.imigrasi.go.id", "bengkalis.imigrasi.go.id", "lubuklinggau.imigrasi.go.id", 
        "kediri.imigrasi.go.id", "kotamobagu.imigrasi.go.id", "tanjungperak.imigrasi.go.id", "palu.imigrasi.go.id", 
        "johorbahru.imigrasi.go.id", "parepare.imigrasi.go.id", "beijing.imigrasi.go.id", "takengon.imigrasi.go.id", 
        "banjarmasin.imigrasi.go.id", "langsa.imigrasi.go.id", "entikong.imigrasi.go.id", "bontang.imigrasi.go.id", 
        "dumai.imigrasi.go.id", "kanwilmalut.imigrasi.go.id", "kanwilsulsel.imigrasi.go.id", "tual.imigrasi.go.id", 
        "meulaboh.imigrasi.go.id", "tahuna.imigrasi.go.id", "putussibau.imigrasi.go.id", "rudenimmakassar.imigrasi.go.id", 
        "kanwilkalsel.imigrasi.go.id", "karawang.imigrasi.go.id", "bantaeng.imigrasi.go.id", "dabosingkep.imigrasi.go.id", 
        "gorontalo.imigrasi.go.id", "ponorogo.imigrasi.go.id", "surabaya.imigrasi.go.id", "sydney.imigrasi.go.id", 
        "jeddah.imigrasi.go.id", "bitung.imigrasi.go.id", "malang.imigrasi.go.id", "tarempa.imigrasi.go.id", 
        "rudenimtanjungpinang.imigrasi.go.id", "kanwilgorontalo.imigrasi.go.id", "bima.imigrasi.go.id", "padang.imigrasi.go.id", 
        "belawan.imigrasi.go.id", "sanggau.imigrasi.go.id", "jakartabarat.imigrasi.go.id", "kanwilpapua.imigrasi.go.id", 
        "rudenimkupang.imigrasi.go.id", "rudenimjakarta.imigrasi.go.id", "maumere.imigrasi.go.id", "bandaaceh.imigrasi.go.id", 
        "davao.imigrasi.go.id", "jakartautara.imigrasi.go.id", "denhaag.imigrasi.go.id", "tawau.imigrasi.go.id", 
        "kualatungkal.imigrasi.go.id", "pekanbaru.imigrasi.go.id", "kanwilkaltim.imigrasi.go.id", "sumbawabesar.imigrasi.go.id", 
        "bengkuluutara.imigrasi.go.id", "kanwilsumut.imigrasi.go.id", "bone.imigrasi.go.id", "semarang.imigrasi.go.id", 
        "ngurahrai.imigrasi.go.id", "cianjur.imigrasi.go.id", "kuching.imigrasi.go.id", "songkhla.imigrasi.go.id", 
        "kerinci.imigrasi.go.id", "pangkalpinang.imigrasi.go.id", "kanwilyogyakarta.imigrasi.go.id", "sukabumi.imigrasi.go.id", 
        "kinabalu.imigrasi.go.id", "selatpanjang.imigrasi.go.id", "imigrasi.go.id"
    ];

    function generatePermutations(baseName, baseTld, options) {
        let results = new Set();
        
        // Helper fungsi penambahan variasi
        const addToResults = (domain, type) => results.add({ domain, type });
        
        // 1. TLD Swap
        if (options.tld) {
            COMMON_TLDS.forEach(tld => {
                if (tld !== baseTld) {
                    addToResults(baseName + tld, 'TLD Swap');
                }
            });
        }
        
        // 2. Typosquatting
        if (options.typo) {
            // Character Omission
            for (let i = 0; i < baseName.length; i++) {
                const omitted = baseName.slice(0, i) + baseName.slice(i + 1);
                if (omitted.length > 0) addToResults(omitted + baseTld, 'Penghilangan Huruf');
            }
            // Character Duplication
            for (let i = 0; i < baseName.length; i++) {
                const duplicated = baseName.slice(0, i) + baseName[i] + baseName.slice(i);
                addToResults(duplicated + baseTld, 'Huruf Ganda');
            }
            // Vowel Swap
            for (let i = 0; i < baseName.length; i++) {
                if (VOWELS.includes(baseName[i].toLowerCase())) {
                    VOWELS.forEach(v => {
                        if (v !== baseName[i].toLowerCase()) {
                            const swapped = baseName.slice(0, i) + v + baseName.slice(i + 1);
                            addToResults(swapped + baseTld, 'Pelesetan Vokal');
                        }
                    });
                }
            }
        }

        // 3. Keyword Insertions
        if (options.keyword) {
            PREFIXES.forEach(pref => {
                addToResults(pref + baseName + baseTld, 'Penambahan Prefix');
            });
            SUFFIXES.forEach(suff => {
                addToResults(baseName + suff + baseTld, 'Penambahan Suffix');
            });
        }
        
        // 4. Target Nama Daerah (Regional Filtering)
        // Mengecualikan Subdomain resmi karena jika asli berbunyi jakarta.imigrasi.go.id,
        // yang dilacak adalah spoofing tld lain misal imigrasi-jakarta.com.
        if (options.region) {
            REGIONS.forEach(region => {
                let generatedTlds = options.tld ? COMMON_TLDS : [baseTld];
                
                generatedTlds.forEach(tld => {
                    // Kasus 1: Strip/Dash dengan wilayah
                    addToResults(baseName + '-' + region + tld, 'Spoofing Daerah (Dash)');
                    addToResults(region + '-' + baseName + tld, 'Spoofing Daerah (Dash)');
                    
                    // Kasus 2: Sambung Langsung
                    addToResults(baseName + region + tld, 'Spoofing Daerah (Sambung)');
                    addToResults(region + baseName + tld, 'Spoofing Daerah (Sambung)');
                    
                    // Ekstraksi untuk TLD pemerintah yang mencoba memakai identitas palsu (Sangat jarang, tapi jika ada akan diflag)
                    if (tld === '.go.id' || baseTld === '.go.id') {
                        // Jangan scan real subdomain seperti jakarta.imigrasi.go.id karena itu legal
                        // Jadi biarkan pola dash dan sambung saja di atas yg beresiko.
                    }
                });
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
            keyword: ruleKeyword.checked,
            region: ruleRegion.checked
        });
        
        // Exclude the original domain if it was accidentally generated
        targetList = targetList.filter(item => item.domain !== full);
        
        // Shuffle and limit
        targetList.sort(() => Math.random() - 0.5);
        if (targetList.length > maxLimit) {
            targetList = targetList.slice(0, maxLimit);
        }
        
        // Simpan referensi nama domain asli agar dikenali oleh sistem verifikasi
        targetList.__originalDomain = full;

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
            updateRow(rowId, item.domain, item.type, result, targetList.__originalDomain);
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

    function updateRow(rowId, domain, type, result, originalDomain = '') {
        const tr = document.getElementById(rowId);
        if(!tr) return;
        
        tr.querySelector('.col-ip').textContent = result.ip;
        
        const statusCol = tr.querySelector('.col-status');
        if (result.isActive) {
            activeCount++;
            
            // FUNGSI VERIFIKASI: Mengecek apakah terdaftar di OFFICIAL_SITES (Database Ditjenim)
            if (OFFICIAL_SITES.includes(domain)) {
                statusCol.innerHTML = `<span class="status-badge badge-safe" style="background: rgba(16, 185, 129, 0.2); color: #10B981; border: 1px solid #10B981;">Resmi DITJENIM (Aman)</span>`;
                tr.style.borderLeft = '3px solid #10B981';
            } else if (domain.endsWith('.go.id')) {
                // Instansi pemerintah lain selain Ditjenim (Pasti Aman)
                statusCol.innerHTML = `<span class="status-badge badge-safe" style="background: rgba(16, 185, 129, 0.2); color: #10B981;">Instansi Lain .go.id (Aman)</span>`;
                tr.style.borderLeft = '3px solid #10B981';
            } else {
                // Untuk non-pemerintah / go.id, maka itu Bahaya
                statusCol.innerHTML = `<span class="status-badge badge-danger">Aktif (Bahaya)</span>`;
                tr.classList.add('row-danger');
            }
        } else {
            if(result.ip === 'Error') {
                statusCol.innerHTML = `<span class="status-badge badge-safe">Time out</span>`;
            } else {
                statusCol.innerHTML = `<span class="status-badge badge-safe">Belum Dibeli</span>`;
            }
        }
    }
});
