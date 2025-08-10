// ====================
// UA Player Frontend JS
// ====================

// Get DOM elements
const playlistItems = document.querySelectorAll(".playlist-item");
const likeBtns      = document.querySelectorAll(".like-btn");
const audioPlayer   = document.getElementById("audioPlayer");
const volumeRange   = document.getElementById("volume-range");
const progressBar   = document.getElementById("progress-bar");
const playPauseBtn  = document.getElementById("playPauseBtn");
const playPauseIcon = document.getElementById("playPauseIcon");
const prevBtn       = document.getElementById("prevBtn");
const nextBtn       = document.getElementById("nextBtn");
const shuffleBtn    = document.getElementById("shuffleBtn");

// Pull songs from localized PHP data
const songs = uaPlayerData?.tracks || [];
let currentSongIndex = 0;
let isSongLoaded = false;

// ====================
// Show duration for each track in playlist
// ====================
playlistItems.forEach((item, index) => {
    const audioSrc = songs[index]?.audio;
    if (!audioSrc) return;

    const tempAudio = new Audio(audioSrc);
    tempAudio.addEventListener("loadedmetadata", () => {
        const durationEl = item.querySelector(".duration");
        if (durationEl) {
            const totalSeconds = Math.floor(tempAudio.duration);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            durationEl.textContent = `${minutes}:${seconds.toString().padStart(2, "0")}`;
        }
    });
});

// ====================
// Init Swiper
// ====================
var swiper = new Swiper(".swiper", {
    effect: "cards",
    cardsEffect: { perSlideOffset: 9, perSlideRotate: 3 },
    grabCursor: true,
    speed: 700,
    initialSlide: 0,
});

swiper.on("slideChange", () => {
    const newIndex = swiper.realIndex;
    if (newIndex !== currentSongIndex) {
        currentSongIndex = newIndex;
        loadAndPlaySong(currentSongIndex);
    }
});

// ====================
// Utility Functions
// ====================
function updatePlaylistHighlight(index) {
    playlistItems.forEach((item, i) => {
        item.classList.toggle("active-playlist-item", i === index);
    });
}

function updateSwiperToMatchSong(index) {
    if (swiper.activeIndex !== index) {
        swiper.slideTo(index);
    }
}

function updatePlayPauseIcon(isPlaying) {
    playPauseIcon.classList.toggle("fa-pause", isPlaying);
    playPauseIcon.classList.toggle("fa-play", !isPlaying);
}

function loadAndPlaySong(index) {
    if (!songs[index]) return;
    audioPlayer.src = songs[index].audio;
    audioPlayer.play();
    updatePlayPauseIcon(true);
    updatePlaylistHighlight(index);
    updateSwiperToMatchSong(index);
    isSongLoaded = true;
}

function pauseSong() {
    audioPlayer.pause();
    updatePlayPauseIcon(false);
}

function playSong() {
    audioPlayer.play();
    updatePlayPauseIcon(true);
}

function togglePlayPause() {
    if (!isSongLoaded) {
        loadAndPlaySong(currentSongIndex);
    } else if (audioPlayer.paused) {
        playSong();
    } else {
        pauseSong();
    }
}

function nextSong() {
    currentSongIndex = (currentSongIndex + 1) % songs.length;
    loadAndPlaySong(currentSongIndex);
}

function prevSong() {
    currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
    loadAndPlaySong(currentSongIndex);
}

// ====================
// Event Listeners
// ====================
playlistItems.forEach((item, index) => {
    item.addEventListener("click", () => {
        currentSongIndex = index;
        loadAndPlaySong(index);
    });
});

playPauseBtn.addEventListener("click", togglePlayPause);
nextBtn.addEventListener("click", nextSong);
prevBtn.addEventListener("click", prevSong);

audioPlayer.addEventListener("loadedmetadata", () => {
    progressBar.max = audioPlayer.duration;
});

audioPlayer.addEventListener("timeupdate", () => {
    if (!audioPlayer.paused) {
        progressBar.value = audioPlayer.currentTime;
    }
});

progressBar.addEventListener("input", () => {
    audioPlayer.currentTime = progressBar.value;
});

volumeRange.addEventListener("input", () => {
    audioPlayer.volume = volumeRange.value / 100;
});

audioPlayer.addEventListener("ended", nextSong);

shuffleBtn.addEventListener("click", () => {
    let randomIndex = Math.floor(Math.random() * songs.length);
    if (randomIndex === currentSongIndex) {
        randomIndex = (randomIndex + 1) % songs.length;
    }
    currentSongIndex = randomIndex;
    loadAndPlaySong(currentSongIndex);
});

// ====================
// Like button AJAX save
// ====================
likeBtns.forEach((likeBtn, index) => {
    likeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        likeBtn.classList.toggle("fa-regular");
        likeBtn.classList.toggle("fa-solid");

        // Send like/unlike to WordPress
        fetch(uaPlayerData.ajax_url, {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                action: "ua_player_toggle_like",
                track_id: songs[index]?.id || index,
                nonce: uaPlayerData.nonce
            })
        });
    });
});

// ====================
// Auto-load first song
// ====================
if (songs.length > 0) {
    loadAndPlaySong(0);
}
