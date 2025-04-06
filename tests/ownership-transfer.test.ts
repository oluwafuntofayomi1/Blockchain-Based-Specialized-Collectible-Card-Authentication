import { describe, it, expect, beforeEach } from 'vitest';

// Mock implementation for testing Clarity contracts

const mockPrincipals = {
  admin: 'SP1ADMIN000000000000000000000000000',
  owner1: 'SP1OWNER000000000000000000000000001',
  owner2: 'SP1OWNER000000000000000000000000002',
  owner3: 'SP1OWNER000000000000000000000000003',
};

// Mock state
let currentSender = mockPrincipals.admin;
let cardOwners = new Map();
let ownershipHistory = new Map();
let historyCounters = new Map();
let blockHeight = 100;

// Mock contract functions
const ownershipTransfer = {
  setSender(sender: string) {
    currentSender = sender;
  },
  
  setBlockHeight(height: number) {
    blockHeight = height;
  },
  
  registerOwnership(cardId: number) {
    if (cardOwners.has(cardId)) {
      return { type: 'err', value: 101 }; // ERR-CARD-NOT-FOUND
    }
    
    cardOwners.set(cardId, { owner: currentSender });
    historyCounters.set(cardId, { count: 0 });
    return { type: 'ok', value: true };
  },
  
  transferOwnership(cardId: number, newOwner: string) {
    if (!cardOwners.has(cardId)) {
      return { type: 'err', value: 101 }; // ERR-CARD-NOT-FOUND
    }
    
    const currentOwner = cardOwners.get(cardId).owner;
    if (currentSender !== currentOwner) {
      return { type: 'err', value: 102 }; // ERR-NOT-OWNER
    }
    
    const historyCount = historyCounters.get(cardId).count;
    
    // Record in history
    ownershipHistory.set(`${cardId}-${historyCount}`, {
      previousOwner: currentOwner,
      newOwner: newOwner,
      transferDate: blockHeight
    });
    
    // Update current owner
    cardOwners.set(cardId, { owner: newOwner });
    
    // Increment history counter
    historyCounters.set(cardId, { count: historyCount + 1 });
    
    return { type: 'ok', value: true };
  },
  
  getOwner(cardId: number) {
    return cardOwners.get(cardId) || null;
  },
  
  getHistoryEntry(cardId: number, index: number) {
    return ownershipHistory.get(`${cardId}-${index}`) || null;
  },
  
  getHistoryCount(cardId: number) {
    return historyCounters.get(cardId)?.count || 0;
  },
  
  // Reset state for tests
  reset() {
    currentSender = mockPrincipals.admin;
    cardOwners.clear();
    ownershipHistory.clear();
    historyCounters.clear();
    blockHeight = 100;
  }
};

describe('Ownership Transfer Contract', () => {
  beforeEach(() => {
    ownershipTransfer.reset();
  });
  
  it('should register initial ownership', () => {
    ownershipTransfer.setSender(mockPrincipals.owner1);
    const result = ownershipTransfer.registerOwnership(1);
    expect(result).toEqual({ type: 'ok', value: true });
    
    const owner = ownershipTransfer.getOwner(1);
    expect(owner).toEqual({ owner: mockPrincipals.owner1 });
    
    const historyCount = ownershipTransfer.getHistoryCount(1);
    expect(historyCount).toBe(0);
  });
  
  it('should not register ownership for an already registered card', () => {
    ownershipTransfer.setSender(mockPrincipals.owner1);
    ownershipTransfer.registerOwnership(1);
    
    ownershipTransfer.setSender(mockPrincipals.owner2);
    const result = ownershipTransfer.registerOwnership(1);
    expect(result).toEqual({ type: 'err', value: 101 });
  });
  
  it('should allow owner to transfer ownership', () => {
    ownershipTransfer.setSender(mockPrincipals.owner1);
    ownershipTransfer.registerOwnership(1);
    
    const result = ownershipTransfer.transferOwnership(1, mockPrincipals.owner2);
    expect(result).toEqual({ type: 'ok', value: true });
    
    const owner = ownershipTransfer.getOwner(1);
    expect(owner).toEqual({ owner: mockPrincipals.owner2 });
    
    const historyCount = ownershipTransfer.getHistoryCount(1);
    expect(historyCount).toBe(1);
    
    const historyEntry = ownershipTransfer.getHistoryEntry(1, 0);
    expect(historyEntry).toEqual({
      previousOwner: mockPrincipals.owner1,
      newOwner: mockPrincipals.owner2,
      transferDate: 100
    });
  });
  
  it('should not allow non-owner to transfer ownership', () => {
    ownershipTransfer.setSender(mockPrincipals.owner1);
    ownershipTransfer.registerOwnership(1);
    
    ownershipTransfer.setSender(mockPrincipals.owner2);
    const result = ownershipTransfer.transferOwnership(1, mockPrincipals.owner3);
    expect(result).toEqual({ type: 'err', value: 102 });
    
    const owner = ownershipTransfer.getOwner(1);
    expect(owner).toEqual({ owner: mockPrincipals.owner1 });
  });
  
  it('should track multiple ownership transfers', () => {
    ownershipTransfer.setSender(mockPrincipals.owner1);
    ownershipTransfer.registerOwnership(1);
    
    ownershipTransfer.setBlockHeight(101);
    ownershipTransfer.transferOwnership(1, mockPrincipals.owner2);
    
    ownershipTransfer.setSender(mockPrincipals.owner2);
    ownershipTransfer.setBlockHeight(102);
    ownershipTransfer.transferOwnership(1, mockPrincipals.owner3);
    
    const owner = ownershipTransfer.getOwner(1);
    expect(owner).toEqual({ owner: mockPrincipals.owner3 });
    
    const historyCount = ownershipTransfer.getHistoryCount(1);
    expect(historyCount).toBe(2);
    
    const historyEntry1 = ownershipTransfer.getHistoryEntry(1, 0);
    expect(historyEntry1).toEqual({
      previousOwner: mockPrincipals.owner1,
      newOwner: mockPrincipals.owner2,
      transferDate: 101
    });
    
    const historyEntry2 = ownershipTransfer.getHistoryEntry(1, 1);
    expect(historyEntry2).toEqual({
      previousOwner: mockPrincipals.owner2,
      newOwner: mockPrincipals.owner3,
      transferDate: 102
    });
  });
  
  it('should return null for non-existent cards', () => {
    const owner = ownershipTransfer.getOwner(999);
    expect(owner).toBeNull();
  });
  
  it('should return null for non-existent history entries', () => {
    ownershipTransfer.setSender(mockPrincipals.owner1);
    ownershipTransfer.registerOwnership(1);
    
    const historyEntry = ownershipTransfer.getHistoryEntry(1, 0);
    expect(historyEntry).toBeNull();
  });
});
