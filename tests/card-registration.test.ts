import { describe, it, expect, beforeEach } from 'vitest';

// Mock implementation for testing Clarity contracts

const mockPrincipals = {
  admin: 'SP1ADMIN000000000000000000000000000',
  manufacturer: 'SP1MANUF000000000000000000000000001',
  user1: 'SP1USER0000000000000000000000000001',
  user2: 'SP1USER0000000000000000000000000002',
};

// Mock state
let currentSender = mockPrincipals.admin;
let cards = new Map();
let nextCardId = 1;
let admin = mockPrincipals.admin;

// Mock contract functions
const cardRegistration = {
  setSender(sender: string) {
    currentSender = sender;
  },
  
  registerCard(name: string, series: string, manufacturer: string, rarity: string, issueDate: number) {
    const cardId = nextCardId;
    
    if (cards.has(cardId)) {
      return { type: 'err', value: 101 }; // ERR-CARD-EXISTS
    }
    
    cards.set(cardId, {
      name,
      series,
      manufacturer,
      rarity,
      issueDate,
      registeredBy: currentSender
    });
    
    nextCardId++;
    return { type: 'ok', value: cardId };
  },
  
  getCard(cardId: number) {
    return cards.get(cardId) || null;
  },
  
  transferAdmin(newAdmin: string) {
    if (currentSender !== admin) {
      return { type: 'err', value: 100 }; // ERR-NOT-AUTHORIZED
    }
    
    admin = newAdmin;
    return { type: 'ok', value: true };
  },
  
  // Reset state for tests
  reset() {
    currentSender = mockPrincipals.admin;
    cards.clear();
    nextCardId = 1;
    admin = mockPrincipals.admin;
  }
};

describe('Card Registration Contract', () => {
  beforeEach(() => {
    cardRegistration.reset();
  });
  
  it('should register a new card', () => {
    cardRegistration.setSender(mockPrincipals.user1);
    const result = cardRegistration.registerCard(
        'Rare Dragon',
        'Fantasy Series 1',
        mockPrincipals.manufacturer,
        'Mythic Rare',
        1625097600
    );
    
    expect(result).toEqual({ type: 'ok', value: 1 });
    
    const card = cardRegistration.getCard(1);
    expect(card).toEqual({
      name: 'Rare Dragon',
      series: 'Fantasy Series 1',
      manufacturer: mockPrincipals.manufacturer,
      rarity: 'Mythic Rare',
      issueDate: 1625097600,
      registeredBy: mockPrincipals.user1
    });
  });
  
  it('should assign sequential IDs to cards', () => {
    cardRegistration.setSender(mockPrincipals.user1);
    const result1 = cardRegistration.registerCard(
        'Card 1',
        'Series 1',
        mockPrincipals.manufacturer,
        'Common',
        1625097600
    );
    
    const result2 = cardRegistration.registerCard(
        'Card 2',
        'Series 1',
        mockPrincipals.manufacturer,
        'Uncommon',
        1625097600
    );
    
    expect(result1).toEqual({ type: 'ok', value: 1 });
    expect(result2).toEqual({ type: 'ok', value: 2 });
  });
  
  it('should return null for non-existent cards', () => {
    const card = cardRegistration.getCard(999);
    expect(card).toBeNull();
  });
  
  it('should allow admin to transfer admin rights', () => {
    cardRegistration.setSender(mockPrincipals.admin);
    const result = cardRegistration.transferAdmin(mockPrincipals.user1);
    expect(result).toEqual({ type: 'ok', value: true });
    
    // Old admin can no longer transfer admin
    cardRegistration.setSender(mockPrincipals.admin);
    const transferResult = cardRegistration.transferAdmin(mockPrincipals.user2);
    expect(transferResult).toEqual({ type: 'err', value: 100 });
    
    // New admin can transfer admin
    cardRegistration.setSender(mockPrincipals.user1);
    const newTransferResult = cardRegistration.transferAdmin(mockPrincipals.user2);
    expect(newTransferResult).toEqual({ type: 'ok', value: true });
  });
});
