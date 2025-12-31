/**
 * @jest-environment jsdom
 */
import { calculateBestFitFontSize } from '../AutoFitText';

describe('AutoFitText', () => {
    describe('calculateBestFitFontSize', () => {
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

        it('should return maxFontSize for short text that fits easily', () => {
            // Constraint height must be > fontSize * lineHeight (100 * 1.2 = 120)
            const size = calculateBestFitFontSize('Hello', 200, 150, baseConfig);
            // It should maximize the size up to maxFontSize
            expect(size).toBe(100);
        });

        it('should reduce font size for long text', () => {
            const longText = 'This is a very long text that definitely needs to wrap multiple lines to fit in the box';
            const size = calculateBestFitFontSize(longText, 100, 100, baseConfig);
            expect(size).toBeLessThan(100);
            expect(size).toBeGreaterThanOrEqual(10);
        });

        it('should respect minFontSize even if text overflows', () => {
            // Use words so it wraps
            const hugeText = 'Word '.repeat(1000);
            const size = calculateBestFitFontSize(hugeText, 50, 50, baseConfig);
            expect(size).toBe(10); // Should be floor at min
        });

        it('should respect maxLines constraint', () => {
            // Text that would normally fit in 3 lines at a larger size, but we force 2 lines
            // "Hello World" in narrow box (50px wide) with large maxFontSize
            // "Hello" is approx 20-30px wide at size 10?
            // Let's rely on the relative behavior: 
            // If maxTextLines is 1, it should try to shrink text until it fits in 1 line 
            // OR if it can't fit in 1 line even at minFontSize, it returns minFontSize.
            
            
            // At 1 line, it should maximize font size to fit width 200.
            // If we didn't have maxLines:1, it might use huge font and wrap to 2-3 lines (filling height 100).
            // With maxLines:1, it must be small enough to stay on 1 line (or 1 line width <= 200).
            
            
            // At 1 line, it should maximize font size to fit width 200.
            // If we didn't have maxLines:1, it might use huge font and wrap to 2-3 lines (filling height 100).
            // With maxLines:1, it must be small enough to stay on 1 line (or 1 line width <= 200).
            
            // Let's test a case where natural wrappping occurs
            const wrapText = "A B C D";
            const narrowWidth = 50; 
            const tallHeight = 200;
            // Naturally this would wrap to many lines to use larger font.
            const sizeWrapped = calculateBestFitFontSize(wrapText, narrowWidth, tallHeight, baseConfig);
            
            // Now constrain to 1 line
            const size1Line = calculateBestFitFontSize(wrapText, narrowWidth, tallHeight, { ...baseConfig, maxLines: 1, minFontSize: 2 });
            
            // The 1-line version must be much smaller to fit in 50px width
            expect(size1Line).toBeLessThan(sizeWrapped);
        });

        it('should handle small containers gracefully', () => {
            const size = calculateBestFitFontSize('Test', 10, 10, baseConfig);
            // Even 'Test' might not fit in 10x10 at size 10, but it should return min
            expect(size).toBe(10);
        });
    });
});
