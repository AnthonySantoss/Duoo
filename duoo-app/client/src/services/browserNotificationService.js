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
            return true;
        }

        try {
            const permission = await Notification.requestPermission();
            this.permission = permission;

            if (permission === 'granted') {
                console.log('✅ Permissão para notificações concedida');
                // Salvar preferência no localStorage
                localStorage.setItem('notificationsEnabled', 'true');
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
                icon: options.icon || '/logo.png', // Logo da aplicação
                badge: options.badge || '/badge.png',
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
        const iconMap = {
            'achievement': '🏆',
            'budget_alert': '💰',
            'goal_progress': '🎯',
            'transaction': '💸',
            'invoice': '💳',
            'info': 'ℹ️',
            'note': '📝'
        };

        const icon = iconMap[notification.type] || 'ℹ️';
        const title = `${icon} ${notification.title}`;

        return this.sendNotification(title, {
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

    /**
     * Habilita ou desabilita notificações
     */
    setEnabled(enabled) {
        localStorage.setItem('notificationsEnabled', enabled ? 'true' : 'false');
    }
}

export default new BrowserNotificationService();
