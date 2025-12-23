/**
 * Unit tests for Distribution Engine
 */

import {
    getTemplateForRow,
    previewDistribution,
    calculateDistributionCounts,
    initializeDistributionSession,
    resetDistributionSession,
    DistributionContext,
    RowContext,
} from '../distributionEngine';
import { TemplateSnapshot } from '@/types/database.types';

// ============================================
// Test Fixtures
// ============================================

const createMockTemplate = (id: string, name: string, shortId?: string): TemplateSnapshot => ({
    id,
    short_id: shortId ?? id.substring(0, 6),
    name,
    elements: [],
    canvas_size: { width: 1000, height: 1500 },
    background_color: '#ffffff',
});

const templateA = createMockTemplate('uuid-a', 'Template A', 'tmpl-a');
const templateB = createMockTemplate('uuid-b', 'Template B', 'tmpl-b');
const templateC = createMockTemplate('uuid-c', 'Template C', 'tmpl-c');

// ============================================
// Sequential Distribution Tests
// ============================================

describe('Sequential Distribution', () => {
    const context: DistributionContext = {
        templates: [templateA, templateB],
        mode: 'sequential',
        totalRows: 10,
    };

    it('cycles through templates in order', () => {
        const results = [0, 1, 2, 3, 4, 5].map(rowIndex =>
            getTemplateForRow(context, { rowIndex, csvRow: {} })
        );

        expect(results[0].template.id).toBe('uuid-a');
        expect(results[1].template.id).toBe('uuid-b');
        expect(results[2].template.id).toBe('uuid-a');
        expect(results[3].template.id).toBe('uuid-b');
        expect(results[4].template.id).toBe('uuid-a');
        expect(results[5].template.id).toBe('uuid-b');
    });

    it('correctly reports template index', () => {
        const result0 = getTemplateForRow(context, { rowIndex: 0, csvRow: {} });
        const result1 = getTemplateForRow(context, { rowIndex: 1, csvRow: {} });

        expect(result0.templateIndex).toBe(0);
        expect(result1.templateIndex).toBe(1);
    });

    it('works with 3 templates', () => {
        const context3: DistributionContext = {
            templates: [templateA, templateB, templateC],
            mode: 'sequential',
            totalRows: 9,
        };

        const results = [0, 1, 2, 3, 4, 5].map(rowIndex =>
            getTemplateForRow(context3, { rowIndex, csvRow: {} })
        );

        expect(results[0].template.id).toBe('uuid-a');
        expect(results[1].template.id).toBe('uuid-b');
        expect(results[2].template.id).toBe('uuid-c');
        expect(results[3].template.id).toBe('uuid-a');
    });
});

// ============================================
// Random Distribution Tests
// ============================================

describe('Random Distribution', () => {
    beforeEach(() => {
        initializeDistributionSession(12345); // Fixed seed for reproducibility
    });

    afterEach(() => {
        resetDistributionSession();
    });

    it('returns valid templates', () => {
        const context: DistributionContext = {
            templates: [templateA, templateB],
            mode: 'random',
            totalRows: 100,
        };

        for (let i = 0; i < 20; i++) {
            const result = getTemplateForRow(context, { rowIndex: i, csvRow: {} });
            expect(['uuid-a', 'uuid-b']).toContain(result.template.id);
        }
    });

    it('produces all templates over many iterations', () => {
        const context: DistributionContext = {
            templates: [templateA, templateB, templateC],
            mode: 'random',
            totalRows: 100,
        };

        const usedTemplates = new Set<string>();
        for (let i = 0; i < 50; i++) {
            const result = getTemplateForRow(context, { rowIndex: i, csvRow: {} });
            usedTemplates.add(result.template.id);
        }

        expect(usedTemplates.size).toBe(3);
    });
});

// ============================================
// Equal Split Distribution Tests
// ============================================

describe('Equal Split Distribution', () => {
    it('divides rows evenly between 2 templates', () => {
        const context: DistributionContext = {
            templates: [templateA, templateB],
            mode: 'equal',
            totalRows: 10,
        };

        // First 5 rows should be Template A
        for (let i = 0; i < 5; i++) {
            const result = getTemplateForRow(context, { rowIndex: i, csvRow: {} });
            expect(result.template.id).toBe('uuid-a');
        }

        // Last 5 rows should be Template B
        for (let i = 5; i < 10; i++) {
            const result = getTemplateForRow(context, { rowIndex: i, csvRow: {} });
            expect(result.template.id).toBe('uuid-b');
        }
    });

    it('handles uneven division correctly', () => {
        const context: DistributionContext = {
            templates: [templateA, templateB],
            mode: 'equal',
            totalRows: 7, // 7 / 2 = 3.5, ceil = 4
        };

        // First 4 rows → Template A
        expect(getTemplateForRow(context, { rowIndex: 0, csvRow: {} }).template.id).toBe('uuid-a');
        expect(getTemplateForRow(context, { rowIndex: 3, csvRow: {} }).template.id).toBe('uuid-a');

        // Remaining 3 rows → Template B
        expect(getTemplateForRow(context, { rowIndex: 4, csvRow: {} }).template.id).toBe('uuid-b');
        expect(getTemplateForRow(context, { rowIndex: 6, csvRow: {} }).template.id).toBe('uuid-b');
    });

    it('works with 3 templates', () => {
        const context: DistributionContext = {
            templates: [templateA, templateB, templateC],
            mode: 'equal',
            totalRows: 9,
        };

        // Rows 0-2 → A, Rows 3-5 → B, Rows 6-8 → C
        expect(getTemplateForRow(context, { rowIndex: 0, csvRow: {} }).template.id).toBe('uuid-a');
        expect(getTemplateForRow(context, { rowIndex: 3, csvRow: {} }).template.id).toBe('uuid-b');
        expect(getTemplateForRow(context, { rowIndex: 6, csvRow: {} }).template.id).toBe('uuid-c');
    });
});

// ============================================
// CSV Column Distribution Tests
// ============================================

describe('CSV Column Distribution', () => {
    const context: DistributionContext = {
        templates: [templateA, templateB, templateC],
        mode: 'csv_column',
        totalRows: 10,
    };

    it('matches by short_id', () => {
        const result = getTemplateForRow(context, {
            rowIndex: 0,
            csvRow: { template: 'tmpl-b' },
        });

        expect(result.template.id).toBe('uuid-b');
        expect(result.warning).toBeUndefined();
    });

    it('matches by name (case insensitive)', () => {
        const result = getTemplateForRow(context, {
            rowIndex: 0,
            csvRow: { template: 'template c' },
        });

        expect(result.template.id).toBe('uuid-c');
    });

    it('matches by partial name', () => {
        const result = getTemplateForRow(context, {
            rowIndex: 0,
            csvRow: { template: 'Template A' },
        });

        expect(result.template.id).toBe('uuid-a');
    });

    it('falls back to first template when no match', () => {
        const result = getTemplateForRow(context, {
            rowIndex: 0,
            csvRow: { template: 'nonexistent' },
        });

        expect(result.template.id).toBe('uuid-a');
        expect(result.warning).toContain('not found');
    });

    it('falls back when no template column exists', () => {
        const result = getTemplateForRow(context, {
            rowIndex: 0,
            csvRow: { title: 'Some Title', image: 'url.jpg' },
        });

        expect(result.template.id).toBe('uuid-a');
        expect(result.warning).toContain('No "template" column');
    });

    it('handles various column name formats', () => {
        // Template
        expect(getTemplateForRow(context, {
            rowIndex: 0,
            csvRow: { Template: 'tmpl-b' },
        }).template.id).toBe('uuid-b');

        // TEMPLATE
        expect(getTemplateForRow(context, {
            rowIndex: 0,
            csvRow: { TEMPLATE: 'tmpl-c' },
        }).template.id).toBe('uuid-c');

        // template_id
        expect(getTemplateForRow(context, {
            rowIndex: 0,
            csvRow: { template_id: 'tmpl-a' },
        }).template.id).toBe('uuid-a');
    });
});

// ============================================
// Edge Cases
// ============================================

describe('Edge Cases', () => {
    it('throws error when no templates provided', () => {
        const context: DistributionContext = {
            templates: [],
            mode: 'sequential',
            totalRows: 10,
        };

        expect(() => getTemplateForRow(context, { rowIndex: 0, csvRow: {} }))
            .toThrow('At least one template is required');
    });

    it('returns single template regardless of mode', () => {
        const context: DistributionContext = {
            templates: [templateA],
            mode: 'random', // Mode doesn't matter with 1 template
            totalRows: 10,
        };

        for (let i = 0; i < 5; i++) {
            const result = getTemplateForRow(context, { rowIndex: i, csvRow: {} });
            expect(result.template.id).toBe('uuid-a');
            expect(result.templateIndex).toBe(0);
        }
    });
});

// ============================================
// Utility Function Tests
// ============================================

describe('previewDistribution', () => {
    it('returns correct preview for sequential mode', () => {
        const context: DistributionContext = {
            templates: [templateA, templateB],
            mode: 'sequential',
            totalRows: 100,
        };

        const preview = previewDistribution(context, 4);

        expect(preview).toHaveLength(4);
        expect(preview[0].templateName).toBe('Template A');
        expect(preview[1].templateName).toBe('Template B');
        expect(preview[2].templateName).toBe('Template A');
        expect(preview[3].templateName).toBe('Template B');
    });
});

describe('calculateDistributionCounts', () => {
    it('calculates sequential counts correctly', () => {
        const context: DistributionContext = {
            templates: [templateA, templateB],
            mode: 'sequential',
            totalRows: 10,
        };

        const counts = calculateDistributionCounts(context);

        expect(counts['uuid-a']).toBe(5);
        expect(counts['uuid-b']).toBe(5);
    });

    it('handles uneven sequential counts', () => {
        const context: DistributionContext = {
            templates: [templateA, templateB],
            mode: 'sequential',
            totalRows: 11,
        };

        const counts = calculateDistributionCounts(context);

        // 11 rows, 2 templates: 5 + 6 = 11
        expect(counts['uuid-a']).toBe(6);
        expect(counts['uuid-b']).toBe(5);
    });

    it('returns -1 for csv_column mode', () => {
        const context: DistributionContext = {
            templates: [templateA, templateB],
            mode: 'csv_column',
            totalRows: 10,
        };

        const counts = calculateDistributionCounts(context);

        expect(counts['uuid-a']).toBe(-1);
        expect(counts['uuid-b']).toBe(-1);
    });
});
