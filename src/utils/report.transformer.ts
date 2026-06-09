import { type AggregationGroupResult } from '../services/mongo.services.js';

type CompanyKey = 'MAG' | 'OWS';
type RiskEntityKey = 'OLD REPUBLIC' | 'FORTEGRA';

interface FinancialMetrics {
  reserves: number;
  feesAndTax: number;
}

type InternalReportMap = {
  [C in CompanyKey]: {
    [R in RiskEntityKey]: FinancialMetrics;
  };
};

export interface FormattedFinancialReport {
  Magnishield: {
    "Reserves Payable to Old Republic": number;
    "Insurance Fees & Premium Tax Payable to Old Republic": number;
    "Reserves Payable to Fortegra": number;
    "Insurance Fees & Premium Tax Payable to Fortegra": number;
  };
  OWS: {
    "Reserves Payable to Old Republic": number;
    "Insurance Fees & Premium Tax Payable to Old Republic": number;
    "Reserves Payable to Fortegra": number;
    "Insurance Fees & Premium Tax Payable to Fortegra": number;
  };
}

export class ReportTransformer {
  /**
   * Takes raw aggregation outputs, executes Remittance Math (Contracts - Cancels - Claims),
   * and maps them into the strict final payout format.
   */
  public static generateFinancialReport(
    contracts: AggregationGroupResult[],
    cancels: AggregationGroupResult[],
    claims: AggregationGroupResult[]
  ): FormattedFinancialReport {
    
    // 1. Initialize our internal math map
    const reportMap: InternalReportMap = {
      MAG: { "OLD REPUBLIC": { reserves: 0, feesAndTax: 0 }, FORTEGRA: { reserves: 0, feesAndTax: 0 } },
      OWS: { "OLD REPUBLIC": { reserves: 0, feesAndTax: 0 }, FORTEGRA: { reserves: 0, feesAndTax: 0 } }
    };

    // 2. Add Written Contracts
    for (const item of contracts) {
      const comp = this.normalizeCompany(item._id.company);
      const risk = this.normalizeRiskEntity(item._id.riskEntity, item._id.insuranceCompany);
      if (comp && risk) {
        reportMap[comp][risk].reserves += (item.totalReserves || 0);
        reportMap[comp][risk].feesAndTax += (item.totalFeesAndTax || 0);
      }
    }

    // 3. Deduct Cancellations
    for (const item of cancels) {
      const comp = this.normalizeCompany(item._id.company);
      const risk = this.normalizeRiskEntity(item._id.riskEntity, item._id.insuranceCompany);
      if (comp && risk) {
        reportMap[comp][risk].reserves -= (item.totalReserves || 0);
        reportMap[comp][risk].feesAndTax -= (item.totalFeesAndTax || 0);
      }
    }

    // 4. Deduct Paid Claims (from Reserves only)
    for (const item of claims) {
      const comp = this.normalizeCompany(item._id.company);
      const risk = this.normalizeRiskEntity(item._id.riskEntity, item._id.insuranceCompany);
      if (comp && risk) {
        reportMap[comp][risk].reserves -= (item.totalClaims || 0);
      }
    }

    // 5. Format to the specific requested text keys and fix precision
    return {
      Magnishield: {
        "Reserves Payable to Old Republic": this.roundToTwo(reportMap.MAG["OLD REPUBLIC"].reserves),
        "Insurance Fees & Premium Tax Payable to Old Republic": this.roundToTwo(reportMap.MAG["OLD REPUBLIC"].feesAndTax),
        "Reserves Payable to Fortegra": this.roundToTwo(reportMap.MAG["FORTEGRA"].reserves),
        "Insurance Fees & Premium Tax Payable to Fortegra": this.roundToTwo(reportMap.MAG["FORTEGRA"].feesAndTax)
      },
      OWS: {
        "Reserves Payable to Old Republic": this.roundToTwo(reportMap.OWS["OLD REPUBLIC"].reserves),
        "Insurance Fees & Premium Tax Payable to Old Republic": this.roundToTwo(reportMap.OWS["OLD REPUBLIC"].feesAndTax),
        "Reserves Payable to Fortegra": this.roundToTwo(reportMap.OWS["FORTEGRA"].reserves),
        "Insurance Fees & Premium Tax Payable to Fortegra": this.roundToTwo(reportMap.OWS["FORTEGRA"].feesAndTax)
      }
    };
  }

  public static normalizeCompany(key: string): CompanyKey | null {
    const normalized = (key || '').toUpperCase().trim();
    if (normalized === 'MAGNISHIELD' || normalized === 'MAG') return 'MAG';
    if (normalized === 'OWS') return 'OWS';
    return null;
  }

  public static normalizeRiskEntity(riskEntity: string, insuranceComp: string = ''): RiskEntityKey | null {
    const combined = `${(riskEntity || '').toUpperCase()} ${(insuranceComp || '').toUpperCase()}`;

    if (combined.includes('OLD REPUBLIC')) return 'OLD REPUBLIC';
    if (combined.includes('FORTEGRA') || combined.includes('LYNDON')) return 'FORTEGRA';

    return null;
  }

  private static roundToTwo(num: number): number {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }
}