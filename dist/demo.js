/**
 * VeritasChain Phase 1 Demo
 *
 * Simple demonstration of core functionality
 */
import { calculateHash } from './core/hash.js';
import { confidenceCalculator } from './core/confidence.js';
// Demo basic functionality
console.log('=== VeritasChain Phase 1 Demo ===');
// Test hashing
const testData = {
    title: "Test Event",
    content: "This is a test event for VeritasChain"
};
const hash = calculateHash(testData);
console.log('Content hash:', hash);
// Test confidence calculation
const testConfidence = confidenceCalculator.calculate({
    changeHistory: [],
    evidenceType: 'official',
    sourceType: 'Academic'
});
console.log('Confidence calculation:', testConfidence.result);
console.log('Formula:', testConfidence.formula);
console.log('\n✅ Phase 1 core utilities working!');
console.log('Next: Repository layer and CLI interface');
