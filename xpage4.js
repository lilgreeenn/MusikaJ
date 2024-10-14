let db;
let artists = {}; 


function initDB() {
    const request = indexedDB.open('SongsDatabase', 1);

    request.onsuccess = function (event) {
        db = event.target.result;
        loadSongsFromIndexedDB(); 
    };

    request.onerror = function () {
        console.error('Database failed to open');
    };
}


function loadSongsFromIndexedDB() {
    const transaction = db.transaction(['songs'], 'readonly');
    const objectStore = transaction.objectStore('songs');
    const request = objectStore.getAll();

    request.onsuccess = function (event) {
        const songs = event.target.result;
        generateArtistRanking(songs);
    };
}

function generateArtistRanking(songs) {
    songs.forEach(song => {
        if (!artists[song.artist]) {
            artists[song.artist] = {
                name: song.artist,
                listenCount: 0,
                songs: [],
                audioClip: null 
            };
        }
        artists[song.artist].listenCount += song.listenCount;
        artists[song.artist].songs.push(song);
    });

    const sortedArtists = Object.values(artists).sort((a, b) => b.listenCount - a.listenCount);
    displayArtists(sortedArtists);
}


function displayArtists(artists) {
    const artistsContainer = document.getElementById('artistsContainer');
    artistsContainer.innerHTML = '';

    artists.forEach((artist, index) => {
        const card = document.createElement('div');
        card.classList.add('artist-card');

        if (index === 0) card.classList.add('top1');
        else if (index === 1) card.classList.add('top2');
        else if (index === 2) card.classList.add('top3');

     
        const ranking = document.createElement('div');
        ranking.classList.add('artist-ranking');
        ranking.textContent = `#${index + 1}`;
        card.appendChild(ranking);


        const cover = document.createElement('img');
        cover.classList.add('artist-cover');
        const topSong = artist.songs.reduce((a, b) => (a.listenCount > b.listenCount ? a : b));
        cover.src = topSong.cover || 'default_cover.jpg';
        card.appendChild(cover);

 
        const artistName = document.createElement('h3');
        artistName.textContent = `${artist.name}`;
        card.appendChild(artistName);

        const listenCount = document.createElement('p');
        listenCount.textContent = `Total times: ${artist.listenCount}`;
        card.appendChild(listenCount);

        
        card.onmouseenter = () => playAudioClip(artist);
        card.onmouseleave = () => stopAudioClip(artist);

        
        card.onclick = () => showArtistDetails(artist);

        artistsContainer.appendChild(card);
    });
}


function playAudioClip(artist) {
    if (artist.audioClip) {
        artist.audioClip.play();
    } else {
        loadAudioFile(artist.name, (audioUrl) => {
            artist.audioClip = new Audio(audioUrl);
            artist.audioClip.play();
        });
    }
}


function stopAudioClip(artist) {
    if (artist.audioClip) {
        artist.audioClip.pause();
        artist.audioClip.currentTime = 0;
    }
}


function loadAudioFile(artistName, callback) {
    const transaction = db.transaction(['audioFiles'], 'readonly');
    const objectStore = transaction.objectStore('audioFiles');
    const request = objectStore.get(artistName);

    request.onsuccess = function (event) {
        const audioData = event.target.result.audio;
        const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);
        callback(audioUrl);
    };
}


function showArtistDetails(artist) {
    document.getElementById('artistName').textContent = artist.name;
    const songsList = document.getElementById('songsList');
    songsList.innerHTML = '';

    artist.songs.forEach(song => {
        const songItem = document.createElement('p');
        songItem.textContent = `${song.title} - Times: ${song.listenCount}`;
        songsList.appendChild(songItem);
    });

    document.getElementById('artistModal').style.display = 'flex';
}


function closeModal() {
    document.getElementById('artistModal').style.display = 'none';
}


window.onload = function () {
    initDB();
};


function uploadAudioSnippet() {
    const fileInput = document.getElementById('musicSnippet');
    const file = fileInput.files[0];

    if (!file) {
        alert('请上传一个音乐文件');
        return;
    }

    const artistName = prompt('请输入歌手名');
    if (!artistName) {
        alert('请填写歌手名');
        return;
    }

    saveMusicFile(artistName, file);
}


function saveMusicFile(artistName, file) {
    const transaction = db.transaction(['audioFiles'], 'readwrite');
    const objectStore = transaction.objectStore('audioFiles');
    const reader = new FileReader();

    reader.onload = function(event) {
        const audioData = event.target.result;
        objectStore.put({ artist: artistName, audio: audioData });
        console.log('音乐文件保存成功:', artistName);
    };

    reader.onerror = function() {
        console.error('音乐文件读取失败');
    };

    reader.readAsArrayBuffer(file); 
}


function exportData() {
    const transaction = db.transaction(['songs', 'audioFiles'], 'readonly');
    const songStore = transaction.objectStore('songs');
    const audioStore = transaction.objectStore('audioFiles');
    const songRequest = songStore.getAll();
    const audioRequest = audioStore.getAll();

    Promise.all([songRequest, audioRequest]).then(([songs, audios]) => {
        const data = { songs, audios };
        const jsonData = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'songs_and_audio_data.json';
        link.click();
    });
}
