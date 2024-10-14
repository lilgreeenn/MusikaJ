let db;
let editId = null;
let videoCount = 1;


const request = indexedDB.open('MusicFestivalDB', 1);

request.onupgradeneeded = function (e) {
    db = e.target.result;
    const objectStore = db.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
    objectStore.createIndex('year', 'year', { unique: false });
    objectStore.createIndex('date', 'date', { unique: false });
    objectStore.createIndex('band', 'band', { unique: false });
    objectStore.createIndex('city', 'city', { unique: false });
    objectStore.createIndex('venue', 'venue', { unique: false });
};

request.onsuccess = function (e) {
    db = e.target.result;
    displayEvents();
};


document.getElementById('add-video').addEventListener('click', function () {
    videoCount++;
    const videoSection = document.getElementById('video-section');
    const newVideo = document.createElement('div');
    newVideo.innerHTML = `
        <label for="video${videoCount}-title">视频${videoCount}（歌曲名称）:</label>
        <input type="text" id="video${videoCount}-title" placeholder="歌曲名称" required>
        <input type="file" id="video${videoCount}" accept="video/*" required>
    `;
    videoSection.appendChild(newVideo);
});

document.getElementById('eventForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const year = document.getElementById('year').value;
    const date = document.getElementById('date').value;
    const band = document.getElementById('band').value;
    const city = document.getElementById('city').value;
    const venue = document.getElementById('venue').value;
    const bandPhoto = document.getElementById('band-photo').files[0];
    const livePhoto = document.getElementById('live-photo').files[0];
    
    const videos = [];
    for (let i = 1; i <= videoCount; i++) {
        const videoTitle = document.getElementById(`video${i}-title`).value;
        const videoFile = document.getElementById(`video${i}`).files[0];
        if (videoTitle && videoFile) {
            videos.push({ title: videoTitle, file: videoFile });
        }
    }

    const newEvent = {
        year,
        date,
        band,
        city,
        venue,
        bandPhoto: bandPhoto ? URL.createObjectURL(bandPhoto) : null,
        livePhoto: livePhoto ? URL.createObjectURL(livePhoto) : null,
        videos: videos.map(video => ({
            title: video.title,
            file: URL.createObjectURL(video.file)
        }))
    };

    const transaction = db.transaction(['events'], 'readwrite');
    const objectStore = transaction.objectStore('events');

    if (editId !== null) {
        newEvent.id = editId;
        objectStore.put(newEvent);
        editId = null;
    } else {
        objectStore.add(newEvent);
    }

    transaction.oncomplete = function () {
        displayEvents();
    };


    document.getElementById('eventForm').reset();
    videoCount = 1; 
    document.getElementById('video-section').innerHTML = `
        <label for="video1-title">视频1（歌曲名称）:</label>
        <input type="text" id="video1-title" placeholder="歌曲名称" required>
        <input type="file" id="video1" accept="video/*" required>
    `;
});

function displayEvents() {
    const timelineContainer = document.querySelector('.timeline-container');
    timelineContainer.innerHTML = ''; 


    const timeline = document.createElement('div');
    timeline.classList.add('timeline');
    timelineContainer.appendChild(timeline);

    const transaction = db.transaction(['events'], 'readonly');
    const objectStore = transaction.objectStore('events');
    const request = objectStore.getAll();

    request.onsuccess = function () {
        let events = request.result;

        
        events.sort((a, b) => new Date(a.date) - new Date(b.date));

        let currentYear = null;

        if (events.length === 0) {
            timelineContainer.innerHTML += '<p>Waiting for upload... </p>';
        } else {
            events.forEach(event => {
                const eventYear = new Date(event.date).getFullYear();

                
                if (eventYear !== currentYear) {
                    currentYear = eventYear;
                    const yearMarker = document.createElement('div');
                    yearMarker.classList.add('timeline-year');
                    yearMarker.textContent = currentYear;
                    timelineContainer.appendChild(yearMarker);
                }

               
                const timelineItem = document.createElement('div');
                timelineItem.classList.add('timeline-item');

                
                const eventDate = document.createElement('div');
                eventDate.classList.add('event-date');
                eventDate.textContent = event.date; 
                timelineItem.appendChild(eventDate);

                
                let htmlContentLeft = `
                    <div class="timeline-content-left">
                        <h3>${event.band}</h3>
                        <p>${event.city} · ${event.venue}</p>
                        ${event.bandPhoto ? `<img class="band-photo" src="${event.bandPhoto}" alt="乐队照片">` : ''}
                        ${event.livePhoto ? `<img class="live-photo" src="${event.livePhoto}" alt="现场照片">` : ''}
                    </div>
                `;

                
                let htmlContentRight = `
                    <div class="timeline-content-right">
                        <div class="video-container">
                            ${event.videos && event.videos.length > 0 ? event.videos.map(video => `
                                <p>${video.title}</p>
                                <video controls src="${video.file}"></video>
                            `).join('') : ''}
                        </div>
                        <button class="edit-btn" onclick="editEvent(${event.id})">编辑</button>
                        <button class="delete-btn" onclick="deleteEvent(${event.id})">删除</button>
                    </div>
                `;

                timelineItem.innerHTML += htmlContentLeft + htmlContentRight;
                timelineContainer.appendChild(timelineItem);
            });
        }
    };

    request.onerror = function () {
        console.log("获取事件数据时出错");
        timelineContainer.innerHTML += '<p>无法加载事件数据，请稍后重试。</p>';
    };
}


function editEvent(id) {
    const transaction = db.transaction(['events'], 'readonly');
    const objectStore = transaction.objectStore('events');
    const request = objectStore.get(id);

    request.onsuccess = function () {
        const event = request.result;

       
        document.getElementById('year').value = event.year;
        document.getElementById('date').value = event.date;
        document.getElementById('band').value = event.band;
        document.getElementById('city').value = event.city;
        document.getElementById('venue').value = event.venue;

       
        videoCount = event.videos.length || 1; 
        document.getElementById('video-section').innerHTML = event.videos.map((video, index) => `
            <div id="video-item-${index}">
                <label for="video${index + 1}-title">视频${index + 1}（歌曲名称）:</label>
                <input type="text" id="video${index + 1}-title" value="${video.title}" required>
                <input type="file" id="video${index + 1}" accept="video/*">
                <button onclick="deleteVideo(${index})">删除视频</button>
            </div>
        `).join('');

        editId = id; 
    };
}


function deleteVideo(index) {
    const videoItem = document.getElementById(`video-item-${index}`);
    if (videoItem) {
        videoItem.remove();
    }
}


function deleteEvent(id) {
    const transaction = db.transaction(['events'], 'readwrite');
    const objectStore = transaction.objectStore('events');
    objectStore.delete(id);

    transaction.oncomplete = function () {
        displayEvents();
    };
}


document.getElementById('download-json').addEventListener('click', function () {
    const transaction = db.transaction(['events'], 'readonly');
    const objectStore = transaction.objectStore('events');
    const request = objectStore.getAll();

    request.onsuccess = function () {
        const events = request.result.map(event => ({
            ...event,
            bandPhoto: event.bandPhoto,
            livePhoto: event.livePhoto,
            videos: event.videos
        }));

        const jsonStr = JSON.stringify(events, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'timeline-data.json';
        a.click();
    };
});


document.getElementById('upload-json-button').addEventListener('click', function () {
    const fileInput = document.getElementById('upload-json');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('请选择一个JSON文件。');
        return;
    }

    const reader = new FileReader();
    
    reader.onload = function (e) {
        const events = JSON.parse(e.target.result);

        const transaction = db.transaction(['events'], 'readwrite');
        const objectStore = transaction.objectStore('events');

        events.forEach(event => {
           
            event.bandPhoto = null;
            event.livePhoto = null;
            event.videos = event.videos.map(video => ({
                title: video.title,
                file: null
            }));
            objectStore.add(event);
        });

        transaction.oncomplete = function () {
            alert("数据导入成功，请重新上传图片和视频文件。");
            displayEvents();
        };
    };

    reader.readAsText(file);
});


function getBase64(file, callback) {
    const reader = new FileReader();
    reader.onload = function (e) {
        callback(e.target.result);
    };
    reader.readAsDataURL(file);
}

function downloadJSON() {
    const transaction = db.transaction(['events'], 'readonly');
    const objectStore = transaction.objectStore('events');
    const request = objectStore.getAll();

    request.onsuccess = function () {
        const events = request.result;
        const promises = events.map(event => {
            return new Promise(resolve => {
                const updatedEvent = { ...event };
                const filePromises = [];

                if (event.bandPhoto) {
                    filePromises.push(new Promise(resolveFile => {
                        getBase64(event.bandPhoto, base64 => {
                            updatedEvent.bandPhoto = base64;
                            resolveFile();
                        });
                    }));
                }

                if (event.livePhoto) {
                    filePromises.push(new Promise(resolveFile => {
                        getBase64(event.livePhoto, base64 => {
                            updatedEvent.livePhoto = base64;
                            resolveFile();
                        });
                    }));
                }

               
                updatedEvent.videos = event.videos.map(video => {
                    return new Promise(resolveVideo => {
                        getBase64(video.file, base64 => {
                            resolve({
                                title: video.title,
                                file: base64
                            });
                        });
                    });
                });

                Promise.all(filePromises).then(() => {
                    resolve(updatedEvent);
                });
            });
        });

        Promise.all(promises).then(updatedEvents => {
            const jsonStr = JSON.stringify(updatedEvents, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'timeline-data.json';
            a.click();
        });
    };
}

document.getElementById('download-json').addEventListener('click', downloadJSON);



function uploadJSON() {
    const fileInput = document.getElementById('upload-json');
    const file = fileInput.files[0];

    if (!file) {
        alert('请选择一个JSON文件。');
        return;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
        const events = JSON.parse(e.target.result);

        const transaction = db.transaction(['events'], 'readwrite');
        const objectStore = transaction.objectStore('events');

        events.forEach(event => {
            event.bandPhoto = event.bandPhoto ? event.bandPhoto : null;
            event.livePhoto = event.livePhoto ? event.livePhoto : null;

          
            objectStore.add(event);
        });

        transaction.oncomplete = function () {
            alert("数据导入成功，图片和视频已恢复。");
            displayEvents();
        };
    };

    reader.readAsText(file);
}

document.getElementById('upload-json-button').addEventListener('click', uploadJSON);


document.getElementById('generate-stats').addEventListener('click', function () {
    const transaction = db.transaction(['events'], 'readonly');
    const objectStore = transaction.objectStore('events');
    const request = objectStore.getAll();

    request.onsuccess = function () {
        const events = request.result;

        const yearData = {};
        const monthData = {};
        const cityData = {};
        const venueData = {};
        const bandCounts = {};
        let totalBands = 0;

        events.forEach(event => {
          
            const year = new Date(event.date).getFullYear();
            yearData[year] = (yearData[year] || 0) + 1;

          
            const month = new Date(event.date).getMonth() + 1;  // 月份从 0 开始，所以要 +1
            monthData[month] = (monthData[month] || 0) + 1;

            cityData[event.city] = (cityData[event.city] || 0) + 1;
            venueData[event.venue] = (venueData[event.venue] || 0) + 1;
            bandCounts[event.band] = (bandCounts[event.band] || 0) + 1;
            totalBands++;
        });

        const mostSeenBands = Object.entries(bandCounts)
            .filter(([_, count]) => count === Math.max(...Object.values(bandCounts)))
            .map(([band, count]) => `${band} + ${count}`);

        const ctxYear = document.getElementById('yearChart').getContext('2d');
        const ctxMonth = document.getElementById('monthChart').getContext('2d');
        const ctxCity = document.getElementById('cityChart').getContext('2d');
        const ctxVenue = document.getElementById('venueChart').getContext('2d');
        const ctxBand = document.getElementById('bandChart').getContext('2d');
        const ctxTotalBand = document.getElementById('totalBandChart').getContext('2d');

        new Chart(ctxYear, {
            type: 'bar',
            data: {
                labels: Object.keys(yearData),
                datasets: [{
                    label: 'Year statistics',
                    data: Object.values(yearData),
                    backgroundColor: '#ff6384'
                }]
            }
        });

        new Chart(ctxMonth, {
            type: 'bar',
            data: {
                labels: Object.keys(monthData).map(month => `第${month}月`),
                datasets: [{
                    label: 'Month statistics',
                    data: Object.values(monthData),
                    backgroundColor: '#36a2eb'
                }]
            }
        });

        new Chart(ctxCity, {
            type: 'bar',
            data: {
                labels: Object.keys(cityData),
                datasets: [{
                    label: 'Citys statistics',
                    data: Object.values(cityData),
                    backgroundColor: '#ffce56'
                }]
            }
        });

        new Chart(ctxVenue, {
            type: 'bar',
            data: {
                labels: Object.keys(venueData),
                datasets: [{
                    label: 'Place statistics',
                    data: Object.values(venueData),
                    backgroundColor: '#4bc0c0'
                }]
            }
        });

        new Chart(ctxBand, {
            type: 'bar',
            data: {
                labels: mostSeenBands,
                datasets: [{
                    label: 'Most common bands',
                    data: mostSeenBands.map(() => 1), // 每个乐队只显示1次
                    backgroundColor: '#9966ff'
                }]
            }
        });

        new Chart(ctxTotalBand, {
            type: 'bar',
            data: {
                labels: ['Total number of bands'],
                datasets: [{
                    label: 'Total number of bands',
                    data: [totalBands],
                    backgroundColor: '#ff9f40'
                }]
            }
        });
    };
});
