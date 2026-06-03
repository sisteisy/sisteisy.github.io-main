// ===== Configuration =====
const CONFIG = {
    // ВАЖНО: Измените этот адрес на ваш ngrok адрес или production API
    // Пример: https://abc123.ngrok.io
    API_BASE_URL: 'https://tweet-trickster-persuaded.ngrok-free.dev',
    
    // Endpoint для получения профиля
    // Ожидается ответ: { user_id, username, email }
    PROFILE_ENDPOINT: '/api/profile'
};

// ===== DOM Elements =====
const loadingState = document.getElementById('loading');
const profileContent = document.getElementById('profile-content');
const errorState = document.getElementById('error-state');

const usernameDisplay = document.getElementById('username-display');
const userIdDisplay = document.getElementById('user-id-display');
const emailDisplay = document.getElementById('email-display');

const refreshBtn = document.getElementById('refresh-btn');
const closeBtn = document.getElementById('close-btn');
const retryBtn = document.getElementById('retry-btn');
const errorMessage = document.getElementById('error-message');

const copyButtons = document.querySelectorAll('.copy-button');

// ===== Telegram SDK =====
let tg = window.Telegram.WebApp;

// ===== Initialize App =====
function initApp() {
    // Расширить приложение на весь экран
    tg.expand();
    
    // Установить цвета
    tg.setBackgroundColor('#ffffff');
    tg.setHeaderColor('#ffffff');
    
    // Показать главную кнопку (если нужна)
    tg.MainButton.hide();
    
    // Начать загрузку профиля
    loadProfile();
    
    // Добавить обработчики событий
    attachEventListeners();
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
        
        // Отобразить профиль
        displayProfile(data);
        showProfile();
        
    } catch (error) {
        console.error('Error loading profile:', error);
        showError(error.message);
    }
}

// ===== Display Profile =====
function displayProfile(data) {
    // Очистить и заполнить поля
    usernameDisplay.textContent = data.username || 'Неизвестно';
    userIdDisplay.textContent = data.user_id;
    emailDisplay.textContent = data.email || 'Не указана';
    
    // Сохранить данные для копирования
    userIdDisplay.dataset.value = data.user_id;
    emailDisplay.dataset.value = data.email || '';
}

// ===== Attach Event Listeners =====
function attachEventListeners() {
    // Кнопки копирования
    copyButtons.forEach(button => {
        button.addEventListener('click', handleCopy);
    });
    
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
}

function showProfile() {
    loadingState.classList.add('hidden');
    profileContent.classList.remove('hidden');
    errorState.classList.add('hidden');
}

function showError(message) {
    loadingState.classList.add('hidden');
    profileContent.classList.add('hidden');
    errorState.classList.remove('hidden');
    
    errorMessage.textContent = message || 'Произошла неизвестная ошибка. Пожалуйста, попробуйте снова.';
}

// ===== Initialize on Page Load =====
document.addEventListener('DOMContentLoaded', () => {
    // Дождаться, когда Telegram SDK будет готов
    tg.ready();
    
    // Инициализировать приложение
    initApp();
});

// ===== Keyboard Safety =====
// Предотвращение скролла при вводе на iOS
document.addEventListener('touchmove', (e) => {
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        // Разрешить скролл только для контента
    }
}, { passive: true });
