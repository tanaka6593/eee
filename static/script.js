function forceReload() {
    const baseUrl = window.location.pathname;
    const newUrl = `${baseUrl}?forceReload=${Date.now()}`;
    window.location.href = newUrl;
}

function showPage2() {
    const page2 = document.querySelector('.page2');
    page2.classList.add('show');
}
function hidePage2() {
    const page2 = document.querySelector('.page2');
    page2.classList.remove('show');
}

function updateDateAndDay() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const dayNum = String(now.getDate()).padStart(2, '0');

    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[now.getDay()];

    document.getElementById('date').textContent = `${year}/${month}/${dayNum}`;
    document.getElementById('day').textContent = `(${weekday})`;
}
function updateTimeDigits() {
    const now = new Date();

    const timeParts = {
        h1: Math.floor(now.getHours() / 10),
        h2: now.getHours() % 10,
        m1: Math.floor(now.getMinutes() / 10),
        m2: now.getMinutes() % 10,
        s1: Math.floor(now.getSeconds() / 10),
        s2: now.getSeconds() % 10,
        ms1: Math.floor(now.getMilliseconds() / 10) % 10,
        ms2: Math.floor(now.getMilliseconds() / 100),
    };

    for (const id in timeParts) {
        document.getElementById(id).textContent = timeParts[id];
    }

    requestAnimationFrame(updateTimeDigits);
}

// timestamp functions
function setUsedTimestamp(now, indexes) {
    const urlParams = new URLSearchParams(window.location.search);
    indexes.forEach(index => {
        urlParams.set(`u${index}`, now.getTime());
    });
    window.history.replaceState({}, '', `${location.pathname}?${urlParams}`);
}

function createUsedTimestamp(now) {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const dayNum = String(now.getDate()).padStart(2, '0');

    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[now.getDay()];

    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    return `${year}/${month}/${dayNum}(${weekday}) ${hours}:${minutes}`;
}

function checkUsedTimestamp() {
    const urlParams = new URLSearchParams(window.location.search);

    document.querySelectorAll('.ticket-card').forEach(card => {
        const ticketIndex = card.dataset.index;
        const usedTimestampValue = urlParams.get(`u${ticketIndex}`);
        if (usedTimestampValue) {
            const usedTimestamp = createUsedTimestamp(new Date(parseInt(usedTimestampValue, 10)));
            card.classList.add('used');
            card.querySelector('.used-timestamp').textContent = usedTimestamp;
        }
    });

    document.querySelectorAll('.select-ticket-card').forEach(card => {
        const ticketIndex = card.dataset.index;
        const usedTimestampValue = urlParams.get(`u${ticketIndex}`);
        if (usedTimestampValue) {
            const usedTimestamp = createUsedTimestamp(new Date(parseInt(usedTimestampValue, 10)));
            card.classList.remove('unused');
            card.classList.remove('selected');
            card.classList.add('used');
            card.querySelector('.used-timestamp').textContent = usedTimestamp;
        }
    });
}

class SwipeTracker {
    constructor(maxLength = 4) {
        this.history = [];
        this.maxLength = maxLength;
    }

    update(position, time) {
        this.history.push({ position, time });
        if (this.history.length > this.maxLength) {
            this.history.shift();
        }
    }

    get position() {
        if (this.history.length === 0) return 0;
        return this.history[this.history.length - 1].position;
    }

    get velocity() {
        if (this.history.length < 2) return 0;
        const { position: x1, time: t1 } = this.history[0];
        const { position: x2, time: t2 } = this.history[this.history.length - 1];
        return (t2 - t1) > 0 ? (x2 - x1) / (t2 - t1) : 0;
    }

    get acceleration() {
        if (this.history.length < 3) return 0;
        const v1 = (this.history[1].position - this.history[0].position) / (this.history[1].time - this.history[0].time);
        const v2 = (this.history[this.history.length - 1].position - this.history[this.history.length - 2].position) /
            (this.history[this.history.length - 1].time - this.history[this.history.length - 2].time);
        const dt = this.history[this.history.length - 1].time - this.history[0].time;
        return dt > 0 ? (v1 - v2) / dt : 0;
    }
}

class SwiperManager {
    constructor(swiper, background, foreground, caution, main, used, usedTicketCount, selectedTicketCount, useTicketCount, totalTicketCount, isDebug = false) {
        this.swiper = swiper;
        this.background = background;
        this.foreground = foreground;
        this.caution = caution;
        this.main = main;
        this.used = used;
        this.usedTicketCount = usedTicketCount;
        this.selectedTicketCount = selectedTicketCount;
        this.useTicketCount = useTicketCount;
        this.totalTicketCount = totalTicketCount;
        this.isDebug = isDebug;

        this.isDragging = false;
        this.isCommitting = false;
        this.isUsed = false;
        this.isAnimating = false;
        this.startX = 0;
        this.deltaX = 0;
        this.swiperWidth = swiper.offsetWidth;

        this.selected = 0;

        this.tracker = new SwipeTracker(4);

        this.backgroundColorOptions = [
            { start: 0, end: 8, color: '#307EBC' },
            { start: 8, end: 16, color: '#3D957F' },
            { start: 16, end: 24, color: '#97C47F' },
            { start: 24, end: 32, color: '#F6EC69' },
            { start: 32, end: 200, color: '#E85A5A' },
        ];

        this.initEventListeners();
        this.update();
    }

    initEventListeners() {
        this.swiper.addEventListener('touchstart', this.onTouchStart.bind(this));
        this.swiper.addEventListener('touchmove', this.onTouchMove.bind(this));
        this.swiper.addEventListener('touchend', this.onTouchEnd.bind(this));
    }

    get tx() {
        const transform = window.getComputedStyle(this.swiper).transform;
        return transform && transform !== 'none' ? new DOMMatrixReadOnly(transform).m41 : 0;
    }

    get shouldCommitSlide() {
        const prePassedThreshold = Math.abs(this.tx) > this.swiperWidth * 0.4;
        const movingFast = Math.abs(this.tracker.acceleration) * Math.sign(this.tx) > 0.02;
        const passedThreshold = Math.abs(this.tx) > this.swiperWidth * 0.7;
        return prePassedThreshold && movingFast || passedThreshold;
    }

    commitSlide() {
        const tx = this.tx;
        const targetX = (tx > 0 ? this.swiperWidth : -this.swiperWidth) * 1.02;
        const distance = targetX - tx;
        const duration = solveDurationFromAcceleration(distance, this.tracker.velocity, this.tracker.acceleration);
        this.swiper.style.transition = `transform ${duration}ms linear`;
        this.swiper.style.transform = `translateX(${targetX}px)`;
        this.isAnimating = false;
        this.isCommitting = true;
        setTimeout(() => {
            // Reset styles after transition
            this.onCommitEnd();
        }, duration + 50);
    }

    onTouchStart(e) {
        if (!this.selected) return;
        if (this.isCommitting) return;
        if (this.isUsed) return;
        if ((this.isDebug && e.touches.length >= 1) || (!this.isDebug && e.touches.length === 2)) {
            e.preventDefault();
            this.isDragging = true;
            this.startX = getAverageX(e.touches);
            this.deltaX = 0;
            this.swiperWidth = this.swiper.offsetWidth;
            this.tracker.history.length = 0;
        }
    }
    onTouchMove(e) {
        if (!this.isDragging) return;
        if ((this.isDebug && e.touches.length >= 1) || (!this.isDebug && e.touches.length === 2)) {
            e.preventDefault();
            this.deltaX = getAverageX(e.touches) - this.startX;
            this.swiper.style.transform = `translateX(${this.deltaX * 1.5}px)`;
        }
    }
    onTouchEnd(e) {
        e.preventDefault();
        this.isDragging = false;
    }

    onCommitEnd() {
        this.isCommitting = false;
        this.swiper.style.transition = '';
        this.swiper.style.transform = '';
    }

    update() {
        const tx = this.tx;
        this.updateBackground();
        this.updateTicketCounter();
        this.updateCaution();
        this.updateMain();
        this.updateUsed();
        this.updateSwiper();
        if (!this.isDragging && this.shouldCommitSlide) this.commitSlide();
        requestAnimationFrame(this.update.bind(this));
    }

    updateBackground() {
        const tx = this.tx;
        const colorOption = this.backgroundColorOptions.find(option =>
            Math.abs(tx) >= this.swiperWidth * option.start / 100 &&
            Math.abs(tx) < this.swiperWidth * option.end / 100
        );

        if (this.isDragging || tx !== 0) {
            this.foreground.style.visibility = 'visible';
            this.background.style.backgroundColor = colorOption ? colorOption.color : '';
            this.foreground.style.backgroundColor = '#024DAC';
        } else {
            this.foreground.style.visibility = 'hidden';
            this.background.style.backgroundColor = '';
            this.foreground.style.backgroundColor = '';
        }
    }

    updateTicketCounter() {
        const total = document.querySelectorAll('.select-ticket-card').length;
        this.selected = document.querySelectorAll('.select-ticket-card.selected').length;
        this.useTicketCount.textContent = this.selected;
        this.totalTicketCount.textContent = total;
        this.selectedTicketCount.classList.toggle('selected', this.selected > 0);
    }

    updateCaution() {
        if (this.isDragging || this.isCommitting) {
            this.caution.style.visibility = 'visible';
            this.main.style.visibility = 'visible';
        } else {
            this.caution.style.visibility = 'hidden';
            this.main.style.visibility = 'hidden';
        }
    }

    updateMain() {
        if (this.isDragging || this.isCommitting) {
            this.main.style.visibility = 'hidden';
        } else {
            this.main.style.visibility = 'visible';
        }
    }

    updateUsed() {
        if (this.isCommitting && !this.isUsed) {
            console.log(`updateUsed`);
            this.isUsed = true;
            this.used.style.transition = 'opacity 2s ease';
            this.used.style.visibility = 'visible';
            const now = new Date();
            const usedTimestamp = createUsedTimestamp(now);
            const indexes = [];
            document.querySelectorAll('.select-ticket-card.selected').forEach(card => {
                indexes.push(parseInt(card.dataset.index, 10));
                card.classList.remove('unused');
                card.classList.remove('selected');
                card.classList.add('used');
                card.querySelector('.used-timestamp').textContent = usedTimestamp;
            });
            setUsedTimestamp(now, indexes);
            indexes.forEach(index => {
                const card = document.querySelector(`.ticket-card[data-index="${index}"]`);
                if (card) {
                    card.classList.add('used');
                    card.querySelector('.used-timestamp').textContent = usedTimestamp;
                }
            });
            this.usedTicketCount.textContent = this.selected;
            this.selectedTicketCount.classList.toggle('selected', false);
            setTimeout(() => {
                this.used.style.opacity = '0';
                setTimeout(() => {
                    this.used.style.visibility = 'hidden';
                    this.used.style.opacity = '1';
                    this.isUsed = false;
                    this.usedTicketCount.textContent = '0';
                }, 2000 + 50);
            }, 750);
        }
    }

    updateSwiper() {
        if (this.isDragging) {
            this.swiper.style.transition = 'none';
        }
        else {
            this.swiper.style.transition = 'transform 300ms ease';
            this.swiper.style.transform = `translateX(0px)`;
            this.deltaX = 0;
        }
    }
}

function solveDurationFromAcceleration(distance, velocity, acceleration) {
    const a = 0.5 * acceleration;
    const b = velocity;
    const c = -distance;
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0 || Math.abs(acceleration) < 0.001) {
        return Math.abs(distance / Math.max(velocity, 1));
    }
    const sqrtD = Math.sqrt(discriminant);
    const t1 = (-b + sqrtD) / (2 * a);
    const t2 = (-b - sqrtD) / (2 * a);
    const t = Math.max(t1, t2);
    return t;
}

function getAverageX(touches) {
    return touches.length === 1
        ? touches[0].clientX
        : (touches[0].clientX + touches[1].clientX) / 2;
}

function toggleDescriptionVisibility() { }
document.addEventListener('DOMContentLoaded', () => {
    const swiper = document.getElementById('mogiri-swiper');
    const background = document.getElementById('mogiri-background');
    const foreground = document.getElementById('mogiri-foreground');
    const caution = document.getElementById('mogiri-caution');
    const main = document.getElementById('mogiri-main');
    const used = document.getElementById('mogiri-used');
    const usedTicketCount = document.getElementById('used-ticket-count');
    const selectedTicketCount = document.getElementById('selected-ticket-count');
    const useTicketCount = document.getElementById('use-ticket-count');
    const totalTicketCount = document.getElementById('total-ticket-count');
    const isDebug = false;

    const swiperManager = new SwiperManager(swiper, background, foreground, caution, main, used, usedTicketCount, selectedTicketCount, useTicketCount, totalTicketCount, isDebug);

    checkUsedTimestamp();
    updateDateAndDay();
    updateTimeDigits();
    setInterval(updateDateAndDay, 60 * 1000);


    document.querySelectorAll('.ticket-card').forEach(card => {
        const button = card.querySelector('.arrow-button');
        const image = button.querySelector('.icon');
        const description = card.querySelector('.description');
        button.addEventListener('click', () => {
            const state = button.classList.contains('up');
            button.classList.toggle('up', !state);
            if (state) {
                image.src = "/static/image/edsdk_v3_icon_arrow_up.png";
                description.style.height = description.scrollHeight + 'px';
                description.addEventListener('transitionend', function handler() {
                    description.style.height = 'auto';
                    description.removeEventListener('transitionend', handler);
                });
            } else {
                image.src = "/static/image/edsdk_v3_icon_arrow_down.png";
                description.style.height = description.scrollHeight + 'px';
                requestAnimationFrame(() => {
                    description.style.height = '45px';
                });
            }
        });
    });

    document.querySelectorAll('.select-ticket-card').forEach(card => {
        card.addEventListener('click', () => {
            if (!card.classList.contains('unused')) return
            card.classList.toggle('selected');
        });
    });
});