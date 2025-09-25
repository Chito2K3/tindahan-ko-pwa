// Generate proper PNG icons for Android PWA
function generateIcon(size) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = size;
    canvas.height = size;
    
    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#ff69b4');
    gradient.addColorStop(0.5, '#ff1493');
    gradient.addColorStop(1, '#dc143c');
    
    // Fill background
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    
    // Add rounded corners
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, size * 0.1);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    
    // Add text
    ctx.fillStyle = 'white';
    ctx.font = `bold ${size * 0.4}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = size * 0.02;
    ctx.shadowOffsetX = size * 0.01;
    ctx.shadowOffsetY = size * 0.01;
    
    ctx.fillText('TK', size/2, size/2);
    
    return canvas.toDataURL('image/png');
}

// Generate icons
const icon192 = generateIcon(192);
const icon512 = generateIcon(512);

console.log('Icons generated. Use these data URLs in manifest.json');
console.log('192x192:', icon192.substring(0, 100) + '...');
console.log('512x512:', icon512.substring(0, 100) + '...');