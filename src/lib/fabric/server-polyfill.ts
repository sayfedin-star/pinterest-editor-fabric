/**
 * Enhanced DOM polyfill for Fabric.js 6.x server-side rendering
 * Provides comprehensive browser API compatibility
 * 
 * IMPORTANT: Call setupFabricServerPolyfills() BEFORE using fabric in API routes!
 */

let polyfillsApplied = false;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = global as any;

/**
 * Add DOM methods to an element (including canvas elements from node-canvas)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addDOMMethods(element: any, tagName: string = 'div'): any {
    // These methods might already exist on canvas, only add if missing
    if (typeof element.hasAttribute !== 'function') {
        element.hasAttribute = () => false;
    }
    if (typeof element.getAttribute !== 'function') {
        element.getAttribute = () => null;
    }
    if (typeof element.setAttribute !== 'function') {
        element.setAttribute = () => {};
    }
    if (typeof element.removeAttribute !== 'function') {
        element.removeAttribute = () => {};
    }
    if (typeof element.addEventListener !== 'function') {
        element.addEventListener = () => {};
    }
    if (typeof element.removeEventListener !== 'function') {
        element.removeEventListener = () => {};
    }
    if (!element.classList) {
        element.classList = {
            add: () => {},
            remove: () => {},
            contains: () => false,
            toggle: () => false,
        };
    }
    if (!element.dataset) {
        element.dataset = {};
    }
    if (!element.style) {
        element.style = {};
    }
    if (!element.tagName) {
        element.tagName = tagName.toUpperCase();
    }
    if (!element.nodeName) {
        element.nodeName = tagName.toUpperCase();
    }
    
    return element;
}

export function setupFabricServerPolyfills(): void {
    // Only run once
    if (polyfillsApplied) {
        return;
    }

    // Only run on server
    if (typeof window !== 'undefined') {
        return;
    }

    console.log('[Polyfill] Setting up Fabric.js server environment...');

    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { createCanvas, Image: CanvasImage, ImageData } = require('canvas');

        // Polyfill global.document
        if (typeof g.document === 'undefined') {
            g.document = {
                createElement: (tagName: string) => {
                    if (tagName === 'canvas') {
                        // Create canvas and add DOM methods to it
                        const canvas = createCanvas(300, 300);
                        return addDOMMethods(canvas, 'canvas');
                    }
                    if (tagName === 'img') {
                        const img = new CanvasImage();
                        return addDOMMethods(img, 'img');
                    }
                    // Return mock element with all required methods
                    return addDOMMethods({
                        getContext: () => null,
                        appendChild: (child: unknown) => child,
                        removeChild: (child: unknown) => child,
                        innerHTML: '',
                        outerHTML: '',
                        textContent: '',
                        parentNode: null,
                        childNodes: [],
                        children: [],
                        cloneNode: function() { return addDOMMethods({...this}, tagName); },
                    }, tagName);
                },
                createElementNS: (_ns: string, tagName: string) => {
                    return g.document.createElement(tagName);
                },
                documentElement: addDOMMethods({ style: {} }, 'html'),
                getElementsByTagName: () => [],
                getElementById: () => null,
                querySelector: () => null,
                querySelectorAll: () => [],
                body: addDOMMethods({
                    appendChild: (child: unknown) => child,
                    removeChild: (child: unknown) => child,
                    style: {},
                }, 'body'),
                head: addDOMMethods({
                    appendChild: (child: unknown) => child,
                    removeChild: (child: unknown) => child,
                }, 'head'),
                createEvent: () => ({
                    initEvent: () => {},
                }),
                createTextNode: (text: string) => ({ textContent: text }),
            };
        }

        // Polyfill global.window
        if (typeof g.window === 'undefined') {
            g.window = {
                document: g.document,
                devicePixelRatio: 1,
                navigator: {
                    userAgent: 'Mozilla/5.0 (compatible; Node.js)',
                    platform: 'Node.js',
                },
                screen: {
                    width: 1920,
                    height: 1080,
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
                    host: '',
                    hostname: '',
                },
                setTimeout: setTimeout,
                clearTimeout: clearTimeout,
                setInterval: setInterval,
                clearInterval: clearInterval,
            };
        }

        // Polyfill global.Image
        if (typeof g.Image === 'undefined') {
            g.Image = CanvasImage;
        }

        // Polyfill global.ImageData
        if (typeof g.ImageData === 'undefined') {
            g.ImageData = ImageData;
        }

        // Polyfill HTMLElement class
        if (typeof g.HTMLElement === 'undefined') {
            g.HTMLElement = class HTMLElement {
                hasAttribute() { return false; }
                getAttribute() { return null; }
                setAttribute() {}
                removeAttribute() {}
                addEventListener() {}
                removeEventListener() {}
                classList = {
                    add: () => {},
                    remove: () => {},
                    contains: () => false,
                    toggle: () => false,
                };
                dataset = {};
                style = {};
            };
        }

        // Polyfill HTMLCanvasElement
        if (typeof g.HTMLCanvasElement === 'undefined') {
            g.HTMLCanvasElement = class HTMLCanvasElement extends g.HTMLElement {};
        }

        // Polyfill HTMLImageElement
        if (typeof g.HTMLImageElement === 'undefined') {
            g.HTMLImageElement = CanvasImage;
        }

        polyfillsApplied = true;
        console.log('[Polyfill] ✅ Enhanced Fabric.js server environment ready');

    } catch (error) {
        console.error('[Polyfill] ❌ Failed to setup polyfills:', error);
    }
}

// NOTE: Do NOT auto-execute here! It breaks Next.js static generation.
// Call setupFabricServerPolyfills() inside the API route handler instead.
