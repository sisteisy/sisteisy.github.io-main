// ===== Configuration =====
const CONFIG = {
    // ВАЖНО: Измените этот адрес на ваш ngrok адрес или production API
    // Пример: https://abc123.ngrok.io
    API_BASE_URL: 'https://tweet-trickster-persuaded.ngrok-free.dev',
    PROFILE_ENDPOINT: '/api/profile',
    UPDATE_PROFILE_ENDPOINT: '/api/profile/update',
    REFERRAL_ENDPOINT: '/api/referrals',
    REFERRAL_LIST_ENDPOINT: '/api/referrals/list'
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
const referralCard = document.getElementById('referral-card');
const referralInvited = document.getElementById('referral-invited');
const referralReward = document.getElementById('referral-reward');
const referralLevel = document.getElementById('referral-level');
const referralProgressWrapper = document.getElementById('referral-progress-wrapper');
const referralProgressLabel = document.getElementById('referral-progress-label');
const referralProgressFill = document.getElementById('referral-progress-fill');
const referralProgressText = document.getElementById('referral-progress-text');
const copyReferralLinkBtn = document.getElementById('copy-referral-link-btn');
const openReferralsBtn = document.getElementById('open-referrals-btn');
const referralModal = document.getElementById('referral-modal');
const referralList = document.getElementById('referral-list');
const closeReferralModal = document.getElementById('close-referral-modal');
const closeReferralModalBottom = document.getElementById('close-referral-modal-bottom');
const modalOverlay = document.querySelector('.modal-overlay');
const toastElement = document.getElementById('toast');

// == avatar elems===
const avatarImg = document.getElementById('avatar-img');
const avatarFallback = document.getElementById('avatar-fallback');

// ===== Telegram SDK =====
let tg = window.Telegram.WebApp;

// ===== Initialize App =====
let currentUserId = null;
let currentReferralLink = '';

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
    tg.expand();
    applyTelegramTheme();
    tg.MainButton.hide();
    loadProfile();
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

async function loadProfile() {
    try {
        showLoading();

        const userId = tg.initDataUnsafe?.user?.id;
        if (!userId) {
            throw new Error('Не удалось получить ID пользователя из Telegram');
        }

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
        if (!data.user_id || !data.username || data.email === undefined) {
            throw new Error('Неверный формат ответа от сервера');
        }

        currentUserId = data.user_id;
        displayProfile(data);
        displayMenu(data);
        showMenu();
        await loadReferralStats();

    } catch (error) {
        console.error('Error loading profile:', error);
        showError(error.message);
    }
}

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

function attachEventListeners() {
    copyButtons.forEach(button => {
        button.addEventListener('click', handleCopy);
    });

    openProfileBtn.addEventListener('click', () => {
        showProfile();
    });

    backBtn.addEventListener('click', () => {
        showMenu();
    });

    saveEmailBtn.addEventListener('click', handleEmailUpdate);
    refreshBtn.addEventListener('click', () => {
        loadProfile();
    });
    closeBtn.addEventListener('click', () => {
        tg.close();
    });
    retryBtn.addEventListener('click', () => {
        loadProfile();
    });

    if (copyReferralLinkBtn) {
        copyReferralLinkBtn.addEventListener('click', handleCopyReferralLink);
    }
    if (openReferralsBtn) {
        openReferralsBtn.addEventListener('click', () => {
            showReferralModal();
            loadReferralList();
        });
    }
    if (closeReferralModal) {
        closeReferralModal.addEventListener('click', hideReferralModal);
    }
    if (closeReferralModalBottom) {
        closeReferralModalBottom.addEventListener('click', hideReferralModal);
    }
    if (modalOverlay) {
        modalOverlay.addEventListener('click', hideReferralModal);
    }
}

async function loadReferralStats() {
    if (!currentUserId) {
        return;
    }

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.REFERRAL_ENDPOINT}?user_id=${currentUserId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            }
        });

        if (!response.ok) {
            throw new Error('Не удалось получить данные рефералов.');
        }

        const data = await response.json();
        displayReferralData(data);
    } catch (error) {
        console.error('Error loading referral stats:', error);
        setReferralCardError();
    }
}

function displayReferralData(data) {
    if (!referralCard) return;

    referralInvited.textContent = `👥 Приглашено: ${data.referrals_count ?? 0}`;
    referralReward.textContent = `⭐ Получено: ${data.reward ?? 0}`;
    referralLevel.textContent = `🏆 Уровень: ${data.level ?? 'Bronze'}`;
    referralProgressLabel.textContent = `🏆 ${data.level ?? 'Bronze'}`;

    const remaining = data.remaining_to_next_level ?? 0;
    if (remaining > 0) {
        referralProgressText.textContent = `До ${data.next_level} осталось ${remaining} человек`;
    } else {
        referralProgressText.textContent = `Вы достигли уровня ${data.level || 'Diamond'}`;
    }

    const progress = calculateReferralProgress(data.referrals_count ?? 0);
    referralProgressFill.style.width = `${progress}%`;
    referralProgressWrapper.classList.remove('hidden');

    currentReferralLink = data.referral_link || `https://t.me/dasLGVJbnhwmer_bot?start=${currentUserId}`;
}

function setReferralCardError() {
    if (!referralCard) return;
    referralInvited.textContent = '👥 Приглашено: —';
    referralReward.textContent = '⭐ Получено: —';
    referralLevel.textContent = '🏆 Уровень: —';
    referralProgressWrapper.classList.add('hidden');
    currentReferralLink = `https://t.me/dasLGVJbnhwmer_bot?start=${currentUserId}`;
}

function calculateReferralProgress(count) {
    if (count >= 50) {
        return 100;
    }
    if (count >= 15) {
        return Math.round(((count - 15) / 35) * 100);
    }
    if (count >= 5) {
        return Math.round(((count - 5) / 10) * 100);
    }
    return Math.round((count / 5) * 100);
}

async function handleCopyReferralLink() {
    if (!currentReferralLink) {
        return;
    }

    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(currentReferralLink);
        } else {
            fallbackCopy(currentReferralLink);
        }

        const message = '✅ Ссылка скопирована';
        if (tg?.showAlert) {
            tg.showAlert(message);
        } else {
            showToast(message);
        }
    } catch (error) {
        console.error('Failed to copy referral link:', error);
        showToast('Ошибка копирования ссылки');
    }
}

async function loadReferralList() {
    if (!currentUserId) {
        return;
    }

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.REFERRAL_LIST_ENDPOINT}?user_id=${currentUserId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            }
        });

        if (!response.ok) {
            throw new Error('Не удалось получить список рефералов.');
        }

        const result = await response.json();
        renderReferralList(result.referrals || []);
    } catch (error) {
        console.error('Error loading referral list:', error);
        renderReferralList([]);
    }
}

function renderReferralList(referrals) {
    if (!referralList) return;

    if (!referrals.length) {
        referralList.innerHTML = '<p>Пока нет приглашённых пользователей.</p>';
        return;
    }

    referralList.innerHTML = referrals
        .map((item) => {
            const username = item.username || 'Пользователь';
            const joinDate = item.join_date || 'Дата не указана';
            return `
                <div class="referral-item">
                    <p><strong>${username}</strong></p>
                    <p>${joinDate}</p>
                </div>
            `;
        })
        .join('');
}

function showReferralModal() {
    if (!referralModal) return;
    referralModal.classList.remove('hidden');
}

function hideReferralModal() {
    if (!referralModal) return;
    referralModal.classList.add('hidden');
}

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
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(textToCopy);
        } else {
            fallbackCopy(textToCopy);
        }

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

function showToast(message) {
    if (!toastElement) return;
    toastElement.textContent = message;
    toastElement.classList.remove('hidden');
    toastElement.classList.add('visible');

    setTimeout(() => {
        toastElement.classList.remove('visible');
        toastElement.classList.add('hidden');
    }, 1800);
}

function showLoading() {
    loadingState.classList.remove('hidden');
    profileContent.classList.add('hidden');
    errorState.classList.add('hidden');
    menuState.classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
    tg.ready();
    initApp();
    setAvatar();
});

document.addEventListener('touchmove', (e) => {
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        // Разрешить скролл только для контента
    }
}, { passive: true });
