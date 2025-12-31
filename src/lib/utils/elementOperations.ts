import { Element, TextElement, ImageElement } from '@/types/editor';
import { generateId } from '@/lib/utils';
import { generateUniqueName } from '@/lib/utils/nameValidation';
import { cloneDeep } from 'lodash';

/**
 * Duplicate an element and return the new element.
 * Handles unique naming and dynamic field generation.
 */
export function duplicateElementLogic(
    element: Element,
    allElements: Element[]
): Element {
    const newElement = {
        ...cloneDeep(element),
        id: generateId(),
        x: element.x + 20,
        y: element.y + 20,
        zIndex: allElements.length
    };

    // For image elements, assign a new unique name and dynamicSource
    if (newElement.type === 'image') {
        const unique = generateUniqueName(allElements, 'image');
        newElement.name = unique.name;
        if ((newElement as ImageElement).isDynamic) {
            (newElement as ImageElement).dynamicSource = unique.fieldName;
        }
    }
    // For text elements, assign a new unique name and dynamicField
    else if (newElement.type === 'text') {
        const unique = generateUniqueName(allElements, 'text');
        newElement.name = unique.name;
        if ((newElement as TextElement).isDynamic) {
            (newElement as TextElement).dynamicField = unique.fieldName;
            (newElement as TextElement).text = `{{${unique.fieldName}}}`;
        }
    }
    // For other types (shapes), append Copy
    else {
        newElement.name = `${element.name} Copy`;
    }

    return newElement;
}

/**
 * Reorder elements in the array.
 * Returns a new array with updated zIndex values.
 */
export function reorderElementsLogic(
    elements: Element[],
    fromIndex: number,
    toIndex: number
): Element[] {
    const sortedElements = [...elements].sort((a, b) => b.zIndex - a.zIndex);
    const [removed] = sortedElements.splice(fromIndex, 1);
    sortedElements.splice(toIndex, 0, removed);

    // Update zIndex for all elements
    return sortedElements.map((el, idx) => ({
        ...el,
        zIndex: sortedElements.length - 1 - idx
    }));
}

/**
 * Move element one step forward (higher zIndex)
 */
export function moveElementForwardLogic(elements: Element[], id: string): Element[] {
    const element = elements.find((el) => el.id === id);
    if (!element) return elements;

    const maxZ = Math.max(...elements.map((el) => el.zIndex));
    if (element.zIndex >= maxZ) return elements;

    const targetZ = element.zIndex + 1;
    return elements.map((el) => {
        if (el.id === id) return { ...el, zIndex: targetZ };
        if (el.zIndex === targetZ) return { ...el, zIndex: el.zIndex - 1 };
        return el;
    });
}

/**
 * Move element one step backward (lower zIndex)
 */
export function moveElementBackwardLogic(elements: Element[], id: string): Element[] {
    const element = elements.find((el) => el.id === id);
    if (!element || element.zIndex <= 0) return elements;

    const targetZ = element.zIndex - 1;
    return elements.map((el) => {
        if (el.id === id) return { ...el, zIndex: targetZ };
        if (el.zIndex === targetZ) return { ...el, zIndex: el.zIndex + 1 };
        return el;
    });
}

/**
 * Move element to the very front
 */
export function moveElementToFrontLogic(elements: Element[], id: string): Element[] {
    const element = elements.find((el) => el.id === id);
    if (!element) return elements;

    const maxZ = Math.max(...elements.map((el) => el.zIndex));
    return elements.map((el) =>
        el.id === id ? { ...el, zIndex: maxZ + 1 } : el
    );
}

/**
 * Move element to the very back
 */
export function moveElementToBackLogic(elements: Element[], id: string): Element[] {
    const movedElements = elements.map((el) => ({
        ...el,
        zIndex: el.id === id ? -1 : el.zIndex + 1
    }));

    // Normalize zIndex to start from 0
    const minZ = Math.min(...movedElements.map((el) => el.zIndex));
    return movedElements.map((el) => ({
        ...el,
        zIndex: el.zIndex - minZ
    }));
}
