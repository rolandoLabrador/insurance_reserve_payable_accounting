import ExcelJS from 'exceljs';
import { type FormattedFinancialReport, ReportTransformer } from '../utils/report.transformer.js';

export class ExcelService {
  /**
   * Takes the formatted JSON report and generates an Excel spreadsheet 
   * mirroring the exact reporting layout.
   */
  public async generateExcelReport(
    report: FormattedFinancialReport, 
    rawData: any[], 
    outputPath: string,
    reportMonth: string = 'All Records'
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();

    const sheet = workbook.addWorksheet('Remittance Payable');
    
    sheet.columns = [
      { header: 'MONTH', key: 'month', width: 15 },
      { header: 'COMPANY', key: 'company', width: 15 },
      { header: 'INSURANCE COMP.', key: 'insuranceComp', width: 25 },
      { header: 'RESERVES PAYABLE', key: 'reserves', width: 25 },
      { header: 'INSURER FEES & PREMIUM TAX PAYABLE', key: 'fees', width: 45 }
    ];

    sheet.getRow(1).font = { bold: true };

    // OWS Rows
    sheet.addRow({
      month: reportMonth,
      company: 'OWS',
      insuranceComp: 'Fortegra',
      reserves: report.OWS["Reserves Payable to Fortegra"],
      fees: report.OWS["Insurance Fees & Premium Tax Payable to Fortegra"]
    });

    sheet.addRow({
      month: reportMonth,
      company: 'OWS',
      insuranceComp: 'Old Republic',
      reserves: report.OWS["Reserves Payable to Old Republic"],
      fees: report.OWS["Insurance Fees & Premium Tax Payable to Old Republic"]
    });

    // One row of spacing before OWS total
    sheet.addRow({});

    // OWS Total Row
    const owsTotalRow = sheet.addRow({
      month: reportMonth,
      company: '',
      insuranceComp: 'TOTAL OWS',
      reserves: report.OWS["Reserves Payable to Fortegra"] + report.OWS["Reserves Payable to Old Republic"],
      fees: report.OWS["Insurance Fees & Premium Tax Payable to Fortegra"] + report.OWS["Insurance Fees & Premium Tax Payable to Old Republic"]
    });
    owsTotalRow.font = { bold: true };

    // Two rows of spacing
    sheet.addRow({});
    sheet.addRow({});

    // Magnishield Rows
    sheet.addRow({
      month: reportMonth,
      company: 'MPC',
      insuranceComp: 'Fortegra',
      reserves: report.Magnishield["Reserves Payable to Fortegra"],
      fees: report.Magnishield["Insurance Fees & Premium Tax Payable to Fortegra"]
    });

    sheet.addRow({
      month: reportMonth,
      company: 'MPC',
      insuranceComp: 'Old Republic',
      reserves: report.Magnishield["Reserves Payable to Old Republic"],
      fees: report.Magnishield["Insurance Fees & Premium Tax Payable to Old Republic"]
    });

    // One row of spacing before MPC total
    sheet.addRow({});

    // MPC Total Row
    const mpcTotalRow = sheet.addRow({
      month: reportMonth,
      company: '',
      insuranceComp: 'TOTAL MPC',
      reserves: report.Magnishield["Reserves Payable to Fortegra"] + report.Magnishield["Reserves Payable to Old Republic"],
      fees: report.Magnishield["Insurance Fees & Premium Tax Payable to Fortegra"] + report.Magnishield["Insurance Fees & Premium Tax Payable to Old Republic"]
    });
    mpcTotalRow.font = { bold: true };

    // Standard Accounting number format for Currency
    sheet.getColumn('reserves').numFmt = '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)';
    sheet.getColumn('fees').numFmt = '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)';

    // Generate the Raw Data page (This is for debugging only)
    const rawSheet = workbook.addWorksheet('Raw Data');
    rawSheet.columns = [
      { header: 'Type', key: '_recordType', width: 12 },
      { header: 'Record ID', key: '_recordId', width: 20 },
      { header: 'Final Payee', key: '_finalPayee', width: 15 },
      { header: 'Final Insurer', key: '_finalInsurer', width: 20 },
      { header: 'Reserves', key: 'reserves', width: 15 },
      { header: 'Fees & Tax', key: 'feesAndTax', width: 15 },
      { header: 'Claim Amount', key: 'claimAmount', width: 15 },
      { header: 'Mapped Company', key: 'company', width: 15 },
      { header: 'Mapped Risk Entity', key: 'riskEntity', width: 20 },
      { header: 'Mapped Ins. Comp.', key: 'insuranceCompany', width: 25 },
      { header: 'Mapped Clip Type', key: 'clipType', width: 15 },
      { header: 'Original Data Base (JSON)', key: 'originalReserve', width: 90 }
    ];

    rawSheet.getRow(1).font = { bold: true };

    for (const row of rawData) {
      const finalPayee = ReportTransformer.normalizeCompany(row.company);
      const finalInsurer = ReportTransformer.normalizeRiskEntity(row.riskEntity, row.insuranceCompany);

      let originalReserve = '';
      if (row._recordType === 'Contract' && row.WrittenAmount?.RESERVE) {
         originalReserve = JSON.stringify(row.WrittenAmount.RESERVE);
      } else if (row._recordType === 'Cancel' && row.CancelledAmount?.RESERVE) {
         originalReserve = JSON.stringify(row.CancelledAmount.RESERVE);
      } else if (row._recordType === 'Claim') {
         originalReserve = `Total Paid Amount: ${row['Total Paid Amount']}`;
      }

      const displayRiskEntity = row.riskEntity === 'UNKNOWN' ? 'Unknown Entity' : row.riskEntity;
      const displayInsComp = row.insuranceCompany === 'UNKNOWN' ? 'Unknown Entity' : row.insuranceCompany;
      const displayClipType = row.clipType === 'UNKNOWN' ? 'Unknown Insurance' : row.clipType;

      const rawRow = rawSheet.addRow({
        _recordType: row._recordType, _recordId: row._recordId,
        _finalPayee: finalPayee || 'EXCLUDED', _finalInsurer: finalInsurer || 'EXCLUDED',
        reserves: row.reserves || 0, feesAndTax: row.feesAndTax || 0, claimAmount: row.claimAmount || 0,
        company: row.company, riskEntity: displayRiskEntity, insuranceCompany: displayInsComp, clipType: displayClipType,
        originalReserve
      });

      // Highlight missing values with a yellow background and red text
      const warningFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
      const warningFont: Partial<ExcelJS.Font> = { color: { argb: 'FFFF0000' }, bold: true };

      if (displayRiskEntity === 'Unknown Entity') {
        rawRow.getCell('riskEntity').fill = warningFill;
        rawRow.getCell('riskEntity').font = warningFont;
      }
      if (displayInsComp === 'Unknown Entity') {
        rawRow.getCell('insuranceCompany').fill = warningFill;
        rawRow.getCell('insuranceCompany').font = warningFont;
      }
      if (displayClipType === 'Unknown Insurance') {
        rawRow.getCell('clipType').fill = warningFill;
        rawRow.getCell('clipType').font = warningFont;
      }
    }

    rawSheet.getColumn('reserves').numFmt = '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)';
    rawSheet.getColumn('feesAndTax').numFmt = '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)';
    rawSheet.getColumn('claimAmount').numFmt = '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)';

    await workbook.xlsx.writeFile(outputPath);
  }
}