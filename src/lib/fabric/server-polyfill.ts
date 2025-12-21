/**
 * Polyfill DOM globals for Fabric.js 6.x server-side rendering
 * 
 * Fabric.js 6.x requires document, window, Image to exist even on server.
 * This polyfill creates minimal implementations using the 'canvas' npm package.
 * 
 * IMPORTANT: Must be called BEFORE importing fabric!
 */

let polyfillsApplied = false;

export function setupFabricServerPolyfills() {
    // Only run once
    if (polyfillsApplied) {
        return;
    }

    // Only run on server
    if (typeof window !== 'undefined') {
        return; // Already in browser
    }

    console.log('[Polyfill] Setting up Fabric.js server environment...');

    try {
        // Dynamic import to avoid issues when not on server
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { createCanvas, Image: CanvasImage, ImageData } = require('canvas');

        // Polyfill global.document
        if (typeof (global as any).document === 'undefined') {
            (global as any).document = {
                createElement: (tagName: string) => {
                    if (tagName === 'canvas') {
                        // Return a real canvas from the canvas package
                        return createCanvas(300, 300);
                    }
                    if (tagName === 'img') {
                        return new CanvasImage();
                    }
                    // Return minimal mock for other elements
                    return {
                        getContext: () => null,
                        addEventListener: () => {},
                        removeEventListener: () => {},
                        style: {},
                    };
                },
                createElementNS: (_ns: string, tagName: string) => {
                    return (global as any).document.createElement(tagName);
                },
                documentElement: {
                    style: {},
                },
                getElementsByTagName: () => [],
                querySelector: () => null,
                querySelectorAll: () => [],
                body: {
                    appendChild: () => {},
                    removeChild: () => {},
                },
            };
        }

        // Polyfill global.window
        if (typeof (global as any).window === 'undefined') {
            (global as any).window = {
                document: (global as any).document,
                devicePixelRatio: 1,
                navigator: {
                    userAgent: 'Node.js',
                    platform: 'Node.js',
                },
                addEventListener: () => {},
                removeEventListener: () => {},
                requestAnimationFrame: (cb: () => void) => setTimeout(cb, 16),
                cancelAnimationFrame: (id: number) => clearTimeout(id),
                getComputedStyle: () => ({
                    getPropertyValue: () => '',
                }),
                matchMedia: () => ({
                    matches: false,
                    addListener: () => {},
                    removeListener: () => {},
                }),
                location: {
                    href: '',
                    protocol: 'https:',
                },
            };
        }

        // Polyfill global.Image
        if (typeof (global as any).Image === 'undefined') {
            (global as any).Image = CanvasImage;
        }

        // Polyfill global.ImageData
        if (typeof (global as any).ImageData === 'undefined') {
            (global as any).ImageData = ImageData;
        }

        // Polyfill HTMLCanvasElement for Fabric detection
        if (typeof (global as any).HTMLCanvasElement === 'undefined') {
            (global as any).HTMLCanvasElement = class HTMLCanvasElement {};
        }

        // Polyfill HTMLImageElement for Fabric detection
        if (typeof (global as any).HTMLImageElement === 'undefined') {
            (global as any).HTMLImageElement = CanvasImage;
        }

        polyfillsApplied = true;
        console.log('[Polyfill] ✅ Fabric.js server environment ready');

    } catch (error) {
        console.error('[Polyfill] ❌ Failed to setup polyfills:', error);
        throw new Error('Canvas package not available. Server-side rendering requires the canvas package.');
    }
}

// Auto-execute on import (ensures polyfills are ready before fabric loads)
setupFabricServerPolyfills();
