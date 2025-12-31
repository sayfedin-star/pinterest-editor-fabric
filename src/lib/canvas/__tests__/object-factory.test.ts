
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

    describe('createFabricObject', () => {
        it('should create a Textbox', () => {
            const element = createTestElement();
            const obj = createFabricObject(element) as any;
            expect(obj.type).toBe('textbox');
            expect(obj.text).toBe('Test');
        });
    });

    describe('syncElementToFabric', () => {
        it('should update Textbox text', () => {
            const element = createTestElement();
            const textbox = createFabricObject(element) as any;
            
            syncElementToFabric(textbox, { text: 'Updated' });
            expect(textbox.set).toHaveBeenCalledWith('text', 'Updated');
        });
    });
});
