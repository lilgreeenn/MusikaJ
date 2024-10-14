const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let width = canvas.width = window.innerWidth;
let height = canvas.height = window.innerHeight;

const image = new Image();
image.src = "openpage.jpg"; 


image.onload = function() {
    drawImage();
};

function drawImage() {
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
}

window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    drawImage();
});

function fishEyeEffect(x, y) {
    const radius = 200;
    const strength = 0.5; 

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const newImageData = ctx.createImageData(imageData);

    for (let i = 0; i < width; i++) {
        for (let j = 0; j < height; j++) {
            const dx = i - x;
            const dy = j - y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < radius) {
                const factor = 1 + (radius - distance) / radius * strength;

               
                const newX = Math.round(x + dx * factor);
                const newY = Math.round(y + dy * factor);

                
                if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
                    const index = (j * width + i) * 4;
                    const newIndex = (newY * width + newX) * 4;

                   
                    newImageData.data[index] = imageData.data[newIndex];
                    newImageData.data[index + 1] = imageData.data[newIndex + 1];
                    newImageData.data[index + 2] = imageData.data[newIndex + 2];
                    newImageData.data[index + 3] = imageData.data[newIndex + 3];
                }
            } else {
                const index = (j * width + i) * 4;
                newImageData.data[index] = imageData.data[index];
                newImageData.data[index + 1] = imageData.data[index + 1];
                newImageData.data[index + 2] = imageData.data[index + 2];
                newImageData.data[index + 3] = imageData.data[index + 3];
            }
        }
    }
    ctx.putImageData(newImageData, 0, 0);
}

canvas.addEventListener('mousemove', (event) => {
    const { clientX: x, clientY: y } = event;
    fishEyeEffect(x, y);
});


