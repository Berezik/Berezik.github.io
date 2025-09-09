/*
=========================================
 3D Flipbook - Фінальна версія логіки
=========================================
*/

// Чекаємо, поки HTML-структура буде готова
document.addEventListener('DOMContentLoaded', () => {
    
    // --- Елементи ---
    const bookEl = document.getElementById('book');
    
    // --- Стан ---
    let currentPage = 0;
    let pages = [];
    let totalPages = 0;
    let isFlipping = false; // Прапорець для блокування анімації

    // --- Функції ---

    /**
     * Створює один елемент сторінки (праву половинку)
     */
    function createPage(index, content) {
        const page = document.createElement('section');
        page.className = 'page'; // Всі сторінки тепер починаються однаково
        page.dataset.pageNumber = index;
        page.style.backfaceVisibility = 'hidden';

        const frame = document.createElement('div');
        frame.className = 'frame';
        const header = document.createElement('header');
        const h2 = document.createElement('h2');
        h2.textContent = content.title || `Історія #${index + 1}`;
        header.appendChild(h2);

        const mediaWrap = document.createElement('div');
        mediaWrap.className = 'media';
        if (content.type === 'video') {
            const v = document.createElement('video');
            v.src = content.src;
            v.setAttribute('playsinline', '');
            v.setAttribute('muted', '');
            v.setAttribute('loop', '');
            v.preload = 'metadata';
            mediaWrap.appendChild(v);
        } else if (content.type === 'image') {
            const img = document.createElement('img');
            img.alt = content.title || 'Зображення';
            img.src = content.src;
            mediaWrap.appendChild(img);
        }

        const p = document.createElement('p');
        p.textContent = content.text || '';
        const path = document.createElement('div');
        path.className = 'beam-path';
        const beam = document.createElement('div');
        beam.className = 'beam';
        path.appendChild(beam);
        frame.appendChild(header);
        frame.appendChild(mediaWrap);
        frame.appendChild(p);
        page.appendChild(frame);
        page.appendChild(path);
        return page;
    }

    /**
     * Будує всю книгу з масиву даних
     */
    function build(items) {
        bookEl.innerHTML = '';
        totalPages = items.length + 2; // +2 для обкладинок
        
        for (let i = 0; i < totalPages; i++) {
            let pageData = {};
            let isCover = false;

            if (i === 0) { // Передня обкладинка
                pageData = { title: 'НАША LOVE STORY', text: 'Тицяй, я чекав на тебе' };
                isCover = true;
            } else if (i === totalPages - 1) { // Задня обкладинка
                pageData = { title: 'To be continue.....' };
                isCover = true;
            } else { // Сторінки з контентом
                pageData = items[i - 1];
            }
            
            const pageEl = createPage(i, pageData);
            if (isCover) pageEl.classList.add('cover');
            pageEl.style.zIndex = totalPages - i;
            bookEl.appendChild(pageEl);
        }
        pages = Array.from(bookEl.querySelectorAll('.page'));
        document.getElementById('loader').style.display = 'none';
    }

    /**
     * Логіка перегортання сторінки
     */
    function turnPage(direction) {
        if (isFlipping) return;

        const newPageIndex = currentPage + direction;
        if (newPageIndex < 0 || newPageIndex >= totalPages) {
            return;
        }

        isFlipping = true;
        const pageToFlip = pages[(direction > 0) ? currentPage : newPageIndex];
        
        // Оновлюємо стан відразу
        currentPage = newPageIndex;

        // Запускаємо анімацію перегортання
        pageToFlip.classList.toggle('flipped', direction > 0);
        
        // Запускаємо анімацію промінчика на сторінці, що перегортається
        const beamTargetPage = (direction > 0) ? pages[currentPage - 1] : pages[currentPage];
        if (beamTargetPage) {
            const beamEl = beamTargetPage.querySelector('.beam');
            if (beamEl) {
                beamEl.classList.remove('is-active');
                void beamEl.offsetWidth; // Force reflow
                beamEl.classList.add('is-active');
            }
        }

        const transitionDuration = parseFloat(getComputedStyle(pageToFlip).transitionDuration) * 1000;
        setTimeout(() => {
            // Оновлюємо z-index після завершення анімації
            if (direction > 0) {
                pageToFlip.style.zIndex = 1000 + currentPage;
            } else {
                pageToFlip.style.zIndex = totalPages - currentPage;
            }
            
            playVideosOnVisibleSpread();
            isFlipping = false;
        }, transitionDuration);
    }
    
    /**
     * Функція відкриття книги
     */
    function openBook() {
        if (!bookEl.classList.contains('open')) {
            bookEl.classList.add('open');
            turnPage(1); // Перегортаємо обкладинку
        }
    }

    // --- Допоміжні функції для відео ---
    function pauseAllVideos() {
        bookEl.querySelectorAll('video').forEach(v => {
            if (!v.paused) v.pause();
        });
    }

    function playVideosOnVisibleSpread() {
        pauseAllVideos();
        const rightPageVideo = pages[currentPage]?.querySelector('video');
        const leftPageVideo = pages[currentPage - 1]?.querySelector('video');
        [leftPageVideo, rightPageVideo].forEach(v => {
            if (v) {
                v.play().catch(error => console.warn("Браузер заблокував відтворення:", error));
            }
        });
    }

    // --- Функція для адаптивного промінчика ---
    function updateBeamPaths() {
        const allBeamPaths = document.querySelectorAll('.beam-path');
        if (allBeamPaths.length === 0) return;
        const pathContainer = allBeamPaths[0];
        const width = pathContainer.clientWidth;
        const height = pathContainer.clientHeight;
        if (width === 0) return;
        const newPath = `M ${width * 0.1} ${height * 0.15} C ${width * 0.4} ${height * 0.05}, ${width * 0.7} ${height * 0.4}, ${width * 0.9} ${height * 0.9}`;
        allBeamPaths.forEach(p => p.style.offsetPath = `path("${newPath}")`);
    }

    // --- Основний потік виконання ---
    fetch('story.json')
        .then(response => {
            if (!response.ok) throw new Error(`Помилка мережі: ${response.status}`);
            return response.json();
        })
        .then(data => {
            build(data);
            
            // --- Слухачі подій ---
            bookEl.addEventListener('click', (e) => {
                if (!bookEl.classList.contains('open')) openBook();
            });

            document.addEventListener('keydown', (e) => {
                if (bookEl.classList.contains('open')) {
                    if (e.key === 'ArrowRight') turnPage(1);
                    if (e.key === 'ArrowLeft') turnPage(-1);
                }
            });

            let touchStartX = 0;
            const minSwipeDistance = 50;
            bookEl.addEventListener('touchstart', (e) => {
                touchStartX = e.touches[0].clientX;
            }, { passive: true });

            bookEl.addEventListener('touchend', (e) => {
                if (touchStartX === 0 || !bookEl.classList.contains('open')) return;
                const touchEndX = e.changedTouches[0].clientX;
                const deltaX = touchEndX - touchStartX;
                if (Math.abs(deltaX) > minSwipeDistance) {
                    if (deltaX < 0) turnPage(1);
                    else turnPage(-1);
                }
                touchStartX = 0;
            }, { passive: true });
        })
        .catch(error => console.error('КРИТИЧНА ПОМИЛКА:', error));

    // --- Події, що залежать від повного завантаження ---
    window.addEventListener('load', () => {
        updateBeamPaths();
        window.addEventListener('resize', updateBeamPaths);
    });
});