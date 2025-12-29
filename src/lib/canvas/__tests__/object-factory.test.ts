
import * as fabric from 'fabric';
import { createFabricObject, syncElementToFabric } from '../ObjectFactory';
import { TextElement } from '@/types/editor';

// Mock Fabric.js for Browser environment testing
jest.mock('fabric', () => {
    class MockTextbox {
        type = 'textbox';
        set = jest.fn().mockReturnThis();
        initDimensions = jest.fn();
        setCoords = jest.fn();
        height = 50;
        width = 200;
        text: string;
        constructor(text: string, options: any) {
            this.text = text;
            Object.assign(this, options);
        }
    }

    class MockRect {
        type = 'rect';
        set = jest.fn().mockReturnThis();
        fill: string | undefined;
        rx: number | undefined;
        constructor(options: any) {
            Object.assign(this, options);
        }
    }

    class MockGroup {
        type = 'group';
        _objects: any[];
        set = jest.fn().mockReturnThis();
        addWithUpdate = jest.fn();
        constructor(objects: any[], options: any) {
            this._objects = objects;
            Object.assign(this, options);
        }
        getObjects() { return this._objects; }
    }

    const mockColor = jest.fn().mockImplementation((color) => ({
        setAlpha: jest.fn().mockReturnThis(),
        toRgba: jest.fn().mockReturnValue('rgba(255, 0, 0, 0.5)'),
    }));

    return {
        Textbox: MockTextbox,
        Rect: MockRect,
        Group: MockGroup,
        Shadow: jest.fn().mockImplementation((options) => options),
        Color: mockColor,
    };
});

describe('ObjectFactory (Browser Environment)', () => {
    const createTestElement = (overrides: Partial<TextElement> = {}): TextElement => ({
        id: '1',
        name: 'Test Text',
        type: 'text',
        x: 10,
        y: 10,
        width: 200,
        height: 50,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        zIndex: 0,
        text: 'Test',
        fontFamily: 'Arial',
        fontSize: 24,
        fontStyle: 'normal',
        fill: '#000000',
        align: 'left',
        verticalAlign: 'top',
        lineHeight: 1.2,
        letterSpacing: 0,
        textDecoration: '',
        isDynamic: false,
        ...overrides,
    });

    describe('createFabricObject - Text Background', () => {
        it('should create a Group when background is enabled', () => {
            const element = createTestElement({
                backgroundEnabled: true,
                backgroundColor: '#ffff00',
                backgroundPadding: 10,
                backgroundCornerRadius: 5,
            });

            const obj = createFabricObject(element) as any;

            expect(obj.type).toBe('group');
            const objects = obj.getObjects();
            const rect = objects.find((o: any) => o.type === 'rect');
            const textbox = objects.find((o: any) => o.type === 'textbox');

            expect(rect).toBeDefined();
            expect(textbox).toBeDefined();
            expect(rect.fill).toBe('#ffff00');
            expect(rect.rx).toBe(5);
            expect(rect.width).toBe(200 + 10 * 2);
        });

        it('should create a Textbox when background is disabled', () => {
            const element = createTestElement({
                backgroundEnabled: false,
            });

            const obj = createFabricObject(element) as any;

            expect(obj.type).toBe('textbox');
        });
    });

    describe('syncElementToFabric - Text Background', () => {
        it('should update background Rect in Group', () => {
            const element = createTestElement({
                backgroundEnabled: true,
                backgroundColor: '#ffff00',
            });

            const group = createFabricObject(element) as any;
            const rect = group.getObjects().find((o: any) => o.type === 'rect');

            syncElementToFabric(group, {
                backgroundColor: '#00ff00',
                backgroundCornerRadius: 15,
            } as any);

            expect(rect.set).toHaveBeenCalledWith(expect.objectContaining({
                fill: '#00ff00',
                rx: 15,
            }));
        });
    });

    describe('syncElementToFabric - Text Background Resize', () => {
        it('should update background Rect size when text content changes', () => {
            const element = createTestElement({
                backgroundEnabled: true,
                backgroundPadding: 10,
                text: 'Short',
            });

            const group = createFabricObject(element) as any;
            const rect = group.getObjects().find((o: any) => o.type === 'rect');
            const textbox = group.getObjects().find((o: any) => o.type === 'textbox');

            // Simulate text change increasing width
            textbox.width = 400; // Mock width change after text update
            textbox.height = 100;

            syncElementToFabric(group, {
                text: 'Longer Text content',
            } as any);

            expect(rect.set).toHaveBeenCalledWith(expect.objectContaining({
                width: 400 + 10 * 2,
                height: 100 + 10 * 2,
            }));
        });
    });
});
