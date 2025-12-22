
// Helper: Get overlap days between two ranges
const getOverlapDays = (s1: string, e1: string, s2: string, e2: string) => {
    const start1 = new Date(s1);
    const end1 = new Date(e1);
    const start2 = new Date(s2);
    const end2 = new Date(e2);

    // Normalize to UTC midnight to avoid DST/Timezone issues
    start1.setUTCHours(0, 0, 0, 0);
    end1.setUTCHours(0, 0, 0, 0);
    start2.setUTCHours(0, 0, 0, 0);
    end2.setUTCHours(0, 0, 0, 0);

    const start = start1 > start2 ? start1 : start2;
    const end = end1 < end2 ? end1 : end2;

    // Check if ranges actually overlap
    if (start > end) return 0;

    const diffTime = end.getTime() - start.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

// Helper: Get total days in range
const getTotalDays = (s: string, e: string) => {
    const start = new Date(s);
    const end = new Date(e);
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(0, 0, 0, 0);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
};

// Mock DB Data
const mockDB: any = {
    // Fixed Period Campaign
    "fixed_camp": {
        id: "fixed_camp",
        type: "fixed",
        periods: [
            {
                startDate: "2025-12-01",
                endDate: "2026-01-31",
                amount: 620000
            }
        ]
    },
    // Monthly Recurring Campaign
    "recurring_camp": {
        id: "recurring_camp",
        type: "recurring",
        periods: [
            {
                startDate: "2025-12-01",
                endDate: "2025-12-31",
                amount: 300000
            }
        ]
    }
};

function calculateBudget(campaignId: string, reqStart: string, reqEnd: string) {
    const customConfig = mockDB[campaignId];
    let customBudget = 0;

    if (customConfig && customConfig.periods) {
        customConfig.periods.forEach((period: any) => {
            const overlap = getOverlapDays(reqStart, reqEnd, period.startDate, period.endDate);
            if (overlap > 0) {
                const budgetType = customConfig.type || 'fixed';

                if (budgetType === 'fixed') {
                    const periodDays = getTotalDays(period.startDate, period.endDate);
                    if (periodDays > 0) {
                        const dailyAmount = period.amount / periodDays;
                        customBudget += dailyAmount * overlap;
                    }
                } else {
                    // Recurring: Full Amount if ANY overlap
                    customBudget += period.amount;
                }
            }
        });
    }
    return customBudget;
}

// Test Cases
console.log("--- Verification Results ---");

// 1. December 2025 (31 Days)
const decStart = "2025-12-01";
const decEnd = "2025-12-31";

const fixedDec = calculateBudget("fixed_camp", decStart, decEnd);
const recurringDec = calculateBudget("recurring_camp", decStart, decEnd);

console.log(`[DEC 2025] Fixed (Exp: 310,000): ${Math.round(fixedDec)}`);
console.log(`[DEC 2025] Recurring (Exp: 300,000): ${Math.round(recurringDec)}`);

// 2. January 2026 (31 Days)
const janStart = "2026-01-01";
const janEnd = "2026-01-31";

const fixedJan = calculateBudget("fixed_camp", janStart, janEnd);
console.log(`[JAN 2026] Fixed (Exp: 310,000): ${Math.round(fixedJan)}`);

// 3. February 2026 (28 Days) - Should be 0 for both (Recurring valid only for Dec in mock)
const febStart = "2026-02-01";
const febEnd = "2026-02-28";

const fixedFeb = calculateBudget("fixed_camp", febStart, febEnd);
const recurringFeb = calculateBudget("recurring_camp", febStart, febEnd); // Mock recurring is only for Dec

console.log(`[FEB 2026] Fixed (Exp: 0): ${Math.round(fixedFeb)}`);
console.log(`[FEB 2026] Recurring (Exp: 0 - since mock period is only Dec): ${Math.round(recurringFeb)}`);
