/**
 * dropdown-table.js - Expand/collapse behaviour for the command tables.
 *
 * Replaces two drifted inline copies (botcommands.html and wildcatttsdocs.html)
 * that bound `click` straight to the <tr>. A <tr> is not focusable and has no
 * role, so the usage syntax and examples in the detail rows -- the only place
 * that information exists -- were unreachable without a mouse. The control is
 * now a real <button> inside the description cell.
 */

document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.dropdown-group').forEach(group => {
        const summary = group.querySelector('.dropdown-summary');
        const details = group.querySelector('.dropdown-details');
        const trigger = summary && summary.querySelector('.dropdown-trigger');
        if (!summary || !details || !trigger) return;

        function setOpen(open) {
            group.classList.toggle('open', open);
            details.hidden = !open;
            trigger.setAttribute('aria-expanded', String(open));
        }

        // Sync state with whatever the markup shipped with
        setOpen(group.classList.contains('open'));

        trigger.addEventListener('click', function () {
            setOpen(details.hidden);
        });

        // Keep the whole row clickable for pointer users, without
        // double-firing when the button itself is the target.
        summary.addEventListener('click', function (e) {
            if (e.target.closest('.dropdown-trigger')) return;
            trigger.click();
        });
    });
});
