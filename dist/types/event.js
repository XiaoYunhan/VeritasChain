/**
 * Unified Event Type Definitions
 *
 * A single recursive Event type that can represent both leaf events and
 * composite events (formerly MacroEvents). Any event can reference other
 * events through the optional components array, enabling infinite narrative layers.
 */
/**
 * Helper function to determine if an event is composite
 */
export function isComposite(event) {
    return !!(event.components && event.components.length > 0);
}
/**
 * Helper function to get event type for backward compatibility
 */
export function getEventType(event) {
    if (isComposite(event)) {
        return 'CompositeEvent';
    }
    return 'Event';
}
/**
 * Migration helper to convert old MacroEvent format
 */
export function migrateMacroEvent(oldEvent) {
    const newEvent = {
        ...oldEvent,
        "@type": "Event"
    };
    // Map old field names
    if ('aggregationLogic' in oldEvent) {
        newEvent.aggregation = mapAggregationLogic(oldEvent.aggregationLogic);
        delete newEvent.aggregationLogic;
    }
    // Convert old component format if needed
    if (oldEvent.components && typeof oldEvent.components[0] === 'string') {
        newEvent.components = oldEvent.components.map((id) => ({
            logicalId: id, // Will need resolution in migration script
            version: oldEvent.version || '1.0' // Use latest by default
        }));
    }
    return newEvent;
}
/**
 * Map old aggregation logic values to new format
 */
function mapAggregationLogic(old) {
    const mapping = {
        'AND': 'ALL',
        'OR': 'ANY',
        'ORDERED_ALL': 'ORDERED',
        'CUSTOM': 'CUSTOM'
    };
    return mapping[old] || 'ALL';
}
/**
 * Calculate the depth of an event (recursively)
 */
export async function calculateDepth(event, loader) {
    if (!isComposite(event)) {
        return 0; // Leaf event
    }
    let maxDepth = 0;
    const visited = new Set();
    for (const component of event.components || []) {
        // Prevent infinite recursion
        const key = `${component.logicalId}${component.version ? `@${component.version}` : ''}`;
        if (visited.has(key)) {
            continue;
        }
        visited.add(key);
        const childEvent = await loader(component.logicalId, component.version);
        if (childEvent) {
            const childDepth = await calculateDepth(childEvent, loader);
            maxDepth = Math.max(maxDepth, childDepth);
        }
    }
    return maxDepth + 1;
}
/**
 * Derive confidence formula for composite events
 */
export async function deriveConfidenceFormula(event, loader) {
    if (!isComposite(event)) {
        return `${event.metadata.confidence?.toFixed(3) || '0.000'}`;
    }
    const componentFormulas = [];
    for (const component of event.components || []) {
        const childEvent = await loader(component.logicalId, component.version);
        if (childEvent) {
            if (component.weak) {
                // Weak dependencies don't contribute to formula
                continue;
            }
            const childFormula = await deriveConfidenceFormula(childEvent, loader);
            componentFormulas.push(childFormula);
        }
    }
    if (componentFormulas.length === 0) {
        return `${event.metadata.confidence?.toFixed(3) || '0.000'}`;
    }
    // Format based on aggregation logic
    switch (event.aggregation || 'ALL') {
        case 'ALL':
            return `min(${componentFormulas.join(', ')})`;
        case 'ANY':
            return `max(${componentFormulas.join(', ')})`;
        case 'ORDERED':
            return `sequence(${componentFormulas.join(' → ')})`;
        case 'CUSTOM':
            return `custom(${componentFormulas.join(', ')})`;
        default:
            return `all(${componentFormulas.join(', ')})`;
    }
}
