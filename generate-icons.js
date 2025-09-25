// Generate TK logo icons programmatically
function generateTKIcon(size) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = size;
    canvas.height = size;
    
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#ff69b4');
    gradient.addColorStop(0.5, '#ff1493');
    gradient.addColorStop(1, '#dc143c');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    
    // Add subtle border radius effect
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, size * 0.1);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    
    // Text styling
    ctx.fillStyle = 'white';
    ctx.font = `bold ${size * 0.45}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Text shadow
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = size * 0.03;
    ctx.shadowOffsetX = size * 0.015;
    ctx.shadowOffsetY = size * 0.015;
    
    // Draw TK text
    ctx.fillText('TK', size/2, size/2);
    
    return canvas.toDataURL('image/png');
}

// Export function for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { generateTKIcon };
}