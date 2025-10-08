/**
 * sidenav.js - Handles the sidebar navigation toggle functionality
 * Updated to work with unified navigation system
 */

document.addEventListener('DOMContentLoaded', function() {
    // Only run on pages with sidebar
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    // Get DOM elements
    const sidebarToggle = document.getElementById('sidenav-toggle');
    const content = document.getElementById('content');

    // Check if we have a stored preference, otherwise use responsive default
    const storedState = localStorage.getItem('sidebarCollapsed');
    let sidebarCollapsed;

    if (storedState !== null) {
        // Use stored preference if it exists
        sidebarCollapsed = storedState === 'true';
    } else {
        // Default behavior: collapsed on mobile (<=768px), open on desktop
        sidebarCollapsed = window.innerWidth <= 768;
    }
    
    // Apply the state on page load
    if (sidebarCollapsed) {
        sidebar.classList.add('collapsed');
        content.classList.add('expanded');
    }
    
    // Toggle sidebar when clicking the icon
    sidebarToggle.addEventListener('click', function() {
        // Toggle the collapsed class on the sidebar
        sidebar.classList.toggle('collapsed');
        
        // Toggle the expanded class on the content
        content.classList.toggle('expanded');
        
        // Store the current state in localStorage
        const isCollapsed = sidebar.classList.contains('collapsed');
        localStorage.setItem('sidebarCollapsed', isCollapsed);
    });
    
    // Add event listener for sidebar links to ensure they work properly on mobile
    const sidebarLinks = sidebar.querySelectorAll('a');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function() {
            // On mobile or when collapsed, close the sidebar when a link is clicked
            if (window.innerWidth <= 768 || sidebar.classList.contains('collapsed')) {
                sidebar.classList.add('collapsed');
                content.classList.add('expanded');
                localStorage.setItem('sidebarCollapsed', 'true');
            }
        });
    });
    
    // Add responsive behavior
    window.addEventListener('resize', function() {
        // Auto-collapse sidebar on small screens
        if (window.innerWidth <= 768) {
            sidebar.classList.add('collapsed');
            content.classList.add('expanded');
        }
    });
    
    // Initially trigger a resize event to handle mobile devices
    if (window.innerWidth <= 768) {
        sidebar.classList.add('collapsed');
        content.classList.add('expanded');
    }
    
    // Collapsible submenu for sidebar
    const submenuLinks = sidebar.querySelectorAll('a.has-submenu');
    submenuLinks.forEach(link => {
        const caret = link.querySelector('.submenu-caret');
        if (caret) {
            // Toggle submenu on caret click
            caret.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const li = link.parentElement;
                const isOpen = li.classList.contains('open');
                // Close all other submenus
                sidebar.querySelectorAll('ul > li.open').forEach(openLi => {
                    if (openLi !== li) openLi.classList.remove('open');
                });
                // Toggle this submenu
                li.classList.toggle('open', !isOpen);
            });
            // Keyboard accessibility
            caret.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    caret.click();
                }
            });
        }
        // Also expand submenu on link click (in addition to caret)
        link.addEventListener('click', function(e) {
            const li = link.parentElement;
            const isOpen = li.classList.contains('open');
            if (!isOpen) {
                // Close all other submenus
                sidebar.querySelectorAll('ul > li.open').forEach(openLi => {
                    if (openLi !== li) openLi.classList.remove('open');
                });
                li.classList.add('open');
                // Allow navigation to anchor
            }
            // If already open, just allow navigation
        });
    });
});