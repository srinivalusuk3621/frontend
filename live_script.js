
        // --- View Navigation & Tab Logic ---
        const menuItems = document.querySelectorAll('.menu-item');
        const views = {
            'dashboard-view': document.getElementById('dashboard-view'),
            'my-points-view': document.getElementById('my-points-view'),
            'orders-view': document.getElementById('orders-view'),
            'transactions-view': document.getElementById('transactions-view'),
            'support-view': document.getElementById('support-view')
        };

        function switchView(viewId) {
            if (!views[viewId]) return;
            // Hide all views
            Object.values(views).forEach(v => { if (v) v.style.display = 'none'; });
            // Show target view
            if (views[viewId]) views[viewId].style.display = 'block';

            // Update active menu link
            menuItems.forEach(i => i.classList.remove('active'));
            const activeLink = document.querySelector(`.menu-item[data-view="${viewId}"]`);
            if (activeLink) activeLink.classList.add('active');
        }

        menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const targetView = item.getAttribute('data-view');
                if (targetView) switchView(targetView);
                // Also auto-close sidebar on mobile after clicking a link
                if(window.innerWidth <= 768) {
                    toggleSidebar(false);
                }
            });
        });

        // --- Mobile Sidebar Toggle ---
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');

        function toggleSidebar(forceState) {
            const isOpen = sidebar.classList.contains('open');
            const newState = forceState !== undefined ? forceState : !isOpen;
            
            if (newState) {
                sidebar.classList.add('open');
                overlay.classList.add('active');
            } else {
                sidebar.classList.remove('open');
                overlay.classList.remove('active');
            }
        }

        // --- Setup PDF.js ---
        try { pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; } catch(e) { console.warn('pdfjsLib missing'); }
        let extractedPageCount = 0;
        let selectedFile = null;

        // --- Drag and Drop File Handling (Updated for Preview) ---
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');
        const pdfPreviewContainer = document.getElementById('pdf-preview-container');
        const pdfViewer = document.getElementById('pdf-viewer');
        const pdfLoadingOverlay = document.getElementById('pdf-loading-overlay');
        const fileMetrics = document.getElementById('file-metrics');

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults (e) { e.preventDefault(); e.stopPropagation(); }

        ['dragenter', 'dragover'].forEach(eventName => dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false));
        ['dragleave', 'drop'].forEach(eventName => dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false));

        dropZone.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files), false);
        fileInput.addEventListener('change', function() { handleFiles(this.files); });

        async function handleFiles(files) {
            if (files.length > 0) {
                selectedFile = files[0];
                const fileURL = URL.createObjectURL(selectedFile);
                
                // Show Preview UI
                dropZone.style.display = 'none';
                pdfPreviewContainer.style.display = 'block';
                fileMetrics.style.display = 'flex';
                pdfLoadingOverlay.style.display = 'flex';
                
                // Update basic metrics
                document.getElementById('metric-filename').textContent = selectedFile.name;
                document.getElementById('metric-filesize').textContent = (selectedFile.size / (1024*1024)).toFixed(2) + ' MB';
                
                // Set Embed Viewer Source
                pdfViewer.src = fileURL + "#toolbar=0&navpanes=0";
                
                // Extract Pages via PDF.js if PDF
                if (selectedFile.type === 'application/pdf') {
                    try {
                        const arrayBuffer = await selectedFile.arrayBuffer();
                        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
                        extractedPageCount = pdf.numPages;
                        document.getElementById('metric-pagecount').textContent = extractedPageCount;
                        calculateLivePrice();
                    } catch (err) {
                        console.error('Error reading PDF:', err);
                        extractedPageCount = 1; // Fallback
                        document.getElementById('metric-pagecount').textContent = '1 (Error reading true count)';
                    }
                } else {
                    extractedPageCount = 1; // Assume 1 for docs
                    document.getElementById('metric-pagecount').textContent = '1 (Word/Doc)';
                }
                
                pdfLoadingOverlay.style.display = 'none';
                calculateLivePrice();
            }
        }

        

        // --- User Rewards Points System Logic ---
        let currentPoints = 0;
        const dashboardPointsDisplay = document.getElementById('dashboard-points-display');
        const totalPointsDisplay = document.getElementById('total-points-display');
        const redeemOptionsContainer = document.getElementById('redeem-options-container');
        
        function loadUserPointsData() {
            fetch('https://xeroxproject-backend-production.up.railway.app/getUserPointsData')
                .then(res => res.json())
                .then(data => {
                    currentPoints = data.points || 0;
                    dashboardPointsDisplay.textContent = currentPoints;
                    totalPointsDisplay.textContent = currentPoints;
                    
                    if (!data.redeemOptions || data.redeemOptions.length === 0) {
                        redeemOptionsContainer.innerHTML = '<p style="color: #777;">Admin has not provided any redeem options yet</p>';
                        return;
                    }
                    
                    let html = '';
                    data.redeemOptions.forEach(opt => {
                        html += `
                            <div class="option" style="margin-bottom:15px; display:flex; justify-content:space-between; align-items:center; background: rgba(0,0,0,0.02); padding: 10px; border-radius: 8px;">
                                <div>
                                    <span style="font-size: 15px; font-weight: 700;">${opt.title}</span><br>
                                    <small style="color: #666;">${opt.description || 'Redeem this offer instantly'}</small>
                                </div>
                                <button onclick="redeemPoints(${opt.id}, ${opt.points_required}, '${opt.title.replace(/'/g, "\\'")}')" style="padding: 8px 15px; background:var(--primary); color:#fff; border:none; border-radius:5px; cursor:pointer; white-space: nowrap;">${opt.points_required} pts</button>
                            </div>
                        `;
                    });
                    redeemOptionsContainer.innerHTML = html;
                })
                .catch(err => {
                    console.error('Failed to load points', err);
                    dashboardPointsDisplay.textContent = '0';
                    totalPointsDisplay.textContent = '0';
                    if(redeemOptionsContainer){
                        redeemOptionsContainer.innerHTML = '<p style="color: #777;">Admin has not provided any redeem options yet</p>';
                    }
                });
        }

        function togglePartialColorDisplay() {
            const isYes = document.querySelector('input[name="partial-color"]:checked').value === 'yes';
            const container = document.getElementById('partial-color-input-container');
            container.style.display = isYes ? 'block' : 'none';
        }

        // --- Pricing Engine ---
        function parsePageRanges(rangeStr) {
            if (!rangeStr) return 0;
            let count = 0;
            const parts = rangeStr.split(',');
            parts.forEach(p => {
                const bounds = p.split('-');
                if(bounds.length === 2 && !isNaN(bounds[0]) && !isNaN(bounds[1])) {
                    count += (Math.abs(parseInt(bounds[1]) - parseInt(bounds[0])) + 1);
                } else if(!isNaN(p)) {
                    count += 1;
                }
            });
            return count;
        }

        function calculateLivePrice() {
            if (!selectedFile) return;

            const copies = parseInt(document.getElementById('copies-input').value) || 1;
            const colorOption = document.getElementById('color-input').value;
            const pageRangeType = document.getElementById('page-range-input').value;
            const customRangeStr = document.getElementById('custom-pages-input').value;
            const binding = document.getElementById('binding-input').value;

            // Handle UI toggle for custom pages
            document.getElementById('custom-pages-group').style.display = (pageRangeType === 'custom') ? 'block' : 'none';

            // Determine billable pages
            let billablePages = extractedPageCount;
            if (pageRangeType === 'custom' && customRangeStr.trim().length > 0) {
                const parsed = parsePageRanges(customRangeStr);
                if (parsed > 0) billablePages = parsed;
            }
            const customColorStr = document.getElementById('custom-color-input')?.value || "";
            document.getElementById('custom-color-group').style.display = (colorOption === 'custom') ? 'block' : 'none';

            let colorPages = 0;
            let bwPages = 0;
            
            if (colorOption === 'color') {
                colorPages = billablePages;
            } else if (colorOption === 'bw') {
                bwPages = billablePages;
            } else if (colorOption === 'custom') {
                const parsedColor = parsePageRanges(customColorStr);
                // Can't have more color pages than total billable pages theoretically
                colorPages = Math.min(parsedColor, billablePages); 
                bwPages = billablePages - colorPages;
            }

            const sides = document.getElementById('sides-input').value;
            const multiplier = (sides === 'double') ? 0.5 : 1.0;

            let colorCost = Math.ceil(colorPages * multiplier) * 10.0;
            let bwCost = Math.ceil(bwPages * multiplier) * 1.0;
            let pagesTotal = (colorCost + bwCost) * copies;
            let total = pagesTotal;
            
            // Add binding cost
            let bindingCost = 0;
            if (binding === 'spiral' || binding === 'staple') {
                bindingCost = 20;
                total += bindingCost;
            }

            // Update UI
            document.getElementById('live-price-display').textContent = `₹${total.toFixed(2)}`;
            
            let breakdown = "";
            let sideSuffix = (sides === 'double') ? ' (Double Sided)' : '';
            if (colorOption === 'custom') {
                breakdown = `${Math.ceil(colorPages * multiplier)} Color Sheets x ₹10 + ${Math.ceil(bwPages * multiplier)} B&W Sheets x ₹1${sideSuffix}`;
                if (copies > 1) breakdown = `(${breakdown}) x ${copies} copies = ₹${pagesTotal.toFixed(2)}`;
                else breakdown += ` = ₹${pagesTotal.toFixed(2)}`;
            } else {
                const costP = (colorOption === 'color') ? 10.0 : 1.0;
                breakdown = `${Math.ceil(billablePages * multiplier)} Sheet(s) x ₹${costP.toFixed(2)} x ${copies} copy = ₹${pagesTotal.toFixed(2)}${sideSuffix}`;
            }

            if (bindingCost > 0) breakdown += ` + ₹20 Binding`;
            document.getElementById('price-breakdown').textContent = breakdown;
            
            return total;
        }

        // --- Modal Control ---
        function openConfirmationModal() {
            if (!selectedFile) {
                alert("Please drop a document to upload first.");
                return;
            }

            const copies = document.getElementById('copies-input').value;
            const colorOptionE = document.getElementById('color-input');
            let color = colorOptionE.options[colorOptionE.selectedIndex].text.split('(')[0].trim();
            if (colorOptionE.value === 'custom') {
                const customColorInput = document.getElementById('custom-color-input').value;
                color = `Custom (${customColorInput || 'None specified'})`;
            }
            const paperTypeE = document.getElementById('paper-type-input');
            const sidesOptionE = document.getElementById('sides-input');
            const sideText = sidesOptionE.options[sidesOptionE.selectedIndex].text;
            const paper = document.getElementById('paper-size-input').value.toUpperCase() + ' / ' + 
                          paperTypeE.options[paperTypeE.selectedIndex].text + ' - ' + sideText;
            const bindingE = document.getElementById('binding-input');
            const binding = bindingE.options[bindingE.selectedIndex].text;
            
            const pageRangeType = document.getElementById('page-range-input').value;
            let pagesText = extractedPageCount;
            if (pageRangeType === 'custom') {
                const customPages = parsePageRanges(document.getElementById('custom-pages-input').value);
                pagesText = `${customPages} (Custom Range)`;
            }

            // Populate Modal
            document.getElementById('summary-file').textContent = selectedFile.name;
            document.getElementById('summary-pages').textContent = pagesText;
            document.getElementById('summary-copies').textContent = copies;
            document.getElementById('summary-color').textContent = color;
            document.getElementById('summary-paper').textContent = paper;
            document.getElementById('summary-binding').textContent = binding;
            document.getElementById('summary-total').textContent = document.getElementById('live-price-display').textContent;

            document.getElementById('order-modal').style.display = 'flex';
        }

        function closeConfirmationModal() {
            document.getElementById('order-modal').style.display = 'none';
        }

        function processFinalOrder() {
            const pointsEarned = 10;
            currentPoints += pointsEarned;
            updatePointsDisplays();
            addHistoryItem('Order Placed', pointsEarned, true);

            alert('Your order has been placed securely! Total Paid: ' + document.getElementById('summary-total').textContent);
            closeConfirmationModal();

            // Reset UI
            selectedFile = null;
            extractedPageCount = 0;
            document.getElementById('drop-zone').style.display = 'flex';
            document.getElementById('pdf-preview-container').style.display = 'none';
            document.getElementById('file-metrics').style.display = 'none';
            document.getElementById('print-form').reset();
            document.getElementById('live-price-display').textContent = '₹0.00';
            document.getElementById('price-breakdown').textContent = '0 pages x ₹1.00 x 1 copy = ₹0.00';
            document.getElementById('metric-pagecount').textContent = '0';
        }

        // Triggers when user redeems an option
        function redeemPoints(cost, rewardName, optionId) {
            const userId = 1; // Replace with dynamic user ID
            try {
                const response = await fetch('https://xeroxproject-backend-production.up.railway.app/process-redemption', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ userId, optionId })
                });

                const result = await response.json();
                if (response.ok && result.success) {
                    alert(`Successfully redeemed ${rewardName} for ${cost} points!`);
                    // Refresh points display (implement as needed)
                } else {
                    alert(result.error || 'Redemption failed.');
                }
            } catch (error) {
                console.error('Error during redemption:', error);
                alert('An unexpected error occurred.');
            }
        }

        // --- FAQ Accordion Logic ---
        function toggleFaq(element) {
            const faqItem = element.parentElement;
            const isCurrentlyActive = faqItem.classList.contains('active');
            
            // Close all items
            document.querySelectorAll('.faq-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // If the clicked one wasn't active, open it
            if (!isCurrentlyActive) {
                faqItem.classList.add('active');
            }
        }

        function togglePhoneField() {
            const isPhone = document.querySelector('input[name="contact-method"]:checked').value === 'phone';
            const phoneContainer = document.getElementById('phone-input-container');
            const phoneInput = document.getElementById('ticket-phone');
            
            if (isPhone) {
                phoneContainer.style.display = 'block';
                phoneInput.setAttribute('required', 'true');
            } else {
                phoneContainer.style.display = 'none';
                phoneInput.removeAttribute('required');
            }
        }

        function submitTicket() {
            const method = document.querySelector('input[name="contact-method"]:checked').value;
            const phoneField = document.getElementById('ticket-phone');
            
            let contactInfo = 'email';
            if (method === 'phone') {
                if (!phoneField.checkValidity()) {
                    phoneField.reportValidity();
                    return;
                }
                contactInfo = `phone (${phoneField.value})`;
            }
            
            alert(`Your ticket has been submitted successfully. Our support team will respond to your ${contactInfo} shortly!`);
            document.getElementById('ticket-form').reset();
            togglePhoneField();
        }

        // --- My Orders & Live Tracking Logic ---
        const orderHistoryData = [];

        function renderOrders(data) {
            const container = document.getElementById('orders-container');
            container.innerHTML = '';
            
            if(data.length === 0) {
                container.innerHTML = '<div style="text-align:center; padding: 40px; color:#777;">No orders found matching your criteria.</div>';
                return;
            }

            data.forEach(order => {
                const dateObj = new Date(order.date);
                const dateFormatted = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                
                let statusBadge = order.status === 'completed' 
                    ? '<span class="order-status status-completed"><i class="fa-solid fa-check"></i> Completed</span>'
                    : '<span class="order-status status-pending"><i class="fa-solid fa-spinner fa-spin"></i> In Progress</span>';

                const html = `
                    <div class="order-card">
                        <div class="order-info">
                            <div class="order-icon">
                                <i class="fa-regular fa-file-pdf"></i>
                            </div>
                            <div class="order-details-summary">
                                <h3>${order.file}</h3>
                                <p><strong>#${order.id}</strong> &bull; ${order.pages} Pages &bull; ${order.copies} Copies &bull; ${dateFormatted}</p>
                            </div>
                        </div>
                        <div class="order-meta">
                            <p class="order-price">₹${order.total.toFixed(2)}</p>
                            ${statusBadge}
                            <button class="btn-view-order" onclick="openOrderDetails('${order.id}')">View Details</button>
                        </div>
                    </div>
                `;
                container.insertAdjacentHTML('beforeend', html);
            });
        }

        function filterAndSortOrders() {
            const statusFilter = document.getElementById('filter-status').value;
            const sortDate = document.getElementById('sort-date').value;

            let filtered = orderHistoryData.filter(o => statusFilter === 'all' || o.status === statusFilter);

            filtered.sort((a, b) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                return sortDate === 'newest' ? dateB - dateA : dateA - dateB;
            });

            renderOrders(filtered);
        }

        function openOrderDetails(orderId) {
            fetch('https://xeroxproject-backend-production.up.railway.app/order-details?id=' + orderId)
                .then(res => {
                    if (!res.ok) throw new Error('Order not found');
                    return res.json();
                })
                .then(order => {
                    document.getElementById('modal-order-id').textContent = order.id;
                    document.getElementById('modal-file-name').textContent = order.file_name;
                    document.getElementById('modal-pages-copies').textContent = `${order.pages} pgs x ${order.copies}`;
                    document.getElementById('modal-color').textContent = order.color_type;
                    document.getElementById('modal-setup').textContent = order.print_type;
                    document.getElementById('modal-total-cost').textContent = `₹${order.amount.toFixed(2)}`;
                    document.getElementById('modal-pay-method').textContent = order.payment_method;
                    
                    const payStatusEl = document.getElementById('modal-pay-status');
                    if(order.payment_status.toLowerCase() === 'paid') {
                        payStatusEl.className = 'payment-status-badge payment-paid';
                        payStatusEl.innerHTML = '<i class="fa-solid fa-check-circle"></i> Paid';
                    } else {
                        payStatusEl.className = 'payment-status-badge payment-pending';
                        payStatusEl.innerHTML = '<i class="fa-solid fa-clock-rotate-left"></i> Pending';
                    }

                    // Dynamically map Status to Tracking Level
                    let tLevel = 1;
                    const lStatus = order.status.toLowerCase();
                    if(lStatus === 'accepted' || lStatus === 'admin accepted') tLevel = 2;
                    else if(lStatus === 'printing' || lStatus === 'printing active') tLevel = 3;
                    else if(lStatus === 'out for delivery' || lStatus === 'ready') tLevel = 4;
                    else if(lStatus === 'delivered' || lStatus === 'completed') tLevel = 5;

                    // Render Tracking Steps
                    const steps = [
                        { title: 'Order Placed', desc: 'We have received your order.', icon: 'fa-regular fa-file-lines' },
                        { title: 'Admin Accepted', desc: 'Print details verified.', icon: 'fa-solid fa-user-check' },
                        { title: 'Printing Active', desc: 'Your documents are being printed.', icon: 'fa-solid fa-print' },
                        { title: 'Ready / Out for Delivery', desc: 'Available for pickup or shipping.', icon: 'fa-solid fa-box' },
                        { title: 'Delivered', desc: 'Order successfully completed.', icon: 'fa-solid fa-flag-checkered' }
                    ];

                    let trackingHtml = '';
                    steps.forEach((step, index) => {
                        let stepClass = 'pending';
                        let iconClass = step.icon;
                        
                        if(index < tLevel - 1) stepClass = 'completed';
                        if(index === tLevel - 1) stepClass = 'active';

                        if(stepClass === 'completed') iconClass = 'fa-solid fa-check';

                        trackingHtml += `
                            <div class="tracking-step ${stepClass}">
                                <div class="tracking-icon"><i class="${iconClass}"></i></div>
                                <div class="tracking-content">
                                    <h4>${step.title}</h4>
                                    <p>${step.desc}</p>
                                </div>
                            </div>
                        `;
                    });
                    document.getElementById('tracking-steps-container').innerHTML = trackingHtml;
                    document.getElementById('order-tracking-modal').style.display = 'flex';
                })
                .catch(err => {
                    alert('Order not found or an error occurred: ' + err.message);
                });
        }

        function closeTrackingModal() {
            document.getElementById('order-tracking-modal').style.display = 'none';
        }

        // Initialize orders view
        filterAndSortOrders();

        // --- Init Dashboard ---
        function loadUserStats() {
            fetch('https://xeroxproject-backend-production.up.railway.app/user-stats')
                .then(res => {
                    if(!res.ok) throw new Error("Not logged in");
                    return res.json();
                })
                .then(data => {
                    document.getElementById('dynamic-total-orders').innerText = data.totalOrders;
                    document.getElementById('dynamic-pending-orders').innerText = data.pendingOrders;
                    document.getElementById('dynamic-completed-orders').innerText = data.completedOrders;
                })
                .catch(err => {
                    console.error("Failed to load user stats", err);
                    document.getElementById('dynamic-total-orders').innerText = 0;
                    document.getElementById('dynamic-pending-orders').innerText = 0;
                    document.getElementById('dynamic-completed-orders').innerText = 0;
                });
        }
        // --- Load Transactions ---
        function loadUserTransactions() {
            fetch('https://xeroxproject-backend-production.up.railway.app/getTransactions')
                .then(res => res.json())
                .then(data => {
                    const tbody = document.getElementById('transactions-tbody');
                    if (!data.transactions || data.transactions.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="6" style="padding: 15px; text-align: center; color: #777;">No transactions found</td></tr>';
                        return;
                    }
                    
                    let html = '';
                    data.transactions.forEach(txn => {
                        let statusColor = 'orange'; // default pending
                        if(txn.status.toLowerCase() === 'paid' || txn.status.toLowerCase() === 'success') statusColor = 'green';
                        if(txn.status.toLowerCase() === 'failed' || txn.status.toLowerCase() === 'cancelled') statusColor = 'red';
                        
                        html += `
                            <tr style="border-bottom: 1px solid var(--glass-border);">
                                <td style="padding: 12px; font-weight: 600;">${txn.transactionId}</td>
                                <td style="padding: 12px;">Order: ${txn.orderId}<br><small style="color:#666;">${txn.fileName}</small></td>
                                <td style="padding: 12px;">${txn.date}<br><small style="color:#666;">${txn.time}</small></td>
                                <td style="padding: 12px;">${txn.paymentMethod}</td>
                                <td style="padding: 12px; font-weight: 700;">₹${txn.amount.toFixed(2)}</td>
                                <td style="padding: 12px;"><span style="padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; color: #fff; background: ${statusColor};">${txn.status}</span></td>
                            </tr>
                        `;
                    });
                    tbody.innerHTML = html;
                })
                .catch(err => {
                    console.error("Failed to load transactions", err);
                    document.getElementById('transactions-tbody').innerHTML = '<tr><td colspan="6" style="padding: 15px; text-align: center; color: #e74c3c;">Failed to load transactions</td></tr>';
                });
        }
        function checkServiceAvailability() {
            fetch('https://xeroxproject-backend-production.up.railway.app/service-config')
                .then(res => res.json())
                .then(data => {
                    if (data.isActive === false) {
                        document.getElementById('print-studio-grid').style.display = 'none';
                        document.getElementById('service-downtime-banner').style.display = 'block';
                        if (data.message && data.message.trim() !== '') {
                            document.getElementById('service-downtime-msg').textContent = data.message;
                        }
                    }
                })
                .catch(err => console.error("Failed to fetch service config.", err));
        }

        window.addEventListener('DOMContentLoaded', () => {
            checkServiceAvailability();
            loadUserStats();
            loadUserPointsData();
            loadUserTransactions();
        });
    