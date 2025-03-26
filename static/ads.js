/**
 * Tango Puzzle - Sistema de Anuncios
 * Este archivo gestiona la carga y visualización de anuncios en el juego
 */

class AdManager {
    constructor() {
        // Configuración
        this.adConfig = {
            adClient: 'ca-pub-TUCODIGO', // Reemplazar con tu código de AdSense
            adSlots: {
                banner: 'TUSLOT1',
                rectangle: 'TUSLOT2',
                victory: 'TUSLOT3',
                footer: 'TUSLOT4',
                interstitial: 'TUSLOT5'
            },
            interstitialCooldown: 300000, // 5 minutos entre anuncios intersticiales
            interstitialTimer: 5 // Segundos para poder cerrar el anuncio
        };

        // Estado
        this.interstitialShown = false;
        this.lastInterstitialTime = 0;

        // Inicializar anuncios
        this.initAds();
    }

    /**
     * Inicializa los anuncios en la página
     */
    initAds() {
        // Esperar a que la página esté completamente cargada
        window.addEventListener('load', () => {
            // Inicializar anuncios normales
            this.refreshAllAds();

            // Configurar eventos para mostrar anuncios intersticiales
            document.getElementById('new-game').addEventListener('click', () => {
                // Posibilidad de mostrar intersticial al iniciar nueva partida
                if (Math.random() < 0.3) { // 30% de probabilidad
                    this.showInterstitialAd();
                }
            });
        });

        // Reportar métricas de anuncios (para análisis)
        this.setupAdMetrics();
    }

    /**
     * Actualiza todos los anuncios en la página
     */
    refreshAllAds() {
        // Forzar la carga de anuncios si AdSense está disponible
        if (window.adsbygoogle && window.adsbygoogle.push) {
            const adElements = document.querySelectorAll('.adsbygoogle');
            adElements.forEach(ad => {
                try {
                    (adsbygoogle = window.adsbygoogle || []).push({});
                } catch (e) {
                    console.error('Error al cargar anuncio:', e);
                }
            });
        }
    }

    /**
     * Muestra un anuncio intersticial
     * @returns {boolean} True si se muestra el anuncio, false si está en cooldown
     */
    showInterstitialAd() {
        const now = Date.now();

        // Verificar si ya pasó el tiempo de cooldown
        if (this.interstitialShown || (now - this.lastInterstitialTime < this.adConfig.interstitialCooldown)) {
            return false;
        }

        // Marcar como mostrado y registrar el tiempo
        this.interstitialShown = true;
        this.lastInterstitialTime = now;

        // Crear un elemento div para el anuncio intersticial
        const adContainer = document.createElement('div');
        adContainer.className = 'interstitial-ad';

        const adContent = document.createElement('div');
        adContent.className = 'interstitial-content';

        // Botón para cerrar el anuncio después del tiempo configurado
        const closeButton = document.createElement('button');
        closeButton.textContent = `Cerrar en ${this.adConfig.interstitialTimer}s`;
        closeButton.disabled = true;

        // Anuncio de Google AdSense
        const adElement = document.createElement('ins');
        adElement.className = 'adsbygoogle';
        adElement.style.display = 'block';
        adElement.setAttribute('data-ad-client', this.adConfig.adClient);
        adElement.setAttribute('data-ad-slot', this.adConfig.adSlots.interstitial);
        adElement.setAttribute('data-ad-format', 'auto');

        adContent.appendChild(closeButton);
        adContent.appendChild(adElement);
        adContainer.appendChild(adContent);
        document.body.appendChild(adContainer);

        // Inicializar el anuncio
        try {
            (adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
            console.error('Error al cargar anuncio intersticial:', e);
        }

        // Temporizador para habilitar el botón de cierre
        let countdown = this.adConfig.interstitialTimer;
        const timer = setInterval(() => {
            countdown--;
            closeButton.textContent = `Cerrar en ${countdown}s`;

            if (countdown <= 0) {
                clearInterval(timer);
                closeButton.textContent = 'Cerrar';
                closeButton.disabled = false;

                closeButton.addEventListener('click', () => {
                    adContainer.remove();
                    this.interstitialShown = false;
                });
            }
        }, 1000);

        // Resetear el estado después de un tiempo en caso de error
        setTimeout(() => {
            if (document.body.contains(adContainer)) {
                adContainer.remove();
                this.interstitialShown = false;
            }
        }, (this.adConfig.interstitialTimer + 30) * 1000); // Tiempo del temporizador + 30 segundos extra

        return true;
    }

    /**
     * Muestra un anuncio cuando el jugador gana
     */
    showVictoryAd() {
        // Mostrar anuncio intersticial antes del popup de victoria
        const interstitialShown = this.showInterstitialAd();

        // Esperar un poco antes de mostrar el popup de victoria
        setTimeout(() => {
            const popup = document.getElementById('victory-popup');
            popup.style.display = 'flex';

            // Asegurarnos de que el anuncio en el popup de victoria se cargue
            try {
                (adsbygoogle = window.adsbygoogle || []).push({});
            } catch (e) {
                console.error('Error al cargar anuncio de victoria:', e);
            }
        }, interstitialShown ? 1000 : 0); // Si se mostró un intersticial, esperar un segundo
    }

    /**
     * Configura métricas para analizar el rendimiento de los anuncios
     * (Útil para optimizar la estrategia de monetización)
     */
    setupAdMetrics() {
        // Estos eventos se pueden conectar a sistemas de análisis como
        // Google Analytics o servicios personalizados

        const adViewEvents = [
            { selector: '.ad-banner', name: 'banner_view' },
            { selector: '.ad-rectangle', name: 'rectangle_view' },
            { selector: '.ad-footer', name: 'footer_view' },
            { selector: '.ad-victory', name: 'victory_view' }
        ];

        // Usar Intersection Observer para detectar cuando los anuncios son visibles
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const adType = entry.target.dataset.adType;
                        if (adType) {
                            this.logAdMetric(adType + '_view');
                        }
                    }
                });
            }, { threshold: 0.5 });

            adViewEvents.forEach(event => {
                document.querySelectorAll(event.selector).forEach(el => {
                    el.dataset.adType = event.name.split('_')[0];
                    observer.observe(el);
                });
            });
        }
    }

    /**
     * Registra una métrica de anuncio
     * @param {string} metricName Nombre de la métrica a registrar
     */
    logAdMetric(metricName) {
        // Aquí puedes conectar con tu sistema de análisis
        // Por ejemplo, si usas Google Analytics:
        if (window.gtag) {
            gtag('event', metricName, {
                'event_category': 'ads',
                'non_interaction': true
            });
        }

        // O simplemente registrar en consola durante el desarrollo
        console.log('Ad Metric:', metricName);
    }
}

// Crear la instancia del gestor de anuncios cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.adManager = new AdManager();
});

// Redefinir la función showVictoryPopup para que use el gestor de anuncios
function showVictoryPopup() {
    const endTime = Date.now();
    const elapsedTime = Math.floor((endTime - startTime) / 1000);
    document.getElementById('victory-time').innerText = `Tiempo total: ${elapsedTime} segundos`;

    // Usar el gestor de anuncios para mostrar anuncios al ganar
    if (window.adManager) {
        window.adManager.showVictoryAd();
    } else {
        // Fallback si el gestor de anuncios no está disponible
        const popup = document.getElementById('victory-popup');
        popup.style.display = 'flex';
    }
}