
import { renderTemplateServer, RenderConfig } from '../serverEngine';
import { TextElement } from '@/types/editor';

// Mock Fabric.js for Node environment testing
jest.mock('fabric/node', () => {
    const mockTextbox = jest.fn().mockImplementation((text, options) => ({
        text,
        ...options,
        type: 'textbox',
        set: jest.fn(),
    }));

    const mockShadow = jest.fn().mockImplementation((options) => ({
        ...options,
        type: 'shadow'
    }));

    const mockRect = jest.fn().mockImplementation((options) => ({
        type: 'rect',
        ...options,
    }));

    const mockGroup = jest.fn().mockImplementation((objects, options) => ({
        type: 'group',
        objects,
        ...options,
    }));

    return {
        StaticCanvas: jest.fn().mockImplementation(() => ({
            setDimensions: jest.fn(),
            clear: jest.fn(),
            add: jest.fn(),
            renderAll: jest.fn(),
            backgroundColor: '',
            toDataURL: jest.fn().mockReturnValue('data:image/png;base64,abc123'),
            getElement: jest.fn().mockReturnValue({}),
            getObjects: jest.fn().mockReturnValue([]),
        })),
        Textbox: mockTextbox,
        Shadow: mockShadow,
        Rect: mockRect,
        Group: mockGroup,
        FabricImage: { fromURL: jest.fn() },
    };
});

// Mock Fetch
global.fetch = jest.fn() as jest.Mock;

describe('Text Rendering Parity Audit', () => {
    let mockCanvas: any;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let fabricMock: any;

    beforeEach(() => {
        jest.clearAllMocks();
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fabric = require('fabric/node');
        mockCanvas = new fabric.StaticCanvas();
        fabricMock = fabric;
    });

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

    const config: RenderConfig = { width: 800, height: 600 };

    it('should map Shadow properties correctly', async () => {
        const element = createTestElement({
            shadowColor: '#ff0000',
            shadowBlur: 10,
            shadowOffsetX: 5,
            shadowOffsetY: 5,
            shadowOpacity: 0.5,
        });

        await renderTemplateServer(mockCanvas, [element], config);

        expect(mockCanvas.add).toHaveBeenCalled();
        const addedObject = mockCanvas.add.mock.calls[0][0];
        
        // Check if shadow object was created and attached
        expect(addedObject.shadow).toBeDefined();
        expect(addedObject.shadow.color).toBe('#ff0000');
        expect(addedObject.shadow.blur).toBe(10);
        expect(addedObject.shadow.offsetX).toBe(5);
        expect(addedObject.shadow.offsetY).toBe(5);
    });

    it('should map Stroke (Outline) properties correctly', async () => {
        const element = createTestElement({
            stroke: '#00ff00',
            strokeWidth: 2,
        });

        await renderTemplateServer(mockCanvas, [element], config);

        const addedObject = mockCanvas.add.mock.calls[0][0];
        expect(addedObject.stroke).toBe('#00ff00');
        expect(addedObject.strokeWidth).toBe(2);
    });

    it('should map Hollow Text correctly', async () => {
        const element = createTestElement({
            hollowText: true,
            fill: '#000000', // Should be ignored/transparent
            stroke: '#000000',
            strokeWidth: 1,
        });

        await renderTemplateServer(mockCanvas, [element], config);

        const addedObject = mockCanvas.add.mock.calls[0][0];
        expect(addedObject.fill).toBe('transparent');
        expect(addedObject.stroke).toBe('#000000');
    });

    it('should map Background correctly', async () => {
        const element = createTestElement({
            backgroundEnabled: true,
            backgroundColor: '#ffff00',
            backgroundPadding: 10,
            backgroundCornerRadius: 5,
        });

        await renderTemplateServer(mockCanvas, [element], config);

        const addedObject = mockCanvas.add.mock.calls[0][0];
        // Background enables a Group
        expect(addedObject.type).toBe('group');
        const objects = addedObject.objects;
        
        // Should contain Rect (bg) and Textbox
        const rect = objects.find((o: any) => o.type === 'rect');
        expect(rect).toBeDefined();
        expect(rect.fill).toBe('#ffff00');
        expect(rect.rx).toBe(5); // Corner radius
        expect(rect.ry).toBe(5);
    });
});
