let toastTimer;
export function launchToastAlert(message) {
    const toast = document.getElementById('toast-alert');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}
export function bindActions(actions) {
    document.querySelectorAll('[data-action]').forEach(element => {
        const action = actions[element.dataset.action];
        if (!action) throw new Error('Unknown action: ' + element.dataset.action);
        element.addEventListener('click', () => action(element.dataset.value));
    });
}
