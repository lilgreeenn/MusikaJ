let db;
let songs = [];

function initDB() {
    const request = indexedDB.open('SongsDatabasePage1', 1);

    request.onupgradeneeded = function (event) {
        db = event.target.result;
        const objectStore = db.createObjectStore('songs', { keyPath: 'id', autoIncrement: true });
        const audioStore = db.createObjectStore('audioFiles', { keyPath: 'artist' }); // 音乐文件存储
    };

    request.onsuccess = function (event) {
        db = event.target.result;
        loadDataFromIndexedDB();
    };

    request.onerror = function (event) {
        console.error('数据库打开失败', event);
    };
}


function addSong() {
    const songTitle = document.getElementById('songTitle').value;
    const artistName = document.getElementById('artistName').value;
    const lyrics = document.getElementById('lyricsInput').value;
    const listenCount = parseInt(document.getElementById('listenCount').value) || 0;
    const albumCover = document.getElementById('albumCover').files[0];
    const musicFile = document.getElementById('musicFile').files[0]; 

    if (!songTitle || !lyrics || !artistName) {
        alert('请填写歌名、歌手名和歌词！');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const coverData = e.target.result;
        const song = {
            title: songTitle,
            artist: artistName,
            lyrics: lyrics,
            listenCount: listenCount,
            wordFrequency: calculateWordFrequency(lyrics),
            cover: coverData
        };
        songs.push(song);

     
        saveDataToIndexedDB(() => {
    
            displaySongList();
            generateListenCountChart();

           
            if (musicFile) {
                saveMusicFile(artistName, musicFile);
            }

          
            resetInputs();
        });
    };

    if (albumCover) {
        reader.readAsDataURL(albumCover);
    } else {
        const song = {
            title: songTitle,
            artist: artistName,
            lyrics: lyrics,
            listenCount: listenCount,
            wordFrequency: calculateWordFrequency(lyrics),
            cover: null
        };
        songs.push(song);

   
        saveDataToIndexedDB(() => {
            displaySongList();
            generateListenCountChart();
            resetInputs();
        });
    }
}


function resetInputs() {
    document.getElementById('songTitle').value = '';
    document.getElementById('artistName').value = '';
    document.getElementById('lyricsInput').value = '';
    document.getElementById('listenCount').value = '';
    document.getElementById('musicFile').value = ''; 
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


function loadAudioFiles() {
    const transaction = db.transaction(['audioFiles'], 'readonly');
    const objectStore = transaction.objectStore('audioFiles');
    const request = objectStore.getAll();

    request.onsuccess = function (event) {
        const audioFiles = event.target.result;
        audioFiles.forEach(file => {
            const audioBlob = new Blob([file.audio], { type: 'audio/mpeg' }); 
            const audioUrl = URL.createObjectURL(audioBlob); 
            
            if (artists[file.artist]) {
                artists[file.artist].audioClip = new Audio(audioUrl); 
            }
        });
    };

    request.onerror = function () {
        console.error('从IndexedDB加载音乐文件时出错');
    };
}




function importData(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const importedData = JSON.parse(e.target.result);
            songs = importedData;

           
            saveDataToIndexedDB(() => {
                displaySongList();
                generateListenCountChart();
            });
        };
        reader.readAsText(file);
    }
}


function saveDataToIndexedDB(callback) {
    const transaction = db.transaction(['songs'], 'readwrite');
    const objectStore = transaction.objectStore('songs');
    objectStore.clear(); 

    songs.forEach(song => {
        objectStore.add(song); 
    });

    transaction.oncomplete = function () {
        console.log('数据保存到IndexedDB成功');
        if (callback) callback();
    };

    transaction.onerror = function () {
        console.error('保存到IndexedDB时出错');
    };
}


function exportData() {
    const dataStr = JSON.stringify(songs, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'songs_data.json';
    link.click();
}


function displaySongList() {
    const songListDiv = document.getElementById('songList');
    songListDiv.innerHTML = '';

    songs.forEach((song, index) => {
        const songItem = document.createElement('div');
        songItem.classList.add('song-item');

        const albumCover = document.createElement('img');
        albumCover.src = song.cover || 'default_cover.jpg';
        albumCover.classList.add('album-cover');
        albumCover.onclick = () => showLyrics(index);

        const songTitle = document.createElement('span');
        songTitle.textContent = `${index + 1}. ${song.title} - ${song.artist} (Times: ${song.listenCount})`;
        songTitle.onclick = () => showLyrics(index);

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `song-${index}`;
        checkbox.name = 'song-checkbox';
        checkbox.onclick = () => updateVisualizations();

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.onclick = () => deleteSong(index);
        deleteButton.style.padding = '4px 6px';
        deleteButton.style.width = '60px';
        deleteButton.style.float = 'right';

        const listenCountInput = document.createElement('input');
        listenCountInput.type = 'number';
        listenCountInput.value = song.listenCount;
        listenCountInput.style.width = '60px';
        listenCountInput.onchange = (e) => updateListenCount(index, e.target.value);

        const controlsContainer = document.createElement('div');
        controlsContainer.style.display = 'flex';
        controlsContainer.appendChild(checkbox);
        controlsContainer.appendChild(listenCountInput);
        controlsContainer.appendChild(deleteButton);

        songItem.appendChild(albumCover);
        songItem.appendChild(songTitle);
        songItem.appendChild(controlsContainer);
        songListDiv.appendChild(songItem);
    });
}

function deleteSong(index) {
    const songId = songs[index].id; 

    
    const transaction = db.transaction(['songs'], 'readwrite');
    const objectStore = transaction.objectStore('songs');
    const deleteRequest = objectStore.delete(songId);

    deleteRequest.onsuccess = function () {
       
        songs.splice(index, 1); 
        displaySongList(); 
        generateListenCountChart(); 
        console.log('歌曲已成功删除');
    };

    deleteRequest.onerror = function () {
        console.error('删除歌曲时出错');
    };
}



function updateListenCount(index, newCount) {
    songs[index].listenCount = parseInt(newCount);
    saveDataToIndexedDB(() => {
        displaySongList();
        generateListenCountChart();
    });
}


function calculateWordFrequency(lyrics) {
    const segmenter = new Intl.Segmenter('zh', { granularity: 'word' });
    const segments = segmenter.segment(lyrics);
    const wordFrequency = {};

    for (const segment of segments) {
        const word = segment.segment.trim();
        if (word && !stopwords.includes(word)) {
            wordFrequency[word] = (wordFrequency[word] || 0) + 1;
        }
    }

    return wordFrequency;
}


function selectAllSongs() {
    const checkboxes = document.querySelectorAll('input[name="song-checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
    });
    updateVisualizations();
}


function unselectAllSongs() {
    const checkboxes = document.querySelectorAll('input[name="song-checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    updateVisualizations();
}


function generateReport() {
    const selectedSongs = document.querySelectorAll('input[name="song-checkbox"]:checked');
    if (selectedSongs.length === 0) {
        alert('Please select at least one song to generate a report!');
        return;
    }

    let report = '<h2>High Frequency Word Report:</h2>';
    selectedSongs.forEach(checkbox => {
        const index = checkbox.id.split('-')[1];
        const song = songs[index];

        report += `<h3>Song: ${song.title} - ${song.artist}</h3>`;
        report += `<p>Time: ${song.listenCount}</p>`;
        report += `<p>High Frequency Word:</p><ul>`;

        for (const [word, frequency] of Object.entries(song.wordFrequency)) {
            report += `<li style="text-align: left;">${word}: ${frequency} times</li>`;
        }

        report += '</ul><hr>';
    });

    document.getElementById('reportContent').innerHTML = report;
    document.getElementById('reportModal').style.display = 'flex';
}


function downloadReport() {
    const content = document.getElementById('reportContent').innerHTML;
    const blob = new Blob([content], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'High Frequency Word Report.html';
    link.click();
}

function closeReportModal() {
    document.getElementById('reportModal').style.display = 'none';
}


function updateVisualizations() {
    calculateTotalFrequency();
    generateListenCountChart();
}


function calculateTotalFrequency() {
    const selectedSongs = document.querySelectorAll('input[name="song-checkbox"]:checked');
    if (selectedSongs.length === 0) {
        clearVisualization();
        return;
    }

    const totalWordFrequency = {};
    selectedSongs.forEach(checkbox => {
        const index = checkbox.id.split('-')[1];
        const song = songs[index];

        for (const word in song.wordFrequency) {
            totalWordFrequency[word] = (totalWordFrequency[word] || 0) + song.wordFrequency[word];
        }
    });

    const sortedTotalFrequency = Object.entries(totalWordFrequency).sort((a, b) => b[1] - a[1]);
    displayResult(sortedTotalFrequency);
    displayChart(sortedTotalFrequency);
}


function clearVisualization() {
    document.getElementById('result').innerHTML = '';
    const ctx = document.getElementById('frequencyChart').getContext('2d');
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}


function displayResult(sortedWordFrequency) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '';

    sortedWordFrequency.forEach(([word, frequency]) => {
        const wordElement = document.createElement('p');
        wordElement.textContent = `${word}: ${frequency} Times`;
        wordElement.onclick = () => showWordOccurrences(word);
        resultDiv.appendChild(wordElement);
    });
}


function showWordOccurrences(word) {
    let occurrences = [];
    songs.forEach(song => {
        if (song.wordFrequency[word]) {
            occurrences.push({ title: song.title, count: song.wordFrequency[word] });
        }
    });

    occurrences.sort((a, b) => b.count - a.count);

    const occurrenceList = document.getElementById('wordOccurrenceResult');
    occurrenceList.innerHTML = '';
    occurrences.forEach(item => {
        const p = document.createElement('p');
        p.style.textAlign = 'left';
        p.textContent = `${item.title}: ${item.count} Times`;
        occurrenceList.appendChild(p);
    });

    document.getElementById('wordOccurrenceModal').style.display = 'flex';
}

function closeWordOccurrenceModal() {
    document.getElementById('wordOccurrenceModal').style.display = 'none';
}


function displayChart(wordFrequencyData) {
    const ctx = document.getElementById('frequencyChart').getContext('2d');
    const labels = wordFrequencyData.map(item => item[0]);
    const data = wordFrequencyData.map(item => item[1]);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '词频统计',
                data: data,
                backgroundColor: 'rgba(233, 30, 99, 0.7)',
                borderColor: 'rgba(233, 30, 99, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}


function generateListenCountChart() {
    const ctx = document.getElementById('listenCountChart').getContext('2d');
    const sortedData = songs
        .map(song => ({ title: song.title, artist: song.artist, listenCount: song.listenCount }))
        .sort((a, b) => b.listenCount - a.listenCount);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedData.map(song => `${song.title} - ${song.artist}`),
            datasets: [{
                label: 'Listening statistics',
                data: sortedData.map(song => song.listenCount),
                backgroundColor: 'rgba(30, 144, 255, 0.7)',
                borderColor: 'rgba(30, 144, 255, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}


function showLyrics(index) {
    const song = songs[index];
    document.getElementById('modalTitle').textContent = `${song.title} - ${song.artist}`;
    document.getElementById('modalLyrics').textContent = song.lyrics;
    document.getElementById('modalCover').src = song.cover || 'default_cover.jpg';
    document.getElementById('lyricsModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('lyricsModal').style.display = 'none';
}

function loadDataFromIndexedDB() {
    const transaction = db.transaction(['songs'], 'readonly');
    const objectStore = transaction.objectStore('songs');
    const request = objectStore.getAll();

    request.onsuccess = function (event) {
        songs = event.target.result; 
        displaySongList(); 
        generateListenCountChart(); 
    };

    request.onerror = function () {
        console.error('从IndexedDB加载数据时出错');
    };
}


function sortByListenCount() {
    
    songs.sort((a, b) => b.listenCount - a.listenCount);
    displaySongList();
    generateListenCountChart(); 
}


function goToArtistsPage() {
    window.location.href = 'page4.html';
}


window.onload = function () {
    initDB();
};


function initDB() {
    const request = indexedDB.open('SongsDatabase', 1);

    request.onupgradeneeded = function (event) {
        db = event.target.result;

       
        if (!db.objectStoreNames.contains('songs')) {
            db.createObjectStore('songs', { keyPath: 'id', autoIncrement: true });
        }

        
        if (!db.objectStoreNames.contains('audioFiles')) {
            db.createObjectStore('audioFiles', { keyPath: 'artist' });
        }
    };

    request.onsuccess = function (event) {
        db = event.target.result;
        console.log('数据库打开成功');
        loadDataFromIndexedDB();
    };

    request.onerror = function (event) {
        console.error('数据库打开失败', event);
    };
}


function saveDataToIndexedDB(callback) {
    if (!db) {
        console.error('IndexedDB 未初始化');
        return;
    }


    const transaction = db.transaction(['songs'], 'readwrite');
    const objectStore = transaction.objectStore('songs');


    objectStore.clear();
    songs.forEach(song => {
        objectStore.add(song);
    });

    transaction.oncomplete = function () {
        console.log('数据保存成功');
        if (callback) callback();
    };

    transaction.onerror = function () {
        console.error('保存数据时出错');
    };
}
