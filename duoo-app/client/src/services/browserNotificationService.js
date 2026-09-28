import api from './api';

const DUOO_NOTIFICATION_ICON = '/icon-192.png';
const DUOO_NOTIFICATION_BADGE = '/badge.png';

/**
 * Serviço para gerenciar notificações do navegador (Web Notifications API)
 * Permite enviar notificações mesmo quando o usuário não está na aba
 */

class BrowserNotificationService {
    constructor() {
        this.permission = 'default';
        this.checkPermission();
    }

    /**
     * Verifica o status atual da permissão de notificações
     */
    checkPermission() {
        if (!('Notification' in window)) {
            console.warn('Este navegador não suporta notificações');
            return false;
        }
        this.permission = Notification.permission;
        return this.permission === 'granted';
    }

    /**
     * Solicita permissão ao usuário para enviar notificações
     */
    async requestPermission() {
        if (!('Notification' in window)) {
            console.warn('Este navegador não suporta notificações');
            return false;
        }

        if (this.permission === 'granted') {
            await this.subscribeUserToPush();
            return true;
        }

        try {
            const permission = await Notification.requestPermission();
            this.permission = permission;

            if (permission === 'granted') {
                console.log('✅ Permissão para notificações concedida');
                // Salvar preferência no localStorage
                localStorage.setItem('notificationsEnabled', 'true');

                // Subscrever para Push Notifications (WebPush)
                await this.subscribeUserToPush();

                return true;
            } else {
                console.log('❌ Permissão para notificações negada');
                localStorage.setItem('notificationsEnabled', 'false');
                return false;
            }
        } catch (error) {
            console.error('Erro ao solicitar permissão:', error);
            return false;
        }
    }

    /**
     * Envia uma notificação do navegador
     * @param {string} title - Título da notificação
     * @param {object} options - Opções da notificação
     * @param {string} options.body - Corpo da mensagem
     * @param {string} options.icon - URL do ícone
     * @param {string} options.badge - URL do badge
     * @param {string} options.tag - Tag única para agrupar notificações
     * @param {boolean} options.requireInteraction - Se true, notificação não fecha automaticamente
     * @param {string} options.link - URL para abrir ao clicar
     */
    async sendNotification(title, options = {}) {
        // Verificar se tem permissão
        if (!this.checkPermission()) {
            console.log('Sem permissão para enviar notificações');
            return null;
        }

        // Verificar se o usuário desabilitou nas configurações
        const enabled = localStorage.getItem('notificationsEnabled');
        if (enabled === 'false') {
            console.log('Notificações desabilitadas pelo usuário');
            return null;
        }

        try {
            const notificationOptions = {
                body: options.body || '',
                icon: options.icon || DUOO_NOTIFICATION_ICON,
                badge: options.badge || DUOO_NOTIFICATION_BADGE,
                tag: options.tag || 'duoo-notification',
                requireInteraction: options.requireInteraction || false,
                vibrate: [200, 100, 200], // Padrão de vibração para mobile
                data: {
                    link: options.link || '/',
                    timestamp: Date.now()
                }
            };

            const notification = new Notification(title, notificationOptions);

            // Adicionar event listeners
            notification.onclick = (event) => {
                event.preventDefault();
                window.focus();

                // Navegar para o link se fornecido
                if (options.link) {
                    window.location.href = options.link;
                }

                notification.close();
            };

            notification.onerror = (error) => {
                console.error('Erro ao exibir notificação:', error);
            };

            return notification;
        } catch (error) {
            console.error('Erro ao criar notificação:', error);
            return null;
        }
    }

    /**
     * Envia notificação baseada no objeto de notificação do backend
     * @param {object} notification - Objeto de notificação do backend
     */
    async sendFromBackendNotification(notification) {
        return this.sendNotification(notification.title, {
            body: notification.message,
            tag: `notification-${notification.id}`,
            link: notification.link || '/dashboard',
            requireInteraction: ['budget_alert', 'invoice', 'note', 'transaction'].includes(notification.type)
        });
    }

    /**
     * Verifica se as notificações estão habilitadas
     */
    isEnabled() {
        const enabled = localStorage.getItem('notificationsEnabled');
        return enabled === 'true' && this.permission === 'granted';
    }

    async isPushSubscribed() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
        try {
            const registration = await navigator.serviceWorker.ready;
            return Boolean(await registration.pushManager.getSubscription());
        } catch (error) {
            console.error('Erro ao verificar inscrição de push:', error);
            return false;
        }
    }

    /**
     * Habilita ou desabilita notificações
     */
    setEnabled(enabled) {
        localStorage.setItem('notificationsEnabled', enabled ? 'true' : 'false');
        if (enabled) {
            this.subscribeUserToPush();
        }
    }

    /**
     * Subscreve o usuário para Push Notifications (WebPush)
     */
    async subscribeUserToPush() {
        try {
            // 1. Verificar se o navegador suporta Service Workers e Push
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
                console.warn('Push notifications não são suportadas neste navegador');
                return false;
            }

            // 2. Aguardar o Service Worker estar pronto
            const registration = await navigator.serviceWorker.ready;

            // 3. Pegar a chave pública do VAPID
            const vapidPublicKey = document.querySelector('meta[name="vapid-public-key"]')?.content;
            if (!vapidPublicKey) {
                console.error('VAPID Public Key não encontrada no meta tag');
                return false;
            }

            const convertedVapidKey = this.urlBase64ToUint8Array(vapidPublicKey);

            // 4. Renovar inscrições criadas com outra chave VAPID
            let subscription = await registration.pushManager.getSubscription();
            const previousVapidKey = localStorage.getItem('duoo:vapid-public-key');
            if (subscription && previousVapidKey !== vapidPublicKey) {
                await subscription.unsubscribe();
                subscription = null;
            }

            // 5. Subscrever
            if (!subscription) {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: convertedVapidKey
                });
            }

            console.log('✅ Usuário subscrito para WebPush');
            localStorage.setItem('duoo:vapid-public-key', vapidPublicKey);

            // 6. Enviar para o backend
            await api.post('/notifications/push/subscribe', {
                subscription,
                deviceType: this.getDeviceType()
            });
            return true;

        } catch (error) {
            console.error('Erro ao subscrever para WebPush:', error);
            return false;
        }
    }

    /**
     * Helper para converter chave VAPID
     */
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    /**
     * Helper para identificar tipo de dispositivo
     */
    getDeviceType() {
        const ua = navigator.userAgent;
        if (/android/i.test(ua)) return 'android';
        if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
        return 'desktop';
    }
}

export default new BrowserNotificationService();
