// Configuración de contraseñas
const AUTH_CONFIG = {
  ADMIN_PASSWORD: '123',
  VIEWER_PASSWORD: 'familia'
};

// Estado de autenticación
let currentUser = {
  role: null,
  authenticated: false
};

// Elementos del DOM
const loginScreen = document.getElementById('loginScreen');
const mainApp = document.getElementById('mainApp');
const loginForm = document.getElementById('loginForm');
const passwordInput = document.getElementById('passwordInput');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const userBadge = document.getElementById('userBadge');
const adminPanelBtn = document.getElementById('adminPanelBtn');
const viewTreeBtn = document.getElementById('viewTreeBtn');
const treeView = document.getElementById('treeView');
const adminPanel = document.getElementById('adminPanel');

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  checkSession();
  setupAuthListeners();
});

function setupAuthListeners() {
  loginForm.addEventListener('submit', handleLogin);
  logoutBtn.addEventListener('click', handleLogout);
  adminPanelBtn.addEventListener('click', () => switchView('admin'));
  viewTreeBtn.addEventListener('click', () => switchView('tree'));
}

function handleLogin(e) {
  e.preventDefault();
  const password = passwordInput.value.trim();
  
  if (password === AUTH_CONFIG.ADMIN_PASSWORD) {
    authenticateUser('admin');
  } else if (password === AUTH_CONFIG.VIEWER_PASSWORD) {
    authenticateUser('viewer');
  } else {
    showLoginError('Contraseña incorrecta');
    passwordInput.value = '';
    passwordInput.focus();
  }
}

function authenticateUser(role) {
  currentUser = {
    role: role,
    authenticated: true
  };
  
  // Guardar sesión
  sessionStorage.setItem('userRole', role);
  
  // Actualizar UI
  loginScreen.classList.add('hidden');
  mainApp.classList.remove('hidden');
  
  // Configurar badge
  if (role === 'admin') {
    userBadge.textContent = '🔒 ADMIN';
    userBadge.className = 'badge badge-admin';
    adminPanelBtn.classList.remove('hidden');
    viewTreeBtn.classList.remove('hidden');
    switchView('tree');
  } else {
    userBadge.textContent = '👁️ VIEWER';
    userBadge.className = 'badge badge-viewer';
    adminPanelBtn.classList.add('hidden');
    viewTreeBtn.classList.add('hidden');
    switchView('tree');
  }
  
  // Cargar datos
  loadData();
}

function handleLogout() {
  if (confirm('¿Cerrar sesión?')) {
    sessionStorage.removeItem('userRole');
    location.reload();
  }
}

function checkSession() {
  const savedRole = sessionStorage.getItem('userRole');
  if (savedRole) {
    authenticateUser(savedRole);
  }
}

function switchView(view) {
  if (view === 'admin') {
    treeView.classList.add('hidden');
    adminPanel.classList.remove('hidden');
    viewTreeBtn.classList.remove('hidden');
    adminPanelBtn.classList.add('hidden');
  } else {
    treeView.classList.remove('hidden');
    adminPanel.classList.add('hidden');
    if (currentUser.role === 'admin') {
      viewTreeBtn.classList.add('hidden');
      adminPanelBtn.classList.remove('hidden');
    }
  }
}

function showLoginError(message) {
  loginError.textContent = message;
  loginError.style.display = 'block';
  setTimeout(() => {
    loginError.style.display = 'none';
  }, 3000);
}

function isAdmin() {
  return currentUser.role === 'admin';
}

function showMessage(message, type = 'success') {
  const existing = document.querySelector('.message');
  if (existing) existing.remove();
  
  const div = document.createElement('div');
  div.className = `message message-${type}`;
  div.textContent = message;
  
  mainApp.insertBefore(div, mainApp.firstChild);
  
  setTimeout(() => div.remove(), 4000);
}
