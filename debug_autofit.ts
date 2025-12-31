import { calculateBestFitFontSize } from './src/lib/canvas/AutoFitText';

const baseConfig = {
    fontFamily: 'Arial',
    fontWeight: 'normal',
    fontStyle: 'normal',
    lineHeight: 1.2,
    fill: '#000000',
    textAlign: 'left',
    minFontSize: 10,
    maxFontSize: 100,
    wordWrap: true
};

console.log('--- Debugging Auto-Fit ---');
try {
    const sizeShort = calculateBestFitFontSize('Hello', 200, 100, baseConfig);
    console.log(`Short Text Result: ${sizeShort} (Expected ~100)`);

    const longText = 'This is a very long text that definitely needs to wrap multiple lines to fit in the box';
    const sizeLong = calculateBestFitFontSize(longText, 100, 100, baseConfig);
    console.log(`Long Text Result: ${sizeLong} (Expected < 100)`);
} catch (e) {
    console.error('Error:', e);
}
