import { describe, it, expect, beforeEach } from 'vitest';

// Mock implementation for testing Clarity contracts

const mockPrincipals = {
  admin: 'SP1ADMIN000000000000000000000000000',
  grader1: 'SP1GRADER000000000000000000000000001',
  grader2: 'SP1GRADER000000000000000000000000002',
  user: 'SP1USER0000000000000000000000000000',
};

// Mock state
let currentSender = mockPrincipals.admin;
let verifiedGraders = new Map();
let gradings = new Map();
let admin = mockPrincipals.admin;
let blockHeight = 100;

// Mock contract functions
const gradingCertification = {
  setSender(sender: string) {
    currentSender = sender;
  },
  
  setBlockHeight(height: number) {
    blockHeight = height;
  },
  
  addGrader(grader: string) {
    if (currentSender !== admin) {
      return { type: 'err', value: 100 }; // ERR-NOT-AUTHORIZED
    }
    
    verifiedGraders.set(grader, true);
    return { type: 'ok', value: true };
  },
  
  removeGrader(grader: string) {
    if (currentSender !== admin) {
      return { type: 'err', value: 100 }; // ERR-NOT-AUTHORIZED
    }
    
    verifiedGraders.delete(grader);
    return { type: 'ok', value: true };
  },
  
  isVerifiedGrader(grader: string) {
    return verifiedGraders.has(grader);
  },
  
  gradeCard(cardId: number, grade: number, notes: string) {
    if (!verifiedGraders.has(currentSender)) {
      return { type: 'err', value: 102 }; // ERR-NOT-VERIFIED-GRADER
    }
    
    if (gradings.has(cardId)) {
      return { type: 'err', value: 101 }; // ERR-ALREADY-GRADED
    }
    
    gradings.set(cardId, {
      grade,
      grader: currentSender,
      gradingDate: blockHeight,
      notes
    });
    
    return { type: 'ok', value: true };
  },
  
  getGrading(cardId: number) {
    return gradings.get(cardId) || null;
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
    verifiedGraders.clear();
    gradings.clear();
    admin = mockPrincipals.admin;
    blockHeight = 100;
  }
};

describe('Grading Certification Contract', () => {
  beforeEach(() => {
    gradingCertification.reset();
  });
  
  it('should allow admin to add a grader', () => {
    gradingCertification.setSender(mockPrincipals.admin);
    const result = gradingCertification.addGrader(mockPrincipals.grader1);
    expect(result).toEqual({ type: 'ok', value: true });
    expect(gradingCertification.isVerifiedGrader(mockPrincipals.grader1)).toBe(true);
  });
  
  it('should not allow non-admin to add a grader', () => {
    gradingCertification.setSender(mockPrincipals.user);
    const result = gradingCertification.addGrader(mockPrincipals.grader1);
    expect(result).toEqual({ type: 'err', value: 100 });
    expect(gradingCertification.isVerifiedGrader(mockPrincipals.grader1)).toBe(false);
  });
  
  it('should allow admin to remove a grader', () => {
    gradingCertification.setSender(mockPrincipals.admin);
    gradingCertification.addGrader(mockPrincipals.grader1);
    const result = gradingCertification.removeGrader(mockPrincipals.grader1);
    expect(result).toEqual({ type: 'ok', value: true });
    expect(gradingCertification.isVerifiedGrader(mockPrincipals.grader1)).toBe(false);
  });
  
  it('should allow verified graders to grade cards', () => {
    gradingCertification.setSender(mockPrincipals.admin);
    gradingCertification.addGrader(mockPrincipals.grader1);
    
    gradingCertification.setSender(mockPrincipals.grader1);
    const result = gradingCertification.gradeCard(1, 95, 'Near mint condition');
    expect(result).toEqual({ type: 'ok', value: true });
    
    const grading = gradingCertification.getGrading(1);
    expect(grading).toEqual({
      grade: 95,
      grader: mockPrincipals.grader1,
      gradingDate: 100,
      notes: 'Near mint condition'
    });
  });
  
  it('should not allow non-verified graders to grade cards', () => {
    gradingCertification.setSender(mockPrincipals.user);
    const result = gradingCertification.gradeCard(1, 95, 'Near mint condition');
    expect(result).toEqual({ type: 'err', value: 102 });
    expect(gradingCertification.getGrading(1)).toBeNull();
  });
  
  it('should not allow grading a card twice', () => {
    gradingCertification.setSender(mockPrincipals.admin);
    gradingCertification.addGrader(mockPrincipals.grader1);
    gradingCertification.addGrader(mockPrincipals.grader2);
    
    gradingCertification.setSender(mockPrincipals.grader1);
    gradingCertification.gradeCard(1, 95, 'Near mint condition');
    
    gradingCertification.setSender(mockPrincipals.grader2);
    const result = gradingCertification.gradeCard(1, 90, 'Slight edge wear');
    expect(result).toEqual({ type: 'err', value: 101 });
  });
  
  it('should record the block height as the grading date', () => {
    gradingCertification.setSender(mockPrincipals.admin);
    gradingCertification.addGrader(mockPrincipals.grader1);
    
    gradingCertification.setBlockHeight(200);
    gradingCertification.setSender(mockPrincipals.grader1);
    gradingCertification.gradeCard(1, 95, 'Near mint condition');
    
    const grading = gradingCertification.getGrading(1);
    expect(grading.gradingDate).toBe(200);
  });
  
  it('should allow admin to transfer admin rights', () => {
    gradingCertification.setSender(mockPrincipals.admin);
    const result = gradingCertification.transferAdmin(mockPrincipals.user);
    expect(result).toEqual({ type: 'ok', value: true });
    
    // Old admin can no longer add graders
    gradingCertification.setSender(mockPrincipals.admin);
    const addResult = gradingCertification.addGrader(mockPrincipals.grader1);
    expect(addResult).toEqual({ type: 'err', value: 100 });
    
    // New admin can add graders
    gradingCertification.setSender(mockPrincipals.user);
    const newAddResult = gradingCertification.addGrader(mockPrincipals.grader1);
    expect(newAddResult).toEqual({ type: 'ok', value: true });
  });
});
