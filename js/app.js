document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI listeners
    UI.init();

    // Check authentication
    if (Auth.isLoggedIn()) {
        showMainApp();
    } else {
        showLogin();
    }

    // Navigation links (already delegated in UI, but ensure any other initialization)
    document.querySelectorAll('[data-section]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.getAttribute('data-section');

            // Update active state
            document.querySelectorAll('[data-section]').forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Render section
            switch (section) {
                case 'dashboard': UI.renderDashboard(); break;
                case 'infrastructure': UI.renderInfrastructure(); break;
                case 'users': UI.renderUsers(); break;
                case 'logs': UI.renderLogs(); break;
                case 'settings': UI.renderSettings(); break;
            }
        });
    });

    // Login Form
    document.getElementById('login-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const originalContent = btn.innerHTML;

        // Loading state
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Iniciando...';

        const user = document.getElementById('login-username').value;
        const pass = document.getElementById('login-password').value;

        try {
            if (await Auth.login(user, pass)) {
                showMainApp();
                Swal.fire({
                    icon: 'success',
                    title: '¡Bienvenido!',
                    text: 'Acceso concedido al AdminPanel',
                    timer: 1500,
                    showConfirmButton: false,
                    toast: true,
                    position: 'top-end'
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Acceso Denegado',
                    text: 'Credenciales incorrectas. Intenta con: admin / admin123',
                    confirmButtonColor: '#4361ee',
                    confirmButtonText: 'Entendido'
                });
            }
        } catch (error) {
            console.error('Error de login:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error del Sistema',
                text: 'No se pudo conectar con la base de datos local IndexedDB.',
                confirmButtonColor: '#f72585',
                confirmButtonText: 'Cerrar'
            });
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalContent;
        }
    });

    // Logout
    document.getElementById('btn-logout')?.addEventListener('click', async (e) => {
        e.preventDefault();
        const result = await Swal.fire({
            title: '¿Cerrar Sesión?',
            text: "Se finalizará tu sesión actual",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#f72585',
            cancelButtonColor: '#4361ee',
            confirmButtonText: 'Sí, salir',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            Auth.logout();
        }
    });

    // Forgot Password
    const recoveryModal = new bootstrap.Modal(document.getElementById('recoveryModal'));
    document.getElementById('btn-forgot-password')?.addEventListener('click', (e) => {
        e.preventDefault();
        recoveryModal.show();
    });

    document.getElementById('btn-check-user')?.addEventListener('click', async () => {
        const username = document.getElementById('recovery-username').value;
        const question = await Auth.getSecurityQuestion(username);
        if (question) {
            document.getElementById('recovery-question').innerText = question;
            document.getElementById('recovery-step-1').classList.add('d-none');
            document.getElementById('recovery-step-2').classList.remove('d-none');
        } else {
            Swal.fire('Error', 'Usuario no encontrado', 'error');
        }
    });

    document.getElementById('btn-verify-answer')?.addEventListener('click', async () => {
        const username = document.getElementById('recovery-username').value;
        const answer = document.getElementById('recovery-answer').value;
        if (await Auth.verifySecurityAnswer(username, answer)) {
            document.getElementById('recovery-step-2').classList.add('d-none');
            document.getElementById('recovery-step-3').classList.remove('d-none');
        } else {
            Swal.fire('Error', 'Respuesta incorrecta', 'error');
        }
    });

    document.getElementById('btn-reset-password')?.addEventListener('click', async () => {
        const username = document.getElementById('recovery-username').value;
        const newPass = document.getElementById('new-password').value;
        if (await Auth.resetPassword(username, newPass)) {
            Swal.fire('Éxito', 'Contraseña actualizada con éxito', 'success');
            recoveryModal.hide();
        }
    });
});

function showLogin() {
    document.getElementById('login-container').classList.remove('d-none');
    document.getElementById('main-container').classList.add('d-none');
}

function showMainApp() {
    document.getElementById('login-container').classList.add('d-none');
    document.getElementById('main-container').classList.remove('d-none');
    document.getElementById('current-user-display').innerText = Auth.currentUser.username;
    UI.renderDashboard();
}
