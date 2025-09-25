/**
 * TINDAHAN KO - JavaScript Application
 * Para sa mga Reyna ng Tahanan 👑
 * Complete POS + Inventory System
 */

class TindahanKo {
    constructor() {
        this.currentPage = 'benta';
        this.cart = [];
        this.products = [];
        this.sales = [];
        this.storeInfo = {};
        this.isFirstTime = true;
        
        // Scanner properties
        this.scannerActive = false;
        this.audioEnabled = true;
        this.scanCount = 0;
        this.fpsCounter = 0;
        this.lastScanTime = 0;
        this.scanCache = new Map();
        this.audioContext = null;
        this.scanMode = 'pos'; // 'pos' or 'inventory'
        this.cameraStream = null;
        this.cameraPermissionGranted = false;
        this.cameraInitialized = false;
        
        // PWA Install
        this.deferredPrompt = null;
        
        this.init();
    }

    // Initialize the application
    init() {
        this.loadData();
        this.setupEventListeners();
        this.setupPWAInstall();
        this.showLandingPage();
        this.loadSampleData();
        this.initCameraOnFirstInteraction();
    }
    
    // Check camera permission status
    async checkCameraPermission() {
        try {
            const result = await navigator.permissions.query({ name: 'camera' });
            return result.state === 'granted';
        } catch (error) {
            return false;
        }
    }
    
    // Initialize camera with persistent stream
    async initPersistentCamera() {
        if (this.cameraInitialized) return true;
        
        try {
            const hasPermission = await this.checkCameraPermission();
            
            const constraints = {
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1920, min: 640 },
                    height: { ideal: 1080, min: 480 },
                    frameRate: { ideal: 30, min: 15 }
                }
            };
            
            this.cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
            this.cameraPermissionGranted = true;
            this.cameraInitialized = true;
            
            // Keep stream alive by creating hidden video element
            if (!document.getElementById('hidden-video')) {
                const hiddenVideo = document.createElement('video');
                hiddenVideo.id = 'hidden-video';
                hiddenVideo.style.display = 'none';
                hiddenVideo.muted = true;
                hiddenVideo.autoplay = true;
                hiddenVideo.playsInline = true;
                document.body.appendChild(hiddenVideo);
                hiddenVideo.srcObject = this.cameraStream;
            }
            
            console.log('Camera initialized and stream persisted');
            return true;
            
        } catch (error) {
            console.error('Camera initialization failed:', error);
            this.cameraPermissionGranted = false;
            return false;
        }
    }
    
    // Initialize camera on first user interaction
    initCameraOnFirstInteraction() {
        const initCamera = async () => {
            await this.initPersistentCamera();
        };
        
        document.addEventListener('click', initCamera, { once: true });
        document.addEventListener('touchstart', initCamera, { once: true });
    }

    // Data Management
    loadData() {
        try {
            this.products = JSON.parse(localStorage.getItem('tindahan_products') || '[]');
            this.sales = JSON.parse(localStorage.getItem('tindahan_sales') || '[]');
            this.storeInfo = JSON.parse(localStorage.getItem('tindahan_store') || '{}');
            this.isFirstTime = !localStorage.getItem('tindahan_setup_complete');
            this.currentTheme = localStorage.getItem('tindahan_theme') || 'pink';
        } catch (error) {
            console.error('Error loading data from localStorage:', error);
            this.showToast('May problema sa pag-load ng data. Subukang i-refresh ang page.', 'error');
        }
    }

    saveData() {
        try {
            localStorage.setItem('tindahan_products', JSON.stringify(this.products));
            localStorage.setItem('tindahan_sales', JSON.stringify(this.sales));
            localStorage.setItem('tindahan_store', JSON.stringify(this.storeInfo));
            localStorage.setItem('tindahan_theme', this.currentTheme);
        } catch (error) {
            console.error('Error saving data to localStorage:', error);
            this.showToast('May problema sa pag-save ng data. Baka puno na ang storage.', 'error');
        }
    }

    // Load sample data for demo
    loadSampleData() {
        if (this.products.length === 0) {
            this.products = [
                {
                    id: 'p1',
                    name: 'Skyflakes Crackers',
                    price: 15.00,
                    stock: 50,
                    category: 'snacks',
                    hasBarcode: true,
                    barcode: '4800016644931',
                    emoji: '🍪',
                    reorderLevel: 10
                },
                {
                    id: 'p2',
                    name: 'Coca Cola 355ml',
                    price: 25.00,
                    stock: 30,
                    category: 'drinks',
                    hasBarcode: true,
                    barcode: '4902430735063',
                    emoji: '🥤',
                    reorderLevel: 5
                },
                {
                    id: 'p3',
                    name: 'Lucky Me Pancit Canton',
                    price: 12.50,
                    stock: 75,
                    category: 'snacks',
                    hasBarcode: true,
                    barcode: '4800016001000',
                    emoji: '🍜',
                    reorderLevel: 15
                },
                {
                    id: 'p4',
                    name: 'Tide Detergent Powder',
                    price: 8.00,
                    stock: 20,
                    category: 'household',
                    hasBarcode: false,
                    barcode: '',
                    emoji: '🧽',
                    reorderLevel: 8
                },
                {
                    id: 'p5',
                    name: 'Colgate Toothpaste',
                    price: 45.00,
                    stock: 15,
                    category: 'personal',
                    hasBarcode: true,
                    barcode: '8850006330012',
                    emoji: '🦷',
                    reorderLevel: 5
                }
            ];
            this.saveData();
        }
    }

    // First Time Setup
    checkFirstTimeSetup() {
        if (this.isFirstTime) {
            document.getElementById('setup-modal').classList.remove('hidden');
        } else {
            this.showApp();
        }
    }

    setupEventListeners() {
        // Setup form
        document.getElementById('setup-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.completeSetup();
        });

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const page = e.currentTarget.dataset.page;
                this.switchPage(page);
            });
        });

        // POS Events
        this.setupPOSEvents();
        
        // Inventory Events
        this.setupInventoryEvents();
        
        // Reports Events
        this.setupReportsEvents();
        
        // Settings Events
        this.setupSettingsEvents();
        
        // Modal Events
        this.setupModalEvents();
    }

    completeSetup() {
        const storeName = document.getElementById('store-name').value;
        const ownerName = document.getElementById('owner-name').value;
        const storeAddress = document.getElementById('store-address').value;

        this.storeInfo = {
            name: storeName,
            owner: ownerName,
            address: storeAddress,
            setupDate: new Date().toISOString()
        };

        localStorage.setItem('tindahan_setup_complete', 'true');
        this.saveData();
        
        document.getElementById('setup-modal').classList.add('hidden');
        this.showApp();
        this.updateStoreDisplay();
        this.showToast('Setup complete! Maligayang pagdating! 🎉', 'success');
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }

    showApp() {
        document.getElementById('app').classList.remove('hidden');
        this.updateStoreDisplay();
        this.applyTheme(this.currentTheme);
        this.switchPage('benta');
        this.updateInventoryStats();
        
        // Initialize camera early for seamless scanning
        setTimeout(() => {
            this.initPersistentCamera();
        }, 1000);
    }

    updateStoreDisplay() {
        const displayName = document.getElementById('store-display-name');
        if (displayName && this.storeInfo.name) {
            displayName.textContent = this.storeInfo.name;
        }
    }

    // Page Navigation
    switchPage(pageName) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-page="${pageName}"]`).classList.add('active');

        // Update pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        document.getElementById(`${pageName}-page`).classList.add('active');

        this.currentPage = pageName;

        // Load page-specific data
        switch (pageName) {
            case 'benta':
                this.updateCart();
                break;
            case 'tindahan':
                this.renderInventory();
                this.updateInventoryStats();
                break;
            case 'ulat':
                this.renderReports();
                break;
            case 'ayos':
                this.loadSettings();
                break;
        }
    }

    // POS (Benta) Functions
    setupPOSEvents() {
        // Product search
        document.getElementById('product-search').addEventListener('input', (e) => {
            this.filterProducts(e.target.value);
        });
        
        // Hide dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-wrapper')) {
                document.getElementById('search-dropdown').classList.add('hidden');
            }
        });

        // Category filters
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.filterProductsByCategory(e.target.dataset.category);
            });
        });

        // Cart actions
        document.getElementById('clear-cart').addEventListener('click', () => {
            this.clearCart();
        });

        document.getElementById('process-payment').addEventListener('click', () => {
            this.openPaymentModal();
        });

        // Barcode scan simulation
        document.getElementById('barcode-scan').addEventListener('click', () => {
            this.scanMode = 'pos';
            this.simulateBarcodeScanning();
        });
    }

    renderProducts(filteredProducts = null) {
        // No product grid in new layout - products are added via search/scan only
        return;
    }

    filterProducts(searchTerm) {
        const dropdown = document.getElementById('search-dropdown');
        
        if (!searchTerm.trim()) {
            dropdown.classList.add('hidden');
            return;
        }
        
        const filtered = this.products.filter(product =>
            product.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        if (filtered.length === 0) {
            dropdown.innerHTML = '<div class="search-item">Walang nahanap na produkto</div>';
            dropdown.classList.remove('hidden');
            return;
        }
        
        dropdown.innerHTML = '';
        filtered.forEach(product => {
            const item = document.createElement('div');
            item.className = 'search-item';
            item.innerHTML = `
                <span class="search-item-name">${product.emoji} ${product.name}</span>
                <span class="search-item-price">₱${product.price.toFixed(2)}</span>
            `;
            item.addEventListener('click', () => {
                this.addToCart(product);
                document.getElementById('product-search').value = '';
                dropdown.classList.add('hidden');
            });
            dropdown.appendChild(item);
        });
        
        dropdown.classList.remove('hidden');
    }

    filterProductsByCategory(category) {
        const searchInput = document.getElementById('product-search');
        const dropdown = document.getElementById('search-dropdown');
        
        let filtered;
        if (category === 'all') {
            filtered = this.products;
        } else {
            filtered = this.products.filter(product => product.category === category);
        }
        
        if (filtered.length === 0) {
            dropdown.innerHTML = '<div class="search-item">Walang produkto sa kategoryang ito</div>';
            dropdown.classList.remove('hidden');
            return;
        }
        
        dropdown.innerHTML = '';
        filtered.forEach(product => {
            const item = document.createElement('div');
            item.className = 'search-item';
            item.innerHTML = `
                <span class="search-item-name">${product.emoji} ${product.name}</span>
                <span class="search-item-price">₱${product.price.toFixed(2)}</span>
            `;
            item.addEventListener('click', () => {
                this.addToCart(product);
                searchInput.value = '';
                dropdown.classList.add('hidden');
            });
            dropdown.appendChild(item);
        });
        
        dropdown.classList.remove('hidden');
        searchInput.focus();
    }

    addToCart(product) {
        if (product.stock <= 0) {
            this.showToast('Walang stock ang produktong ito', 'warning');
            return;
        }

        const existingItem = this.cart.find(item => item.id === product.id);
        
        if (existingItem) {
            if (existingItem.quantity < product.stock) {
                existingItem.quantity++;
            } else {
                this.showToast('Hindi pwedeng dagdagan pa', 'warning');
                return;
            }
        } else {
            this.cart.push({
                ...product,
                quantity: 1,
                originalPrice: product.price
            });
        }

        this.updateCart();
        this.showToast(`${product.name} naidagdag sa cart`, 'success');
    }

    updateCart() {
        const cartItems = document.getElementById('cart-items');
        const subtotalEl = document.getElementById('cart-subtotal');
        const totalEl = document.getElementById('cart-total');
        const processBtn = document.getElementById('process-payment');

        if (this.cart.length === 0) {
            cartItems.innerHTML = `
                <div class="empty-cart">
                    <p>Walang laman ang cart 🛒</p>
                    <p>Pumili ng produkto sa kaliwa</p>
                </div>
            `;
            subtotalEl.textContent = '₱0.00';
            totalEl.textContent = '₱0.00';
            processBtn.disabled = true;
            return;
        }

        cartItems.innerHTML = '';
        let subtotal = 0;

        this.cart.forEach((item, index) => {
            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;

            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            cartItem.innerHTML = `
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">₱${item.price.toFixed(2)} each</div>
                </div>
                <div class="cart-item-controls">
                    <button class="qty-btn" onclick="app.updateCartQuantity(${index}, -1)">-</button>
                    <span class="qty-display">${item.quantity}</span>
                    <button class="qty-btn" onclick="app.updateCartQuantity(${index}, 1)">+</button>
                    <button class="qty-btn" onclick="app.removeFromCart(${index})" style="background: var(--danger); margin-left: 0.5rem;">×</button>
                </div>
            `;
            cartItems.appendChild(cartItem);
        });

        subtotalEl.textContent = `₱${subtotal.toFixed(2)}`;
        totalEl.textContent = `₱${subtotal.toFixed(2)}`;
        processBtn.disabled = false;
    }

    updateCartQuantity(index, change) {
        const item = this.cart[index];
        const newQuantity = item.quantity + change;

        if (newQuantity <= 0) {
            this.removeFromCart(index);
            return;
        }

        const product = this.products.find(p => p.id === item.id);
        if (newQuantity > product.stock) {
            this.showToast('Hindi pwedeng dagdagan pa', 'warning');
            return;
        }

        item.quantity = newQuantity;
        this.updateCart();
    }

    removeFromCart(index) {
        this.cart.splice(index, 1);
        this.updateCart();
        this.showToast('Naalis sa cart', 'success');
    }

    clearCart() {
        this.cart = [];
        this.updateCart();
        this.showToast('Na-clear ang cart', 'success');
    }

    // Audio System for Scanner Sounds
    initAudioSystem() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }

    playSound(type) {
        if (!this.audioEnabled || !this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        switch (type) {
            case 'success':
                oscillator.frequency.setValueAtTime(2000, this.audioContext.currentTime);
                oscillator.type = 'square';
                gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.15);
                this.vibrate([100]);
                break;
            case 'error':
                oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
                oscillator.type = 'sawtooth';
                gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.3);
                this.vibrate([200, 100, 200]);
                break;
            case 'startup':
                [800, 1000, 1200].forEach((freq, i) => {
                    setTimeout(() => {
                        const osc = this.audioContext.createOscillator();
                        const gain = this.audioContext.createGain();
                        osc.connect(gain);
                        gain.connect(this.audioContext.destination);
                        osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);
                        gain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
                        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
                        osc.start();
                        osc.stop(this.audioContext.currentTime + 0.1);
                    }, i * 100);
                });
                break;
        }
    }

    vibrate(pattern) {
        if (navigator.vibrate) {
            navigator.vibrate(pattern);
        }
    }

    async simulateBarcodeScanning() {
        this.initAudioSystem();
        
        // Check if camera is ready
        if (!this.cameraInitialized) {
            const success = await this.initPersistentCamera();
            if (!success) {
                this.showToast('Hindi ma-access ang camera. Subukang i-allow ang permission.', 'error');
                return;
            }
        }
        
        try {
            await this.startProfessionalScanner();
        } catch (error) {
            console.error('Scanner error:', error);
            this.showToast('May problema sa camera. Subukang i-refresh ang page.', 'error');
        }
    }

    async startProfessionalScanner() {
        const modal = document.getElementById('barcode-modal');
        const statusText = document.getElementById('scanner-status-text');
        
        modal.classList.remove('hidden');
        this.scannerActive = true;
        this.scanCount = 0;
        
        statusText.textContent = 'Nagsisimula ang camera...';
        this.playSound('startup');
        
        // Initialize performance counters
        this.startPerformanceMonitoring();
        
        try {
            await this.initZXingScanner();
            statusText.textContent = 'I-point ang barcode sa gitna ng frame...';
        } catch (error) {
            console.error('Camera error:', error);
            statusText.textContent = 'Hindi ma-access ang camera. Ginagamit ang simulation...';
            setTimeout(() => this.fallbackScannerMode(), 2000);
        }
    }

    async initZXingScanner() {
        try {
            const video = document.getElementById('scanner-video');
            
            // Ensure camera is initialized
            if (!this.cameraInitialized) {
                const success = await this.initPersistentCamera();
                if (!success) {
                    throw new Error('Camera initialization failed');
                }
            }
            
            // Clone the stream for the scanner video
            if (this.cameraStream && this.cameraStream.active) {
                video.srcObject = this.cameraStream;
            } else {
                throw new Error('Camera stream not available');
            }
            
            await new Promise(resolve => video.onloadedmetadata = resolve);
            
            // Enhanced ZXing configuration
            if (!this.codeReader) {
                this.codeReader = new ZXing.BrowserMultiFormatReader();
                
                const hints = new Map();
                hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
                hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
                    ZXing.BarcodeFormat.EAN_13,
                    ZXing.BarcodeFormat.EAN_8,
                    ZXing.BarcodeFormat.UPC_A,
                    ZXing.BarcodeFormat.UPC_E,
                    ZXing.BarcodeFormat.CODE_128,
                    ZXing.BarcodeFormat.CODE_39
                ]);
                
                this.codeReader.hints = hints;
            }
            
            document.getElementById('scanner-status-text').textContent = 'I-point ang barcode sa gitna ng frame...';
            this.startScanning();
            
        } catch (error) {
            console.error('Camera error:', error);
            throw new Error('Camera access denied or not available');
        }
    }
    
    startScanning() {
        if (!this.scannerActive || !this.codeReader) return;
        
        const video = document.getElementById('scanner-video');
        let scanAttempts = 0;
        
        // Debounced scanning with optimized timing
        this.codeReader.decodeFromVideoDevice(null, video, (result, error) => {
            scanAttempts++;
            
            if (result) {
                console.log('Barcode detected:', result.text);
                this.onBarcodeDetected({ codeResult: { code: result.text } });
                return;
            }
            
            // Enhanced error handling for better UX
            if (error && !(error instanceof ZXing.NotFoundException)) {
                if (scanAttempts > 100) { // Reset after many attempts
                    this.showScanError('Subukang i-adjust ang lighting o distance...');
                    scanAttempts = 0;
                }
            }
        });
        
        // Add flashlight toggle if supported
        this.setupFlashlight(video);
    }

    async getBatteryInfo() {
        try {
            return await navigator.getBattery?.();
        } catch {
            return { level: 1 };
        }
    }

    startPerformanceMonitoring() {
        let frameCount = 0;
        let lastTime = performance.now();
        let lowFpsCount = 0;
        
        const updateFPS = () => {
            if (!this.scannerActive) return;
            
            frameCount++;
            const currentTime = performance.now();
            
            if (currentTime - lastTime >= 1000) {
                this.fpsCounter = Math.round(frameCount * 1000 / (currentTime - lastTime));
                document.getElementById('fps-counter').textContent = this.fpsCounter;
                
                // Update FPS indicator color and provide feedback
                const fpsEl = document.getElementById('fps-counter');
                const qualityEl = document.getElementById('quality-indicator');
                
                if (this.fpsCounter >= 25) {
                    fpsEl.className = 'fps-high';
                    qualityEl.textContent = 'HD';
                    lowFpsCount = 0;
                } else if (this.fpsCounter >= 15) {
                    fpsEl.className = 'fps-medium';
                    qualityEl.textContent = 'Good';
                    lowFpsCount = 0;
                } else {
                    fpsEl.className = 'fps-low';
                    qualityEl.textContent = 'Low';
                    lowFpsCount++;
                    
                    // Suggest improvements after consistent low FPS
                    if (lowFpsCount >= 3) {
                        this.showScanError('Low performance detected. Try better lighting or close other apps.');
                        lowFpsCount = 0;
                    }
                }
                
                frameCount = 0;
                lastTime = currentTime;
                
                // Auto-cleanup cache periodically
                if (Math.random() < 0.1) {
                    this.cleanupCache();
                }
            }
            
            requestAnimationFrame(updateFPS);
        };
        
        updateFPS();
    }

    onBarcodeDetected(result) {
        const now = Date.now();
        const barcode = result.codeResult.code;
        
        // Enhanced debounce with barcode-specific caching
        const cacheKey = `${barcode}_${this.scanMode}`;
        if (this.scanCache.has(cacheKey) && now - this.scanCache.get(cacheKey) < 1500) {
            return; // Prevent duplicate scans
        }
        
        this.scanCache.set(cacheKey, now);
        this.lastScanTime = now;
        
        console.log('Barcode detected:', barcode);
        
        // Enhanced barcode validation for common formats
        if (!barcode || barcode.length < 6) {
            this.showScanError('Barcode too short');
            return;
        }
        
        // Allow common barcode characters
        if (!/^[0-9A-Za-z\-\.\s]+$/.test(barcode)) {
            this.showScanError('Invalid barcode characters');
            return;
        }
        
        // Validate common barcode lengths
        const validLengths = [8, 12, 13, 14]; // EAN-8, UPC-A, EAN-13, ITF-14
        if (!/^[0-9]+$/.test(barcode) && !validLengths.includes(barcode.length)) {
            console.warn('Unusual barcode length:', barcode.length);
        }
        
        const product = this.findProductByBarcode(barcode);
        
        if (product) {
            console.log('Product found:', product.name);
            if (this.scanMode === 'inventory') {
                this.closeBarcodeScanner();
                this.showToast(`${product.name} - Nasa inventory na!`, 'warning');
            } else {
                this.processScanResult(product, barcode);
            }
        } else {
            console.log('Product not found for barcode:', barcode);
            this.handleNewProduct(barcode);
        }
    }
    
    handleNewProduct(barcode) {
        this.closeBarcodeScanner();
        
        if (this.scanMode === 'inventory') {
            // Open add product modal with barcode
            this.openProductModal(null, barcode);
            this.showToast('Bagong produkto! I-add sa inventory.', 'warning');
        } else {
            // In POS mode - show error
            this.showToast(`Barcode ${barcode} hindi nahanap sa inventory`, 'error');
        }
    }

    findProductByBarcode(barcode) {
        // Enhanced barcode matching with normalization
        const normalizedBarcode = barcode.trim().replace(/^0+/, ''); // Remove leading zeros
        
        return this.products.find(p => {
            if (!p.barcode) return false;
            
            const productBarcode = p.barcode.trim();
            
            // Exact match
            if (productBarcode === barcode) return true;
            
            // Match without leading zeros
            if (productBarcode.replace(/^0+/, '') === normalizedBarcode) return true;
            
            // UPC-A to EAN-13 conversion (add leading zero)
            if (barcode.length === 12 && productBarcode === '0' + barcode) return true;
            if (productBarcode.length === 12 && barcode === '0' + productBarcode) return true;
            
            return false;
        });
    }

    processScanResult(product, barcode) {
        this.scanCount++;
        document.getElementById('scan-counter').textContent = this.scanCount;
        
        // Visual feedback
        const container = document.querySelector('.scanner-container');
        container.classList.add('scanner-success');
        setTimeout(() => container.classList.remove('scanner-success'), 500);
        
        this.playSound('success');
        this.closeBarcodeScanner();
        this.addToCart(product);
        this.showToast(`✅ ${product.name} - ₱${product.price}`, 'success');
    }

    showScanError(message) {
        const container = document.querySelector('.scanner-container');
        container.classList.add('scanner-error');
        setTimeout(() => container.classList.remove('scanner-error'), 500);
        
        this.playSound('error');
        document.getElementById('scanner-status-text').textContent = message;
        
        setTimeout(() => {
            if (this.scannerActive) {
                document.getElementById('scanner-status-text').textContent = 'I-point ang barcode sa gitna ng frame...';
            }
        }, 2000);
    }

    cleanupCache() {
        const now = Date.now();
        // Remove entries older than 5 minutes
        for (const [key, timestamp] of this.scanCache.entries()) {
            if (now - timestamp > 300000) {
                this.scanCache.delete(key);
            }
        }
        
        // Fallback size limit
        if (this.scanCache.size > 100) {
            const entries = Array.from(this.scanCache.entries());
            entries.slice(0, 50).forEach(([key]) => this.scanCache.delete(key));
        }
    }
    
    // Add flashlight support
    async setupFlashlight(video) {
        try {
            const track = video.srcObject.getVideoTracks()[0];
            const capabilities = track.getCapabilities();
            
            if (capabilities.torch) {
                const flashBtn = document.createElement('button');
                flashBtn.className = 'btn btn-small';
                flashBtn.innerHTML = '🔦';
                flashBtn.id = 'toggle-flash';
                
                document.querySelector('.scanner-controls').appendChild(flashBtn);
                
                let flashOn = false;
                flashBtn.addEventListener('click', async () => {
                    flashOn = !flashOn;
                    await track.applyConstraints({ advanced: [{ torch: flashOn }] });
                    flashBtn.innerHTML = flashOn ? '🔆' : '🔦';
                });
            }
        } catch (error) {
            console.log('Flashlight not supported:', error);
        }
    }

    fallbackScannerMode() {
        const barcodeProducts = this.products.filter(p => p.hasBarcode && p.barcode);
        if (barcodeProducts.length === 0) {
            this.closeBarcodeScanner();
            this.showToast('Walang produktong may barcode sa inventory', 'warning');
            return;
        }
        
        document.getElementById('scanner-status-text').textContent = 'Simulation mode - Pipili ng random product...';
        
        // Simulate scan after 2-3 seconds
        setTimeout(() => {
            if (this.scannerActive) {
                const product = barcodeProducts[Math.floor(Math.random() * barcodeProducts.length)];
                console.log('Simulating scan for:', product.name, product.barcode);
                this.processScanResult(product, product.barcode);
            }
        }, 2000 + Math.random() * 1000);
    }

    closeBarcodeScanner() {
        this.scannerActive = false;
        
        try {
            if (this.codeReader) {
                this.codeReader.reset();
            }
        } catch (e) {
            console.warn('Scanner stop error:', e);
        }
        
        const video = document.getElementById('scanner-video');
        if (video) {
            video.srcObject = null;
            video.pause();
        }
        
        // Keep camera stream alive in hidden video
        
        document.getElementById('barcode-modal').classList.add('hidden');
        document.getElementById('fps-counter').textContent = '0';
        document.getElementById('scan-counter').textContent = '0';
    }

    toggleScannerSound() {
        this.audioEnabled = !this.audioEnabled;
        const btn = document.getElementById('toggle-sound');
        btn.textContent = this.audioEnabled ? '🔊' : '🔇';
        this.showToast(this.audioEnabled ? 'Sound enabled' : 'Sound disabled', 'success');
    }
    
    async triggerFocusAssist() {
        try {
            const video = document.getElementById('scanner-video');
            const track = video.srcObject.getVideoTracks()[0];
            
            // Trigger autofocus
            await track.applyConstraints({
                focusMode: 'single-shot'
            });
            
            // Visual feedback
            const guide = document.querySelector('.scanner-guide');
            const originalText = guide.textContent;
            guide.textContent = 'Focusing...';
            guide.style.background = 'var(--warning)';
            
            setTimeout(() => {
                guide.textContent = originalText;
                guide.style.background = 'rgba(0, 0, 0, 0.7)';
            }, 1000);
            
            this.showToast('Focus assist triggered', 'success');
        } catch (error) {
            console.log('Focus assist not supported:', error);
            this.showToast('Focus assist not available', 'warning');
        }
    }
    
    processManualBarcode() {
        const input = document.getElementById('manual-barcode');
        const barcode = input.value.trim();
        
        if (!barcode) {
            this.showToast('I-type ang barcode', 'warning');
            return;
        }
        
        console.log('Manual barcode entered:', barcode);
        
        const product = this.findProductByBarcode(barcode);
        
        if (product) {
            this.processScanResult(product, barcode);
        } else {
            this.handleNewProduct(barcode);
        }
        
        input.value = '';
    }

    // Payment Processing
    openPaymentModal() {
        if (this.cart.length === 0) return;

        const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        document.getElementById('payment-total').textContent = `₱${total.toFixed(2)}`;
        document.getElementById('payment-modal').classList.remove('hidden');
        
        // Reset payment form
        document.getElementById('amount-received').value = '';
        document.getElementById('change-amount').textContent = '₱0.00';
        
        // Set cash as default and disable complete button
        document.querySelectorAll('.payment-method').forEach(btn => btn.classList.remove('active'));
        document.querySelector('[data-method="cash"]').classList.add('active');
        document.getElementById('cash-payment').classList.remove('hidden');
        document.getElementById('gcash-payment').classList.add('hidden');
        document.getElementById('complete-payment').disabled = true;
    }

    // Utility Functions
    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const messageEl = document.getElementById('toast-message');
        
        messageEl.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.remove('hidden');
        
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }

    generateId() {
        return 'id_' + Math.random().toString(36).substr(2, 9);
    }

    formatCurrency(amount) {
        return `₱${amount.toFixed(2)}`;
    }

    formatDate(date) {
        return new Date(date).toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Payment Modal Events
    setupModalEvents() {
        // Payment method selection
        document.querySelectorAll('.payment-method').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.payment-method').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                
                const method = e.currentTarget.dataset.method;
                if (method === 'cash') {
                    document.getElementById('cash-payment').classList.remove('hidden');
                    document.getElementById('gcash-payment').classList.add('hidden');
                    this.calculateChange(); // Recalculate to update button state
                } else {
                    document.getElementById('cash-payment').classList.add('hidden');
                    document.getElementById('gcash-payment').classList.remove('hidden');
                    document.getElementById('complete-payment').disabled = false; // Enable for GCash
                }
            });
        });

        // Amount received input
        document.getElementById('amount-received').addEventListener('input', (e) => {
            this.calculateChange();
        });

        // Payment actions
        document.getElementById('cancel-payment').addEventListener('click', () => {
            document.getElementById('payment-modal').classList.add('hidden');
        });

        document.getElementById('complete-payment').addEventListener('click', () => {
            this.completeSale();
        });

        document.getElementById('gcash-confirm').addEventListener('click', () => {
            this.completeSale('gcash');
        });

        // Barcode scanner events
        document.getElementById('close-scanner').addEventListener('click', () => {
            this.closeBarcodeScanner();
        });
        
        document.getElementById('toggle-sound').addEventListener('click', () => {
            this.toggleScannerSound();
        });
        
        document.getElementById('focus-assist').addEventListener('click', () => {
            this.triggerFocusAssist();
        });
        
        document.getElementById('manual-submit').addEventListener('click', () => {
            this.processManualBarcode();
        });
        
        document.getElementById('manual-barcode').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.processManualBarcode();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.scannerActive) {
                this.closeBarcodeScanner();
            }
            // Only trigger scanner with Ctrl+S, not just 's'
            if (e.key.toLowerCase() === 's' && e.ctrlKey && !this.scannerActive && this.currentPage === 'benta') {
                e.preventDefault();
                this.simulateBarcodeScanning();
            }
        });
        
        // Handle page visibility to manage camera stream
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.cameraStream) {
                // Pause stream when page is hidden (battery optimization)
                this.cameraStream.getVideoTracks().forEach(track => {
                    track.enabled = false;
                });
            } else if (!document.hidden && this.cameraStream) {
                // Resume stream when page is visible
                this.cameraStream.getVideoTracks().forEach(track => {
                    track.enabled = true;
                });
            }
        });
        
        // Handle beforeunload to clean up properly
        window.addEventListener('beforeunload', () => {
            if (this.cameraStream) {
                this.cameraStream.getTracks().forEach(track => track.stop());
            }
        });
        
        // Toast close
        document.getElementById('toast-close').addEventListener('click', () => {
            document.getElementById('toast').classList.add('hidden');
        });

        // Receipt close
        document.getElementById('close-receipt').addEventListener('click', () => {
            document.getElementById('receipt-modal').classList.add('hidden');
        });

        document.getElementById('print-receipt').addEventListener('click', () => {
            window.print();
        });
    }

    calculateChange() {
        const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const received = parseFloat(document.getElementById('amount-received').value) || 0;
        const change = received - total;
        
        document.getElementById('change-amount').textContent = this.formatCurrency(Math.max(0, change));
        
        const completeBtn = document.getElementById('complete-payment');
        const activeMethod = document.querySelector('.payment-method.active').dataset.method;
        
        if (activeMethod === 'cash') {
            completeBtn.disabled = received < total || received === 0;
        } else {
            completeBtn.disabled = false; // GCash doesn't need amount validation
        }
    }

    completeSale(paymentMethod = 'cash') {
        const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const received = paymentMethod === 'cash' ? 
            parseFloat(document.getElementById('amount-received').value) : total;
        const change = received - total;

        if (paymentMethod === 'cash' && received < total) {
            this.showToast('Kulang ang bayad', 'error');
            return;
        }

        // Create sale record
        const sale = {
            id: this.generateId(),
            timestamp: new Date().toISOString(),
            items: [...this.cart],
            total: total,
            paymentMethod: paymentMethod === 'cash' ? 'Cash' : 'GCash',
            received: received,
            change: change,
            profit: this.calculateProfit(this.cart)
        };

        // Update stock
        this.cart.forEach(cartItem => {
            const product = this.products.find(p => p.id === cartItem.id);
            if (product) {
                product.stock -= cartItem.quantity;
            }
        });

        // Save sale
        this.sales.push(sale);
        this.saveData();

        // Show receipt
        this.showReceipt(sale);

        // Clear cart and close payment modal
        this.cart = [];
        this.updateCart();
        document.getElementById('payment-modal').classList.add('hidden');
        
        this.showToast('Benta successful! 🎉', 'success');
    }

    calculateProfit(cartItems) {
        // Simple profit calculation - assuming 30% markup
        return cartItems.reduce((profit, item) => {
            const cost = item.price / 1.3; // Assuming 30% markup
            return profit + ((item.price - cost) * item.quantity);
        }, 0);
    }

    showReceipt(sale) {
        document.getElementById('receipt-store-name').textContent = this.storeInfo.name || 'Tindahan Ko';
        document.getElementById('receipt-store-address').textContent = this.storeInfo.address || '';
        document.getElementById('receipt-datetime').textContent = this.formatDate(sale.timestamp);

        const itemsContainer = document.getElementById('receipt-items');
        itemsContainer.innerHTML = '';

        sale.items.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'receipt-item';
            itemEl.innerHTML = `
                <span>${item.name} x${item.quantity}</span>
                <span>${this.formatCurrency(item.price * item.quantity)}</span>
            `;
            itemsContainer.appendChild(itemEl);
        });

        document.getElementById('receipt-subtotal').textContent = this.formatCurrency(sale.total);
        document.getElementById('receipt-total').textContent = this.formatCurrency(sale.total);
        document.getElementById('receipt-payment').textContent = this.formatCurrency(sale.received);
        document.getElementById('receipt-change').textContent = this.formatCurrency(sale.change);

        document.getElementById('receipt-modal').classList.remove('hidden');
    }

    // Inventory Management
    setupInventoryEvents() {
        document.getElementById('add-product').addEventListener('click', () => {
            this.openProductModal();
        });
        
        document.getElementById('scan-inventory').addEventListener('click', () => {
            this.scanMode = 'inventory';
            this.simulateBarcodeScanning();
        });

        document.getElementById('inventory-search').addEventListener('input', (e) => {
            this.filterInventory(e.target.value);
        });

        document.getElementById('inventory-filter').addEventListener('change', (e) => {
            this.filterInventoryByCategory(e.target.value);
        });

        document.getElementById('low-stock-alert').addEventListener('click', () => {
            this.showLowStockItems();
        });

        // Product modal events
        document.getElementById('product-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProduct();
        });

        document.getElementById('cancel-product').addEventListener('click', () => {
            document.getElementById('product-modal').classList.add('hidden');
        });
    }

    renderInventory(filteredProducts = null) {
        const container = document.getElementById('inventory-list');
        const productsToShow = filteredProducts || this.products;

        container.innerHTML = '';

        productsToShow.forEach(product => {
            const isLowStock = product.stock <= product.reorderLevel;
            const itemEl = document.createElement('div');
            itemEl.className = `inventory-item ${isLowStock ? 'low-stock' : ''}`;
            
            itemEl.innerHTML = `
                <div class="inventory-emoji">${product.emoji}</div>
                <div class="inventory-details">
                    <h4>${product.name}</h4>
                    <div class="inventory-meta">
                        <span>₱${product.price.toFixed(2)}</span>
                        <span>${product.category}</span>
                        <span>${product.hasBarcode ? '📱 Barcode' : '📝 Manual'}</span>
                    </div>
                </div>
                <div class="inventory-stock">
                    <span class="stock-number">${product.stock}</span>
                    <span class="stock-label">Stock</span>
                </div>
                <div class="inventory-actions">
                    <button class="btn btn-small btn-secondary" onclick="app.editProduct('${product.id}')">✏️</button>
                    <button class="btn btn-small btn-danger" onclick="app.deleteProduct('${product.id}')">🗑️</button>
                </div>
            `;
            
            container.appendChild(itemEl);
        });
    }

    updateInventoryStats() {
        const totalProducts = this.products.length;
        const lowStockCount = this.products.filter(p => p.stock <= p.reorderLevel).length;
        const totalValue = this.products.reduce((sum, p) => sum + (p.price * p.stock), 0);

        document.getElementById('total-products').textContent = totalProducts;
        document.getElementById('low-stock-count').textContent = lowStockCount;
        document.getElementById('total-value').textContent = this.formatCurrency(totalValue);
    }

    filterInventory(searchTerm) {
        const filtered = this.products.filter(product =>
            product.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        this.renderInventory(filtered);
    }

    filterInventoryByCategory(category) {
        if (category === 'all') {
            this.renderInventory();
        } else {
            const filtered = this.products.filter(product => product.category === category);
            this.renderInventory(filtered);
        }
    }

    showLowStockItems() {
        const lowStockItems = this.products.filter(p => p.stock <= p.reorderLevel);
        if (lowStockItems.length === 0) {
            this.showToast('Walang low stock items! 👍', 'success');
        } else {
            this.renderInventory(lowStockItems);
            this.showToast(`${lowStockItems.length} items na maubos na ang stock`, 'warning');
        }
    }

    openProductModal(productId = null, scannedBarcode = null) {
        const modal = document.getElementById('product-modal');
        const form = document.getElementById('product-form');
        const title = document.getElementById('product-modal-title');

        form.reset();

        if (productId) {
            const product = this.products.find(p => p.id === productId);
            if (product) {
                title.textContent = 'Edit Produkto';
                document.getElementById('product-name').value = product.name;
                document.getElementById('product-price').value = product.price;
                document.getElementById('product-stock').value = product.stock;
                document.getElementById('product-category').value = product.category;
                document.getElementById('product-emoji').value = product.emoji;
                document.getElementById('product-reorder').value = product.reorderLevel;
                document.getElementById('product-barcode').checked = product.hasBarcode;
                document.getElementById('product-barcode-value').value = product.barcode || '';
                form.dataset.editId = productId;
            }
        } else {
            title.textContent = scannedBarcode ? 'Bagong Produkto (Scanned)' : 'Dagdag Produkto';
            if (scannedBarcode) {
                document.getElementById('product-barcode-value').value = scannedBarcode;
                document.getElementById('product-barcode').checked = true;
            }
            delete form.dataset.editId;
        }

        modal.classList.remove('hidden');
    }

    saveProduct() {
        const form = document.getElementById('product-form');
        const editId = form.dataset.editId;
        const barcodeValue = document.getElementById('product-barcode-value').value.trim();

        // Check for duplicate barcode
        if (barcodeValue && !editId) {
            const existingProduct = this.products.find(p => p.barcode === barcodeValue);
            if (existingProduct) {
                this.showToast(`Barcode ${barcodeValue} ay ginagamit na ng ${existingProduct.name}`, 'error');
                return;
            }
        }

        const productData = {
            name: document.getElementById('product-name').value,
            price: parseFloat(document.getElementById('product-price').value),
            stock: parseInt(document.getElementById('product-stock').value),
            category: document.getElementById('product-category').value,
            emoji: document.getElementById('product-emoji').value || '📦',
            reorderLevel: parseInt(document.getElementById('product-reorder').value),
            hasBarcode: document.getElementById('product-barcode').checked,
            barcode: barcodeValue
        };

        if (editId) {
            const product = this.products.find(p => p.id === editId);
            Object.assign(product, productData);
            this.showToast('Product updated successfully! ✅', 'success');
        } else {
            const newProduct = {
                id: this.generateId(),
                ...productData
            };
            this.products.push(newProduct);
            
            // Clear entire cache to refresh all lookups
            this.scanCache.clear();
            
            this.showToast('Product added successfully! ✅', 'success');
        }

        this.saveData();
        this.renderInventory();
        this.updateInventoryStats();
        document.getElementById('product-modal').classList.add('hidden');
    }

    editProduct(productId) {
        this.openProductModal(productId);
    }

    deleteProduct(productId) {
        if (confirm('Sigurado ka bang gusto mong tanggalin ang produktong ito?')) {
            this.products = this.products.filter(p => p.id !== productId);
            this.saveData();
            this.renderInventory();
            this.updateInventoryStats();
            this.showToast('Product deleted successfully! 🗑️', 'success');
        }
    }

    // Reports
    setupReportsEvents() {
        document.getElementById('report-period').addEventListener('change', (e) => {
            this.renderReports(e.target.value);
        });
    }

    renderReports(period = 'today') {
        const filteredSales = this.filterSalesByPeriod(period);
        
        const totalSales = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
        const totalProfit = filteredSales.reduce((sum, sale) => sum + sale.profit, 0);
        const transactionCount = filteredSales.length;

        document.getElementById('total-sales').textContent = this.formatCurrency(totalSales);
        document.getElementById('total-profit').textContent = this.formatCurrency(totalProfit);
        document.getElementById('transaction-count').textContent = transactionCount;

        this.renderTopProducts(filteredSales);
        this.renderSalesChart(filteredSales);
    }

    filterSalesByPeriod(period) {
        const now = new Date();
        let startDate;

        switch (period) {
            case 'today':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            default:
                startDate = new Date(0);
        }

        return this.sales.filter(sale => new Date(sale.timestamp) >= startDate);
    }

    renderTopProducts(sales) {
        const productSales = {};
        
        sales.forEach(sale => {
            sale.items.forEach(item => {
                if (!productSales[item.id]) {
                    productSales[item.id] = {
                        name: item.name,
                        emoji: item.emoji,
                        quantity: 0,
                        revenue: 0
                    };
                }
                productSales[item.id].quantity += item.quantity;
                productSales[item.id].revenue += item.price * item.quantity;
            });
        });

        const sortedProducts = Object.values(productSales)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        const container = document.getElementById('top-products-list');
        container.innerHTML = '';

        sortedProducts.forEach((product, index) => {
            const itemEl = document.createElement('div');
            itemEl.className = 'top-product-item';
            itemEl.innerHTML = `
                <div class="top-product-info">
                    <div class="top-product-rank">${index + 1}</div>
                    <span>${product.emoji} ${product.name}</span>
                </div>
                <div class="top-product-sales">${this.formatCurrency(product.revenue)}</div>
            `;
            container.appendChild(itemEl);
        });
    }

    renderSalesChart(sales) {
        // Simple chart implementation using canvas
        const canvas = document.getElementById('sales-chart');
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (sales.length === 0) {
            ctx.fillStyle = '#718096';
            ctx.font = '16px Poppins';
            ctx.textAlign = 'center';
            ctx.fillText('Walang data para sa period na ito', canvas.width / 2, canvas.height / 2);
            return;
        }

        // Simple bar chart
        const maxSale = Math.max(...sales.map(s => s.total));
        const barWidth = canvas.width / sales.length;
        
        sales.forEach((sale, index) => {
            const barHeight = (sale.total / maxSale) * (canvas.height - 40);
            const x = index * barWidth;
            const y = canvas.height - barHeight - 20;
            
            ctx.fillStyle = '#ff69b4';
            ctx.fillRect(x + 5, y, barWidth - 10, barHeight);
            
            // Add value labels
            ctx.fillStyle = '#2d3748';
            ctx.font = '10px Poppins';
            ctx.textAlign = 'center';
            ctx.fillText(
                this.formatCurrency(sale.total),
                x + barWidth / 2,
                y - 5
            );
        });
    }

    // Settings
    setupSettingsEvents() {
        document.getElementById('save-store-info').addEventListener('click', () => {
            this.saveStoreInfo();
        });

        document.getElementById('export-data').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('import-btn').addEventListener('click', () => {
            document.getElementById('import-data').click();
        });

        document.getElementById('import-data').addEventListener('change', (e) => {
            this.importData(e.target.files[0]);
        });

        document.getElementById('cleanup-data').addEventListener('click', () => {
            this.cleanupData();
        });

        document.getElementById('theme-selector').addEventListener('change', (e) => {
            this.changeTheme(e.target.value);
        });

        document.getElementById('landing-install-btn').addEventListener('click', () => {
            this.installFromLanding();
        });

        document.getElementById('install-prompt-yes').addEventListener('click', () => {
            this.installPWA();
        });

        document.getElementById('install-prompt-no').addEventListener('click', () => {
            this.dismissInstallPrompt();
        });
    }

    loadSettings() {
        document.getElementById('settings-store-name').value = this.storeInfo.name || '';
        document.getElementById('settings-owner-name').value = this.storeInfo.owner || '';
        document.getElementById('settings-store-address').value = this.storeInfo.address || '';
        document.getElementById('theme-selector').value = this.currentTheme;
    }

    saveStoreInfo() {
        this.storeInfo.name = document.getElementById('settings-store-name').value;
        this.storeInfo.owner = document.getElementById('settings-owner-name').value;
        this.storeInfo.address = document.getElementById('settings-store-address').value;
        
        this.saveData();
        this.updateStoreDisplay();
        this.showToast('Store info saved! 💾', 'success');
    }

    exportData() {
        let csvContent = '';
        
        // Products CSV
        csvContent += 'PRODUCTS\n';
        csvContent += 'ID,Name,Price,Stock,Category,Emoji,Reorder Level,Has Barcode,Barcode\n';
        this.products.forEach(product => {
            csvContent += `${product.id},"${product.name}",${product.price},${product.stock},${product.category},${product.emoji},${product.reorderLevel},${product.hasBarcode},${product.barcode || ''}\n`;
        });
        
        // Sales CSV
        csvContent += '\nSALES\n';
        csvContent += 'ID,Date,Total,Payment Method,Received,Change,Profit\n';
        this.sales.forEach(sale => {
            const date = new Date(sale.timestamp).toLocaleDateString('en-PH');
            csvContent += `${sale.id},${date},${sale.total},${sale.paymentMethod},${sale.received},${sale.change},${sale.profit}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tindahan-ko-data-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        this.showToast('CSV data exported successfully! 📤', 'success');
    }

    importData(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const csvData = e.target.result;
                const lines = csvData.split('\n');
                
                if (confirm('Sigurado ka bang gusto mong i-import ang CSV data? Mawawala ang kasalukuyang data.')) {
                    this.parseCSVData(lines);
                    
                    this.saveData();
                    this.renderInventory();
                    this.updateInventoryStats();
                    this.loadSettings();
                    
                    this.showToast('CSV data imported successfully! 📥', 'success');
                }
            } catch (error) {
                console.error('Error parsing CSV file:', error);
                this.showToast('Invalid CSV file. Pakisuri ang format ng file.', 'error');
            }
        };
        reader.onerror = () => {
            console.error('Error reading file:', reader.error);
            this.showToast('May problema sa pagbasa ng file.', 'error');
        };
        reader.readAsText(file);
    }

    parseCSVData(lines) {
        let currentSection = '';
        let products = [];
        let sales = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line === 'PRODUCTS') {
                currentSection = 'products';
                i++; // Skip header
                continue;
            }
            
            if (line === 'SALES') {
                currentSection = 'sales';
                i++; // Skip header
                continue;
            }
            
            if (line && currentSection === 'products') {
                const cols = this.parseCSVLine(line);
                if (cols.length >= 9) {
                    products.push({
                        id: cols[0],
                        name: cols[1],
                        price: parseFloat(cols[2]),
                        stock: parseInt(cols[3]),
                        category: cols[4],
                        emoji: cols[5],
                        reorderLevel: parseInt(cols[6]),
                        hasBarcode: cols[7] === 'true',
                        barcode: cols[8]
                    });
                }
            }
            
            if (line && currentSection === 'sales') {
                const cols = this.parseCSVLine(line);
                if (cols.length >= 7) {
                    sales.push({
                        id: cols[0],
                        timestamp: new Date(cols[1]).toISOString(),
                        total: parseFloat(cols[2]),
                        paymentMethod: cols[3],
                        received: parseFloat(cols[4]),
                        change: parseFloat(cols[5]),
                        profit: parseFloat(cols[6]),
                        items: [] // Items data not preserved in CSV
                    });
                }
            }
        }
        
        this.products = products;
        this.sales = sales;
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }

    cleanupData() {
        if (confirm('Tanggalin ang mga lumang sales data (3+ months old)?')) {
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
            
            const oldCount = this.sales.length;
            this.sales = this.sales.filter(sale => new Date(sale.timestamp) > threeMonthsAgo);
            const removedCount = oldCount - this.sales.length;
            
            this.saveData();
            this.showToast(`${removedCount} old records removed! 🧹`, 'success');
        }
    }

    changeTheme(theme) {
        this.currentTheme = theme;
        this.applyTheme(theme);
        this.saveData();
        this.showToast('Theme changed! 🎨', 'success');
    }

    applyTheme(theme) {
        const root = document.documentElement;
        
        switch (theme) {
            case 'purple':
                root.style.setProperty('--primary-pink', '#9f7aea');
                root.style.setProperty('--secondary-pink', '#d6bcfa');
                root.style.setProperty('--light-pink', '#f7fafc');
                root.style.setProperty('--dark-pink', '#805ad5');
                root.style.setProperty('--gradient-primary', 'linear-gradient(135deg, #9f7aea, #805ad5, #6b46c1)');
                root.style.setProperty('--gradient-secondary', 'linear-gradient(135deg, #d6bcfa, #9f7aea)');
                break;
            case 'blue':
                root.style.setProperty('--primary-pink', '#4299e1');
                root.style.setProperty('--secondary-pink', '#90cdf4');
                root.style.setProperty('--light-pink', '#ebf8ff');
                root.style.setProperty('--dark-pink', '#3182ce');
                root.style.setProperty('--gradient-primary', 'linear-gradient(135deg, #4299e1, #3182ce, #2c5282)');
                root.style.setProperty('--gradient-secondary', 'linear-gradient(135deg, #90cdf4, #4299e1)');
                break;
            default: // pink
                root.style.setProperty('--primary-pink', '#ff69b4');
                root.style.setProperty('--secondary-pink', '#ffb6c1');
                root.style.setProperty('--light-pink', '#ffeef8');
                root.style.setProperty('--dark-pink', '#e91e63');
                root.style.setProperty('--gradient-primary', 'linear-gradient(135deg, #ff69b4, #ff1493, #dc143c)');
                root.style.setProperty('--gradient-secondary', 'linear-gradient(135deg, #ffb6c1, #ff69b4)');
        }
    }

    // PWA Installation
    setupPWAInstall() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallButton();
        });

        window.addEventListener('appinstalled', () => {
            this.deferredPrompt = null;
            this.hideInstallButton();
            this.showToast('App installed successfully! 🎉', 'success');
        });
    }

    showInstallButton() {
        const installBtn = document.getElementById('install-app');
        if (installBtn) {
            installBtn.style.display = 'inline-flex';
            installBtn.disabled = false;
        }
    }

    hideInstallButton() {
        const installBtn = document.getElementById('install-app');
        if (installBtn) {
            installBtn.style.display = 'none';
        }
    }

    showInstallPrompt() {
        if (this.deferredPrompt || this.isInstallable()) {
            document.getElementById('install-prompt-modal').classList.remove('hidden');
        }
    }

    isInstallable() {
        return !window.matchMedia('(display-mode: standalone)').matches && 
               'serviceWorker' in navigator;
    }

    async installPWA() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                this.showToast('Installing app... 📲', 'success');
            } else {
                this.showToast('Installation cancelled', 'warning');
            }
            
            this.deferredPrompt = null;
            document.getElementById('install-prompt-modal').classList.add('hidden');
        } else if (this.isInstallable()) {
            this.showToast('Please use your browser\'s "Add to Home Screen" option', 'info');
        } else {
            this.showToast('App is already installed or not available', 'warning');
        }
    }

    dismissInstallPrompt() {
        document.getElementById('install-prompt-modal').classList.add('hidden');
    }

    showLandingPage() {
        if (!localStorage.getItem('tindahan_setup_complete')) {
            document.getElementById('landing-page').classList.remove('hidden');
        } else {
            this.hideLandingPage();
            this.showApp();
        }
    }

    hideLandingPage() {
        document.getElementById('landing-page').classList.add('hidden');
    }

    installFromLanding() {
        if (this.deferredPrompt) {
            this.installPWA();
        } else {
            // If no install prompt, proceed to setup
            this.hideLandingPage();
            this.checkFirstTimeSetup();
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TindahanKo();
});

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Global functions for inline event handlers
window.updateCartQuantity = (index, change) => app.updateCartQuantity(index, change);
window.removeFromCart = (index) => app.removeFromCart(index);
window.editProduct = (id) => app.editProduct(id);
window.deleteProduct = (id) => app.deleteProduct(id);
