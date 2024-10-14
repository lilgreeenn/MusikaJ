const images = document.querySelectorAll('.draggable');
const mainImage = document.getElementById('return-image');
let zIndexCounter = 1;


let isDragging = false;
let isMouseDown = false;
let currentElement = null;
let offsetX, offsetY;
let dragTimeout; 
const dragThreshold = 5; 
const dragDelay = 300; 


mainImage.style.zIndex = 1000;

images.forEach(image => {
   
    image.addEventListener('dragstart', (e) => e.preventDefault());

    
    image.addEventListener('mousedown', startPress);
   
    image.addEventListener('mouseup', stopPress);
   
    image.addEventListener('click', bringToFront);
   
    image.addEventListener('dblclick', handleImageDoubleClick);
   
    document.addEventListener('mousemove', handleMouseMove);
});

function startPress(event) {
    currentElement = event.target;
    isMouseDown = true; 
    isDragging = false; 
    offsetX = event.clientX - currentElement.offsetLeft;
    offsetY = event.clientY - currentElement.offsetTop;

    
    dragTimeout = setTimeout(() => {
        isDragging = true;  
    }, dragDelay);
}

function handleMouseMove(event) {
    if (!isMouseDown || !isDragging) return;  

   
    const currentX = event.clientX;
    const currentY = event.clientY;
    currentElement.style.left = (currentX - offsetX) + 'px';
    currentElement.style.top = (currentY - offsetY) + 'px';
}

function stopPress(event) {
    clearTimeout(dragTimeout);
    isMouseDown = false; 
    isDragging = false;  
    currentElement = null;
}

function bringToFront(event) {
    if (isDragging) return;
    zIndexCounter++; 
    event.target.style.zIndex = zIndexCounter; 
}

function handleImageDoubleClick(event) {
    
    const imageId = event.target.id;

    switch(imageId) {
        case 'image1':
            window.location.href = 'page.html';
            break;
        case 'image2':
            window.location.href = 'page2.html';
            break;
        case 'image3':
            window.location.href = 'page3.html';
            break;
        case 'image4':
            window.location.href = 'page4.html';
            break;
        case 'image5':
            window.location.href = 'page5.html';
            break;
    }
}
