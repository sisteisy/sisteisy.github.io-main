// ===== Configuration =====
const CONFIG = {
    // ВАЖНО: Измените этот адрес на ваш ngrok адрес или production API
    // Пример: https://abc123.ngrok.io
    API_BASE_URL: 'https://tweet-trickster-persuaded.ngrok-free.dev',
    
    // Endpoint для получения профиля
    // Ожидается ответ: { user_id, username, email }
    PROFILE_ENDPOINT: '/api/profile',
    UPDATE_PROFILE_ENDPOINT: '/api/profile/update'
};

// ===== DOM Elements =====
const loadingState = document.getElementById('loading');
const menuState = document.getElementById('menu-state');
const profileContent = document.getElementById('profile-content');
const errorState = document.getElementById('error-state');

const menuGreeting = document.getElementById('menu-greeting');
const usernameDisplay = document.getElementById('username-display');
const userIdDisplay = document.getElementById('user-id-display');
const emailDisplay = document.getElementById('email-display');

const openProfileBtn = document.getElementById('open-profile-btn');
const backBtn = document.getElementById('back-btn');
const saveEmailBtn = document.getElementById('save-email-btn');
const newEmailInput = document.getElementById('new-email-input');
const passwordInput = document.getElementById('password-input');
const updateStatus = document.getElementById('update-status');

const refreshBtn = document.getElementById('refresh-btn');
const closeBtn = document.getElementById('close-btn');
const retryBtn = document.getElementById('retry-btn');
const errorMessage = document.getElementById('error-message');

const copyButtons = document.querySelectorAll('.copy-button');

// == avatar elems===
const avatarImg = document.getElementById('avatar-img');
const avatarFallback = document.getElementById('avatar-fallback');


// ===== Telegram SDK =====
let tg = window.Telegram.WebApp;

// ===== Initialize App =====
let currentUserId = null;


function setAvatar() {
  const photoUrl = tg.initDataUnsafe?.user?.photo_url;
  if (photoUrl) {
    avatarImg.src = photoUrl;
    avatarImg.classList.remove('hidden');
    avatarFallback.classList.add('hidden');
  } else {
    avatarImg.classList.add('hidden');
    avatarFallback.classList.remove('hidden');
  }
}


function initApp() {
    // Расширить приложение на весь экран
    tg.expand();
    
    applyTelegramTheme();
    
    // Показать главную кнопку (если нужна)
    tg.MainButton.hide();
    
    // Начать загрузку профиля
    loadProfile();
    
    // Добавить обработчики событий
    attachEventListeners();
}

function applyTelegramTheme() {
    const theme = tg.themeParams || {};
    const bgColor = theme.bg_color || '#ffffff';
    const textColor = theme.text_color || theme.secondary_text_color || '#000000';

    document.body.style.backgroundColor = bgColor;
    document.body.style.color = textColor;
    usernameDisplay.style.color = textColor;
    menuGreeting.style.color = textColor;
}

// ===== Load Profile =====
async function loadProfile() {
    try {
        showLoading();
        
        // Получить user_id из Telegram Mini App
        const userId = tg.initDataUnsafe?.user?.id;
        
        if (!userId) {
            throw new Error('Не удалось получить ID пользователя из Telegram');
        }
        
        // Запрос профиля с backend
        const response = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.PROFILE_ENDPOINT}?user_id=${userId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            }
        });
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Профиль не найден. Вы не зареганы в системе.');
            }
            throw new Error(`Ошибка сервера: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Проверить наличие необходимых полей
        if (!data.user_id || !data.username || data.email === undefined) {
            throw new Error('Неверный формат ответа от сервера');
        }
        
        // Сохранить профиль и отобразить меню
        currentUserId = data.user_id;
        displayProfile(data);
        displayMenu(data);
        showMenu();
        
    } catch (error) {
        console.error('Error loading profile:', error);
        showError(error.message);
    }
}

// ===== Display Profile =====
function displayProfile(data) {
    usernameDisplay.textContent = data.username || 'Неизвестно';
    userIdDisplay.textContent = data.user_id;
    emailDisplay.textContent = data.email || 'Не указана';
    
    userIdDisplay.dataset.value = data.user_id;
    emailDisplay.dataset.value = data.email || '';
    setAvatar();
}

function displayMenu(data) {
    menuGreeting.textContent = data.username ? `Привет, ${data.username}!` : 'Привет!';
}

function showMenu() {
    loadingState.classList.add('hidden');
    profileContent.classList.add('hidden');
    errorState.classList.add('hidden');
    menuState.classList.remove('hidden');
}

function showProfile() {
    setAvatar();
    loadingState.classList.add('hidden');
    profileContent.classList.remove('hidden');
    errorState.classList.add('hidden');
    menuState.classList.add('hidden');
}

function showError(message) {
    loadingState.classList.add('hidden');
    profileContent.classList.add('hidden');
    menuState.classList.add('hidden');
    errorState.classList.remove('hidden');
    
    errorMessage.textContent = message || 'Произошла неизвестная ошибка. Пожалуйста, попробуйте снова.';
}

// ===== Attach Event Listeners =====
function attachEventListeners() {
    // Кнопки копирования
    copyButtons.forEach(button => {
        button.addEventListener('click', handleCopy);
    });
    
    // Открыть профиль из меню
    openProfileBtn.addEventListener('click', () => {
        showProfile();
    });
    
    // Кнопка назад в меню
    backBtn.addEventListener('click', () => {
        showMenu();
    });
    
    // Сохранение новой почты
    saveEmailBtn.addEventListener('click', handleEmailUpdate);
    
    // Кнопка обновления
    refreshBtn.addEventListener('click', () => {
        loadProfile();
    });
    
    // Кнопка закрытия
    closeBtn.addEventListener('click', () => {
        tg.close();
    });
    
    // Кнопка повтора
    retryBtn.addEventListener('click', () => {
        loadProfile();
    });
}

// ===== Copy to Clipboard =====
async function handleCopy(event) {
    const button = event.target;
    const copyType = button.dataset.copy;
    
    let textToCopy = '';
    if (copyType === 'user-id') {
        textToCopy = userIdDisplay.textContent;
    } else if (copyType === 'email') {
        textToCopy = emailDisplay.textContent;
    }
    
    if (!textToCopy || textToCopy === '—') return;
    
    try {
        // Использовать Clipboard API если доступна
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(textToCopy);
        } else {
            // Fallback для старых браузеров
            fallbackCopy(textToCopy);
        }
        
        // Визуальная обратная связь
        const originalText = button.textContent;
        button.textContent = '✓ Скопировано';
        button.classList.add('copied');
        
        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('copied');
        }, 2000);
        
    } catch (error) {
        console.error('Failed to copy:', error);
        button.textContent = 'Ошибка копирования';
        setTimeout(() => {
            button.textContent = 'Копировать';
        }, 2000);
    }
}

async function handleEmailUpdate() {
    const newEmail = newEmailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!currentUserId) {
        showUpdateMessage('Не удалось определить пользователя. Обновите страницу.', true);
        return;
    }

    if (!newEmail || !password) {
        showUpdateMessage('Введите новую почту и пароль для подтверждения.', true);
        return;
    }

    try {
        saveEmailBtn.disabled = true;
        showUpdateMessage('Сохранение изменений...', false);

        const response = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.UPDATE_PROFILE_ENDPOINT}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({
                user_id: currentUserId,
                new_email: newEmail,
                password
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || 'Не удалось сохранить почту.');
        }

        showUpdateMessage('Почта успешно обновлена.', false);
        passwordInput.value = '';
        newEmailInput.value = '';
        emailDisplay.textContent = result.email || newEmail;
        emailDisplay.dataset.value = result.email || newEmail;
    } catch (error) {
        console.error('Error updating email:', error);
        showUpdateMessage(error.message || 'Ошибка обновления почты.', true);
    } finally {
        saveEmailBtn.disabled = false;
    }
}

function showUpdateMessage(message, isError = false) {
    updateStatus.textContent = message;
    updateStatus.style.color = isError ? '#d04848' : '#0084ff';
}

// ===== Fallback Copy (для старых браузеров) =====
function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
}

// ===== UI State Management =====
function showLoading() {
    loadingState.classList.remove('hidden');
    profileContent.classList.add('hidden');
    errorState.classList.add('hidden');
    menuState.classList.add('hidden');
}

// ===== Initialize on Page Load =====
document.addEventListener('DOMContentLoaded', () => {
    // Дождаться, когда Telegram SDK будет готов
    tg.ready();
    
    // Инициализировать приложение
    initApp();
    setAvatar();
});

// ===== Keyboard Safety =====
// Предотвращение скролла при вводе на iOS
document.addEventListener('touchmove', (e) => {
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        // Разрешить скролл только для контента
    }
}, { passive: true });