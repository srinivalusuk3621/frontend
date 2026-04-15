
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

        // Cleaned up invalid file handlers

        // --- View Navigation & Tab Logic ---
        const menuItems = document.querySelectorAll('.menu-item');
        const views = {
            'dashboard-view': document.getElementById('dashboard-view'),
            'users-view': document.getElementById('users-view'),
            'orders-view': document.getElementById('orders-view'),
            'payments-view': document.getElementById('payments-view'),
            'support-view': document.getElementById('support-view'),
            'service-view': document.getElementById('service-view')
        };

        function switchView(viewId) {
            if (!views[viewId]) return;
            // Hide all views
            Object.values(views).forEach(v => v.style.display = 'none');
            // Show target view
            views[viewId].style.display = 'block';

            // Update active menu link
            menuItems.forEach(i => i.classList.remove('active'));
            const activeLink = document.querySelector(`.menu-item[data-view="${viewId}"]`);
            if (activeLink) activeLink.classList.add('active');

            // Hook loaders if applicable
            if (viewId === 'service-view') loadServiceConfig();
        }

        function loadServiceConfig() {
            fetch('https://xeroxproject-backend-production.up.railway.app/service-config')
                .then(res => res.json())
                .then(data => {
                    document.getElementById('service-active-toggle').checked = data.isActive;
                    document.getElementById('service-message-input').value = data.message || '';
                })
                .catch(err => console.error("Failed to fetch service config.", err));
        }

        function saveServiceConfig() {
            const isActive = document.getElementById('service-active-toggle').checked;
            const message = document.getElementById('service-message-input').value;
            const statusDiv = document.getElementById('service-config-status');

            fetch('https://xeroxproject-backend-production.up.railway.app/service-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: String(isActive), message: message })
            })
                .then(res => res.json())
                .then(data => {
                    statusDiv.style.display = 'block';
                    if (data.success) {
                        statusDiv.style.color = '#2ecc71';
                        statusDiv.innerText = 'Configuration Saved Successfully!';
                    } else {
                        statusDiv.style.color = '#e74c3c';
                        statusDiv.innerText = data.error || 'Failed to save configuration.';
                    }
                    setTimeout(() => { statusDiv.style.display = 'none'; }, 3000);
                })
                .catch(err => {
                    console.error(err);
                    statusDiv.style.display = 'block';
                    statusDiv.style.color = '#e74c3c';
                    statusDiv.innerText = 'Network error saving configuration.';
                    setTimeout(() => { statusDiv.style.display = 'none'; }, 3000);
                });
        }

        menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const targetView = item.getAttribute('data-view');
                if (targetView) switchView(targetView);
                // Also auto-close sidebar on mobile after clicking a link
                if (window.innerWidth <= 768) {
                    toggleSidebar(false);
                }
            });
        });

        // --- Admin Users Load Logic ---
        window.allUsersData = [];

        function loadAdminUsers() {
            fetch('https://xeroxproject-backend-production.up.railway.app/getAllUsers')
                .then(res => {
                    if (!res.ok) throw new Error("Unauthorized fetching users");
                    return res.json();
                })
                .then(data => {
                    if (data.users) {
                        window.allUsersData = data.users;
                        filterAndRenderUsers();
                    }
                })
                .catch(err => {
                    console.error("Failed to load users", err);
                    document.getElementById('admin-users-tbody').innerHTML = '<tr><td colspan="6" style="padding: 15px; text-align: center; color: #e74c3c;">Failed to fetch users</td></tr>';
                });
        }

        function filterAndRenderUsers() {
            const tbody = document.getElementById('admin-users-tbody');
            const searchTxt = document.getElementById('user-search').value.toLowerCase();
            const orderFilter = document.getElementById('user-orders-filter').value;
            const paymentFilter = document.getElementById('user-payment-filter').value;
            const sortSelection = document.getElementById('user-sort').value;

            // Deep clone to filter and sort natively
            let filtered = [...window.allUsersData];

            // 1. Text Filters explicitly
            if (searchTxt) {
                filtered = filtered.filter(u =>
                    (u.name && u.name.toLowerCase().includes(searchTxt)) ||
                    (u.email && u.email.toLowerCase().includes(searchTxt)) ||
                    (u.phone && u.phone.toLowerCase().includes(searchTxt))
                );
            }

            // 2. Numerical Filter Mapping
            if (orderFilter === 'high') filtered = filtered.filter(u => u.totalOrders > 5);
            if (orderFilter === 'low') filtered = filtered.filter(u => u.totalOrders <= 5);

            if (paymentFilter === 'high') filtered = filtered.filter(u => u.totalPayment > 500);
            if (paymentFilter === 'low') filtered = filtered.filter(u => u.totalPayment <= 500);

            // 3. Array Structuring Constraints
            if (sortSelection === 'name-asc') {
                filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            } else if (sortSelection === 'name-desc') {
                filtered.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
            } else if (sortSelection === 'orders-desc') {
                filtered.sort((a, b) => b.totalOrders - a.totalOrders);
            } else if (sortSelection === 'payment-desc') {
                filtered.sort((a, b) => b.totalPayment - a.totalPayment);
            }

            // Render Output Array dynamically
            if (filtered.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="padding: 15px; text-align: center; color: #777;">No users found</td></tr>';
                return;
            }

            let html = '';
            filtered.forEach(u => {
                html += `
                    <tr style="border-bottom: 1px solid var(--glass-border);">
                        <td style="padding: 15px; font-weight: 600;">#${u.id}</td>
                        <td style="padding: 15px; font-weight: 700;">${u.name}</td>
                        <td style="padding: 15px;">
                            <div style="font-size: 13px;"><i class="fa-solid fa-envelope" style="color: #666; margin-right:5px;"></i>${u.email}</div>
                            <div style="font-size: 13px; margin-top: 5px;"><i class="fa-solid fa-phone" style="color: #666; margin-right:5px;"></i>${u.phone}</div>
                        </td>
                        <td style="padding: 15px;">
                            <span style="background: rgba(75, 125, 176, 0.1); color: var(--primary); padding: 5px 10px; border-radius: 15px; font-size: 13px; font-weight: 700;">
                                <i class="fa-solid fa-file-invoice"></i> ${u.totalOrders}
                            </span>
                        </td>
                        <td style="padding: 15px; font-weight: 800; color: #2ecc71;">₹${u.totalPayment.toFixed(2)}</td>
                        <td style="padding: 15px;">
                            <button onclick="openAdminUserDetails(${u.id})" style="padding: 8px 12px; background: var(--primary); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; transition: background 0.2s;">
                                <i class="fa-solid fa-eye"></i> View Details
                            </button>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
        }

        function openAdminUserDetails(userId) {
            document.getElementById('user-details-modal').style.display = 'flex';
            document.getElementById('modal-ud-name').textContent = "Loading...";
            document.getElementById('modal-ud-email').textContent = "-";
            document.getElementById('modal-ud-phone').textContent = "-";
            document.getElementById('modal-ud-orders').textContent = "-";
            document.getElementById('modal-ud-revenue').textContent = "-";
            document.getElementById('modal-ud-tbody').innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">Fetching insights...</td></tr>';

            fetch('https://xeroxproject-backend-production.up.railway.app/getUserDetails?userId=' + userId)
                .then(res => res.json())
                .then(data => {
                    if (data.error) {
                        alert(data.error);
                        closeUserInsightsModal();
                        return;
                    }

                    const u = data.user;
                    const orders = data.orders || [];
                    const trans = data.transactions || [];

                    document.getElementById('modal-ud-name').textContent = u.name;
                    document.getElementById('modal-ud-email').textContent = u.email;
                    document.getElementById('modal-ud-phone').textContent = u.phone;
                    document.getElementById('modal-ud-orders').textContent = orders.length;

                    // Sum Revenue
                    let totRev = 0;
                    orders.forEach(o => {
                        if (o.status && (o.status.toLowerCase() === 'delivered' || o.status.toLowerCase() === 'completed')) {
                            totRev += o.amount || 0;
                        }
                    });
                    document.getElementById('modal-ud-revenue').textContent = '₹' + totRev.toFixed(2);

                    let tbHtml = '';
                    if (orders.length === 0) {
                        tbHtml = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #777;">No orders found for this user.</td></tr>';
                    } else {
                        orders.forEach(o => {
                            let itemAmt = o.amount || 0;
                            tbHtml += `
                                <tr style="border-bottom: 1px solid rgba(0,0,0,0.05);">
                                    <td style="padding: 12px 15px; font-weight: 600;">#ORD-${o.id}</td>
                                    <td style="padding: 12px 15px;">${o.file_name}</td>
                                    <td style="padding: 12px 15px;">${o.status}</td>
                                    <td style="padding: 12px 15px; font-weight: bold; color: var(--primary);">₹${itemAmt.toFixed(2)}</td>
                                </tr>
                            `;
                        });
                    }
                    document.getElementById('modal-ud-tbody').innerHTML = tbHtml;
                })
                .catch(err => {
                    console.error(err);
                    document.getElementById('modal-ud-name').textContent = "Error Loading";
                    document.getElementById('modal-ud-tbody').innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #e74c3c;">Failed to fetch backend data.</td></tr>';
                });
        }

        function closeUserInsightsModal() {
            document.getElementById('user-details-modal').style.display = 'none';
        }

        // Cleaned up Dead Code
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

        // --- Global Orders Pipeline Logic ---
        window.allAdminOrders = [];
        window.currentManagingOrderId = null;

        function loadAdminOrders() {
            fetch('https://xeroxproject-backend-production.up.railway.app/get-all-orders')
                .then(res => {
                    if (!res.ok) throw new Error("Unauthorized fetching orders");
                    return res.json();
                })
                .then(data => {
                    if (data.orders) {
                        window.allAdminOrders = data.orders;
                        filterAdminOrders();
                        filterAdminPayments(); // Also populate payments module
                    }
                })
                .catch(err => {
                    console.error("Failed to load admin orders", err);
                    document.getElementById('global-orders-tbody').innerHTML = '<tr><td colspan="7" style="padding: 15px; text-align: center; color: #e74c3c;">Failed to fetch orders</td></tr>';
                });
        }

        function filterAdminOrders() {
            const tbody = document.getElementById('global-orders-tbody');
            const searchTxt = document.getElementById('admin-order-search').value.toLowerCase();
            const statusFilter = document.getElementById('admin-order-status-filter').value;

            let filtered = [...window.allAdminOrders];

            if (searchTxt) {
                filtered = filtered.filter(o =>
                    (o.username && o.username.toLowerCase().includes(searchTxt)) ||
                    (o.phone && o.phone.toLowerCase().includes(searchTxt)) ||
                    (String(o.id).includes(searchTxt)) ||
                    (o.email && o.email.toLowerCase().includes(searchTxt))
                );
            }

            if (statusFilter !== 'all') {
                filtered = filtered.filter(o => o.status.toLowerCase() === statusFilter.toLowerCase());
            }

            if (filtered.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="padding: 15px; text-align: center; color: #777;">No Orders Available</td></tr>';
                return;
            }

            let html = '';
            filtered.forEach(o => {
                let badgeColor = '#f39c12'; // Pending
                if (o.status === 'Printing' || o.status === 'Accepted') badgeColor = '#3498db';
                if (o.status === 'Ready' || o.status === 'Delivered') badgeColor = '#2ecc71';

                html += `
                    <tr style="border-bottom: 1px solid var(--glass-border);">
                        <td style="padding: 15px; font-weight: 600;">#ORD-${o.id}</td>
                        <td style="padding: 15px; font-weight: 700;">${o.username}</td>
                        <td style="padding: 15px;">
                            <div style="font-size: 13px;"><i class="fa-solid fa-phone" style="color: #666; margin-right:5px;"></i>${o.phone}</div>
                            <div style="font-size: 13px; margin-top: 5px;"><i class="fa-solid fa-envelope" style="color: #666; margin-right:5px;"></i>${o.email}</div>
                        </td>
                        <td style="padding: 15px;">${o.file_name}</td>
                        <td style="padding: 15px; font-weight: 800; color: #2ecc71;">₹${o.amount.toFixed(2)}</td>
                        <td style="padding: 15px;">
                            <span style="background: ${badgeColor}22; color: ${badgeColor}; padding: 5px 10px; border-radius: 15px; font-size: 13px; font-weight: 700;">
                                ${o.status}
                            </span>
                        </td>
                        <td style="padding: 15px;">
                            <button onclick="openAdminOrderDetails(${o.id})" style="padding: 8px 12px; background: var(--primary); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; transition: background 0.2s;">
                                View Details
                            </button>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;

            // --- Real-time Notifications Hook ---
            populateOrderNotifications();
        }

        function populateOrderNotifications() {
            // Sort by Created At descending (simulated by ID descending if created_at absent)
            let sortedDe = [...window.allAdminOrders].sort((a, b) => b.id - a.id);

            // 1. Recent Orders Engine (Top 7)
            let recentHtml = '';
            sortedDe.slice(0, 7).forEach(o => {
                recentHtml += `
                    <div class="notification-list-item" onclick="openAdminOrderDetails(${o.id}); switchView('orders-view');">
                        <div class="notification-list-title"><span>#ORD-${o.id} - ${o.username}</span> <span>₹${o.amount.toFixed(2)}</span></div>
                        <div class="notification-list-meta"><i class="fa-solid fa-clock"></i> User File: ${o.file_name}</div>
                    </div>
                `;
            });
            if (recentHtml === '') recentHtml = '<div style="text-align: center; color: #777; font-size: 13px; padding: 20px;">No recent activity</div>';
            document.getElementById('notify-recent-orders').innerHTML = recentHtml;

            // 2. Pending Actions Engine
            let pendingArr = sortedDe.filter(o => o.status.toLowerCase() === 'pending' || o.status.toLowerCase() === 'admin not accepted');
            let pendingHtml = '';
            pendingArr.forEach(o => {
                pendingHtml += `
                    <div class="notification-list-item" style="border-left-color: #f39c12;" onclick="openAdminOrderDetails(${o.id}); switchView('orders-view');">
                        <div class="notification-list-title"><span>#ORD-${o.id} - ${o.username}</span> <span style="color: #f39c12;">${o.status}</span></div>
                        <div class="notification-list-meta"><i class="fa-solid fa-clock"></i> Action required</div>
                    </div>
                `;
            });
            if (pendingHtml === '') pendingHtml = '<div style="text-align: center; color: #777; font-size: 13px; padding: 20px;">All clear!</div>';
            document.getElementById('notify-pending-orders').innerHTML = pendingHtml;

            // 3. Sidebar Badges
            const badgeOrders = document.getElementById('badge-orders');
            if (pendingArr.length > 0) {
                badgeOrders.style.display = 'inline-block';
                badgeOrders.innerText = pendingArr.length;
            } else {
                badgeOrders.style.display = 'none';
            }
        }

        // --- Admin Payments Load Logic ---
        function filterAdminPayments() {
            const tbody = document.getElementById('admin-payments-tbody');
            const searchTxt = document.getElementById('payments-search-input').value.toLowerCase();
            const statusFilter = document.getElementById('payments-status-filter').value;
            const sortFilter = document.getElementById('payments-sort-filter').value;

            let filtered = window.allAdminOrders.filter(o => o.payment_status && o.payment_status !== "");

            // Filtering
            if (searchTxt) {
                filtered = filtered.filter(o =>
                    (o.username && o.username.toLowerCase().includes(searchTxt)) ||
                    (o.email && o.email.toLowerCase().includes(searchTxt)) ||
                    (o.id.toString().includes(searchTxt)) ||
                    (o.file_name && o.file_name.toLowerCase().includes(searchTxt))
                );
            }
            if (statusFilter !== 'all') {
                filtered = filtered.filter(o => o.payment_status.toLowerCase() === statusFilter.toLowerCase());
            }

            // Sorting
            if (sortFilter === 'latest') {
                filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            } else if (sortFilter === 'highest') {
                filtered.sort((a, b) => b.amount - a.amount);
            }

            // Calculate Revenue Native
            let totalRevenue = 0;
            filtered.forEach(o => {
                if (['paid', 'completed'].includes(o.payment_status.toLowerCase())) {
                    totalRevenue += o.amount;
                }
            });
            document.getElementById('payments-total-rev').textContent = '₹' + totalRevenue.toFixed(2);

            // Rendering
            if (filtered.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="padding: 15px; text-align: center; color: #777;">No payment transactions available.</td></tr>';
                return;
            }

            let html = '';
            filtered.forEach(o => {
                let badgeClass = 'payment-pending';
                if (o.payment_status.toLowerCase() === 'paid' || o.payment_status.toLowerCase() === 'completed') badgeClass = 'payment-paid';
                if (o.payment_status.toLowerCase() === 'failed') badgeClass = 'payment-failed'; // Note: you'd need CSS for this

                html += `
                    <tr style="border-bottom: 1px solid var(--glass-border);">
                        <td style="padding: 15px; font-weight: 600;">PAY-${o.id}</td>
                        <td style="padding: 15px;">
                            <div style="font-weight: 700;">${o.username}</div>
                            <div style="font-size: 12px; color: #666;">${o.email}</div>
                            <div style="font-size: 12px; color: #666;">${o.phone}</div>
                        </td>
                        <td style="padding: 15px; font-weight: 600; font-size: 13px;">${o.file_name}</td>
                        <td style="padding: 15px; font-size: 13px; color: #444;">${o.created_at}</td>
                        <td style="padding: 15px; font-weight: 800; color: #2ecc71;">₹${o.amount.toFixed(2)}</td>
                        <td style="padding: 15px;">
                            <span class="payment-status-badge ${badgeClass}" style="margin-top: 0; padding: 4px 10px; font-size: 12px;">
                                ${o.payment_status}
                            </span>
                            <div style="font-size: 11px; color:#888; font-weight:700; margin-top:3px;">via ${o.payment_method}</div>
                        </td>
                        <td style="padding: 15px;">
                            <button onclick="openAdminOrderDetails(${o.id})" style="padding: 8px 12px; background: transparent; color: var(--primary); border: 1px solid var(--primary); border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s;">
                                View Details
                            </button>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
        }

        function openAdminOrderDetails(orderId) {
            const order = window.allAdminOrders.find(o => o.id === orderId);
            if (!order) return;

            window.currentManagingOrderId = orderId;

            // Update Left Side Info natively
            document.getElementById('modal-order-id').textContent = order.id;
            document.getElementById('modal-file-name').textContent = order.file_name;
            document.getElementById('modal-pages-copies').textContent = `${order.pages} pgs x ${order.copies}`;
            document.getElementById('modal-color').textContent = order.color;
            document.getElementById('modal-setup').textContent = order.paper_size;
            document.getElementById('modal-total-cost').textContent = `₹${order.amount.toFixed(2)}`;

            const payStatusEl = document.getElementById('modal-pay-status');
            if (order.payment_status && (order.payment_status.toLowerCase() === 'paid' || order.payment_status.toLowerCase() === 'completed')) {
                payStatusEl.className = 'payment-status-badge payment-paid';
                payStatusEl.innerHTML = '<i class="fa-solid fa-check-circle"></i> Paid (' + order.payment_method + ')';
            } else {
                payStatusEl.className = 'payment-status-badge payment-pending';
                payStatusEl.innerHTML = '<i class="fa-solid fa-clock-rotate-left"></i> ' + (order.payment_status || 'Pending');
            }

            // Bind Download
            const dlBtn = document.getElementById('modal-download-btn');
            if (dlBtn) {
                dlBtn.onclick = function () {
                    window.open('/xerox/download-file?fileName=' + encodeURIComponent(order.file_name), '_blank');
                };
            }

            // Sync Tracker Checkboxes Right Side
            const levels = ['Pending', 'Accepted', 'Printing', 'Ready', 'Delivered'];
            let currentLevelIdx = levels.findIndex(l => l.toLowerCase() === order.status.toLowerCase());
            if (currentLevelIdx === -1) currentLevelIdx = 0; // fallback

            ['accepted', 'printing', 'ready', 'delivered'].forEach((st, idx) => {
                const el = document.getElementById('chk-' + st);
                const block = document.getElementById('box-' + st);

                // Actual index mapping offset by 1 since 'Pending' is 0
                const targetIdx = idx + 1;

                if (targetIdx <= currentLevelIdx) {
                    // Already passed this status
                    el.checked = true;
                    el.disabled = true;
                    block.style.background = 'rgba(46, 204, 113, 0.1)';
                } else if (targetIdx === currentLevelIdx + 1) {
                    // This is the next available step
                    el.checked = false;
                    el.disabled = false;
                    block.style.background = 'rgba(0,0,0,0.02)';
                } else {
                    // Futures steps are locked
                    el.checked = false;
                    el.disabled = true;
                    block.style.background = 'rgba(0,0,0,0.02)';
                }
            });

            document.getElementById('order-tracking-modal').style.display = 'flex';
        }

        function updateOrderStatusAction(statusTarget) {
            if (!window.currentManagingOrderId) return;

            if (!confirm("Advance order status to: " + statusTarget + "?")) {
                loadAdminOrders(); // reset checks cleanly
                closeTrackingModal();
                return;
            }

            fetch('https://xeroxproject-backend-production.up.railway.app/update-order-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: window.currentManagingOrderId,
                    status: statusTarget
                })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        alert('Order Status Updated Successfully!');
                        loadAdminOrders(); // Pull fresh data seamlessly!
                        closeTrackingModal(); // close automatically Native UI mapping
                    } else {
                        alert(data.error || 'Failed to update order');
                    }
                })
                .catch(err => {
                    console.error("Update error: ", err);
                    alert("Connection failed.");
                });
        }

        function closeTrackingModal() {
            document.getElementById('order-tracking-modal').style.display = 'none';
        }

        // --- Admin Support Tickets Pipeline ---
        window.allAdminTickets = [];
        window.currentManagingTicketId = null;

        function loadAdminTickets() {
            fetch('https://xeroxproject-backend-production.up.railway.app/get-admin-tickets')
                .then(res => res.json())
                .then(data => {
                    if (data.tickets) {
                        window.allAdminTickets = data.tickets;
                        filterAdminTickets();
                    }
                })
                .catch(err => {
                    console.error("Failed to load generic tickets", err);
                    document.getElementById('admin-tickets-tbody').innerHTML = '<tr><td colspan="7" style="padding: 15px; text-align: center; color: #e74c3c;">Failed to fetch tickets</td></tr>';
                });
        }

        function filterAdminTickets() {
            const tbody = document.getElementById('admin-tickets-tbody');
            const searchTxt = document.getElementById('admin-ticket-search').value.toLowerCase();
            const statusFilter = document.getElementById('admin-ticket-status-filter').value;

            let filtered = [...window.allAdminTickets];

            if (searchTxt) {
                filtered = filtered.filter(t =>
                    (String(t.id).includes(searchTxt)) ||
                    (t.userName && t.userName.toLowerCase().includes(searchTxt)) ||
                    (t.email && t.email.toLowerCase().includes(searchTxt))
                );
            }
            if (statusFilter !== 'all') {
                filtered = filtered.filter(t => t.status.toLowerCase() === statusFilter.toLowerCase());
            }

            if (filtered.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="padding: 15px; text-align: center; color: #777;">No support tickets found natively in database.</td></tr>';
                return;
            }

            let html = '';
            filtered.forEach(t => {
                let badgeClass = 'payment-pending';
                if (t.status.toLowerCase() === 'resolved') badgeClass = 'payment-paid';
                if (t.status.toLowerCase() === 'in progress') badgeClass = 'payment-failed'; // Re-using styling class visually

                html += `
                    <tr style="border-bottom: 1px solid var(--glass-border);">
                        <td style="padding: 15px; font-weight: 600;">TKT-${t.id}</td>
                        <td style="padding: 15px;">
                            <div style="font-weight: 700;">${t.userName}</div>
                        </td>
                        <td style="padding: 15px; font-size: 12px; color: #666;">
                            <div>${t.email}</div>
                            <div>${t.phone || t.contactData || 'N/A'}</div>
                        </td>
                        <td style="padding: 15px; font-size: 13px; color: #444; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${t.message}
                        </td>
                        <td style="padding: 15px;">
                            <span class="payment-status-badge ${badgeClass}" style="margin-top: 0; padding: 4px 10px; font-size: 12px;">
                                ${t.status}
                            </span>
                        </td>
                        <td style="padding: 15px; font-size: 13px; color: #444;">${t.createdAt.substring(0, 16)}</td>
                        <td style="padding: 15px;">
                            <button onclick="openAdminTicketModal(${t.id})" style="padding: 8px 12px; background: transparent; color: var(--primary); border: 1px solid var(--primary); border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s;">
                                Resolve
                            </button>
                        </td>
                    </tr>
                `;
            });
        tbody.innerHTML = html;
        // --- Real-time Notifications Hook ---
        populateTicketNotifications();
        }

        function populateTicketNotifications() {
            // Sort by Created At descending
            let sortedDe = [...window.allAdminTickets].sort((a, b) => b.id - a.id);

            // 3. Open Support Tickets Engine
            let openArr = sortedDe.filter(t => t.status.toLowerCase() === 'open');
            let ticketsHtml = '';
            openArr.forEach(t => {
                ticketsHtml += `
                    <div class="notification-list-item" style="border-left-color: #e74c3c;" onclick="openAdminTicketModal(${t.id}); switchView('support-view');">
                        <div class="notification-list-title"><span>#TKT-${t.id} - ${t.userName}</span> <span style="color: #e74c3c;">${t.status}</span></div>
                        <div class="notification-list-meta" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"><i class="fa-solid fa-circle-info"></i> ${t.message}</div>
                    </div>
                `;
            });
            if (ticketsHtml === '') ticketsHtml = '<div style="text-align: center; color: #777; font-size: 13px; padding: 20px;">No open support tickets!</div>';
            document.getElementById('notify-live-tickets').innerHTML = ticketsHtml;

            // 3. Sidebar Badges for Tickets
            const badgeTickets = document.getElementById('badge-tickets');
            if (openArr.length > 0) {
                badgeTickets.style.display = 'inline-block';
                badgeTickets.innerText = openArr.length;
            } else {
                badgeTickets.style.display = 'none';
            }
        }

        function openAdminTicketModal(ticketId) {
            const ticket = window.allAdminTickets.find(t => t.id === ticketId);
            if (!ticket) return;

            window.currentManagingTicketId = ticketId;

            document.getElementById('modal-ticket-id').textContent = '#TKT-' + ticket.id;
            document.getElementById('modal-ticket-name').textContent = ticket.userName;
            document.getElementById('modal-ticket-contact').textContent = ticket.contactMethod === 'email' ? ticket.email : ticket.contactData;
            document.getElementById('modal-ticket-date').textContent = ticket.createdAt;
            document.getElementById('modal-ticket-message').textContent = ticket.message;
            document.getElementById('modal-ticket-status').value = ticket.status;
            document.getElementById('modal-ticket-reply').value = ticket.adminReply || '';

            document.getElementById('admin-ticket-modal').style.display = 'flex';
        }

        function closeAdminTicketModal() {
            document.getElementById('admin-ticket-modal').style.display = 'none';
        }

        function processAdminTicketUpdate() {
            if (!window.currentManagingTicketId) return;

            const btn = document.getElementById('btn-update-ticket');
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
            btn.disabled = true;

            const payload = {
                ticketId: window.currentManagingTicketId,
                status: document.getElementById('modal-ticket-status').value,
                adminReply: document.getElementById('modal-ticket-reply').value
            };

            fetch('https://xeroxproject-backend-production.up.railway.app/update-ticket', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        alert('Ticket state manually overridden resolving cleanly.');
                        closeAdminTicketModal();
                        loadAdminTickets(); // Refresh table seamlessly
                    } else {
                        alert('Error: ' + data.error);
                    }
                })
                .catch(err => {
                    console.error("Failed dispatching admin ticket override", err);
                    alert("Connection failed.");
                })
                .finally(() => {
                    btn.innerHTML = 'Deploy Status Changes';
                    btn.disabled = false;
                });
        }

        // --- Admin Dashboard Stats Fetch Logic ---
        function loadAdminStats() {
            fetch('https://xeroxproject-backend-production.up.railway.app/admin-stats')
                .then(res => {
                    if (!res.ok) throw new Error("Unauthorized or Invalid Admin session");
                    return res.json();
                })
                .then(data => {
                    document.getElementById('admin-total-users').innerText = data.totalUsers || 0;
                    document.getElementById('admin-pending-orders').innerText = data.pendingOrders || 0;
                    document.getElementById('admin-completed-orders').innerText = data.completedPrints || 0;
                    document.getElementById('admin-revenue').innerText = '₹' + (data.totalRevenue || 0.0).toFixed(2);
                })
                .catch(err => {
                    console.error("Failed to load admin stats dynamically", err);
                    document.getElementById('admin-total-users').innerText = 0;
                    document.getElementById('admin-pending-orders').innerText = 0;
                    document.getElementById('admin-completed-orders').innerText = 0;
                    document.getElementById('admin-revenue').innerText = '₹0.00';
                });
        }

        window.addEventListener('DOMContentLoaded', () => {
            loadAdminStats();
            loadAdminUsers();
            loadAdminOrders();
            loadAdminTickets();

            // --- Silent Real-Time Sync Hook ---
            setInterval(() => {
                loadAdminStats();
                loadAdminOrders();
                loadAdminTickets();
            }, 30000); // 30 second interval silently syncing Orders & Tickets arrays
        });

    