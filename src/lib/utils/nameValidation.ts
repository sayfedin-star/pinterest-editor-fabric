/**
 * Name Validation Utilities
 * 
 * Provides functions for:
 * - Checking duplicate element names
 * - Finding next available numbered name
 * - Validating element names
 */

import { Element, ImageElement, TextElement } from '@/types/editor';

/**
 * Check if an element name already exists
 * @param name - The name to check
 * @param elements - Array of existing elements
 * @param excludeId - Optional ID to exclude from check (for rename validation)
 * @returns true if name is a duplicate
 */
export function isNameDuplicate(
    name: string,
    elements: Element[],
    excludeId?: string
): boolean {
    const normalizedName = name.trim().toLowerCase();
    return elements.some(el => 
        el.name.trim().toLowerCase() === normalizedName && 
        el.id !== excludeId
    );
}

/**
 * Get all names that are currently in use
 * Returns a Set for fast lookup
 */
export function getAllUsedNames(elements: Element[]): Set<string> {
    return new Set(elements.map(el => el.name.trim().toLowerCase()));
}

/**
 * Get all numbers used in element names matching pattern "Image N" or "Text N"
 * Also checks dynamicSource/dynamicField for additional numbers
 */
export function getUsedNumbers(
    elements: Element[],
    type: 'image' | 'text'
): number[] {
    const namePattern = type === 'image' 
        ? /^Image\s*(\d+)$/i 
        : /^Text\s*(\d+)$/i;
    
    const dynamicPattern = type === 'image'
        ? /^image(\d+)$/i
        : /^text(\d+)$/i;
    
    const numbers: number[] = [];
    
    // Check ALL elements for name pattern (not just matching type)
    // because user might have renamed an image to "Text 5" etc.
    elements.forEach(e => {
        const nameMatch = e.name.match(namePattern);
        if (nameMatch) {
            numbers.push(parseInt(nameMatch[1]));
        }
    });
    
    // Check dynamicSource/dynamicField only for matching types
    elements
        .filter(e => e.type === type)
        .forEach(e => {
            if (type === 'image') {
                const imgEl = e as ImageElement;
                const sourceMatch = imgEl.dynamicSource?.match(dynamicPattern);
                if (sourceMatch) {
                    numbers.push(parseInt(sourceMatch[1]));
                }
            } else {
                const textEl = e as TextElement;
                const fieldMatch = textEl.dynamicField?.match(dynamicPattern);
                if (fieldMatch) {
                    numbers.push(parseInt(fieldMatch[1]));
                }
            }
        });
    
    // Return unique numbers sorted
    return [...new Set(numbers)].sort((a, b) => a - b);
}

/**
 * Get the next available number for a type
 * Finds an unused number by checking if the resulting name already exists
 * @param elements - Array of existing elements
 * @param type - 'image' or 'text'
 * @returns Next available number (starts at 1)
 */
export function getNextAvailableNumber(
    elements: Element[],
    type: 'image' | 'text'
): number {
    const usedNames = getAllUsedNames(elements);
    const prefix = type === 'image' ? 'image' : 'text';
    
    // Start from 1 and find first number where name doesn't exist
    let num = 1;
    while (num < 10000) { // Safety limit
        const candidateName = `${prefix} ${num}`.toLowerCase();
        if (!usedNames.has(candidateName)) {
            return num;
        }
        num++;
    }
    
    return num;
}

/**
 * Generate a unique name for an element
 * Guarantees the returned name doesn't already exist
 * @param elements - Array of existing elements
 * @param type - 'image' or 'text'
 * @returns Unique name like "Image 1" or "Text 2"
 */
export function generateUniqueName(
    elements: Element[],
    type: 'image' | 'text'
): { name: string; fieldName: string; number: number } {
    const nextNum = getNextAvailableNumber(elements, type);
    const prefix = type === 'image' ? 'Image' : 'Text';
    
    return {
        name: `${prefix} ${nextNum}`,
        fieldName: `${type}${nextNum}`,
        number: nextNum
    };
}

/**
 * Suggest a fix for a duplicate name
 * @param baseName - The desired base name (e.g., "Image 1")
 * @param elements - Array of existing elements
 * @param type - 'image' or 'text'
 * @returns Suggested unique name
 */
export function suggestUniqueName(
    baseName: string,
    elements: Element[],
    type: 'image' | 'text'
): string {
    const { name } = generateUniqueName(elements, type);
    return name;
}

